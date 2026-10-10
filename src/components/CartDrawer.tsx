import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE, EASE_ENTER } from '../lib/motion';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity } = useCartStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shopping Cart"
          className="fixed inset-0 z-[150] flex justify-end"
        >
          {/* Backdrop — fades in on open, fades out on close */}
          <motion.div
            key="cart-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40"
          />

          {/* Drawer panel — slides in from right, exits right */}
          <motion.div
            key="cart-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: EASE_ENTER }}
            className="relative w-full max-w-full sm:max-w-md bg-white border-l border-border/80 flex flex-col h-full z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-border/70 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={18} className="stroke-[1.3] text-text-primary" />
                <h2 className="font-heading font-normal text-base sm:text-lg tracking-wide text-text-primary">
                  Shopping Cart
                </h2>
                <span className="bg-neutral-50 border border-border/70 text-[11px] font-medium px-2 py-0.5 rounded-full text-text-secondary">
                  {items.reduce((acc, curr) => acc + curr.quantity, 0)}
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close cart"
                className="w-8 h-8 flex items-center justify-center rounded-full text-text-secondary hover:text-text-primary hover:bg-neutral-100 transition-colors"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>

            {/* Cart items list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5 space-y-4">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                  <ShoppingBag size={38} className="text-text-secondary/40 stroke-[1.2]" />
                  <p className="text-text-secondary text-xs sm:text-sm font-normal">Your shopping cart is empty.</p>
                  <button
                    onClick={onClose}
                    className="mt-2 px-5 py-2.5 text-[11px] font-medium uppercase tracking-widest border border-text-primary text-text-primary hover:bg-text-primary hover:text-white transition-colors rounded-xs"
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {items.map((item) => (
                    <div key={item.id} className="py-4 flex gap-3.5 sm:gap-4 first:pt-0 last:pb-0 items-start">
                      {/* Item Image */}
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 sm:w-20 aspect-[2/3] object-cover object-top bg-neutral-50 border border-border/60 rounded-xs flex-shrink-0"
                      />

                      {/* Item Details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch py-0.5">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-xs sm:text-sm font-medium text-text-primary truncate">
                              {item.name}
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-text-primary flex-shrink-0">
                              ₹{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                          <p className="text-[11px] text-text-secondary mt-0.5 font-light">
                            Size: {item.size} {item.color && <>• Color: {item.color}</>}
                          </p>
                        </div>

                        {/* Quantity adjustments and Remove action */}
                        <div className="flex justify-between items-center mt-3 pt-1">
                          <div className="flex items-center border border-border/70 rounded-xs bg-white">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="px-2 min-w-[24px] text-center text-xs font-normal select-none">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-text-secondary/60 hover:text-sale transition-colors rounded-full"
                            aria-label="Remove item"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {items.length > 0 && (
              <div className="px-5 py-4 sm:px-6 sm:py-5 border-t border-border/70 bg-white space-y-3.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Subtotal</span>
                  <span className="text-base sm:text-lg font-medium text-text-primary">₹{subtotal.toFixed(2)}</span>
                </div>

                <p className="text-[11px] text-text-secondary/70 text-center leading-relaxed font-light">
                  Shipping &amp; taxes are calculated at checkout.
                </p>

                <div>
                  <Link
                    to="/checkout"
                    onClick={onClose}
                    className="block w-full py-3 sm:py-3.5 bg-[#00221A] hover:bg-[#063A2C] text-white font-medium uppercase text-[11px] tracking-widest text-center rounded-xs transition-colors shadow-xs"
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
