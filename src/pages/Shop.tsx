import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Heart, Loader2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import { getActiveProducts, getCategories, supabase } from '../lib/supabase';
import linenShirt from '../assets/product_linen_shirt.png';

export default function Shop() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const [heartId, setHeartId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';
  const activeGender = searchParams.get('gender') || 'all';
  const activeOccasion = searchParams.get('occasion') || 'all';

  const [dbProducts, setDbProducts] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const [occasionProducts, setOccasionProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [prodData, catData, occData] = await Promise.all([
          getActiveProducts(),
          getCategories(),
          supabase.from('occasion_products' as any).select('*')
        ]);
        setDbProducts(prodData || []);
        setDbCategories(catData || []);
        setOccasionProducts(occData.data || []);
      } catch (err) {
        console.warn('Shop load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const products = useMemo(() => dbProducts, [dbProducts]);
  const categories = useMemo(() => dbCategories, [dbCategories]);

  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(15000);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const sizesList = ['S', 'M', 'L', 'XL'];

  const handleCategoryChange = (slug: string) => {
    searchParams.delete('gender');
    slug === 'all' ? searchParams.delete('category') : searchParams.set('category', slug);
    setSearchParams(searchParams);
  };

  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]);
  };

  const resetFilters = () => {
    searchParams.delete('category');
    searchParams.delete('gender');
    searchParams.delete('occasion');
    setSearchParams(searchParams);
    setSelectedSizes([]);
    setMaxPrice(15000);
  };

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    setHeartId(id);
    setTimeout(() => setHeartId(null), 400);
  };

  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Filter by occasion if active
    if (activeOccasion !== 'all') {
      const occProductIds = occasionProducts
        .filter((op) => op.occasion.toLowerCase() === activeOccasion.toLowerCase())
        .map((op) => op.product_id);
      result = result.filter((p) => occProductIds.includes(p.id));
    }

    if (activeCategory !== 'all') {
      // Find category slug, with flexible fallbacks for specific category names
      let categoryObj = categories.find((c) => c.slug === activeCategory);
      if (!categoryObj) {
        if (activeCategory === 'trousers') {
          categoryObj = categories.find((c) => c.slug === 'pants');
        } else if (activeCategory === 'crop-tops') {
          categoryObj = categories.find((c) => c.slug === 'crop-top');
        } else if (activeCategory === 'tshirt-and-tops' || activeCategory === 'tshirt' || activeCategory === 'tshirts') {
          categoryObj = categories.find((c) => c.slug === 't-shirts');
        }
      }

      if (categoryObj) {
        result = result.filter((p) => {
          if (p.category_id === categoryObj.id) return true;
          const prodCat = categories.find((c) => c.id === p.category_id);
          return prodCat?.parent_category_id === categoryObj.id;
        });
      }
    }
    if (activeGender !== 'all') {
      result = result.filter((p) => {
        const prodCat = categories.find((c) => c.id === p.category_id);
        return prodCat?.name?.toLowerCase() === activeGender.toLowerCase();
      });
    }
    result = result.filter((p) => p.base_price <= maxPrice);
    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        p.product_variants?.some((v: any) => selectedSizes.includes(v.size) && v.stock_qty > 0)
      );
    }
    if (sortBy === 'price-asc') result.sort((a, b) => a.base_price - b.base_price);
    else if (sortBy === 'price-desc') result.sort((a, b) => b.base_price - a.base_price);
    else result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return result;
  }, [products, categories, activeCategory, activeGender, maxPrice, selectedSizes, sortBy]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-secondary mb-3" />
        <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold anim-fade-in">Loading Catalog</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen overflow-x-hidden">

      {/* Page Header */}
      <div className="border-b border-border pb-6 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent-gold font-bold">Zenphire Catalog</p>
          <h1 className="text-3xl font-heading font-medium uppercase mt-1">
            {activeOccasion !== 'all' ? activeOccasion.replace('-', ' ')
              : activeCategory !== 'all' ? activeCategory
                : activeGender !== 'all'
                  ? ({ male: 'Men', female: 'Women', unisex: 'Unisex' }[activeGender] ?? activeGender)
                  : 'Shop All'}
          </h1>
        </div>
        <p className="text-xs text-text-secondary">{filteredProducts.length} results</p>
      </div>

      {/* Control Bar */}
      <div className="flex justify-between items-center mb-8 border border-border px-3 py-2.5 bg-bg-subtle gap-2">
        {/* Filter icon button (mobile → opens sheet, desktop → shows reset if active) */}
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          title="Filters"
          className="relative btn-icon w-8 h-8 flex items-center justify-center rounded hover:bg-border transition-colors text-text-secondary hover:text-text-primary md:hidden"
        >
          <SlidersHorizontal size={15} />
          {(selectedSizes.length > 0 || activeCategory !== 'all') && (
            <span className="absolute -top-1 -right-1 bg-accent text-white text-[8px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full leading-none">
              {selectedSizes.length + (activeCategory !== 'all' ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Desktop: filter reset icon (only when filters active) */}
        <div className="hidden md:flex items-center">
          {(selectedSizes.length > 0 || activeCategory !== 'all' || maxPrice < 15000) ? (
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
            <div
              title="No filters active"
              className="w-8 h-8 flex items-center justify-center rounded text-text-secondary/40"
            >
              <SlidersHorizontal size={15} />
            </div>
          )}
        </div>

        {/* Sort — icon + native select, label hidden */}
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Collections</h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => handleCategoryChange('all')}
                    className={`nav-link text-sm tracking-wide ${activeCategory === 'all' ? 'font-bold text-text-primary' : 'text-text-secondary'}`}
                  >
                    All Collections
                  </button>
                </li>
                {categories.filter((c) => !c.parent_category_id).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => handleCategoryChange(c.slug)}
                      className={`nav-link text-sm tracking-wide capitalize ${activeCategory === c.slug ? 'font-bold text-text-primary' : 'text-text-secondary'}`}
                    >
                      {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-4 pb-2 border-b border-border">Size</h3>
            <div className="flex flex-wrap gap-2">
              {sizesList.map((size) => {
                const isSel = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeToggle(size)}
                    className={`size-btn w-10 h-10 border text-xs font-semibold flex items-center justify-center transition-all ${isSel ? 'ambient-green-gradient text-white border-transparent selected' : 'border-border text-text-primary bg-white hover:border-accent'
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
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-bg-subtle border border-border anim-fade-in">
              <p className="text-sm text-text-secondary mb-5">No products match the active filters.</p>
              <button onClick={resetFilters} className="btn btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest">
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-8 gap-x-4 md:gap-x-6 anim-stagger">
              {filteredProducts.map((product) => (
                <Link key={product.id} to={`/product/${product.slug}`} className="group product-card block">
                  <div className="w-full bg-bg-subtle overflow-hidden border border-border relative mb-3">
                    <img
                      src={product.product_images?.[0]?.url || linenShirt}
                      alt={product.name}
                      className="card-img w-full h-auto block relative z-10"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    {product.product_variants?.every((v: any) => v.stock_qty === 0) && (
                      <div className="absolute top-2 left-2 bg-sale text-white text-[9px] uppercase font-bold tracking-wider px-2 py-0.5">Sold Out</div>
                    )}
                    <div className="card-overlay absolute bottom-0 left-0 right-0 bg-white/90 py-2.5 px-4 flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-text-primary flex items-center gap-1">
                        <ShoppingBag size={10} /> Quick View
                      </span>
                      <ArrowRight size={11} className="text-text-secondary" />
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-2.5 right-2.5 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={13} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                    <h3 className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{product.name}</h3>
                    <p className="text-sm font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MOBILE FILTER BOTTOM SHEET */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div onClick={() => setIsMobileFilterOpen(false)} className="fixed inset-0 bg-black/40 lightbox-backdrop" />
          <div className="fixed bottom-0 left-0 right-0 max-h-[82vh] bg-white border-t border-border flex flex-col p-6 space-y-6 overflow-y-auto drawer-bottom shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-border">
              <h2 className="font-heading font-black text-base uppercase tracking-widest">Filters</h2>
              <button onClick={() => setIsMobileFilterOpen(false)} className="btn-icon p-1.5 hover:bg-bg-subtle rounded-full">
                <X size={18} />
              </button>
            </div>

            {categories.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3">Collections</h3>
                <div className="flex flex-wrap gap-2">
                  {['all', ...categories.filter((c) => !c.parent_category_id)].map((c: any) => {
                    const slug = typeof c === 'string' ? c : c.slug;
                    const label = typeof c === 'string' ? 'All' : c.name;
                    const isActive = activeCategory === slug;
                    return (
                      <button
                        key={slug}
                        onClick={() => handleCategoryChange(slug)}
                        className={`btn px-4 py-2 border text-[10px] font-semibold uppercase tracking-wider ${isActive ? 'filter-chip-active bg-white' : 'border-border bg-white text-text-primary hover:border-accent'
                          }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3">Size</h3>
              <div className="flex gap-2">
                {sizesList.map((size) => {
                  const isSel = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`size-btn w-10 h-10 border text-xs font-semibold flex items-center justify-center transition-all ${isSel ? 'ambient-green-gradient text-white border-transparent selected' : 'border-border text-text-primary bg-white hover:border-accent'
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
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Max Price</h3>
                <span className="text-xs font-bold text-text-primary">₹{maxPrice.toLocaleString()}</span>
              </div>
              <input type="range" min="100" max="15000" step="100" value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-accent h-1 cursor-pointer"
              />
            </div>

            <div className="flex gap-3 pt-3 border-t border-border">
              <button onClick={resetFilters} className="btn flex-1 py-3 border border-border text-[10px] font-bold uppercase tracking-widest hover:bg-bg-subtle">
                Reset
              </button>
              <button onClick={() => setIsMobileFilterOpen(false)} className="btn btn-primary flex-1 py-3 text-[10px] font-bold uppercase tracking-widest">
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
