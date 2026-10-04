import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, MapPin, CheckCircle, Tag, AlertCircle,
  RefreshCw, Copy, Check, Truck, Package, ChevronDown, ShoppingBag,
  Lock, ChevronLeft, Sparkles, CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE, EASE_ENTER } from '../lib/motion';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { supabase } from '../lib/supabase';

type CheckoutStep = 'SHIPPING' | 'REVIEW' | 'SUCCESS';

interface AddressForm {
  recipient_name: string;
  phone_primary: string;
  phone_secondary: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const { user } = useAuthStore();

  const [step, setStep] = useState<CheckoutStep>('SHIPPING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTrackId, setCopiedTrackId] = useState(false);
  const [mobileSummaryOpen, setMobileSummaryOpen] = useState(false);

  // Address State
  const [addressForm, setAddressForm] = useState<AddressForm>({
    recipient_name: '',
    phone_primary: '',
    phone_secondary: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
    is_default: true,
  });
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  // Coupon State
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Payment state — no simulated modal, real Razorpay SDK
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Fetch saved addresses from Supabase if logged in
  useEffect(() => {
    async function fetchAddresses() {
      if (!user) return;
      try {
        const { data, error: addrError } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_id', user.id);

        if (addrError) throw addrError;
        if (data && data.length > 0) {
          setSavedAddresses(data);
          const defaultAddr = data.find((a) => a.is_default);
          setSelectedAddressId(defaultAddr ? defaultAddr.id : data[0].id);
        }
      } catch (err) {
        console.warn('Could not load addresses (placeholder DB or network issue):', err);
      }
    }
    fetchAddresses();
  }, [user]);

  // Order Calculations
  const subtotal = useMemo(() => items.reduce((acc, item) => acc + item.price * item.quantity, 0), [items]);

  const discount = useMemo(() => {
    if (!appliedCoupon) return 0;
    return couponDiscount;
  }, [appliedCoupon, couponDiscount]);

  const shipping = useMemo(() => {
    const remaining = subtotal - discount;
    if (remaining <= 0) return 0;
    return remaining > 1000 ? 0 : 150;
  }, [subtotal, discount]);

  const total = useMemo(() => {
    const val = subtotal - discount + shipping;
    return Math.max(0, val);
  }, [subtotal, discount, shipping]);

  // Redirect to shop if cart is empty and not on success step
  useEffect(() => {
    if (items.length === 0 && step !== 'SUCCESS') {
      navigate('/shop');
    }
  }, [items, step, navigate]);

  // Handle address form changes
  const handleAddressInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setAddressForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  // Validate address form
  const validateAddress = () => {
    if (selectedAddressId !== 'new') return true;
    const { recipient_name, phone_primary, phone_secondary, line1, city, state, pincode } = addressForm;
    if (!recipient_name.trim() || !phone_primary.trim() || !line1.trim() || !city.trim() || !state.trim() || !pincode.trim()) {
      setError('Please fill in all required shipping address fields.');
      return false;
    }

    // Indian phone number validation
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone_primary.trim())) {
      setError('Please enter a valid 10-digit Indian mobile number for the primary contact.');
      return false;
    }

    if (phone_secondary.trim() && !phoneRegex.test(phone_secondary.trim())) {
      setError('Please enter a valid 10-digit Indian mobile number for the alternate contact.');
      return false;
    }

