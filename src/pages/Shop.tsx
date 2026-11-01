import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import {
  SlidersHorizontal, X, ChevronDown, Heart,
  ChevronLeft, ChevronRight, WifiOff,
  LayoutGrid, LayoutList,
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
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { DUR, EASE, EASE_ENTER } from "../lib/motion";
import { usePageSEO } from "../hooks/usePageSEO";

// Standard order for sorting size labels
const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "28", "30", "32", "34", "36", "38", "40", "42"];

// --- Image card with proper loading / error states ---------------------------

type ImgState = "loading" | "loaded" | "error";

function ProductImage({
  src,
  hoverSrc,
  alt,
  lazy,
  priority,
}: {
  src: string | null;
  hoverSrc?: string | null;
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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-neutral-100">
      {/* Skeleton shown until image loads */}
      {imgState === "loading" && (
        <div
          className="absolute inset-0 animate-pulse bg-neutral-100"
          aria-hidden="true"
        />
      )}

      {/* Brand-colored fallback — shown when src is null OR onError fires */}
      {imgState === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-100 gap-2">
          {/* Minimal brand placeholder — geometric diamond motif */}
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
          <span className="text-[10px] uppercase tracking-widest text-text-secondary/50 font-bold">
            Zenphire
          </span>
        </div>
      )}

      {/* Primary Image */}
      {src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          width={600}
          height={800}
          {...(priority ? { fetchPriority: "high" as any } : {})}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("error")}
          className={`card-img absolute inset-0 w-full h-full object-cover object-top transition-transform duration-500 ease-out [@media(hover:hover)]:group-hover:scale-105 ${
            imgState === "loaded" ? "opacity-100" : "opacity-0"
          } ${hoverSrc ? "[@media(hover:hover)]:group-hover:opacity-0" : ""}`}
        />
      )}

      {/* Secondary Hover Image (Fashion Lookbook Angle) */}
      {hoverSrc && (
        <img
          src={hoverSrc}
          alt={`${alt} alternate angle`}
          loading="lazy"
          decoding="async"
          width={600}
          height={800}
          className="absolute inset-0 w-full h-full object-cover object-top opacity-0 transition-all duration-500 ease-out [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-hover:scale-105 pointer-events-none"
        />
      )}
    </div>
  );
}

// --- Skeleton grid / list -----------------------------------------------------

