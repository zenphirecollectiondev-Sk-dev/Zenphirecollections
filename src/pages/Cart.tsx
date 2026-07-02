import { Link } from 'react-router-dom';
import { ShoppingBag, Plus, Minus, Trash2, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';

export default function Cart() {
  const { items, removeItem, updateQuantity } = useCartStore();

  const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = subtotal > 100 ? 0 : 15;
  const total = subtotal + shipping;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[70vh]">
      {/* Page Header */}
      <div className="border-b border-border pb-6 mb-10">
        <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
          Checkout Step 1
        </span>
        <h1 className="text-3xl font-heading font-black uppercase mt-1">
          Shopping Cart
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20 bg-bg-subtle border border-border">
          <ShoppingBag size={48} className="mx-auto text-text-secondary stroke-[1.2] mb-4" />
          <h2 className="text-lg font-heading font-bold uppercase mb-2">Your shopping cart is empty</h2>
          <p className="text-text-secondary text-sm mb-8 max-w-xs mx-auto">
            You have no items in your cart. Discover our latest minimal wardrobe arrivals.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 bg-accent text-white px-6 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors"
          >
            Explore Catalog <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main items listing column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="hidden md:grid grid-cols-12 gap-4 pb-4 border-b border-border text-xs uppercase tracking-wider font-bold text-text-secondary">
              <div className="col-span-6">Product Details</div>
              <div className="col-span-2 text-center">Price</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Total</div>
            </div>

            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="py-6 flex flex-col md:grid md:grid-cols-12 gap-4 items-center first:pt-0 last:pb-0">
                  {/* Thumbnail and name info */}
                  <div className="col-span-6 flex gap-4 w-full">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-16 aspect-[3/4] object-cover object-center bg-bg-subtle border border-border"
                    />
                    <div className="flex flex-col justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-text-primary">
                          {item.name}
                        </h3>
                        <p className="text-xs text-text-secondary mt-1">
                          Size: {item.size} &bull; Color: {item.color}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-xs text-sale font-medium hover:underline flex items-center gap-1 mt-2 md:mt-0"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>

                  {/* Unit price */}
                  <div className="col-span-2 text-center hidden md:block">
                    <span className="text-sm text-text-primary">${item.price.toFixed(2)}</span>
                  </div>

                  {/* Quantity adjustments */}
                  <div className="col-span-2 flex justify-center w-full md:w-auto my-3 md:my-0">
                    <div className="flex items-center border border-border bg-white">
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
                  </div>

                  {/* Total price for line item */}
                  <div className="col-span-2 text-right w-full md:w-auto flex justify-between md:block">
                    <span className="text-xs text-text-secondary uppercase font-bold md:hidden">Total:</span>
                    <span className="text-sm font-bold text-text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Checkout summary column */}
          <div className="lg:col-span-4">
            <div className="bg-bg-subtle border border-border p-6 space-y-6">
              <h2 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary pb-3 border-b border-border">
                Order Summary
              </h2>

              <div className="space-y-4 text-sm">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-text-primary">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-bold text-emerald-600 uppercase text-xs">Free</span>
                  ) : (
                    <span className="font-semibold text-text-primary">${shipping.toFixed(2)}</span>
                  )}
                </div>
                {shipping > 0 && (
                  <p className="text-[10px] text-text-secondary leading-tight italic bg-white p-2 border border-border">
                    Tip: Add ${(100 - subtotal).toFixed(2)} more to unlock free shipping.
                  </p>
                )}
                
                <div className="flex justify-between items-baseline pt-4 border-t border-border">
                  <span className="font-heading font-bold uppercase text-xs tracking-wider">Total</span>
                  <span className="text-xl font-bold text-text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/checkout"
                  className="block w-full bg-accent text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-accent-hover transition-colors text-center"
                >
                  Proceed to Checkout
                </Link>
                <Link
                  to="/shop"
                  className="block w-full border border-border bg-white text-text-primary py-3 font-semibold uppercase text-xs tracking-wider hover:bg-bg-subtle transition-colors text-center mt-3"
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