    return true;
  };

  // Submit address and move to Review step
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (validateAddress()) {
      setStep('REVIEW');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle Coupon Apply — validates against DB (checks is_active + expiry + min_order)
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    const normalizedCode = couponCode.trim().toUpperCase();

    try {
      const { data: dbCoupon, error: couponErr } = await supabase
        .from('coupons' as any)
        .select('*')
        .eq('code', normalizedCode)
        .eq('is_active', true)           // only admin-activated coupons
        .maybeSingle();

      if (couponErr) throw couponErr;

      if (!dbCoupon) {
        setCouponError('Invalid coupon code or coupon has been deactivated.');
        return;
      }
      if (new Date() > new Date((dbCoupon as any).expiry)) {
        setCouponError('This coupon code has expired.');
        return;
      }
      if (subtotal < ((dbCoupon as any).min_order_value || 0)) {
        setCouponError(`Minimum order value of ₹${Number((dbCoupon as any).min_order_value).toFixed(2)} is required.`);
        return;
      }

      let discountAmount = (dbCoupon as any).discount_type === 'percentage'
        ? (subtotal * (dbCoupon as any).value) / 100
        : (dbCoupon as any).value;
      discountAmount = Math.min(discountAmount, subtotal);

      setAppliedCoupon({ code: normalizedCode, discountType: (dbCoupon as any).discount_type, value: (dbCoupon as any).value });
      setCouponDiscount(discountAmount);
      setCouponSuccess(`Coupon "${normalizedCode}" applied! You save ₹${discountAmount.toFixed(2)}.`);
    } catch (_) {
      setCouponError('Unable to validate coupon. Please check your connection and try again.');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    }
  };

  // Remove applied coupon
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponDiscount(0);
    setCouponCode('');
    setCouponSuccess(null);
    setCouponError(null);
  };

  // Build address text for success screen
  const buildAddressText = () => {
    if (selectedAddressId !== 'new') {
      const sel = savedAddresses.find((a) => a.id === selectedAddressId);
      return sel ? `${sel.line1}, ${sel.city}, ${sel.state} - ${sel.pincode}` : '';
    }
    return `${addressForm.line1}, ${addressForm.city}, ${addressForm.state} - ${addressForm.pincode}`;
  };

  // Save new address to DB and return its ID (or null on failure)
  const saveAddressIfNew = async (): Promise<string | null> => {
    if (selectedAddressId !== 'new') return selectedAddressId;
    if (!user) return null;
    try {
      const { data } = await supabase
        .from('addresses')
        .insert({
          user_id: user.id,
          recipient_name: addressForm.recipient_name,
          phone_primary: addressForm.phone_primary,
          phone_secondary: addressForm.phone_secondary || null,
          line1: addressForm.line1,
          city: addressForm.city,
          state: addressForm.state,
          pincode: addressForm.pincode,
          is_default: addressForm.is_default,
        })
        .select()
        .single();
      return data?.id ?? null;
    } catch {
      return null; // non-critical — order proceeds without saved address
    }
  };

  // ─── REAL RAZORPAY INTEGRATION ───────────────────────────────
  const initializePayment = async () => {
    if (!user) {
      setError('Please sign in to complete your purchase.');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Call server — server re-validates stock, coupon, and computes true total
      const res = await fetch('/api/create-razorpay-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart_items: items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
          coupon_code: appliedCoupon?.code ?? null,
        }),
      });

      let orderData: any;
      const text = await res.text();
      try {
        orderData = JSON.parse(text);
      } catch {
        throw new Error(text || `Server returned ${res.status}: Failed to initialize order.`);
      }
      if (!res.ok) throw new Error(orderData?.error || 'Could not create payment order.');

      const {
        razorpay_order_id,
        amount_paise,
        key_id,
        verified_subtotal,
        discount_amount,
        shipping_cost,
        verified_total,
        coupon_code: serverCouponCode,
      } = orderData;

      setLoading(false);

      // Open the REAL Razorpay checkout modal
      const rzp = new (window as any).Razorpay({
        key: key_id,
        order_id: razorpay_order_id,
        amount: amount_paise,
        currency: 'INR',
        name: 'Zenphire Collections',
        description: `${items.length} item${items.length > 1 ? 's' : ''}`,
        image: '/favicon.svg',
        theme: { color: '#00221A' },
        modal: {
          ondismiss: () => {
            setError('Payment was dismissed. Your cart is preserved — you can resume anytime.');
          },
        },
        handler: async (response: any) => {
          await handlePaymentSuccess(response, {
            razorpay_order_id,
            verified_subtotal,
            discount_amount,
            shipping_cost,
            verified_total,
            server_coupon_code: serverCouponCode,
          });
        },
      });

      rzp.open();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Could not initialize payment. Please try again.');
    }
  };

  // Step 3: Called by Razorpay SDK after user completes payment
  const handlePaymentSuccess = async (
    rzpResponse: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    meta: { razorpay_order_id: string; verified_subtotal: number; discount_amount: number; shipping_cost: number; verified_total: number; server_coupon_code: string | null },
  ) => {
    setPaymentLoading(true);
    setError(null);

    try {
      const addressId = await saveAddressIfNew();

      const res = await fetch('/api/verify-razorpay-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: rzpResponse.razorpay_order_id,
          razorpay_payment_id: rzpResponse.razorpay_payment_id,
          razorpay_signature: rzpResponse.razorpay_signature,
          user_id: user!.id,
          address_id: addressId,
          cart_items: items.map((i) => ({
            variant_id: i.variantId,
            quantity: i.quantity,
            price: i.price,
          })),
          coupon_code: meta.server_coupon_code,
          subtotal: meta.verified_subtotal,
          discount_amount: meta.discount_amount,
          shipping_cost: meta.shipping_cost,
          total: meta.verified_total,
        }),
      });

      let result: any;
      const verifyText = await res.text();
      try {
        result = JSON.parse(verifyText);
      } catch {
        result = { success: false, error: verifyText || `Server returned ${res.status}: Failed to verify payment.` };
      }

      if (!res.ok || !result.success) {
        setError(
          result.error ||
          `Order could not be saved. Please contact support with Payment ID: ${rzpResponse.razorpay_payment_id}`,
        );
        setPaymentLoading(false);
        return;
      }

      // Success screen
      setPaymentSuccessData({
        trackingId: result.order_ref,
        paymentId: rzpResponse.razorpay_payment_id,
        total: meta.verified_total,
        itemsCount: items.reduce((acc, i) => acc + i.quantity, 0),
        address: buildAddressText(),
        date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
      });

      clearCart();
      setStep('SUCCESS');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(err.message || 'Payment confirmed but order save failed. Please contact support.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 min-h-screen relative anim-fade-up">

      {/* ── Minimal Header & Stepper (Non-Success Steps) ── */}
      {step !== 'SUCCESS' && (
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-border/70">
            {/* Left: Back to Cart + Title */}
            <div className="flex items-center gap-2.5">
              <Link
                to="/cart"
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors duration-150 py-1"
                aria-label="Back to Cart"
              >
                <ChevronLeft size={15} />
                <span>Cart</span>
              </Link>
              <span className="text-border/80">/</span>
              <h1 className="text-base sm:text-lg font-heading font-medium uppercase tracking-wider text-text-primary">
                Checkout
              </h1>
            </div>

            {/* Right: Minimal Step Indicator & Trust Badge */}
            <div className="flex items-center gap-3">
              <nav aria-label="Checkout Progress" className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => step === 'REVIEW' && setStep('SHIPPING')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-150 ${step === 'SHIPPING'
                      ? 'ambient-green-gradient text-white font-medium shadow-2xs border border-white/10'
                      : 'text-text-secondary hover:text-text-primary cursor-pointer'
                    }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold ${step === 'SHIPPING' ? 'bg-white/25 text-white' : 'bg-black/5 text-text-secondary'
                    }`}>1</span>
                  <span>Address</span>
                </button>

                <span className="text-text-secondary/30 text-xs">→</span>

                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full transition-all duration-150 ${step === 'REVIEW'
                      ? 'ambient-green-gradient text-white font-medium shadow-2xs border border-white/10'
                      : 'text-text-secondary/50'
                    }`}
                >
                  <span className={`w-3.5 h-3.5 rounded-full text-[9px] flex items-center justify-center font-bold ${step === 'REVIEW' ? 'bg-white/25 text-white' : 'bg-black/5 text-text-secondary/50'
                    }`}>2</span>
                  <span>Payment</span>
                </div>
              </nav>

              <div className="hidden md:flex items-center gap-1 text-[11px] text-text-secondary/70 pl-3 border-l border-border/70">
                <Lock size={12} className="text-accent-gold" />
                <span>256-Bit SSL</span>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="mb-6 p-3.5 bg-sale/5 border border-sale/30 rounded-xl text-sale text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* ── Mobile Order Summary Accordion (Visible on < lg screens) ── */}
      {step !== 'SUCCESS' && (
        <div className="lg:hidden mb-6 border border-border/70 rounded-xl overflow-hidden bg-bg-subtle/50">
          <button
            type="button"
            onClick={() => setMobileSummaryOpen(!mobileSummaryOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-text-primary hover:bg-bg-subtle transition-colors duration-150"
            aria-expanded={mobileSummaryOpen}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={14} className="text-accent-gold" />
              <span className="font-semibold text-text-primary">Order Summary</span>
              <span className="text-[11px] text-text-secondary">
                ({items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'items'})
              </span>
              <ChevronDown
                size={13}
                className={`text-text-secondary transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${mobileSummaryOpen ? 'rotate-180' : ''
                  }`}
              />
            </div>
            <div className="font-bold text-sm text-text-primary">
              ₹{total.toFixed(2)}
            </div>
          </button>

          <AnimatePresence>
            {mobileSummaryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: DUR.fast, ease: EASE }}
                className="overflow-hidden border-t border-border/60 px-4 py-3 bg-white"
              >
                {/* Items */}
                <div className="divide-y divide-border/40 max-h-48 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center gap-3 first:pt-0 last:pb-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-9 aspect-[2/3] object-cover object-center rounded border border-border/60 bg-bg-subtle flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary truncate">{item.name}</p>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Size: {item.size} • Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-text-primary flex-shrink-0">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Subtotals */}
                <div className="pt-2.5 mt-2.5 border-t border-border/60 space-y-1.5 text-xs">
                  <div className="flex justify-between text-text-secondary">
                    <span>Subtotal</span>
                    <span className="text-text-primary font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount ({appliedCoupon.code})</span>
                      <span>-₹{discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-text-secondary">
                    <span>Shipping</span>
                    {shipping === 0 ? (
                      <span className="text-emerald-600 font-semibold uppercase text-[11px]">Free</span>
                    ) : (
                      <span className="text-text-primary font-medium">₹{shipping.toFixed(2)}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Main Two-Column Layout ── */}
      {step !== 'SUCCESS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">

          {/* ─────────────────────────────────────────────────────────────
              LEFT COLUMN: Form / Review Content
             ───────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">

            {/* ── STEP 1: SHIPPING ADDRESS ── */}
            {step === 'SHIPPING' && (
              <form onSubmit={handleShippingSubmit} className="space-y-6">
                <div>
                  <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-primary mb-1">
                    Shipping Address
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Where should we deliver your order?
                  </p>
                </div>

                {/* Saved addresses selector */}
                {savedAddresses.length > 0 && (
                  <div className="space-y-2.5">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                      Saved Addresses
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => setSelectedAddressId(addr.id)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 relative flex flex-col justify-between text-left ${isSelected
                                ? 'border-[#063A2C] bg-[#00221A]/5 ring-1 ring-[#063A2C]/20 shadow-2xs'
                                : 'border-border/70 bg-white hover:border-border hover:bg-bg-subtle/40'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#00221A] ambient-green-gradient' : 'border-border'
                                  }`}>
                                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                                <span className="text-xs font-bold text-text-primary truncate">
                                  {addr.recipient_name || 'Saved Address'}
                                </span>
                              </div>
                              {addr.is_default && (
                                <span className="text-[9px] uppercase tracking-wider text-accent-gold font-bold bg-accent-gold/10 px-1.5 py-0.5 rounded">
                                  Default
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-text-primary leading-relaxed pl-5 font-normal">
                              {addr.line1}
                            </p>
                            <p className="text-[11px] text-text-secondary pl-5 mt-0.5">
                              {addr.city}, {addr.state} — {addr.pincode}
                            </p>
                          </div>
                        );
                      })}

                      <div
                        onClick={() => setSelectedAddressId('new')}
                        className={`p-3.5 rounded-xl border border-dashed cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 text-center min-h-[92px] ${selectedAddressId === 'new'
                            ? 'border-[#063A2C] bg-[#00221A]/5 text-[#00221A] font-semibold'
                            : 'border-border/70 bg-white text-text-secondary hover:border-[#063A2C] hover:text-[#00221A]'
                          }`}
                      >
                        <span className="text-xs tracking-wider">
                          + Use New Address
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form for new address */}
                {selectedAddressId === 'new' && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label htmlFor="recipient_name" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          Full Name *
                        </label>
                        <input
                          id="recipient_name"
                          name="recipient_name"
                          type="text"
                          required
                          value={addressForm.recipient_name}
                          onChange={handleAddressInputChange}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                          placeholder="e.g. Rahul Sharma"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone_primary" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          Mobile Number *
                        </label>
                        <input
                          id="phone_primary"
                          name="phone_primary"
                          type="tel"
                          required
                          value={addressForm.phone_primary}
                          onChange={handleAddressInputChange}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                          placeholder="10-digit mobile"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="line1" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                        Street Address *
                      </label>
                      <input
                        id="line1"
                        name="line1"
                        type="text"
                        required
                        value={addressForm.line1}
                        onChange={handleAddressInputChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                        placeholder="House/Flat No, Apartment, Street, Landmark"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                      <div className="col-span-1">
                        <label htmlFor="city" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          City *
                        </label>
                        <input
                          id="city"
                          name="city"
                          type="text"
                          required
                          value={addressForm.city}
                          onChange={handleAddressInputChange}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                          placeholder="e.g. Mumbai"
                        />
                      </div>

                      <div className="col-span-1">
                        <label htmlFor="state" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          State *
                        </label>
                        <input
                          id="state"
                          name="state"
                          type="text"
                          required
                          value={addressForm.state}
                          onChange={handleAddressInputChange}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                          placeholder="e.g. Maharashtra"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label htmlFor="pincode" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                          Pincode *
                        </label>
                        <input
                          id="pincode"
                          name="pincode"
                          type="text"
                          required
                          value={addressForm.pincode}
                          onChange={handleAddressInputChange}
                          className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                          placeholder="6 digits"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="phone_secondary" className="block text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-1">
                        Alternate Mobile <span className="text-text-secondary/50 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="phone_secondary"
                        name="phone_secondary"
                        type="tel"
                        value={addressForm.phone_secondary}
                        onChange={handleAddressInputChange}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-white text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                        placeholder="Alternative contact number"
                      />
                    </div>

                    {user && (
                      <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                        <input
                          id="is_default"
                          name="is_default"
                          type="checkbox"
                          checked={addressForm.is_default}
                          onChange={handleAddressInputChange}
                          className="w-4 h-4 rounded accent-[#063A2C]"
                        />
                        <span className="text-xs text-text-secondary">
                          Save as default shipping address
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="btn w-full h-11 sm:h-12 rounded-xl ambient-green-gradient text-white font-medium text-xs uppercase tracking-widest hover:opacity-95 hover:shadow-md transition-all duration-150 shadow-xs flex items-center justify-center gap-2 border border-white/10"
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}

            {/* ── STEP 2: REVIEW & PAYMENT ── */}
            {step === 'REVIEW' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-sm font-heading font-semibold uppercase tracking-wider text-text-primary mb-1">
                    Review & Pay
                  </h2>
                  <p className="text-xs text-text-secondary">
                    Verify shipping destination and complete payment securely.
                  </p>
                </div>

                {/* Delivery destination preview card */}
                <div className="p-4 rounded-xl border border-border/80 bg-white flex items-start justify-between gap-3 text-left">
                  <div className="flex items-start gap-2.5">
                    <MapPin size={15} className="text-accent-gold mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-0.5">
                        Delivering To
                      </span>
                      <p className="text-xs font-semibold text-text-primary">
                        {selectedAddressId !== 'new'
                          ? savedAddresses.find((a) => a.id === selectedAddressId)?.recipient_name || 'Saved Address'
                          : addressForm.recipient_name}
                      </p>
                      <p className="text-xs text-text-secondary leading-relaxed mt-0.5">
                        {buildAddressText()}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep('SHIPPING')}
                    className="text-xs text-[#063A2C] hover:text-[#00221A] font-semibold underline underline-offset-4 flex-shrink-0 transition-colors"
                  >
                    Change
                  </button>
                </div>

                {/* Promo Coupon Card */}
                <div className="p-4 rounded-xl border border-border/80 bg-white space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary uppercase tracking-wider">
                    <Tag size={13} className="text-accent-gold" />
                    <span>Promo Coupon</span>
                  </div>

                  {appliedCoupon ? (
                    <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs flex justify-between items-center text-emerald-800">
                      <span className="font-medium">
                        Applied: <strong>{appliedCoupon.code}</strong> (-₹{couponDiscount.toFixed(2)})
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveCoupon}
                        className="text-[10px] uppercase font-bold text-sale hover:underline ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleApplyCoupon} className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Coupon code (e.g. ZENPHIRE10)"
                        className="flex-1 px-3.5 py-2 rounded-lg border border-border/80 text-xs sm:text-sm uppercase placeholder:normal-case placeholder:text-text-secondary/40 focus:outline-none focus:border-[#063A2C] focus:ring-1 focus:ring-[#063A2C]/20 transition-all duration-150"
                      />
                      <button
                        type="submit"
                        className="btn px-4 py-2 rounded-lg ambient-green-gradient text-white text-xs font-semibold uppercase tracking-wider hover:opacity-95 transition-opacity duration-150 flex-shrink-0 border border-white/10"
                      >
                        Apply
                      </button>
                    </form>
                  )}

                  {couponError && (
                    <p className="text-xs text-sale font-medium flex items-center gap-1">
                      <AlertCircle size={12} /> {couponError}
                    </p>
                  )}

                  {couponSuccess && (
                    <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle size={12} /> {couponSuccess}
                    </p>
                  )}

                  {/* Suggestion tags */}
                  {!appliedCoupon && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px] text-text-secondary">
                      <Sparkles size={11} className="text-accent-gold" />
                      <span>Available:</span>
                      <button
                        type="button"
                        onClick={() => { setCouponCode('ZENPHIRE10'); setCouponError(null); }}
                        className="px-2.5 py-0.5 rounded-md bg-[#00221A]/5 hover:bg-[#00221A]/10 text-[#00221A] border border-[#063A2C]/15 font-semibold text-[10px] tracking-wide transition-colors cursor-pointer"
                      >
                        ZENPHIRE10 (10% off)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setCouponCode('ZENPHIRE50'); setCouponError(null); }}
                        className="px-2.5 py-0.5 rounded-md bg-[#00221A]/5 hover:bg-[#00221A]/10 text-[#00221A] border border-[#063A2C]/15 font-semibold text-[10px] tracking-wide transition-colors cursor-pointer"
                      >
                        ZENPHIRE50 (₹50 off)
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Methods & Trust Banner */}
                <div className="p-4 rounded-xl border border-border/70 bg-bg-subtle/50 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-primary">
                      <CreditCard size={14} className="text-accent-gold" />
                      <span>Online Payment</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-text-secondary tracking-widest">
                      Powered by Razorpay
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Pay securely using UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking, or Wallets.
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium pt-1 border-t border-border/50">
                    <ShieldCheck size={13} className="text-emerald-600 flex-shrink-0" />
                    <span>256-Bit SSL Encrypted</span>
                  </div>
                </div>

                {/* Mobile Direct Pay Action */}
                <div className="lg:hidden pt-2">
                  <button
                    type="button"
                    onClick={initializePayment}
                    disabled={loading || paymentLoading}
                    className="btn w-full h-12 rounded-xl ambient-green-gradient text-white font-medium text-xs uppercase tracking-widest hover:opacity-95 hover:shadow-md transition-all duration-150 shadow-xs flex items-center justify-center gap-2 border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading || paymentLoading ? (
                      <><RefreshCw size={14} className="animate-spin" /> Preparing Payment...</>
                    ) : (
                      `Pay ₹${total.toFixed(2)} via Razorpay`
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              RIGHT COLUMN: Desktop Sticky Order Summary
             ───────────────────────────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="bg-white border border-border/70 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <h3 className="text-xs font-heading font-semibold uppercase tracking-wider text-text-primary">
                  Order Summary
                </h3>
                <span className="text-[11px] text-text-secondary font-medium">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} {items.reduce((acc, i) => acc + i.quantity, 0) === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Items List */}
              <div className="divide-y divide-border/40 max-h-60 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="py-2.5 flex items-center gap-3 first:pt-0 last:pb-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-10 h-13 object-cover object-center rounded border border-border/60 bg-bg-subtle flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{item.name}</p>
                      <p className="text-[10px] text-text-secondary mt-0.5">
                        Size: {item.size} • Qty: {item.quantity}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-text-primary flex-shrink-0">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Pricing Breakdown */}
              <div className="pt-3 border-t border-border/60 space-y-2 text-xs">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="text-text-primary font-medium">₹{subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="text-emerald-600 font-semibold uppercase text-[11px]">Free</span>
                  ) : (
                    <span className="text-text-primary font-medium">₹{shipping.toFixed(2)}</span>
                  )}
                </div>

                <div className="pt-3 border-t border-border/60 flex justify-between items-baseline">
                  <span className="text-xs font-heading font-semibold uppercase tracking-wider text-text-primary">
                    Total
                  </span>
                  <span className="text-xl font-bold text-text-primary">
                    ₹{total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Primary action in sidebar if on review step */}
              {step === 'REVIEW' && (
                <button
                  type="button"
                  onClick={initializePayment}
                  disabled={loading || paymentLoading}
                  className="btn w-full h-11 sm:h-12 rounded-xl ambient-green-gradient text-white font-medium text-xs uppercase tracking-widest hover:opacity-95 hover:shadow-md transition-all duration-150 shadow-xs flex items-center justify-center gap-2 border border-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading || paymentLoading ? (
                    <><RefreshCw size={14} className="animate-spin" /> Preparing Payment...</>
                  ) : (
                    'Proceed to Payment'
                  )}
                </button>
              )}

              {/* Trust micro-text */}
              <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-text-secondary/70 text-center">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Encrypted 256-Bit SSL Checkout</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── STEP 3: SUCCESS CONFIRMATION RECEIPT ── */}
      {step === 'SUCCESS' && paymentSuccessData && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.enter, ease: EASE_ENTER }}
          className="max-w-xl mx-auto py-6 sm:py-10 px-2"
        >
          <div className="bg-white border border-border/80 shadow-lg rounded-2xl p-6 sm:p-10 text-center space-y-6 relative overflow-hidden">
            {/* Ambient Background Accent Glow */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-accent-gold/10 rounded-full blur-2xl pointer-events-none" />

            {/* Restrained Success Tick Icon */}
            <div className="relative flex items-center justify-center mx-auto">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: DUR.enter, ease: EASE_ENTER }}
                className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative shadow-md shadow-emerald-500/10 border border-emerald-200/70"
              >
                <svg className="w-8 h-8 stroke-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: DUR.base, delay: 0.15, ease: EASE }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Header Content */}
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.2em] bg-emerald-100/70 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200/80">
                Payment Confirmed
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-medium uppercase text-text-primary tracking-tight">
                Order Successful!
              </h2>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Thank you for your order. We are preparing your minimal pieces with care.
              </p>
            </div>

            {/* Order Reference ID Pill */}
            <div className="bg-bg-subtle/80 border border-border/80 rounded-xl p-3.5 sm:p-4 flex items-center justify-between gap-3 text-left">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
                  Order Reference ID
                </span>
                <span className="font-mono text-sm sm:text-base font-bold text-text-primary tracking-wider">
                  #{paymentSuccessData.trackingId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (paymentSuccessData.trackingId) {
                    navigator.clipboard.writeText(paymentSuccessData.trackingId);
                    setCopiedTrackId(true);
                    setTimeout(() => setCopiedTrackId(false), 2000);
                  }
                }}
                className="px-3 py-1.5 border border-border/80 bg-white text-text-primary text-[11px] font-semibold uppercase tracking-wider hover:border-[#063A2C] hover:text-[#00221A] flex items-center gap-1.5 rounded-lg transition-all duration-150 shadow-2xs"
              >
                {copiedTrackId ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copiedTrackId ? 'Copied' : 'Copy ID'}</span>
              </button>
            </div>

            {/* Delivery Details */}
            <div className="bg-emerald-50/40 border border-emerald-200/50 p-3.5 rounded-xl flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-white border border-emerald-200 rounded-full flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-2xs">
                <Truck size={14} />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-emerald-950">Standard Delivery (3–5 Business Days)</p>
                <p className="text-emerald-800/80 text-[11px] truncate max-w-xs sm:max-w-md mt-0.5">
                  Delivering to: {paymentSuccessData.address}
                </p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <Link
                to="/account?tab=orders"
                className="btn ambient-green-gradient text-white px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-2 shadow-xs border border-white/10 hover:opacity-95"
              >
                <Package size={14} /> Track Order
              </Link>
              <Link
                to="/shop"
                className="btn btn-secondary px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-center flex items-center justify-center gap-2 hover:border-[#063A2C] hover:text-[#00221A]"
              >
                Continue Shopping <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Payment processing overlay — shown while verifying payment server-side */}
      {paymentLoading && (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
          <RefreshCw size={28} className="animate-spin text-white mb-3" />
          <p className="text-white text-xs font-semibold tracking-wider uppercase">Verifying Payment…</p>
          <p className="text-white/60 text-[11px] mt-1">Please do not close this window</p>
        </div>
      )}
    </div>
  );
}
