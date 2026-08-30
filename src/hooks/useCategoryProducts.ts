/**
 * useCategoryProducts
 *
 * A TanStack-Query-powered hook for the Shop grid.
 *
 * Features:
 *  - Single Supabase query with embedded joins (no N+1)
 *  - Lean field selection (only what the grid needs)
 *  - Server-side pagination via .range()
 *  - .eq("is_active", true) always applied
 *  - Discriminated-union status machine: loading | slow | error | empty | success
 *  - Slow-network detection after 5 s
 *  - staleTime=5min + keepPreviousData for seamless page/filter transitions
 */

import { useEffect, useRef, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

// --- Constants ----------------------------------------------------------------
export const PAGE_SIZE = 24;
const SLOW_THRESHOLD_MS = 5_000;

// --- Public Types -------------------------------------------------------------

/** Minimal product shape for the grid */
export interface GridProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  category_id: string | null;
  /** URL of the first image sorted by sort_order, or null */
  coverImageUrl: string | null;
  /** True if at least one variant has stock_qty > 0 */
  inStock: boolean;
}

export type CategoryQueryStatus =
  | { status: "loading" }
  | { status: "slow" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "empty" }
  | { status: "success"; products: GridProduct[]; totalFetched: number };

// --- Internal Types -----------------------------------------------------------
interface RawVariant { stock_qty: number }
interface RawImage { url: string; sort_order: number }
interface RawProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  category_id: string | null;
  product_images: RawImage[];
  product_variants: RawVariant[];
}

// --- Supabase Fetcher ---------------------------------------------------------

async function fetchCategoryProducts(
  page: number,
  categoryId: string | null,
): Promise<RawProduct[]> {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let q = supabase
    .from("products")
    .select(
      `id, name, slug, base_price, category_id,
       product_images ( url, sort_order ),
       product_variants ( stock_qty )`
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (categoryId) {
    q = q.eq("category_id", categoryId);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as RawProduct[];
}

// --- Data Transform -----------------------------------------------------------

function toGridProduct(raw: RawProduct): GridProduct {
  const sorted = [...(raw.product_images ?? [])].sort(
    (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    base_price: raw.base_price,
    category_id: raw.category_id,
    coverImageUrl: sorted[0]?.url ?? null,
    inStock: (raw.product_variants ?? []).some((v) => v.stock_qty > 0),
  };
}

// --- Hook ---------------------------------------------------------------------

interface UseCategoryProductsOptions {
  /** The Supabase category ID to filter on, null for "all",
   *  or the sentinel "__loading__" to pause the query until categories resolve. */
  categoryId: string | null;
  page: number;
}

export function useCategoryProducts({
  categoryId,
  page,
}: UseCategoryProductsOptions): CategoryQueryStatus {
  const [isSlow, setIsSlow] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "__loading__" sentinel: categories not yet resolved — pause query
  const isAwaitingCategories = categoryId === "__loading__";
  // The real ID to pass to Supabase (null = fetch all)
  const resolvedCategoryId = isAwaitingCategories ? null : categoryId;

  const query = useQuery<GridProduct[], Error>({
    queryKey: ["category-products", resolvedCategoryId ?? "all", page],
    queryFn: async () => {
      const raw = await fetchCategoryProducts(page, resolvedCategoryId);
      return raw.map(toGridProduct);
    },
    // Disable the query entirely while categories are still loading
    enabled: !isAwaitingCategories,
    // staleTime=0 for category-filtered queries: always re-fetch when the user
    // picks a category so we never serve a stale "all products" result for a
    // category-specific URL. For "all" (null categoryId) keep 5-min cache.
    staleTime: resolvedCategoryId ? 0 : 5 * 60 * 1000,
    // Don't keep old category data in memory after navigating away
    gcTime: resolvedCategoryId ? 30 * 1000 : 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  // Slow-network detection - only fires on a genuine fresh fetch
  const isPendingFresh = query.isFetching && !query.isPlaceholderData;

  useEffect(() => {
    if (isPendingFresh) {
      setIsSlow(false);
      slowTimer.current = setTimeout(() => setIsSlow(true), SLOW_THRESHOLD_MS);
    } else {
      setIsSlow(false);
      if (slowTimer.current) {
        clearTimeout(slowTimer.current);
        slowTimer.current = null;
      }
    }
    return () => {
      if (slowTimer.current) clearTimeout(slowTimer.current);
    };
  }, [isPendingFresh]);

  // -- State machine ---------------------------------------
  // While waiting for categories to resolve, show loading skeleton
  if (isAwaitingCategories) {
    return { status: "loading" };
  }

  if (query.isError) {
    return { status: "error", error: query.error, retry: () => query.refetch() };
  }

  if (query.isPending && !query.isPlaceholderData) {
    return isSlow ? { status: "slow" } : { status: "loading" };
  }

  const products = query.data ?? [];
  if (products.length === 0 && !query.isFetching) {
    return { status: "empty" };
  }

  return { status: "success", products, totalFetched: products.length };
}