import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE } from '../lib/motion';
import CouponRecommendation from '../components/CouponRecommendation';

export default function Cart() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 1000 ? 0 : 150;
  const total = subtotal + shipping;
  const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 min-h-[70vh] overflow-x-hidden">
      {/* Sleek Minimal Header */}
      <div className="flex items-baseline justify-between pb-4 sm:pb-5 mb-6 sm:mb-8 border-b border-border/60">
        <h1 className="text-2xl sm:text-3xl font-heading font-medium tracking-tight text-text-primary">
          Shopping Bag
        </h1>
        {items.length > 0 && (
          <span className="text-xs text-text-secondary font-medium">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 sm:py-24 bg-[#FAFAFA] border border-border/60 rounded-md px-4">
          <ShoppingBag size={40} className="mx-auto text-text-secondary/40 stroke-[1.2] mb-4" />
          <h2 className="text-base font-heading font-medium uppercase tracking-wider mb-2">Your bag is empty</h2>
          <p className="text-text-secondary text-xs sm:text-sm mb-6 max-w-xs mx-auto">
            Discover our curated collection of luxury garments and refined wardrobe essentials.
          </p>
          <Link
            to="/shop"
            className="btn inline-flex items-center gap-2 px-6 py-3 bg-[#00221A] hover:bg-[#063A2C] text-white text-xs font-semibold uppercase tracking-widest rounded-sm transition-colors shadow-xs"
          >
            <span>Explore Collection</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Main items listing */}
          <div className="lg:col-span-7 xl:col-span-8 divide-y divide-border/60 w-full min-w-0">
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.22, ease: EASE }}
                  className="py-5 sm:py-6 first:pt-0 last:pb-0 flex gap-3.5 sm:gap-6 items-start w-full min-w-0"
                >
                  {/* Thumbnail */}
                  <Link to={`/product/${item.productId}`} className="flex-shrink-0 group">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 sm:w-24 aspect-[2/3] object-cover object-top rounded-sm border border-border/60 bg-[#FAFAFA] transition-opacity group-hover:opacity-90"
                    />
                  </Link>

                  {/* Details & Controls */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex justify-between items-start gap-2 sm:gap-3 min-w-0">
                        <Link
                          to={`/product/${item.productId}`}
                          className="text-xs sm:text-sm font-medium text-text-primary hover:text-text-secondary transition-colors truncate min-w-0 flex-1"
                        >
                          {item.name}
                        </Link>
                        <span className="text-xs sm:text-sm font-semibold text-text-primary flex-shrink-0">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      <p className="text-xs text-text-secondary truncate">
                        Size: {item.size} {item.color && <>• Color: {item.color}</>}
                      </p>
                      <p className="text-[11px] text-text-secondary/70">
                        ₹{item.price.toFixed(2)} each
                      </p>
                    </div>

                    {/* Quantity and Remove */}
                    <div className="flex items-center justify-between pt-3 sm:pt-4 gap-2">
                      {/* Minimal Quantity Stepper */}
                      <div className="flex items-center border border-border/80 rounded-sm bg-white flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-7 sm:w-8 text-center text-xs font-medium select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Discreet Remove */}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-text-secondary/70 hover:text-sale transition-colors font-normal py-1 flex-shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Minimalist Summary Sidebar */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24 w-full min-w-0">
            <div className="bg-[#FAFAFA] border border-border/70 rounded-md p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-primary pb-3 border-b border-border/60">
                Summary
              </h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-medium text-text-primary">₹{subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-semibold text-emerald-700 uppercase text-[11px]">Free</span>
                  ) : (
                    <span className="font-medium text-text-primary">₹{shipping.toFixed(2)}</span>
                  )}
                </div>

                {shipping > 0 && (
                  <p className="text-[11px] text-text-secondary/80 leading-relaxed pt-1 border-t border-border/40">
                    Add ₹{(1000 - subtotal).toFixed(2)} more to qualify for complimentary shipping.
                  </p>
                )}

                {/* Smart Coupon Nudge */}
                <CouponRecommendation subtotal={subtotal} compact className="pt-1" />

                <div className="flex justify-between items-baseline pt-4 border-t border-border/60">
                  <span className="font-semibold uppercase text-xs tracking-wider text-text-primary">Estimated Total</span>
                  <span className="text-xl font-medium text-text-primary">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <Link
                  to="/checkout"
                  className="btn block w-full py-3.5 bg-[#00221A] hover:bg-[#063A2C] text-white text-xs font-semibold uppercase tracking-widest rounded-sm text-center transition-all shadow-xs"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  to="/shop"
                  className="block w-full py-2 text-text-secondary hover:text-text-primary text-center text-xs transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
