import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowRight, Image } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import { getProductsByIds } from '../lib/supabase';
import { imgCard } from '../lib/imgTransform';

export default function Wishlist() {
  const { productIds, toggleWishlist } = useWishlistStore();
  const [wishlistProducts, setWishlistProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadWishlistItems() {
      if (productIds.length === 0) {
        setWishlistProducts([]);
        return;
      }
      setLoading(true);
      try {
        const data = await getProductsByIds(productIds);
        setWishlistProducts(data || []);
      } catch (err) {
        console.warn('Could not load wishlist product details from Supabase:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWishlistItems();
  }, [productIds]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh]">
        {/* Header skeleton */}
        <div className="border-b border-border pb-6 mb-8">
          <div className="h-2.5 w-20 bg-bg-subtle animate-pulse mb-2" />
          <div className="h-8 w-48 bg-bg-subtle animate-pulse" />
        </div>
        {/* Product card skeletons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 md:gap-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-bg-subtle border border-border overflow-hidden">
              <div className="aspect-[3/4] w-full bg-black/5 mb-3" />
              <div className="p-3 space-y-2">
                <div className="h-2 w-10 bg-black/10" />
                <div className="h-3 w-3/4 bg-black/10" />
                <div className="h-3 w-1/4 bg-black/10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh]">
      {/* Header */}
      <div className="border-b border-border pb-6 mb-8">
        <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
          Saved Items
        </span>
        <h1 className="text-2xl sm:text-3xl font-heading font-black uppercase mt-1">
          My Wishlist
        </h1>
      </div>

      {wishlistProducts.length === 0 ? (
        <div className="text-center py-20 bg-bg-subtle border border-border">
          <Heart size={40} className="mx-auto text-text-secondary stroke-[1.2] mb-4" />
          <h2 className="text-lg font-heading font-bold uppercase mb-2">Your wishlist is empty</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-xs mx-auto">
            Save items you love here to easily find and add them to your cart later.
          </p>
          <Link
            to="/shop"
            className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest min-h-[44px]"
          >
            Start Shopping <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 md:gap-8">
          {wishlistProducts.map((product) => (
            <div key={product.id} className="group product-card block bg-bg-subtle border border-border overflow-hidden transition-all duration-300 hover:shadow-md">
              <div className="aspect-[3/4] w-full bg-bg-subtle overflow-hidden relative">
                <Link to={`/product/${product.slug}`}>
                  {product.product_images?.[0]?.url ? (
                    <img
                      src={imgCard(product.product_images[0].url)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="card-img w-full h-full object-cover object-top block relative z-10 transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-subtle">
                      <Image size={24} className="text-text-secondary/20" />
                    </div>
                  )}
                </Link>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Remove from wishlist"
                  className="wishlist-btn absolute top-2.5 right-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center p-2 bg-white/90 text-sale border border-border/60 rounded-full shadow-xs"
                >
                  <Trash2 size={15} className="stroke-[1.5]" />
                </button>
              </div>

              {/* Text info */}
              <div className="p-3.5 space-y-1">
                <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">
                  Zenphire
                </p>
                <Link to={`/product/${product.slug}`}>
                  <h3 className="text-xs font-medium text-text-primary group-hover:text-accent-gold transition-colors duration-200 truncate">
                    {product.name}
                  </h3>
                </Link>
                <div className="flex justify-between items-center pt-0.5">
                  <p className="text-xs font-semibold text-text-primary">
                    ₹{Number(product.base_price || 0).toFixed(2)}
                  </p>
                  <Link
                    to={`/product/${product.slug}`}
                    className="text-[10px] uppercase tracking-wider font-bold text-text-secondary hover:text-text-primary underline underline-offset-4"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
