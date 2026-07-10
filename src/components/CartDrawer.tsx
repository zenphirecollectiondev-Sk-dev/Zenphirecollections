import { Link } from 'react-router-dom';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end">
      {/* Backdrop overlay with fade transition */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 transition-opacity duration-300"
      ></div>

      {/* Drawer content sliding in from the right */}
      <div className="relative w-full max-w-md bg-white border-l border-border flex flex-col h-full z-50 animate-slide-in shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag size={20} className="stroke-[1.5]" />
            <h2 className="font-heading font-black text-lg uppercase tracking-wider text-text-primary">
              Shopping Cart
            </h2>
            <span className="bg-bg-subtle border border-border text-xs px-2 py-0.5 font-bold rounded-full">
              {items.reduce((acc, curr) => acc + curr.quantity, 0)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="btn-icon p-1.5 hover:bg-bg-subtle rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
              <ShoppingBag size={48} className="text-text-secondary stroke-[1.2]" />
              <p className="text-text-secondary font-medium text-sm">Your shopping cart is empty.</p>
              <button
                onClick={onClose}
                className="btn btn-primary px-6 py-3 text-[10px] font-bold uppercase tracking-widest"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 first:pt-0 last:pb-0">
                  {/* Item Image */}
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-20 aspect-[2/3] object-cover object-center bg-bg-subtle border border-border flex-shrink-0"
                  />

                  {/* Item Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-semibold text-text-primary truncate max-w-[180px]">
                          {item.name}
                        </h3>
                        <p className="text-sm font-bold text-text-primary ml-2">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                      <p className="text-xs text-text-secondary mt-1">
                        Size: {item.size} &bull; Color: {item.color}
                      </p>
                    </div>

                    {/* Quantity adjustments and Remove action */}
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center border border-border">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-bg-subtle text-text-secondary transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-3 text-xs font-semibold select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-bg-subtle text-text-secondary transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-text-secondary hover:text-sale transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={15} />
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
          <div className="p-6 border-t border-border bg-bg-subtle space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-semibold uppercase tracking-wider text-text-secondary">Subtotal</span>
              <span className="text-xl font-bold text-text-primary">₹{subtotal.toFixed(2)}</span>
            </div>

            <p className="text-[11px] text-text-secondary text-center leading-relaxed">
              Shipping & taxes are calculated at checkout.
            </p>

            <div className="space-y-2.5">
              <Link
                to="/checkout"
                onClick={onClose}
                className="btn btn-primary block w-full py-4 font-bold uppercase text-[10px] tracking-widest text-center"
              >
                Proceed to Checkout
              </Link>
              <Link
                to="/cart"
                onClick={onClose}
                className="btn block w-full border border-border bg-white text-text-primary py-3 font-semibold uppercase text-[10px] tracking-widest hover:bg-bg-subtle text-center"
              >
                View Full Cart
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
