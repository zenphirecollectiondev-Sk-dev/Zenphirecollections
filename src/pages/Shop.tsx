import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import {
  SlidersHorizontal, X, ChevronDown, Heart, ShoppingBag,
  ArrowRight, ChevronLeft, ChevronRight, WifiOff,
} from "lucide-react";
import { useWishlistStore } from "../store/useWishlistStore";
import { getCategories, supabase } from "../lib/supabase";
import { dataCache } from "../lib/dataCache";
import { useCategoryProducts, PAGE_SIZE } from "../hooks/useCategoryProducts";
import { ProductCardSkeleton } from "../components/ui/ProductCardSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import type { GridProduct } from "../hooks/useCategoryProducts";
import { imgCard } from "../lib/imgTransform";
import { motion, AnimatePresence } from "framer-motion";
import { DUR, EASE, EASE_ENTER } from "../lib/motion";
import { usePageSEO } from "../hooks/usePageSEO";

// --- Image card with proper loading / error states ---------------------------

type ImgState = "loading" | "loaded" | "error";

function ProductImage({
  src,
  alt,
  lazy,
  priority,
}: {
  src: string | null;
  alt: string;
  lazy: boolean;
  priority?: boolean;
}) {
  const [imgState, setImgState] = useState<ImgState>(src ? "loading" : "error");
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset when src changes (e.g. navigating between categories)
  useEffect(() => {
    setImgState(src ? "loading" : "error");
    if (src && imgRef.current?.complete) {
      setImgState("loaded");
    }
  }, [src]);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-bg-subtle border border-border">
      {/* Skeleton shown until image loads */}
      {imgState === "loading" && (
        <div
          className="absolute inset-0 animate-pulse bg-zinc-100"
          aria-hidden="true"
        />
      )}

      {/* Brand-colored fallback � shown when src is null OR onError fires */}
      {imgState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-subtle gap-2">
          {/* Minimal brand placeholder � geometric diamond motif */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <rect
              x="20"
              y="2"
              width="25"
              height="25"
              rx="1"
              transform="rotate(45 20 20)"
              stroke="#B8975A"
              strokeWidth="1"
              fill="none"
              opacity="0.4"
            />
            <rect
              x="20"
              y="8"
              width="15"
              height="15"
              rx="0.5"
              transform="rotate(45 20 20)"
              stroke="#B8975A"
              strokeWidth="0.8"
              fill="none"
              opacity="0.25"
            />
          </svg>
          <span className="text-[9px] uppercase tracking-widest text-text-secondary/40 font-bold">
            Zenphire
          </span>
        </div>
      )}

      {/* The real image � only rendered when we have a src */}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          {...(priority ? { fetchPriority: "high" as any } : {})}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("error")}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out ${imgState === "loaded" ? "opacity-100" : "opacity-0"
            }`}
        />
      )}
    </div>
  );
}

// --- Skeleton grid ------------------------------------------------------------

function SkeletonGrid({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4 md:gap-x-6">
      <ProductCardSkeleton count={count} />
    </div>
  );
}

// --- Pagination controls ------------------------------------------------------

function Pagination({
  page,
  hasMore,
  onPrev,
  onNext,
}: {
  page: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (page === 0 && !hasMore) return null;
  return (
    <div className="flex items-center justify-center gap-4 mt-12 pt-8 border-t border-border">
      <button
        onClick={onPrev}
        disabled={page === 0}
        className="btn flex items-center gap-1.5 min-h-[44px] px-5 py-2.5 border border-border text-xs font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-subtle"
      >
        <ChevronLeft size={14} />
        Previous
      </button>
      <span className="text-xs text-text-secondary font-medium px-2">
        Page {page + 1}
      </span>
      <button
        onClick={onNext}
        disabled={!hasMore}
        className="btn flex items-center gap-1.5 min-h-[44px] px-5 py-2.5 border border-border text-xs font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-subtle"
      >
        Next
        <ChevronRight size={14} />
      </button>
    </div>
  );
}

// --- Main Shop page -----------------------------------------------------------

export default function Shop() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const [heartId, setHeartId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "all";
  const activeGender = searchParams.get("gender") || "all";
  const activeOccasion = searchParams.get("occasion") || "";

  // -- Categories (lightweight — fetched once, cached) -----------------------
  // ⚠️ CRITICAL: lazy initializer reads from dataCache synchronously on first render.
  const [dbCategories, setDbCategories] = useState<any[]>(
    () => dataCache.get<any[]>('categories') ?? []
  );

  // Track whether categories have been loaded (either from cache or network)
  const [categoriesReady, setCategoriesReady] = useState(
    () => (dataCache.get<any[]>('categories') ?? []).length > 0
  );

  useEffect(() => {
    const cached = dataCache.get<any[]>("categories");
    if (cached && cached.length > 0) {
      setDbCategories(cached);
      setCategoriesReady(true);
    }
    if (cached && !dataCache.isStale("categories")) return;
    getCategories().then((cats) => {
      dataCache.set("categories", cats || []);
      setDbCategories(cats || []);
      setCategoriesReady(true);
    });
  }, []);

  const categories = useMemo(() => dbCategories, [dbCategories]);

  // Main collections: exclude gender subcategory rows ("Male", "Female", "Unisex")
  const mainCategories = useMemo(() => {
    return categories.filter((c: any) =>
      !c.parent_category_id ||
      (!['male', 'female', 'unisex'].includes(c.name?.toLowerCase() || '') &&
       !['male', 'female', 'unisex'].includes(c.slug?.split('-').pop()?.toLowerCase() || ''))
    );
  }, [categories]);

  // Filter categories shown to user based on activeGender
  const displayedCategories = useMemo(() => {
    if (activeGender === 'all') return mainCategories;
    const targetGender = activeGender.toLowerCase();
    return mainCategories.filter((mainCat: any) => {
      return categories.some((c: any) =>
        c.parent_category_id === mainCat.id &&
        (c.name?.toLowerCase() === targetGender || c.slug?.toLowerCase().endsWith(`-${targetGender}`))
      );
    });
  }, [mainCategories, categories, activeGender]);

  // Available genders for current selection or activeCategory
  const availableGenders = useMemo(() => {
    if (activeCategory === 'all') {
      return [
        { id: 'all', label: 'All' },
        { id: 'male', label: 'Men' },
        { id: 'female', label: 'Women' },
        { id: 'unisex', label: 'Unisex' },
      ];
    }
    const mainCat = categories.find((c: any) =>
      c.slug === activeCategory || c.name?.toLowerCase() === activeCategory.toLowerCase()
    );
    if (!mainCat) {
      return [
        { id: 'all', label: 'All' },
        { id: 'male', label: 'Men' },
        { id: 'female', label: 'Women' },
        { id: 'unisex', label: 'Unisex' },
      ];
    }
    const childGenders = new Set<string>();
    categories.forEach((c: any) => {
      if (c.parent_category_id === mainCat.id) {
        const n = c.name?.toLowerCase();
        if (n === 'male') childGenders.add('male');
        if (n === 'female') childGenders.add('female');
        if (n === 'unisex') childGenders.add('unisex');
      }
    });

    const list = [{ id: 'all', label: 'All' }];
    if (childGenders.has('male')) list.push({ id: 'male', label: 'Men' });
    if (childGenders.has('female')) list.push({ id: 'female', label: 'Women' });
    if (childGenders.has('unisex')) list.push({ id: 'unisex', label: 'Unisex' });
    return list;
  }, [activeCategory, categories]);

  const shopTitle = useMemo(() => {
    const genderLabel =
      activeGender !== 'all'
        ? activeGender === 'male'
          ? "Men's"
          : activeGender === 'female'
          ? "Women's"
          : "Unisex"
        : null;

    let catLabel: string | null = null;
    if (activeCategory !== 'all') {
      const match = categories.find(
        (c: any) =>
          c.slug === activeCategory ||
          c.name?.toLowerCase() === activeCategory.toLowerCase()
      );
      const raw = match ? match.name : activeCategory.replace(/-/g, ' ');
      // Format as title case cleanly
      catLabel = raw
        .split(' ')
        .filter(Boolean)
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    }

    // Clean up if catLabel is already a standalone gender name
    if (catLabel) {
      const catNorm = catLabel.toLowerCase().replace(/[^a-z]/g, '');
      if (catNorm === 'men' || catNorm === 'mens' || catNorm === 'male') {
        return "Men's Collection";
      }
      if (catNorm === 'women' || catNorm === 'womens' || catNorm === 'female') {
        return "Women's Collection";
      }
      if (catNorm === 'unisex') {
        return "Unisex Collection";
      }
    }

    if (genderLabel && catLabel) {
      const catLower = catLabel.toLowerCase();
      const genderStem = activeGender === 'male' ? 'men' : activeGender === 'female' ? 'women' : 'unisex';
      // If catLabel already has the gender prefix, e.g. "Men's Collection" or "Men's Shirts", don't repeat gender
      if (catLower.includes(genderStem)) {
        return catLabel.endsWith('collection') ? catLabel : `${catLabel} Collection`;
      }
      if (catLower.endsWith('collection')) {
        return `${genderLabel} ${catLabel}`;
      }
      return `${genderLabel} ${catLabel}`;
    }

    if (genderLabel) return `${genderLabel} Collection`;

    if (catLabel) {
      if (catLabel.toLowerCase().includes('collection')) return catLabel;
      return `${catLabel} Collection`;
    }

    if (activeOccasion) {
      const occ = activeOccasion.replace(/-/g, ' ');
      return `${occ.charAt(0).toUpperCase() + occ.slice(1).toLowerCase()} Selection`;
    }

    return 'Collections';
  }, [activeGender, activeCategory, activeOccasion, categories]);

  usePageSEO({
    title: shopTitle,
    description: `Browse Zenphire's ${shopTitle.toLowerCase()} featuring luxury craftsmanship, premium fabrics, and sculpted silhouettes.`
  });

  // -- Occasion product IDs (fetched from occasion_products when ?occasion= is set) --
  // null = no occasion filter, ["__occasion_loading__"] = still fetching
  const [occasionProductIds, setOccasionProductIds] = useState<string[] | null>(
    () => activeOccasion ? ["__occasion_loading__"] : null
  );

  useEffect(() => {
    if (!activeOccasion) {
      setOccasionProductIds(null);
      return;
    }
    // Signal "loading" immediately so the hook shows skeleton
    setOccasionProductIds(["__occasion_loading__"]);
    supabase
      .from('occasion_products' as any)
      .select('product_id')
      .eq('occasion', activeOccasion)
      .then(({ data, error }) => {
        if (error) {
          console.warn('occasion_products fetch error:', error);
          setOccasionProductIds(null);
          return;
        }
        const ids = (data || []).map((r: any) => r.product_id).filter(Boolean);
        setOccasionProductIds(ids.length > 0 ? ids : null);
      });
  }, [activeOccasion]);

  // -- Client-side filter state ----------------------------------------------
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [page, setPage] = useState(0);

  // Lock body scroll when mobile filter is open
  useEffect(() => {
    if (!isMobileFilterOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileFilterOpen]);

  // -- Resolve active category IDs for the hook -------------------------------
  // If categories haven't loaded yet and a specific category is requested,
  // return a sentinel array so the hook stays in "loading" state
  // rather than fetching all products with no filter.
  const activeCategoryIds = useMemo(() => {
    if (activeCategory === "all" && activeGender === "all") return null;
    if (!categoriesReady) return ["__loading__"];

    let validCatIds: string[] = [];

    if (activeGender !== "all") {
      // Admin stores gender as child categories named "Male"/"Female"/"Unisex"
      // with slugs like "shirts-male". There is NO top-level "men"/"women" slug.
      const genderName = activeGender.toLowerCase(); // "male" | "female" | "unisex"
      validCatIds = categories
        .filter((c: any) => c.parent_category_id && c.name.toLowerCase() === genderName)
        .map((c: any) => c.id);
      if (validCatIds.length === 0) return ["__empty__"];
    }

    if (activeCategory === "all") {
      return validCatIds.length > 0 ? validCatIds : null;
    }

    let cat = categories.find((c: any) => c.slug === activeCategory);
    if (!cat) {
      if (activeCategory === "trousers") cat = categories.find((c: any) => c.slug === "pants");
      else if (activeCategory === "crop-tops") cat = categories.find((c: any) => c.slug === "crop-top");
      else if (
        activeCategory === "tshirt-and-tops" ||
        activeCategory === "tshirt" ||
        activeCategory === "tshirts"
      )
        cat = categories.find((c: any) => c.slug === "t-shirts");
      else if (activeCategory === "dresses")
        cat = categories.find((c: any) => c.slug === "dress" || c.slug === "dresses");
    }

    // Flexible slug / singular / plural fallback
    if (!cat) {
      const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const activeNorm = norm(activeCategory);
      cat = categories.find((c: any) => {
        const catSlugNorm = norm(c.slug || '');
        const catNameNorm = norm(c.name || '');
        return (
          catSlugNorm === activeNorm ||
          catNameNorm === activeNorm ||
          catSlugNorm + 's' === activeNorm ||
          catSlugNorm === activeNorm + 's' ||
          catNameNorm + 's' === activeNorm ||
          catNameNorm === activeNorm + 's'
        );
      });
    }

    if (!cat) return null;

    const catFamilyIds = categories
      .filter((c: any) => c.id === cat.id || c.parent_category_id === cat.id)
      .map((c: any) => c.id);

    if (activeGender !== "all") {
      const intersected = catFamilyIds.filter(id => validCatIds.includes(id));
      return intersected.length > 0 ? intersected : ["__empty__"];
    }

    return catFamilyIds.length > 0 ? catFamilyIds : null;
  }, [activeCategory, activeGender, categories, categoriesReady]);

  // Reset to page 0 and clear size selection whenever category or gender changes
  useEffect(() => {
    setPage(0);
    setSelectedSizes([]);
  }, [activeCategoryIds, activeOccasion, activeGender]);

  // -- Data from hook (TanStack Query) --------------------------------------
  const queryState = useCategoryProducts({
    categoryIds: activeCategoryIds,
    productIds: occasionProductIds,
    page,
  });
  const filteredProducts = useMemo((): GridProduct[] => {
    if (queryState.status !== "success") return [];
    let result = [...queryState.products];
    result = result.filter((p) => p.base_price <= maxPrice);
    if (selectedSizes.length > 0) {
      // Keep products that have at least one selected size in stock
      result = result.filter((p) =>
        selectedSizes.some((s) => p.availableSizes.includes(s))
      );
    }
    if (sortBy === "price-asc") result.sort((a, b) => a.base_price - b.base_price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.base_price - a.base_price);
    return result;
  }, [queryState, maxPrice, sortBy, selectedSizes]);

  // -- Sane page title -------------------------------------------------------
  const pageTitle = shopTitle;

  // -- Handlers --------------------------------------------------------------
  const handleCategoryChange = (slug: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", slug);
      if (activeGender !== "all") {
        const targetGender = activeGender.toLowerCase();
        const mainCat = categories.find((c: any) =>
          c.slug === slug || c.name?.toLowerCase() === slug.toLowerCase()
        );
        if (mainCat) {
          const hasGenderInCat = categories.some((c: any) =>
            c.parent_category_id === mainCat.id &&
            (c.name?.toLowerCase() === targetGender || c.slug?.toLowerCase().endsWith(`-${targetGender}`))
          );
          if (!hasGenderInCat) {
            newParams.delete("gender");
          }
        }
      }
    }
    setSearchParams(newParams);
  };

  const handleGenderChange = (gender: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (gender === "all") {
      newParams.delete("gender");
    } else {
      newParams.set("gender", gender);
      if (activeCategory !== "all") {
        const targetGender = gender.toLowerCase();
        const mainCat = categories.find((c: any) =>
          c.slug === activeCategory || c.name?.toLowerCase() === activeCategory.toLowerCase()
        );
        if (mainCat) {
          const hasGenderInCat = categories.some((c: any) =>
            c.parent_category_id === mainCat.id &&
            (c.name?.toLowerCase() === targetGender || c.slug?.toLowerCase().endsWith(`-${targetGender}`))
          );
          if (!hasGenderInCat) {
            newParams.delete("category");
          }
        }
      }
    }
    setSearchParams(newParams);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const resetFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    newParams.delete("gender");
    newParams.delete("occasion");
    setSearchParams(newParams);
    setSelectedSizes([]);
    setMaxPrice(15000);
    setSortBy("newest");
    setPage(0);
  };

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    setHeartId(id);
    setTimeout(() => setHeartId(null), 400);
  };

  // Standard order for sorting size labels
  const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL",
    "28", "30", "32", "34", "36", "38", "40", "42"];

  // Dynamically derived from loaded products — only sizes that actually exist and have stock
  const sizesList = useMemo(() => {
    if (queryState.status !== "success") return [];
    const all = new Set<string>();
    queryState.products.forEach(p => p.availableSizes.forEach(s => all.add(s)));
    return [...all].sort((a, b) => {
      const ia = SIZE_ORDER.indexOf(a);
      const ib = SIZE_ORDER.indexOf(b);
      // Known sizes: sort by position; unknown sizes: append alphabetically
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [queryState]);

  // Prune any selected sizes that are not present in current sizesList
  useEffect(() => {
    if (selectedSizes.length > 0 && sizesList.length > 0) {
      const valid = selectedSizes.filter((s) => sizesList.includes(s));
      if (valid.length !== selectedSizes.length) {
        setSelectedSizes(valid);
      }
    }
  }, [sizesList, selectedSizes]);

  const activeFilterCount =
    (selectedSizes.length > 0 ? selectedSizes.length : 0) +
    (activeCategory !== "all" ? 1 : 0) +
    (activeGender !== "all" ? 1 : 0) +
    (maxPrice < 15000 ? 1 : 0);

  const resultCount =
    queryState.status === "success" ? filteredProducts.length : null;
  const hasMore =
    queryState.status === "success" && queryState.totalFetched === PAGE_SIZE;

  // -- Render ----------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen overflow-x-hidden anim-fade-up">

      {/* Page Header */}
      <div className="border-b border-border pb-5 mb-7 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent-gold font-medium">
            Zenphire
          </p>
          <h1 className="text-xl sm:text-2xl font-mending font-medium tracking-wide text-text-primary mt-1">
            {pageTitle}
          </h1>
        </div>
        {resultCount !== null && (
          <p className="text-xs text-text-secondary">{resultCount} results</p>
        )}
      </div>

      {/* Control Bar (Sticky & always accessible) */}
      <div className="sticky top-16 z-30 flex justify-between items-center mb-8 border border-border/70 px-3 py-2 bg-white/95 backdrop-blur-sm shadow-xs gap-3">
        {/* Mobile filter button */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          title="Filter"
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border/80 text-xs font-normal md:hidden hover:border-text-primary text-text-primary bg-white transition-colors rounded-xs"
        >
          <SlidersHorizontal size={13} />
          <span>Filter</span>
          {activeFilterCount > 0 && (
            <span className="bg-text-primary text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full leading-none">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Desktop: filter reset */}
        <div className="hidden md:flex items-center gap-2">
          {activeFilterCount > 0 ? (
            <button
              onClick={resetFilters}
              title="Reset all filters"
              className="flex items-center gap-1.5 text-xs font-medium text-sale hover:underline uppercase tracking-wider py-1 px-2 border border-sale/30 rounded-xs"
            >
              <SlidersHorizontal size={12} />
              <span>Reset Filters</span>
              <X size={11} strokeWidth={2.5} />
            </button>
          ) : (
            <div title="No filters active" className="flex items-center gap-1.5 text-xs text-text-secondary/60 tracking-wider py-1 px-2">
              <SlidersHorizontal size={12} />
              <span>Filters</span>
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-text-secondary font-normal hidden sm:inline-block">
            Sort:
          </span>
          <div className="relative">
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort"
              className="appearance-none bg-white border border-border/80 rounded-xs text-xs font-normal py-1.5 pl-2.5 pr-6 focus:outline-none focus:border-text-primary cursor-pointer text-text-primary hover:border-text-primary transition-colors"
            >
              <option value="newest">New Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary/70" />
          </div>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-10">

        {/* DESKTOP SIDEBAR */}
        <aside className="w-56 flex-shrink-0 hidden md:block space-y-8">
          {/* Gender Filter */}
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3 pb-2 border-b border-border">
              Gender
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {availableGenders.map((g) => {
                const isActive = activeGender === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleGenderChange(g.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-all duration-150 ${
                      isActive
                        ? "bg-text-primary text-white border-text-primary shadow-xs"
                        : "border-border text-text-secondary hover:text-text-primary hover:border-accent bg-white"
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Collections Filter (Dynamic based on active gender) */}
          {displayedCategories.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3 pb-2 border-b border-border">
                Collections
              </h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleCategoryChange("all")}
                    className={`nav-link text-sm tracking-wide ${activeCategory === "all" ? "font-bold text-text-primary" : "text-text-secondary"}`}
                  >
                    All Collections
                  </button>
                </li>
                {displayedCategories.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => handleCategoryChange(c.slug)}
                      className={`nav-link text-sm tracking-wide capitalize ${activeCategory === c.slug ? "font-bold text-text-primary" : "text-text-secondary"}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border flex items-center justify-between">
              <span>Size</span>
              {sizesList.length > 0 && selectedSizes.length > 0 && (
                <button
                  onClick={() => setSelectedSizes([])}
                  className="text-[9px] font-bold text-text-secondary hover:text-sale transition-colors duration-150 uppercase tracking-widest"
                >
                  Clear
                </button>
              )}
            </h3>
            {queryState.status === 'loading' || queryState.status === 'slow' ? (
              <div className="flex flex-wrap gap-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-10 h-10 bg-border/40 animate-pulse" />
                ))}
              </div>
            ) : sizesList.length === 0 ? (
              <p className="text-[10px] text-text-secondary/50 italic">No sizes available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sizesList.map((size) => {
                  const isSel = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`size-btn w-10 h-10 border text-xs font-semibold flex items-center justify-center ${isSel
                          ? "ambient-green-gradient text-white border-transparent selected"
                          : "border-border text-text-primary bg-white hover:border-accent"
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3 pb-2 border-b border-border flex justify-between">
              <span>Max Price</span>
              <span className="text-text-secondary font-normal">₹{maxPrice.toLocaleString()}</span>
            </h3>
            <input
              type="range" min="100" max="15000" step="100"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-accent h-1 cursor-pointer"
            />
          </div>
        </aside>

        {/* PRODUCT GRID */}
        <main className="flex-1 min-w-0">

          {/* -- State machine rendering ----------------------------------- */}

          {/* Loading ─ genuine first fetch */}
          {queryState.status === "loading" && (
            <SkeletonGrid count={PAGE_SIZE} />
          )}

          {/* Slow network ─ skeleton + banner */}
          {queryState.status === "slow" && (
            <>
              <div className="flex items-center gap-2 text-xs text-text-secondary bg-bg-subtle border border-border px-4 py-3 mb-6 rounded-sm anim-fade-in">
                <WifiOff size={13} className="shrink-0 text-text-secondary/60" />
                <span>Still loading ─ your connection seems slow. Hang tight…</span>
              </div>
              <SkeletonGrid count={PAGE_SIZE} />
            </>
          )}

          {/* Error */}
          {queryState.status === "error" && (
            <ErrorState
              message={`We had trouble loading products: ${queryState.error.message}`}
              onRetry={queryState.retry}
            />
          )}

          {/* Empty */}
          {queryState.status === "empty" && (
            <EmptyState
              title="No products found"
              message={
                activeCategory !== "all"
                  ? `There are no active products in this category yet. Try browsing all collections.`
                  : "No active products found. Please try again later."
              }
              action={
                activeCategory !== "all" || selectedSizes.length > 0 || maxPrice < 15000
                  ? { label: "View all collections", onClick: resetFilters }
                  : undefined
              }
            />
          )}

          {/* Filtered empty */}
          {queryState.status === "success" && filteredProducts.length === 0 && (
            <EmptyState
              title="No products match"
              message="No products match your current filters."
              action={{ label: "Clear filters", onClick: resetFilters }}
            />
          )}

          {queryState.status === "success" && filteredProducts.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-3.5 sm:gap-x-4 md:gap-x-6 anim-stagger">
                {filteredProducts.map((product, idx) => (
                  <Link
                    key={product.id}
                    to={`/product/${product.slug}`}
                    className="group product-card block"
                  >
                    <div className="relative mb-3">
                      <ProductImage
                        src={imgCard(product.coverImageUrl)}
                        alt={product.name}
                        lazy={idx >= 8}
                        priority={idx < 4}
                      />
                      {/* Hover accent line */}
                      <div className="gold-accent-line z-10" />
                      {/* Sold-out badge */}
                      {!product.inStock && (
                        <div className="absolute top-2 left-2 bg-sale text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 z-10">
                          Sold Out
                        </div>
                      )}
                      {/* Quick view overlay */}
                      <div className="card-overlay absolute bottom-0 left-0 right-0 bg-white/90 py-2.5 px-4 flex items-center justify-between z-10">
                        <span className="text-[9px] uppercase font-bold tracking-widest text-text-primary flex items-center gap-1">
                          <ShoppingBag size={10} /> Quick View
                        </span>
                        <ArrowRight size={11} className="text-text-secondary" />
                      </div>
                      {/* Wishlist button */}
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleWishlist(product.id);
                        }}
                        aria-label="Toggle Wishlist"
                        className={`wishlist-btn absolute top-2.5 right-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center p-2 bg-white/90 border border-border/60 rounded-full z-10 shadow-xs ${heartId === product.id ? "anim-heart-pop" : ""
                          }`}
                      >
                        <Heart
                          size={14}
                          className={
                            isWishlisted(product.id)
                              ? "fill-sale stroke-sale"
                              : "stroke-text-primary"
                          }
                        />
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">
                        Zenphire
                      </p>
                      <h3 className="text-xs font-medium text-text-primary group-hover:text-accent-gold transition-colors duration-150 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs font-semibold text-text-primary">
                        ₹{Number(product.base_price || 0).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              <Pagination
                page={page}
                hasMore={hasMore}
                onPrev={() => { setPage((p) => Math.max(0, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                onNext={() => { setPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
              />
            </>
          )}
        </main>
      </div>

      {/* MOBILE FILTER BOTTOM SHEET — Portaled to document.body so it is always fixed to viewport without transform parent bugs */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMobileFilterOpen && (
            <div className="fixed inset-0 z-[200] md:hidden">
              <motion.div
                key="filter-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
                onClick={() => setIsMobileFilterOpen(false)}
                className="fixed inset-0 bg-black/40"
              />
              <motion.div
                key="filter-sheet"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'tween', duration: DUR.base, ease: EASE_ENTER }}
                className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white border-t border-border/80 flex flex-col p-5 space-y-5 overflow-y-auto shadow-2xl z-[201]"
              >
                <div className="flex justify-between items-center pb-3 border-b border-border/70">
                  <h2 className="font-heading font-normal text-base tracking-wide text-text-primary">
                    Filters
                  </h2>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    aria-label="Close filters"
                    className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors"
                  >
                    <X size={18} strokeWidth={1.5} />
                  </button>
                </div>

                {/* Gender Filter */}
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-primary mb-2">
                    Gender
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableGenders.map((g) => {
                      const isActive = activeGender === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => handleGenderChange(g.id)}
                          className={`px-3 py-1.5 border text-xs font-normal rounded-xs transition-all ${
                            isActive
                              ? "filter-chip-active bg-white"
                              : "border-border/80 bg-white text-text-primary hover:border-text-primary"
                          }`}
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Collections Filter (Gender-aware) */}
                {displayedCategories.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-primary mb-2">
                      Collections
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {["all", ...displayedCategories].map(
                        (c: any) => {
                          const slug = typeof c === "string" ? c : c.slug;
                          const label = typeof c === "string" ? "All" : c.name;
                          const isActive = activeCategory === slug;
                          return (
                            <button
                              key={slug}
                              onClick={() => handleCategoryChange(slug)}
                              className={`px-3 py-1.5 border text-xs font-normal rounded-xs capitalize ${
                                isActive
                                  ? "filter-chip-active bg-white"
                                  : "border-border/80 bg-white text-text-primary hover:border-text-primary"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Size Filter */}
                <div>
                  <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-primary mb-2.5 flex items-center justify-between">
                    <span>Size</span>
                    {sizesList.length > 0 && selectedSizes.length > 0 && (
                      <button
                        onClick={() => setSelectedSizes([])}
                        className="text-[9px] font-semibold text-text-secondary hover:text-sale transition-colors uppercase tracking-widest"
                      >
                        Clear
                      </button>
                    )}
                  </h3>
                  {queryState.status === 'loading' || queryState.status === 'slow' ? (
                    <div className="flex flex-wrap gap-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-9 h-9 bg-border/40 animate-pulse" />
                      ))}
                    </div>
                  ) : sizesList.length === 0 ? (
                    <p className="text-[10px] text-text-secondary/50 italic">No sizes available</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sizesList.map((size) => {
                        const isSel = selectedSizes.includes(size);
                        return (
                          <button
                            key={size}
                            onClick={() => handleSizeToggle(size)}
                            className={`size-btn w-9 h-9 border text-xs font-normal flex items-center justify-center rounded-xs ${isSel
                                ? "ambient-green-gradient text-white border-transparent selected"
                                : "border-border/80 text-text-primary bg-white hover:border-text-primary"
                              }`}
                          >
                            {size}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Max Price Filter */}
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-primary">
                      Max Price
                    </h3>
                    <span className="text-xs font-medium text-text-primary">
                      ₹{maxPrice.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range" min="100" max="15000" step="100"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-[#00221A] h-1 cursor-pointer"
                  />
                </div>

                {/* Bottom Actions */}
                <div className="flex gap-3 pt-3 border-t border-border/70">
                  <button
                    onClick={resetFilters}
                    className="flex-1 py-2.5 border border-border/80 text-xs font-normal uppercase tracking-wider text-text-secondary hover:text-text-primary rounded-xs transition-colors"
                  >
                    Reset
                  </button>
                  <button
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="flex-1 py-2.5 bg-[#00221A] hover:bg-[#063A2C] text-white text-xs font-medium uppercase tracking-wider rounded-xs transition-colors shadow-xs"
                  >
                    Apply
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
