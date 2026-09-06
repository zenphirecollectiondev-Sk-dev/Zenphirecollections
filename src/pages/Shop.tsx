import { useState, useMemo, useEffect } from "react";
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

// --- Image card with proper loading / error states ---------------------------

type ImgState = "loading" | "loaded" | "error";

function ProductImage({
  src,
  alt,
  lazy,
}: {
  src: string | null;
  alt: string;
  lazy: boolean;
}) {
  const [imgState, setImgState] = useState<ImgState>(src ? "loading" : "error");

  // Reset when src changes (e.g. navigating between categories)
  useEffect(() => {
    setImgState(src ? "loading" : "error");
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
          src={src}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          onLoad={() => setImgState("loaded")}
          onError={() => setImgState("error")}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imgState === "loaded" ? "opacity-100" : "opacity-0"
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
        className="btn flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors"
      >
        <ChevronLeft size={13} />
        Previous
      </button>
      <span className="text-xs text-text-secondary font-medium">
        Page {page + 1}
      </span>
      <button
        onClick={onNext}
        disabled={!hasMore}
        className="btn flex items-center gap-1.5 px-4 py-2 border border-border text-xs font-semibold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-bg-subtle transition-colors"
      >
        Next
        <ChevronRight size={13} />
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

  // -- Categories (lightweight — fetched once, cached) -----------------------
  // ⚠️ CRITICAL: lazy initializer reads from dataCache synchronously on first render.
  // This ensures activeCategoryId is non-null from frame 0 when the cache is warm
  // (e.g. user came from Home page). Without this, categories=[] on first render
  // resolves every slug to null — causing the hook to fetch ALL products, then
  // show "no products found" when filtered client-side by the selected category.
  const [dbCategories, setDbCategories] = useState<any[]>(
    () => dataCache.get<any[]>('categories') ?? []
  );

  // Track whether categories have been loaded (either from cache or network)
  // so we don't resolve activeCategoryId before we have the data.
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

  // Reset to page 0 whenever the category filter changes
  useEffect(() => {
    setPage(0);
  }, [activeCategoryIds, activeOccasion]);

  // -- Data from hook (TanStack Query) --------------------------------------
  const queryState = useCategoryProducts({
    categoryIds: activeCategoryIds,
    productIds: occasionProductIds,
    page,
  });
  const filteredProducts = useMemo((): GridProduct[] => {
    if (queryState.status !== "success") return [];
    let result = [...queryState.products];

    // Gender filtering is now handled in activeCategoryIds based on category hierarchy.
    // The previous implementation ignored it, but now we properly restrict to gender subcategories.

    result = result.filter((p) => p.base_price <= maxPrice);
    if (selectedSizes.length > 0) {
      // Size filter not applicable at grid level (we only fetch stock_qty).
      // Keep all products — size filter is advisory only without per-variant sizes fetched.
    }
    if (sortBy === "price-asc") result.sort((a, b) => a.base_price - b.base_price);
    else if (sortBy === "price-desc") result.sort((a, b) => b.base_price - a.base_price);
    return result;
  }, [queryState, maxPrice, sortBy, selectedSizes]);

  // -- Sane page title -------------------------------------------------------
  const pageTitle =
    activeCategory !== "all"
      ? activeCategory.replace(/-/g, " ")
      : activeGender !== "all"
        ? { male: "Men", female: "Women", unisex: "Unisex" }[activeGender] ?? activeGender
        : "Shop All";

  // -- Handlers --------------------------------------------------------------
  const handleCategoryChange = (slug: string) => {
    searchParams.delete("gender");
    slug === "all" ? searchParams.delete("category") : searchParams.set("category", slug);
    setSearchParams(searchParams);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const resetFilters = () => {
    searchParams.delete("category");
    searchParams.delete("gender");
    setSearchParams(searchParams);
    setSelectedSizes([]);
    setMaxPrice(15000);
    setPage(0);
  };

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    setHeartId(id);
    setTimeout(() => setHeartId(null), 400);
  };

  const sizesList = ["S", "M", "L", "XL", "28", "30", "32", "34", "36", "38"];

  const resultCount =
    queryState.status === "success" ? filteredProducts.length : null;
  const hasMore =
    queryState.status === "success" && queryState.totalFetched === PAGE_SIZE;

  // -- Render ----------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen overflow-x-hidden">

      {/* Page Header */}
      <div className="border-b border-border pb-6 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent-gold font-bold">
            Zenphire Catalog
          </p>
          <h1 className="text-3xl font-heading font-medium uppercase mt-1 capitalize">
            {pageTitle}
          </h1>
        </div>
        {resultCount !== null && (
          <p className="text-xs text-text-secondary">{resultCount} results</p>
        )}
      </div>

      {/* Control Bar */}
      <div className="flex justify-between items-center mb-8 border border-border px-3 py-2.5 bg-bg-subtle gap-2">
        {/* Mobile filter button */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          title="Filters"
          className="relative btn-icon w-8 h-8 flex items-center justify-center rounded hover:bg-border transition-colors text-text-secondary hover:text-text-primary md:hidden"
        >
          <SlidersHorizontal size={15} />
          {(selectedSizes.length > 0 || activeCategory !== "all") && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full leading-none">
              {selectedSizes.length + (activeCategory !== "all" ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Desktop: filter reset */}
        <div className="hidden md:flex items-center">
          {(selectedSizes.length > 0 || activeCategory !== "all" || maxPrice < 15000) ? (
            <button
              onClick={resetFilters}
              title="Reset filters"
              className="relative btn-icon w-8 h-8 flex items-center justify-center rounded hover:bg-border transition-colors text-sale"
            >
              <SlidersHorizontal size={15} />
              <span className="absolute -top-1 -right-1 bg-sale text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full leading-none">
                <X size={8} strokeWidth={3} />
              </span>
            </button>
          ) : (
            <div title="No filters active" className="w-8 h-8 flex items-center justify-center rounded text-text-secondary/40">
              <SlidersHorizontal size={15} />
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="relative">
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              title="Sort"
              className="appearance-none bg-transparent border-none text-[10px] uppercase tracking-wider font-semibold py-1.5 pl-0 pr-6 focus:outline-none cursor-pointer text-text-secondary hover:text-text-primary transition-colors duration-150"
            >
              <option value="newest">New Arrivals</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
            <ChevronDown size={11} className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
          </div>
        </div>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-10">

        {/* DESKTOP SIDEBAR */}
        <aside className="w-56 flex-shrink-0 hidden md:block space-y-8">
          {categories.length > 0 && (
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">
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
                {categories.filter((c) => !c.parent_category_id).map((c) => (
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
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">
              Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {sizesList.map((size) => {
                const isSel = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeToggle(size)}
                    className={`size-btn w-10 h-10 border text-xs font-semibold flex items-center justify-center transition-all ${isSel
                        ? "ambient-green-gradient text-white border-transparent selected"
                        : "border-border text-text-primary bg-white hover:border-accent"
                      }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
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

          {/* Loading � genuine first fetch */}
          {queryState.status === "loading" && (
            <SkeletonGrid count={PAGE_SIZE} />
          )}

          {/* Slow network � skeleton + banner */}
          {queryState.status === "slow" && (
            <>
              <div className="flex items-center gap-2 text-xs text-text-secondary bg-bg-subtle border border-border px-4 py-3 mb-6 rounded-sm anim-fade-in">
                <WifiOff size={13} className="shrink-0 text-text-secondary/60" />
                <span>Still loading � your connection seems slow. Hang tight�</span>
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
                activeCategory !== "all"
                  ? { label: "Browse all", onClick: resetFilters }
                  : undefined
              }
            />
          )}

          {/* Success */}
          {queryState.status === "success" && filteredProducts.length === 0 && (
            <EmptyState
              title="No products match"
              message="No products match your current filters."
              action={{ label: "Clear filters", onClick: resetFilters }}
            />
          )}

          {queryState.status === "success" && filteredProducts.length > 0 && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4 md:gap-x-6 anim-stagger">
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
                        lazy={idx >= 4}
                      />
                      {/* Hover accent line */}
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left z-10" />
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
                        className={`wishlist-btn absolute top-2.5 right-2.5 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? "anim-heart-pop" : ""
                          }`}
                      >
                        <Heart
                          size={13}
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
                      <h3 className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm font-semibold text-text-primary">
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

      {/* MOBILE FILTER BOTTOM SHEET */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/40 lightbox-backdrop"
          />
          <div className="fixed bottom-0 left-0 right-0 max-h-[82vh] bg-white border-t border-border flex flex-col p-6 space-y-6 overflow-y-auto drawer-bottom shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h2 className="font-heading font-black text-base uppercase tracking-widest">
                Filters
              </h2>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn-icon p-1.5 hover:bg-bg-subtle rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {categories.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3">
                  Collections
                </h3>
                <div className="flex flex-wrap gap-2">
                  {["all", ...categories.filter((c) => !c.parent_category_id)].map(
                    (c: any) => {
                      const slug = typeof c === "string" ? c : c.slug;
                      const label = typeof c === "string" ? "All" : c.name;
                      const isActive = activeCategory === slug;
                      return (
                        <button
                          key={slug}
                          onClick={() => handleCategoryChange(slug)}
                          className={`btn px-4 py-2 border text-[10px] font-semibold uppercase tracking-wider ${isActive
                              ? "filter-chip-active bg-white"
                              : "border-border bg-white text-text-primary hover:border-accent"
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

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3">
                Size
              </h3>
              <div className="flex flex-wrap gap-2">
                {sizesList.map((size) => {
                  const isSel = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`size-btn w-10 h-10 border text-xs font-semibold flex items-center justify-center transition-all ${isSel
                          ? "ambient-green-gradient text-white border-transparent selected"
                          : "border-border text-text-primary bg-white hover:border-accent"
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary">
                  Max Price
                </h3>
                <span className="text-xs font-bold text-text-primary">
                  ₹{maxPrice.toLocaleString()}
                </span>
              </div>
              <input
                type="range" min="100" max="15000" step="100"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-accent h-1 cursor-pointer"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-border">
              <button
                onClick={resetFilters}
                className="btn flex-1 py-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-bg-subtle"
              >
                Reset
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="btn btn-primary flex-1 py-3 text-[10px] font-bold uppercase tracking-widest"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
