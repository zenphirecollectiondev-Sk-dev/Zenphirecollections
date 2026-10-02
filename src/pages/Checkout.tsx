import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, MapPin, CheckCircle, Tag, AlertCircle, RefreshCw, Copy, Check, Truck, Package } from 'lucide-react';
import { motion } from 'framer-motion';
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
      setError('Please fill in all shipping address fields.');
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
  // Step 1: Call /api/create-razorpay-order to get server-verified total
  // Step 2: Open Razorpay checkout modal (real SDK)
  // Step 3: On success, call /api/verify-razorpay-payment (HMAC check + DB write)
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
        theme: { color: '#2B2B2B' },
        modal: {
          ondismiss: () => {
            setError('Payment cancelled. Your cart is saved — you can try again anytime.');
          },
        },
        handler: async (response: any) => {
          // Called by Razorpay after successful payment
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

      // Verify signature + write order atomically on server
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
        // Payment was real but DB write failed — show payment ID for support
        setError(
          result.error ||
            `Order could not be saved. Please contact support with Payment ID: ${rzpResponse.razorpay_payment_id}`,
        );
        setPaymentLoading(false);
        return;
      }

      // All good — show success screen
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
    } catch (err: any) {
      setError(err.message || 'Payment confirmed but order save failed. Please contact support.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-screen relative">
      {/* Page Header */}
      {step !== 'SUCCESS' && (
        <div className="border-b border-border pb-6 mb-8 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-[0.2em] text-text-secondary font-bold">
              Checkout Flow
            </span>
            <h1 className="text-3xl font-heading font-black uppercase mt-1">
              Secure Checkout
            </h1>
          </div>
          <div className="flex gap-2 text-xs uppercase tracking-wider font-semibold">
            <span className={step === 'SHIPPING' ? 'text-text-primary underline font-bold' : 'text-text-secondary'}>Shipping</span>
            <span className="text-text-secondary">&bull;</span>
            <span className={step === 'REVIEW' ? 'text-text-primary underline font-bold' : 'text-text-secondary'}>Review & Pay</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* -------------------------------------------------------------
          STEP 1: SHIPPING ADDRESS ENTRY
         ------------------------------------------------------------- */}
      {step === 'SHIPPING' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <form onSubmit={handleShippingSubmit} className="lg:col-span-8 space-y-6">
            <h2 className="text-lg font-heading font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border">
              Shipping Address
            </h2>

            {/* Saved addresses selector */}
            {savedAddresses.length > 0 && (
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                  Select a Saved Address
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedAddresses.map((addr) => (
                    <div
                      key={addr.id}
                      onClick={() => setSelectedAddressId(addr.id)}
                      className={`p-4 border cursor-pointer flex flex-col justify-between ${selectedAddressId === addr.id
                        ? 'border-accent bg-bg-subtle'
                        : 'border-border bg-white hover:border-accent'
                        }`}
                    >
                      <p className="text-sm font-medium text-text-primary leading-relaxed">{addr.line1}</p>
                      <p className="text-xs text-text-secondary mt-1">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      {addr.is_default && (
                        <span className="text-[9px] uppercase tracking-wider bg-accent text-white font-bold px-1.5 py-0.5 rounded-none self-start mt-3">
                          Default
                        </span>
                      )}
                    </div>
                  ))}
                  <div
                    onClick={() => setSelectedAddressId('new')}
                    className={`p-4 border cursor-pointer flex items-center justify-center border-dashed ${selectedAddressId === 'new'
                      ? 'border-accent bg-bg-subtle'
                      : 'border-border bg-white hover:border-accent'
                      }`}
                  >
                    <span className="text-xs uppercase tracking-wider font-bold text-text-secondary">
                      + Add New Address
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Form for new address */}
            {selectedAddressId === 'new' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="recipient_name" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      Recipient Name
                    </label>
                    <input
                      id="recipient_name"
                      name="recipient_name"
                      type="text"
                      required
                      value={addressForm.recipient_name}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="e.g. John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone_primary" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      Mobile Number
                    </label>
                    <input
                      id="phone_primary"
                      name="phone_primary"
                      type="tel"
                      required
                      value={addressForm.phone_primary}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="10-digit mobile"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone_secondary" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      Alt Mobile (Optional)
                    </label>
                    <input
                      id="phone_secondary"
                      name="phone_secondary"
                      type="tel"
                      value={addressForm.phone_secondary}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="10-digit mobile"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="line1" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                    Street Address
                  </label>
                  <input
                    id="line1"
                    name="line1"
                    type="text"
                    required
                    value={addressForm.line1}
                    onChange={handleAddressInputChange}
                    className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                    placeholder="Flat/House No, Building, Street Name"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      City
                    </label>
                    <input
                      id="city"
                      name="city"
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="e.g. Mumbai"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      State
                    </label>
                    <input
                      id="state"
                      name="state"
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="e.g. Maharashtra"
                    />
                  </div>

                  <div>
                    <label htmlFor="pincode" className="block text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-2">
                      Pincode
                    </label>
                    <input
                      id="pincode"
                      name="pincode"
                      type="text"
                      required
                      value={addressForm.pincode}
                      onChange={handleAddressInputChange}
                      className="w-full px-4 py-3 border border-border bg-white text-text-primary text-sm rounded-none focus:outline-none focus:border-accent"
                      placeholder="400001"
                    />
                  </div>
                </div>

                {user && (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      id="is_default"
                      name="is_default"
                      type="checkbox"
                      checked={addressForm.is_default}
                      onChange={handleAddressInputChange}
                      className="w-4 h-4 accent-accent"
                    />
                    <label htmlFor="is_default" className="text-xs text-text-secondary select-none">
                      Save as default shipping address
                    </label>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full py-4 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2"
            >
              Continue to Review <ArrowRight size={14} />
            </button>
          </form>

          {/* Cart items review sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-bg-subtle border border-border p-6 space-y-6">
              <h2 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary pb-3 border-b border-border">
                Your Order
              </h2>
              <div className="max-h-60 overflow-y-auto divide-y divide-border pr-2">
                {items.map((item) => (
                  <div key={item.id} className="py-3 flex gap-3 first:pt-0 last:pb-0">
                    <img src={item.image} alt={item.name} className="w-10 aspect-[2/3] object-cover object-center bg-white border border-border" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-text-primary truncate">{item.name}</h4>
                      <p className="text-[10px] text-text-secondary mt-0.5">Size: {item.size} | Qty: {item.quantity}</p>
                    </div>
                    <span className="text-xs font-bold text-text-primary">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 text-sm flex justify-between items-baseline">
                <span className="font-heading font-bold uppercase text-xs tracking-wider">Subtotal</span>
                <span className="font-bold text-text-primary">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STEP 2: ORDER REVIEW & PAYMENTS
         ------------------------------------------------------------- */}
      {step === 'REVIEW' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8">
            {/* Delivery address review */}
            <div className="bg-white border border-border p-6 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                  <MapPin size={14} /> Shipping Destination
                </h3>
                <button
                  onClick={() => setStep('SHIPPING')}
                  className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-4"
                >
                  Change
                </button>
              </div>
              <div className="text-sm leading-relaxed">
                {selectedAddressId !== 'new' ? (
                  <>
                    <p className="font-medium text-text-primary">
                      {savedAddresses.find((a) => a.id === selectedAddressId)?.line1}
                    </p>
                    <p className="text-text-secondary mt-0.5">
                      {savedAddresses.find((a) => a.id === selectedAddressId)?.city},{' '}
                      {savedAddresses.find((a) => a.id === selectedAddressId)?.state} -{' '}
                      {savedAddresses.find((a) => a.id === selectedAddressId)?.pincode}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-text-primary">{addressForm.line1}</p>
                    <p className="text-text-secondary mt-0.5">
                      {addressForm.city}, {addressForm.state} - {addressForm.pincode}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Coupons selection */}
            <div className="bg-white border border-border p-6 space-y-4">
              <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary pb-2 border-b border-border flex items-center gap-1.5">
                <Tag size={14} /> Promo Discount Coupon
              </h3>

              {appliedCoupon ? (
                <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs flex justify-between items-center">
                  <span className="font-semibold">Applied: {appliedCoupon.code} (-₹{couponDiscount.toFixed(2)})</span>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-[10px] uppercase font-bold text-sale hover:underline"
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
                    placeholder="Enter code (e.g. ZENPHIRE10)"
                    className="flex-1 px-4 py-2.5 border border-border text-sm rounded-none focus:outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="btn btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider"
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

              <p className="text-[11px] text-text-secondary">
                Try <span className="font-bold text-text-primary">ZENPHIRE10</span> (10% off) or <span className="font-bold text-text-primary">ZENPHIRE50</span> (₹50 off orders &gt; ₹200).
              </p>
            </div>

            {/* Payment security info */}
            <div className="bg-emerald-50/50 border border-emerald-100 p-6 flex gap-4 items-center">
              <ShieldCheck className="text-emerald-600 stroke-[1.5] w-12 h-12 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">Fully Encrypted Transactions</h4>
                <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                  Your payments are processed safely through standard banking API protocols. No card data is stored on our servers.
                </p>
              </div>
            </div>
          </div>

          {/* Pricing breakdown summary */}
          <div className="lg:col-span-4">
            <div className="bg-bg-subtle border border-border p-6 space-y-6">
              <h2 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary pb-3 border-b border-border">
                Review Total
              </h2>
              <div className="space-y-4 text-sm border-b border-border pb-4">
                <div className="flex justify-between text-text-secondary">
                  <span>Subtotal</span>
                  <span className="font-semibold text-text-primary">₹{subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>-₹{discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-text-secondary">
                  <span>Shipping</span>
                  {shipping === 0 ? (
                    <span className="font-bold text-emerald-600 uppercase text-xs">Free</span>
                  ) : (
                    <span className="font-semibold text-text-primary">₹{shipping.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-baseline pb-2">
                <span className="font-heading font-bold uppercase text-xs tracking-wider">Grand Total</span>
                <span className="text-2xl font-bold text-text-primary">₹{total.toFixed(2)}</span>
              </div>

              <button
                onClick={initializePayment}
                disabled={loading || paymentLoading}
                className="btn btn-primary w-full py-4 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading || paymentLoading ? (
                  <><RefreshCw size={14} className="animate-spin" /> Preparing Payment...</>
                ) : (
                  'Proceed to Payment'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STEP 3: SUCCESS PAYMENT CONFIRMATION RECEIPT
         ------------------------------------------------------------- */}
      {step === 'SUCCESS' && paymentSuccessData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl mx-auto py-10 px-4"
        >
          <div className="bg-white border border-border shadow-2xl p-8 md:p-12 text-center space-y-8 relative overflow-hidden">
            {/* Ambient Background Accent Glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

            {/* Premium Animated Tick Icon */}
            <div className="relative flex items-center justify-center mx-auto">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [0.6, 1.15, 1], opacity: 1 }}
                transition={{ duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }}
                className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center relative shadow-lg shadow-emerald-500/10 border border-emerald-200/80"
              >
                {/* Ripple ring animation */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0.8 }}
                  animate={{ scale: 1.5, opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                  className="absolute inset-0 rounded-full border border-emerald-400"
                />

                <svg className="w-10 h-10 stroke-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path
                    d="M20 6L9 17l-5-5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeInOut' }}
                  />
                </svg>
              </motion.div>
            </div>

            {/* Header Content */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] bg-emerald-100/80 text-emerald-900 font-bold px-3 py-1 rounded-full border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Payment Confirmed & Verified
              </span>
              <h2 className="text-3xl md:text-4xl font-heading font-black uppercase text-text-primary pt-2 tracking-tight">
                Order Successful!
              </h2>
              <p className="text-sm text-text-secondary max-w-md mx-auto leading-relaxed">
                Thank you for your order! Our team is preparing your minimal collection pieces with care.
              </p>
            </div>

            {/* Official Order ID Copy Banner */}
            <div className="bg-bg-subtle border border-border/80 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-left">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary block mb-1">
                  Official Order Reference ID
                </span>
                <span className="font-mono text-lg font-bold text-text-primary tracking-wider">
                  #{paymentSuccessData.trackingId}
                </span>
                <p className="text-xs text-text-secondary mt-1 font-medium">
                  Keep this Order ID to track your order or quote it when contacting customer support.
                </p>
              </div>
              <button
                onClick={() => {
                  if (paymentSuccessData.trackingId) {
                    navigator.clipboard.writeText(paymentSuccessData.trackingId);
                    setCopiedTrackId(true);
                    setTimeout(() => setCopiedTrackId(false), 2000);
                  }
                }}
                className="btn border border-border bg-white text-text-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:border-accent flex items-center gap-1.5 shadow-2xs rounded-lg transition-all flex-shrink-0"
              >
                {copiedTrackId ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedTrackId ? 'Copied ID' : 'Copy Order ID'}
              </button>
            </div>

            {/* Estimated Delivery Status Pill */}
            <div className="bg-emerald-50/50 border border-emerald-200/60 p-4 rounded-lg flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-white border border-emerald-200 rounded-full flex items-center justify-center text-emerald-700 flex-shrink-0 shadow-xs">
                <Truck size={20} />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-950">Estimated Dispatch & Delivery</h4>
                <p className="text-xs text-emerald-800 font-medium">Standard Express Delivery (3 &ndash; 5 Business Days)</p>
              </div>
            </div>

            {/* Detailed Receipt Breakdown */}
            <div className="bg-bg-subtle border border-border/80 rounded-lg p-5 text-left space-y-3.5 text-xs">
              <div className="flex justify-between border-b border-border pb-3 uppercase tracking-wider font-bold text-text-secondary text-[11px]">
                <span>Order Summary</span>
                <span>Details</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Transaction Date</span>
                <span className="font-semibold text-text-primary">{paymentSuccessData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary font-medium">Total Quantity</span>
                <span className="font-semibold text-text-primary">{paymentSuccessData.itemsCount} {paymentSuccessData.itemsCount === 1 ? 'Item' : 'Items'}</span>
              </div>
              <div className="flex justify-between border-t border-border/50 pt-2.5">
                <span className="text-text-primary font-bold">Total Paid</span>
                <span className="font-bold text-base text-text-primary">₹{paymentSuccessData.total.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <span className="block text-[10px] uppercase tracking-wider font-bold text-text-secondary mb-1">
                  Delivery Address:
                </span>
                <p className="text-xs text-text-primary leading-relaxed">{paymentSuccessData.address}</p>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3.5 justify-center">
              <Link
                to="/account?tab=orders"
                className="btn btn-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-center flex items-center justify-center gap-2 shadow-md"
              >
                <Package size={15} /> Track Order
              </Link>
              <Link
                to="/shop"
                className="border border-border bg-white text-text-primary px-8 py-4 text-xs font-bold uppercase tracking-widest hover:border-text-primary transition-all text-center flex items-center justify-center gap-2"
              >
                Continue Shopping <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </motion.div>
      )}
      {/* Payment processing overlay — shown while verifying payment server-side */}
      {paymentLoading && (
        <div className="fixed inset-0 z-[400] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
          <RefreshCw size={32} className="animate-spin text-white mb-4" />
          <p className="text-white text-sm font-semibold tracking-wider uppercase">Verifying Payment…</p>
          <p className="text-white/60 text-xs mt-2">Please do not close this tab</p>
        </div>
      )}
    </div>
  );
}
