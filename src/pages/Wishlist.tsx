import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, ArrowRight, Loader2 } from 'lucide-react';
import { useWishlistStore } from '../store/useWishlistStore';
import { getProductsByIds } from '../lib/supabase';
import linenShirt from '../assets/product_linen_shirt.png';

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-text-secondary mb-2" />
        <p className="text-xs uppercase tracking-widest text-text-secondary font-bold">
          Loading Wishlist...
        </p>
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
        <h1 className="text-3xl font-heading font-black uppercase mt-1">
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
            className="btn btn-primary inline-flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-widest"
          >
            Start Shopping <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {wishlistProducts.map((product) => (
            <div key={product.id} className="group product-card relative">
              <div className="w-full bg-bg-subtle overflow-hidden border border-border relative mb-3">
                <Link to={`/product/${product.slug}`}>
                  <img
                    src={product.product_images && product.product_images[0]?.url || linenShirt}
                    alt={product.name}
                    className="card-img w-full h-auto block relative z-10"
                  />
                </Link>
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <button
                  onClick={() => toggleWishlist(product.id)}
                  aria-label="Remove from wishlist"
                  className="wishlist-btn absolute top-2.5 right-2.5 p-2 bg-white/90 text-sale border border-border/60 rounded-full"
                >
                  <Trash2 size={16} className="stroke-[1.5]" />
                </button>
              </div>

              {/* Text info */}
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                  Zenphire
                </p>
                <Link to={`/product/${product.slug}`}>
                  <h3 className="text-sm font-medium text-text-primary group-hover:underline truncate">
                    {product.name}
                  </h3>
                </Link>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-text-primary">
                    ₹{Number(product.base_price || 0).toFixed(2)}
                  </p>
                  <Link
                    to={`/product/${product.slug}`}
                    className="text-xs uppercase tracking-wider font-bold text-text-secondary hover:text-text-primary underline underline-offset-4"
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