function SkeletonGrid({
  count,
  gridClass,
  viewMode = "grid",
}: {
  count: number;
  gridClass?: string;
  viewMode?: "grid" | "list";
}) {
  return (
    <div
      className={
        gridClass ||
        (viewMode === "list"
          ? "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 w-full min-w-0"
          : "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:gap-x-6 lg:gap-y-12 items-start w-full min-w-0")
      }
    >
      <ProductCardSkeleton count={count} viewMode={viewMode} />
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
        aria-label="Previous page"
        className="h-11 min-w-[120px] px-5 border border-border rounded-md text-xs font-semibold uppercase tracking-wider text-text-primary bg-white hover:bg-neutral-50 hover:border-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
      >
        <ChevronLeft size={16} />
        <span>Previous</span>
      </button>
      <span className="text-xs sm:text-sm text-text-secondary font-medium px-2">
        Page {page + 1}
      </span>
      <button
        onClick={onNext}
        disabled={!hasMore}
        aria-label="Next page"
        className="h-11 min-w-[120px] px-5 border border-border rounded-md text-xs font-semibold uppercase tracking-wider text-text-primary bg-white hover:bg-neutral-50 hover:border-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
      >
        <span>Next</span>
        <ChevronRight size={16} />
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

  // -- Client-side filter & layout state -------------------------------------
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [userMaxPrice, setUserMaxPrice] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [showDesktopFilters, setShowDesktopFilters] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("zenphire_shop_view_mode");
      if (saved === "grid" || saved === "list") return saved as "grid" | "list";
    }
    return "grid";
  });
  const [page, setPage] = useState(0);

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("zenphire_shop_view_mode", mode);
    }
  };

  const shouldReduceMotion = useReducedMotion();

  // Dynamic grid / list layout classes
  const containerColsClass = useMemo(() => {
    if (viewMode === "list") {
      return "grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 lg:gap-6 w-full min-w-0";
    }
    return "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-x-4 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:gap-x-6 lg:gap-y-12 items-start w-full min-w-0";
  }, [viewMode]);


  // -- Dynamic Product Filters (configured in Admin) -------------------------
  const [allProductFilters, setAllProductFilters] = useState<any[]>([]);
  const [selectedDynamicFilters, setSelectedDynamicFilters] = useState<Record<string, string[]>>({});
  const [productFilterValues, setProductFilterValues] = useState<Record<string, string[]>>({});

  // 1. Fetch active product filters on mount
  useEffect(() => {
    (supabase as any)
      .from('product_filters')
      .select(`
        id,
        name,
        slug,
        filter_type,
        gender_scope,
        is_active,
        sort_order,
        filter_options ( id, filter_id, value, sort_order ),
        filter_category_scope ( category_id )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }: any) => {
        if (!error && data) {
          setAllProductFilters(data);
        }
      })
      .catch((err: any) => console.warn('Product filters not loaded yet:', err));
  }, []);

  // 2. Filter visible dynamic filters based on active category & active gender
  const visibleDynamicFilters = useMemo(() => {
    if (allProductFilters.length === 0) return [];

    let currentCatId: string | null = null;
    if (activeCategory !== 'all') {
      const match = categories.find((c: any) => c.slug === activeCategory || c.name?.toLowerCase() === activeCategory.toLowerCase());
      if (match) currentCatId = match.id;
    }

    return allProductFilters.filter((filter) => {
      // 1. Gender scope check
      if (activeGender !== 'all') {
        const targetGender = activeGender.toLowerCase();
        const gScope = filter.gender_scope || [];
        if (gScope.length > 0 && !gScope.map((g: string) => g.toLowerCase()).includes(targetGender)) {
          return false;
        }
      }

      // 2. Category scope check
      const scopes = filter.filter_category_scope || [];
      if (scopes.length === 0) return true;
      if (!currentCatId) return true;
      const scopeIds = new Set(scopes.map((s: any) => s.category_id));
      if (scopeIds.has(currentCatId)) return true;
      const familyIds = categories.filter((c: any) => c.parent_category_id === currentCatId).map((c: any) => c.id);
      return familyIds.some(fid => scopeIds.has(fid));
    });
  }, [allProductFilters, activeCategory, activeGender, categories]);

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

  // Dynamically derive ceiling price from products currently listing in the shop page
  const ceilingPrice = useMemo(() => {
    if (queryState.status !== "success" || queryState.products.length === 0) return 15000;
    const highest = Math.max(...queryState.products.map(p => Number(p.base_price) || 0));
    if (highest <= 0) return 5000;
    return Math.ceil(highest / 100) * 100;
  }, [queryState]);

  // Dynamically derive floor price from products currently listing
  const floorPrice = useMemo(() => {
    if (queryState.status !== "success" || queryState.products.length === 0) return 0;
    const lowest = Math.min(...queryState.products.map(p => Number(p.base_price) || 0));
    const floored = Math.floor(lowest / 100) * 100;
    return floored < ceilingPrice ? Math.max(0, floored) : 0;
  }, [queryState, ceilingPrice]);

  // If user hasn't adjusted the slider, default to the ceiling price of listed products
  const maxPrice = useMemo(() => {
    if (userMaxPrice === null) return ceilingPrice;
    return Math.min(userMaxPrice, ceilingPrice);
  }, [userMaxPrice, ceilingPrice]);

  const setMaxPrice = (price: number) => {
    setUserMaxPrice(price);
  };

  // 3. Fetch product filter assignments whenever queryState changes
  useEffect(() => {
    if (queryState.status !== 'success') {
      setProductFilterValues({});
      return;
    }
    const products = queryState.products;
    if (products.length === 0) {
      setProductFilterValues({});
      return;
    }
    const pids = products.map(p => p.id);
    (supabase as any)
      .from('product_filter_values')
      .select('product_id, filter_option_id')
      .in('product_id', pids)
      .then(({ data, error }: any) => {
        if (!error && data) {
          const map: Record<string, string[]> = {};
          data.forEach((row: any) => {
            if (!map[row.product_id]) map[row.product_id] = [];
            map[row.product_id].push(row.filter_option_id);
          });
          setProductFilterValues(map);
        }
      })
      .catch((err: any) => console.warn('Product filter values error:', err));
  }, [queryState]);

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
    // Dynamic DB filters filtering
    Object.entries(selectedDynamicFilters).forEach(([_, optIds]) => {
      if (optIds.length > 0) {
        result = result.filter(p => {
          const assigned = productFilterValues[p.id] || [];
          return optIds.some(id => assigned.includes(id));
        });
      }
    });
    if (sortBy === "price-asc") result.sort((a, b) => a.base_price - b.base_price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.base_price - a.base_price);
    return result;
  }, [queryState, maxPrice, sortBy, selectedSizes, selectedDynamicFilters, productFilterValues]);

  // -- Sane page title -------------------------------------------------------
  const pageTitle = shopTitle;

  // -- Handlers --------------------------------------------------------------
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

  const handleDynamicFilterToggle = (filterId: string, optionId: string) => {
    setSelectedDynamicFilters(prev => {
      const current = prev[filterId] || [];
      const updated = current.includes(optionId)
        ? current.filter(id => id !== optionId)
        : [...current, optionId];
      if (updated.length === 0) {
        const copy = { ...prev };
        delete copy[filterId];
        return copy;
      }
      return { ...prev, [filterId]: updated };
    });
  };

  const resetFilters = () => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("category");
    newParams.delete("gender");
    newParams.delete("occasion");
    setSearchParams(newParams);
    setSelectedSizes([]);
    setSelectedDynamicFilters({});
    setUserMaxPrice(null);
    setSortBy("newest");
    setPage(0);
  };

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    setHeartId(id);
    setTimeout(() => setHeartId(null), 400);
  };


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

  const dynamicFilterCount = Object.values(selectedDynamicFilters).reduce((acc, list) => acc + list.length, 0);

  const isPriceFiltered = userMaxPrice !== null && userMaxPrice < ceilingPrice;

  const activeFilterCount =
    (selectedSizes.length > 0 ? selectedSizes.length : 0) +
    (activeCategory !== "all" ? 1 : 0) +
    (activeGender !== "all" ? 1 : 0) +
    (isPriceFiltered ? 1 : 0) +
    dynamicFilterCount;

  const resultCount =
    queryState.status === "success" ? filteredProducts.length : null;
  const hasMore =
    queryState.status === "success" && queryState.totalFetched === PAGE_SIZE;

  // -- Render ----------------------------------------------------------------
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 flex-1 flex flex-col w-full min-w-0">

      {/* Page Header */}
      <div className="border-b border-border pb-4 mb-6 sm:pb-5 sm:mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 sm:gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#B8975A] font-semibold">
            Zenphire
          </p>
          <h1 className="text-2xl sm:text-3xl font-heading font-medium tracking-wide text-text-primary mt-1">
            {pageTitle}
          </h1>
        </div>
        {resultCount !== null && (
          <p className="text-xs sm:text-sm text-text-secondary font-normal">
            {resultCount} {resultCount === 1 ? "result" : "results"}
          </p>
        )}
      </div>

      {/* Control Bar (Sticky & always accessible) */}
      <div className="sticky top-16 z-30 mb-8 border border-border/80 px-3 py-2 sm:px-4 sm:py-2.5 bg-white/95 backdrop-blur-md shadow-xs rounded-md">

        {/* ── Mobile bar (< md) ─────────────────────────────────── */}
        <div className="flex items-center gap-2 w-full md:hidden">
          {/* Filter pill */}
          <button
            onClick={() => setIsMobileFilterOpen(true)}
            aria-label="Open filters"
            className={`h-9 flex items-center gap-1.5 px-3 border rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
              activeFilterCount > 0
                ? "border-text-primary bg-text-primary text-white"
                : "border-border text-text-secondary bg-white"
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="bg-white text-text-primary text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort — takes remaining space */}
          <div className="relative flex-1 h-9">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort products"
              className="h-9 w-full appearance-none bg-white border border-border rounded-full text-xs font-medium pl-3 pr-7 focus:outline-none focus:border-text-primary cursor-pointer text-text-secondary transition-all"
            >
              <option value="newest">New Arrivals</option>
              <option value="price-asc">Price: Low–High</option>
              <option value="price-desc">Price: High–Low</option>
            </select>
            <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" aria-hidden="true" />
          </div>

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-full p-0.5 bg-neutral-50 shrink-0">
            <button
              onClick={() => handleViewModeChange("grid")}
              aria-label="Grid view"
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${viewMode === "grid" ? "bg-white text-text-primary shadow-xs" : "text-text-secondary"}`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              onClick={() => handleViewModeChange("list")}
              aria-label="List view"
              className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${viewMode === "list" ? "bg-white text-text-primary shadow-xs" : "text-text-secondary"}`}
            >
              <LayoutList size={14} />
            </button>
          </div>
        </div>

        {/* ── Desktop bar (≥ md) ────────────────────────────────── */}
        <div className="hidden md:flex items-center justify-between gap-3 w-full">
          {/* Left: Filter toggle + Reset */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDesktopFilters((prev) => !prev)}
              aria-label={showDesktopFilters ? "Hide Filter Sidebar" : "Show Filter Sidebar"}
              className={`h-9 flex items-center gap-1.5 px-3 border rounded-full text-xs font-medium transition-all cursor-pointer ${
                showDesktopFilters
                  ? "border-text-primary bg-text-primary text-white"
                  : "border-border text-text-secondary hover:border-text-primary hover:text-text-primary bg-white"
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className={`text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center leading-none ${showDesktopFilters ? "bg-white text-text-primary" : "bg-text-primary text-white"}`}>
                  {activeFilterCount}
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                aria-label="Reset all filters"
                className="h-9 flex items-center gap-1 px-3 text-xs font-medium text-text-secondary border border-border/80 rounded-full bg-white hover:border-text-primary hover:text-text-primary transition-all cursor-pointer"
              >
                <X size={11} strokeWidth={2.5} />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Right: View toggle + Sort */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-border rounded-full p-0.5 bg-neutral-50">
              <button
                onClick={() => handleViewModeChange("grid")}
                aria-label="Grid view"
                title="Grid view"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${viewMode === "grid" ? "bg-white text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => handleViewModeChange("list")}
                aria-label="List view"
                title="List view"
                className={`h-8 w-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${viewMode === "list" ? "bg-white text-text-primary shadow-xs" : "text-text-secondary hover:text-text-primary"}`}
              >
                <LayoutList size={14} />
              </button>
            </div>

            <div className="relative h-9">
              <select
                id="sortBy"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
                className="h-9 appearance-none bg-white border border-border rounded-full text-xs font-medium pl-3 pr-7 focus:outline-none focus:border-text-primary cursor-pointer text-text-secondary hover:border-text-primary hover:text-text-primary transition-all"
              >
                <option value="newest">New Arrivals</option>
                <option value="price-asc">Price: Low–High</option>
                <option value="price-desc">Price: High–Low</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" aria-hidden="true" />
            </div>
          </div>
        </div>

      </div>

      {/* Layout: sidebar + grid */}
      <div className="w-full md:flex md:gap-8 lg:gap-12 items-start">

        {/* DESKTOP SIDEBAR */}
        {showDesktopFilters && (
          <aside className="w-60 flex-shrink-0 hidden md:block space-y-8 sticky top-36">
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-all duration-150 ${isActive
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

          {/* Dynamic Category-Scoped Filters (Fit, Fabric, Pattern, etc.) */}
          {visibleDynamicFilters.map((filter) => {
            const options = (filter.filter_options || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
            if (options.length === 0) return null;
            const selected = selectedDynamicFilters[filter.id] || [];
            return (
              <div key={filter.id}>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3 pb-2 border-b border-border flex items-center justify-between">
                  <span>{filter.name}</span>
                  {selected.length > 0 && (
                    <button
                      onClick={() => setSelectedDynamicFilters(prev => {
                        const next = { ...prev };
                        delete next[filter.id];
                        return next;
                      })}
                      className="text-[9px] font-bold text-text-secondary hover:text-sale transition-colors duration-150 uppercase tracking-widest"
                    >
                      Clear
                    </button>
                  )}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((opt: any) => {
                    const isSel = selected.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleDynamicFilterToggle(filter.id, opt.id)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-xs border transition-all duration-150 ${isSel
                          ? "bg-text-primary text-white border-text-primary shadow-xs"
                          : "border-border text-text-secondary hover:text-text-primary hover:border-accent bg-white"
                          }`}
                      >
                        {opt.value}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

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
                {[1, 2, 3, 4].map(i => (
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
              type="range"
              min={floorPrice}
              max={ceilingPrice}
              step={ceilingPrice - floorPrice > 2000 ? 100 : 50}
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-accent h-1 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-text-secondary mt-1.5 font-mono">
              <span>₹{floorPrice.toLocaleString()}</span>
              <span>₹{ceilingPrice.toLocaleString()}</span>
            </div>
          </div>
        </aside>
      )}

        {/* PRODUCT GRID */}
        <main className="flex-1 min-w-0 flex flex-col">

          {/* -- State machine rendering ----------------------------------- */}

          {/* Loading ─ genuine first fetch */}
          {queryState.status === "loading" && (
            <SkeletonGrid count={PAGE_SIZE} gridClass={containerColsClass} viewMode={viewMode} />
          )}

          {/* Slow network ─ skeleton + banner */}
          {queryState.status === "slow" && (
            <>
              <div className="flex items-center gap-2 text-xs text-text-secondary bg-bg-subtle border border-border px-4 py-3 mb-6 rounded-sm anim-fade-in">
                <WifiOff size={13} className="shrink-0 text-text-secondary/60" />
                <span>Still loading ─ your connection seems slow. Hang tight…</span>
              </div>
              <SkeletonGrid count={PAGE_SIZE} gridClass={containerColsClass} viewMode={viewMode} />
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
                activeCategory !== "all" || selectedSizes.length > 0 || isPriceFiltered
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
              <div className={containerColsClass}>
                {filteredProducts.map((product, idx) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={
                      shouldReduceMotion
                        ? { duration: 0 }
                        : {
                            duration: 0.3,
                            delay: Math.min(idx, 6) * 0.05,
                            ease: [0.4, 0, 0.2, 1],
                          }
                    }
                    className="w-full min-w-0"
                  >
                    {viewMode === "grid" ? (
                      <Link
                        to={`/product/${product.slug}`}
                        className="group product-card flex flex-col h-full w-full min-w-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8975A] focus-visible:ring-offset-2"
                      >
                        {/* Image — large aspect, no border-radius corner clip */}
                        <div className="relative w-full overflow-hidden rounded-lg bg-neutral-100">
                          <div className="aspect-[3/4] w-full">
                            <ProductImage
                              src={imgCard(product.coverImageUrl)}
                              hoverSrc={product.hoverImageUrl ? imgCard(product.hoverImageUrl) : null}
                              alt={product.name}
                              lazy={idx >= 6}
                              priority={idx < 4}
                            />
                          </div>

                          {/* Sold-out badge */}
                          {!product.inStock && (
                            <div className="absolute top-3 left-3 bg-[#00221A] text-white text-[10px] uppercase font-semibold tracking-wider px-2.5 py-1 rounded-sm shadow-xs z-10">
                              Sold Out
                            </div>
                          )}

                          {/* Wishlist button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWishlist(product.id);
                            }}
                            aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                            className={`wishlist-btn absolute top-3 right-3 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-border/50 rounded-full z-10 shadow-sm hover:bg-white active:scale-95 transition-all cursor-pointer ${heartId === product.id ? "anim-heart-pop" : ""}`}
                          >
                            <Heart
                              size={15}
                              className={isWishlisted(product.id) ? "fill-sale stroke-sale" : "stroke-text-primary/70 hover:stroke-text-primary"}
                            />
                          </button>
                        </div>

                        {/* Text block — name + price, clean and readable */}
                        <div className="pt-3.5 pb-1 flex flex-col gap-1 min-w-0 w-full">
                          <h2 className="font-sans text-sm sm:text-[15px] font-medium text-text-primary line-clamp-1 group-hover:text-[#B8975A] transition-colors leading-snug">
                            {product.name}
                          </h2>
                          <p className="font-sans text-sm sm:text-base font-semibold text-text-primary">
                            ₹{Number(product.base_price || 0).toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <Link
                        to={`/product/${product.slug}`}
                        className="group product-card flex flex-col w-full min-w-0 cursor-pointer rounded-xl overflow-hidden border border-border/60 bg-white hover:border-text-primary/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B8975A] focus-visible:ring-offset-2"
                      >
                        {/* List Image — tall/large, fills the card top */}
                        <div className="relative w-full overflow-hidden bg-neutral-100">
                          <div className="aspect-[3/4] sm:aspect-[4/5] w-full">
                            <ProductImage
                              src={imgCard(product.coverImageUrl)}
                              hoverSrc={product.hoverImageUrl ? imgCard(product.hoverImageUrl) : null}
                              alt={product.name}
                              lazy={idx >= 6}
                              priority={idx < 4}
                            />
                          </div>

                          {/* Sold Out badge */}
                          {!product.inStock && (
                            <div className="absolute top-3 left-3 bg-[#00221A] text-white text-[10px] uppercase font-semibold tracking-wider px-2.5 py-1 rounded-sm shadow-xs z-10">
                              Sold Out
                            </div>
                          )}

                          {/* Wishlist */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleWishlist(product.id);
                            }}
                            aria-label={isWishlisted(product.id) ? "Remove from wishlist" : "Add to wishlist"}
                            className={`wishlist-btn absolute top-3 right-3 w-9 h-9 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-border/60 rounded-full z-10 shadow-sm hover:bg-white active:scale-95 transition-all cursor-pointer ${heartId === product.id ? "anim-heart-pop" : ""}`}
                          >
                            <Heart
                              size={15}
                              className={isWishlisted(product.id) ? "fill-sale stroke-sale" : "stroke-text-primary/70 hover:stroke-text-primary"}
                            />
                          </button>
                        </div>

                        {/* Info below image */}
                        <div className="px-4 pt-3.5 pb-4 flex flex-col gap-1">
                          <h2 className="font-sans text-sm sm:text-[15px] font-medium text-text-primary line-clamp-2 group-hover:text-[#B8975A] transition-colors leading-snug">
                            {product.name}
                          </h2>
                          <p className="font-sans text-sm sm:text-base font-semibold text-text-primary">
                            ₹{Number(product.base_price || 0).toFixed(2)}
                          </p>
                          {product.availableSizes && product.availableSizes.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-1">
                              {product.availableSizes.slice(0, 5).map((s) => (
                                <span key={s} className="px-1.5 py-0.5 text-[11px] font-medium border border-border/80 rounded-sm bg-neutral-50 text-text-secondary">
                                  {s}
                                </span>
                              ))}
                              {product.availableSizes.length > 5 && (
                                <span className="text-[11px] text-text-secondary">+{product.availableSizes.length - 5}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>
                    )}
                  </motion.div>
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
            <motion.div
              key="mobile-filter-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className="fixed inset-0 z-[200] md:hidden"
            >
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
                          className={`px-3 py-1.5 border text-xs font-normal rounded-xs transition-all ${isActive
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

                {/* Dynamic Category-Scoped Filters */}
                {visibleDynamicFilters.map((filter) => {
                  const options = (filter.filter_options || []).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
                  if (options.length === 0) return null;
                  const selected = selectedDynamicFilters[filter.id] || [];
                  return (
                    <div key={filter.id}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-semibold uppercase tracking-widest text-text-primary">
                          {filter.name}
                        </h3>
                        {selected.length > 0 && (
                          <button
                            onClick={() => setSelectedDynamicFilters(prev => {
                              const next = { ...prev };
                              delete next[filter.id];
                              return next;
                            })}
                            className="text-[9px] font-semibold text-text-secondary hover:text-sale transition-colors uppercase tracking-widest"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {options.map((opt: any) => {
                          const isSel = selected.includes(opt.id);
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleDynamicFilterToggle(filter.id, opt.id)}
                              className={`px-3 py-1.5 border text-xs font-normal rounded-xs capitalize ${isSel
                                ? "filter-chip-active bg-white"
                                : "border-border/80 bg-white text-text-primary hover:border-text-primary"
                                }`}
                            >
                              {opt.value}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

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
                      {[1, 2, 3, 4].map(i => (
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
                    type="range"
                    min={floorPrice}
                    max={ceilingPrice}
                    step={ceilingPrice - floorPrice > 2000 ? 100 : 50}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                    className="w-full accent-[#00221A] h-1 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-text-secondary mt-1 font-mono">
                    <span>₹{floorPrice.toLocaleString()}</span>
                    <span>₹{ceilingPrice.toLocaleString()}</span>
                  </div>
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
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
