import { useState, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { SlidersHorizontal, X, ChevronDown, Heart } from 'lucide-react';
import { mockProducts, mockCategories } from '../lib/mockData';
import { useWishlistStore } from '../store/useWishlistStore';

export default function Shop() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get('category') || 'all';

  // Filters State
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number>(200);
  const [sortBy, setSortBy] = useState<string>('newest');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const sizesList = ['S', 'M', 'L', 'XL'];

  // Handle category change
  const handleCategoryChange = (slug: string) => {
    if (slug === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', slug);
    }
    setSearchParams(searchParams);
  };

  // Toggle size selection
  const handleSizeToggle = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  // Reset all filters
  const resetFilters = () => {
    searchParams.delete('category');
    setSearchParams(searchParams);
    setSelectedSizes([]);
    setMaxPrice(200);
  };

  // Filter and Sort Logic
  const filteredProducts = useMemo(() => {
    let result = [...mockProducts];

    // Filter by Category
    if (activeCategory !== 'all') {
      const categoryObj = mockCategories.find((c) => c.slug === activeCategory);
      if (categoryObj) {
        result = result.filter((p) => p.category_id === categoryObj.id);
      }
    }

    // Filter by Price
    result = result.filter((p) => p.base_price <= maxPrice);

    // Filter by Sizes
    if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        p.product_variants.some(
          (v) => selectedSizes.includes(v.size) && v.stock_qty > 0
        )
      );
    }

    // Sorting
    if (sortBy === 'price-asc') {
      result.sort((a, b) => a.base_price - b.base_price);
    } else if (sortBy === 'price-desc') {
      result.sort((a, b) => b.base_price - a.base_price);
    } else if (sortBy === 'newest') {
      // For mock data, larger product IDs or sequence represents newest
      result.sort((a, b) => b.id.localeCompare(a.id));
    }

    return result;
  }, [activeCategory, maxPrice, selectedSizes, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen">
      {/* Page Header */}
      <div className="border-b border-border pb-6 mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
            Zenphire Catalog
          </span>
          <h1 className="text-3xl font-heading font-black uppercase mt-1">
            {activeCategory === 'all' ? 'Shop All' : `${activeCategory} Collection`}
          </h1>
        </div>
        <p className="text-sm text-text-secondary">
          Showing {filteredProducts.length} results
        </p>
      </div>

      {/* Control Bar (Mobile toggle and Desktop sort dropdown) */}
      <div className="flex justify-between items-center mb-8 bg-bg-subtle border border-border p-4 md:py-3">
        <button
          onClick={() => setIsMobileFilterOpen(true)}
          className="flex items-center gap-2 text-sm uppercase tracking-wider font-semibold text-text-primary md:hidden"
        >
          <SlidersHorizontal size={16} />
          Filters {selectedSizes.length > 0 || activeCategory !== 'all' ? `(${1 + selectedSizes.length})` : ''}
        </button>

        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-text-secondary">
            Filter status:
          </span>
          {(selectedSizes.length > 0 || activeCategory !== 'all' || maxPrice < 200) ? (
            <button
              onClick={resetFilters}
              className="text-xs uppercase tracking-wider text-sale font-bold flex items-center gap-1 hover:underline"
            >
              Reset Filters <X size={12} />
            </button>
          ) : (
            <span className="text-xs text-text-secondary italic">None active</span>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 ml-auto">
          <label htmlFor="sortBy" className="text-xs uppercase tracking-wider text-text-secondary hidden sm:inline">
            Sort by:
          </label>
          <div className="relative">
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white border border-border text-xs uppercase tracking-wider font-semibold py-2 pl-4 pr-10 rounded-none focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="newest">New Arrivals</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-text-secondary" />
          </div>
        </div>
      </div>

      {/* Product list grid with filters sidebar */}
      <div className="flex gap-10">
        {/* DESKTOP SIDEBAR FILTER */}
        <aside className="w-64 flex-shrink-0 hidden md:block space-y-8">
          {/* Categories */}
          <div>
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-4 pb-2 border-b border-border">
              Collections
            </h3>
            <ul className="space-y-2">
              <li>
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`text-sm tracking-wide ${activeCategory === 'all' ? 'font-bold text-text-primary underline underline-offset-4' : 'text-text-secondary hover:text-text-primary'}`}
                >
                  All Collections
                </button>
              </li>
              {mockCategories.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handleCategoryChange(c.slug)}
                    className={`text-sm tracking-wide capitalize ${activeCategory === c.slug ? 'font-bold text-text-primary underline underline-offset-4' : 'text-text-secondary hover:text-text-primary'}`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Sizes */}
          <div>
            <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-4 pb-2 border-b border-border">
              Filter by Size
            </h3>
            <div className="flex flex-wrap gap-2">
              {sizesList.map((size) => {
                const isSelected = selectedSizes.includes(size);
                return (
                  <button
                    key={size}
                    onClick={() => handleSizeToggle(size)}
                    className={`w-10 h-10 border text-xs font-medium flex items-center justify-center transition-colors rounded-none ${
                      isSelected
                        ? 'bg-accent border-accent text-white font-bold'
                        : 'border-border text-text-primary bg-white hover:border-accent'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border w-full flex justify-between">
                <span>Max Price</span>
                <span className="text-text-secondary">${maxPrice}</span>
              </h3>
            </div>
            <input
              type="range"
              min="40"
              max="200"
              step="5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseInt(e.target.value))}
              className="w-full accent-accent bg-bg-subtle h-1.5 cursor-pointer"
            />
          </div>
        </aside>

        {/* MAIN PRODUCT GRID CONTAINER */}
        <main className="flex-1">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-bg-subtle border border-border">
              <p className="text-text-secondary font-medium mb-4">No products found matching active filters.</p>
              <button
                onClick={resetFilters}
                className="bg-accent text-white px-6 py-2.5 text-xs font-medium uppercase tracking-wider hover:bg-accent-hover transition-colors"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-10 gap-x-4 md:gap-8">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group"
                >
                  <div className="aspect-[3/4] bg-bg-subtle overflow-hidden border border-border relative mb-4">
                    <img
                      src={product.product_images[0]?.url}
                      alt={product.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    {product.product_variants.every((v) => v.stock_qty === 0) && (
                      <div className="absolute top-2 left-2 bg-sale text-white text-[10px] uppercase font-bold tracking-wider px-2 py-1">
                        Sold Out
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleWishlist(product.id);
                      }}
                      aria-label="Toggle Wishlist"
                      className="absolute top-3 right-3 p-1.5 bg-white/80 hover:bg-white text-text-primary border border-border shadow-sm rounded-full transition-colors z-10"
                    >
                      <Heart
                        size={14}
                        className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'}
                      />
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                      Zenphire
                    </p>
                    <h3 className="text-sm font-medium text-text-primary group-hover:underline truncate">
                      {product.name}
                    </h3>
                    <p className="text-sm font-semibold text-text-primary">
                      ${product.base_price.toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* 5. MOBILE FILTER DRAWER BOTTOM SHEET */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setIsMobileFilterOpen(false)}
            className="fixed inset-0 bg-black/40 transition-opacity"
          ></div>

          {/* Drawer content */}
          <div className="fixed bottom-0 left-0 right-0 max-h-[85vh] bg-white border-t border-border flex flex-col p-6 space-y-6 overflow-y-auto animate-slide-up shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h2 className="font-heading font-black text-lg uppercase tracking-wider">
                Filters
              </h2>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="p-1 hover:bg-bg-subtle transition-colors rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Collections */}
            <div>
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-3">
                Collections
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCategoryChange('all')}
                  className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-colors ${
                    activeCategory === 'all'
                      ? 'bg-accent border-accent text-white'
                      : 'border-border bg-white text-text-primary hover:border-accent'
                  }`}
                >
                  All Collections
                </button>
                {mockCategories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleCategoryChange(c.slug)}
                    className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-colors ${
                      activeCategory === c.slug
                        ? 'bg-accent border-accent text-white'
                        : 'border-border bg-white text-text-primary hover:border-accent'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Sizes */}
            <div>
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-3">
                Sizes
              </h3>
              <div className="flex gap-2">
                {sizesList.map((size) => {
                  const isSelected = selectedSizes.includes(size);
                  return (
                    <button
                      key={size}
                      onClick={() => handleSizeToggle(size)}
                      className={`w-10 h-10 border text-xs font-medium flex items-center justify-center transition-colors rounded-none ${
                        isSelected
                          ? 'bg-accent border-accent text-white font-bold'
                          : 'border-border text-text-primary bg-white hover:border-accent'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Price */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                  Max Price
                </h3>
                <span className="text-xs font-bold text-text-primary">${maxPrice}</span>
              </div>
              <input
                type="range"
                min="40"
                max="200"
                step="5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                className="w-full accent-accent bg-bg-subtle h-1.5 cursor-pointer"
              />
            </div>

            {/* Mobile Action Buttons */}
            <div className="flex gap-4 pt-4 border-t border-border">
              <button
                onClick={resetFilters}
                className="flex-1 py-3 border border-border text-xs font-semibold uppercase tracking-wider hover:bg-bg-subtle transition-colors text-center"
              >
                Reset All
              </button>
              <button
                onClick={() => setIsMobileFilterOpen(false)}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-semibold uppercase tracking-wider transition-colors text-center"
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
