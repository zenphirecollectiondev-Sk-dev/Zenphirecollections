import { ArrowRight, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { mockCategories, mockProducts } from '../lib/mockData';
import heroBanner from '../assets/hero_banner.png';
import { useWishlistStore } from '../store/useWishlistStore';

export default function Home() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  // Use first 4 products for new arrivals, and next 4 (or same) for best sellers
  const newArrivals = mockProducts.slice(0, 4);
  const bestSellers = mockProducts.slice(2, 6);

  return (
    <div className="bg-bg min-h-screen">
      {/* 1. Hero Banner */}
      <section className="relative h-[70vh] md:h-[80vh] bg-bg-subtle overflow-hidden">
        <img
          src={heroBanner}
          alt="Zenphire Editorial Banner"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-16 max-w-7xl mx-auto">
          <div className="max-w-xl text-white space-y-4">
            <span className="text-xs uppercase tracking-[0.3em] font-bold text-gray-200">
              New Collection 2026
            </span>
            <h1 className="text-4xl md:text-6xl font-heading font-black tracking-tight uppercase leading-none">
              Raw Textures &<br />Minimal Form
            </h1>
            <p className="text-sm md:text-base text-gray-200 font-light leading-relaxed max-w-sm">
              An exploration of organic fabrics and relaxed silhouettes designed to stand the test of time.
            </p>
            <div className="pt-4">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-white text-text-primary px-6 py-3 text-sm font-medium uppercase tracking-wider hover:bg-black hover:text-white transition-all duration-300"
              >
                Shop Collection
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Shop By Category (Horizontal Scroll) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex justify-between items-end mb-8">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
              Curated Wardrobe
            </span>
            <h2 className="text-2xl md:text-3xl font-heading font-black uppercase mt-1">
              Gender Collections
            </h2>
          </div>
          <Link
            to="/shop"
            className="text-sm font-medium uppercase tracking-wider hover:text-text-secondary transition-colors inline-flex items-center gap-1 border-b border-text-primary pb-0.5"
          >
            View All <ArrowRight size={14} />
          </Link>
        </div>

        {/* Scroll Container */}
        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
          {mockCategories.map((category) => (
            <Link
              key={category.id}
              to={`/shop?category=${category.slug}`}
              className="flex-shrink-0 w-72 md:w-96 snap-start group block"
            >
              <div className="relative aspect-[4/5] bg-bg-subtle overflow-hidden border border-border">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                <div className="absolute bottom-6 left-6 text-white">
                  <h3 className="text-lg font-heading font-bold tracking-wider uppercase">
                    {category.name}
                  </h3>
                  <span className="text-xs tracking-wider opacity-80 uppercase inline-flex items-center gap-1 mt-1">
                    Explore <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. New Arrivals Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
            Just Released
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-black uppercase mt-1">
            New Arrivals
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {newArrivals.map((product) => (
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
                {product.product_variants.every(v => v.stock_qty === 0) && (
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
                  className="absolute top-3 right-3 p-1.5 bg-white/85 hover:bg-white text-text-primary border border-border shadow-sm rounded-full transition-colors z-10"
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
      </section>

      {/* 4. Editorial Banner */}
      <section className="bg-bg-subtle py-20 my-16 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
              The Edit
            </span>
            <h2 className="text-3xl md:text-5xl font-heading font-black uppercase tracking-tight leading-tight">
              Honest Materials,<br />Artisan Craft
            </h2>
            <p className="text-sm md:text-base text-text-secondary leading-relaxed max-w-md">
              We design under the principle of reduction. By removing unnecessary embellishments, we highlight the raw beauty of premium fibers: organic linen, long-staple cotton, and natural wool.
            </p>
            <div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 text-sm font-medium uppercase tracking-wider hover:bg-accent-hover transition-colors"
              >
                Discover Collection
              </Link>
            </div>
          </div>
          <div className="aspect-[4/3] bg-white border border-border overflow-hidden">
            <img
              src={mockProducts[0].product_images[0].url}
              alt="Artisan Craft detail"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* 5. Best Sellers Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 mb-16">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
            Customer Favorites
          </span>
          <h2 className="text-2xl md:text-3xl font-heading font-black uppercase mt-1">
            Best Sellers
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {bestSellers.map((product) => (
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
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleWishlist(product.id);
                  }}
                  aria-label="Toggle Wishlist"
                  className="absolute top-3 right-3 p-1.5 bg-white/85 hover:bg-white text-text-primary border border-border shadow-sm rounded-full transition-colors z-10"
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
      </section>
    </div>
  );
}
