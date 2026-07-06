import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, MapPin, CheckCircle, Tag, AlertCircle, RefreshCw, X } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useAuthStore } from '../store/useAuthStore';
import { validateCoupon } from '../lib/coupons';
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

  // Simulated Razorpay Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<any>(null);

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

  // Handle Coupon Apply
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    setCouponSuccess(null);

    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code.');
      return;
    }

    const result = validateCoupon(couponCode, subtotal);
    if (!result.isValid) {
      setCouponError(result.error || 'Failed to apply coupon.');
      setAppliedCoupon(null);
      setCouponDiscount(0);
    } else {
      setAppliedCoupon(result.coupon);
      setCouponDiscount(result.discountAmount);
      setCouponSuccess(`Coupon "${result.coupon?.code}" applied successfully! Saved $${result.discountAmount.toFixed(2)}.`);
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

  // Trigger Payment Simulator (Razorpay checkout)
  const triggerPayment = () => {
    setShowPaymentModal(true);
  };

  // Finalize order writing to Supabase
  const finalizeOrder = async (isSuccess: boolean) => {
    setShowPaymentModal(false);
    if (!isSuccess) {
      setError('Payment cancelled or failed. Please try again.');
      return;
    }

    setLoading(true);
    setError(null);

    const trackingId = `ZP-${Math.floor(100000 + Math.random() * 900000)}-IN`;
    
    // Construct address info
    let finalAddressText = '';
    if (selectedAddressId !== 'new') {
      const selected = savedAddresses.find((a) => a.id === selectedAddressId);
      finalAddressText = selected 
        ? `${selected.line1}, ${selected.city}, ${selected.state} - ${selected.pincode}` 
        : '';
    } else {
      finalAddressText = `${addressForm.line1}, ${addressForm.city}, ${addressForm.state} - ${addressForm.pincode}`;
    }

    try {
      // 1. Try to write address to Supabase if it's a new address and user is logged in
      let dbAddressId = null;
      if (selectedAddressId === 'new' && user) {
        try {
          const { data: addressData } = await supabase
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
              is_default: addressForm.is_default
            })
            .select()
            .single();
          if (addressData) dbAddressId = addressData.id;
        } catch (addrErr) {
          console.warn('Address write warning:', addrErr);
        }
      } else if (selectedAddressId !== 'new') {
        dbAddressId = selectedAddressId;
      }

      // 2. Try to write order to Supabase
      if (user) {
        try {
          const { data: orderData, error: orderErr } = await supabase
            .from('orders')
            .insert({
              user_id: user.id,
              status: 'processing',
              total: total,
              address_id: dbAddressId,
              tracking_id: trackingId
            })
            .select()
            .single();

          if (orderErr) throw orderErr;

          if (orderData && items.length > 0) {
            // Write order items
            const orderItemsInsert = items.map((item) => ({
              order_id: orderData.id,
              variant_id: item.variantId,
              quantity: item.quantity,
              price_at_purchase: item.price
            }));

            await supabase.from('order_items').insert(orderItemsInsert);
          }
        } catch (dbErr) {
          console.warn('Database order write fell back to local memory (Placeholder key or connection issue):', dbErr);
        }
      }

      // 3. Set payment receipt context
      setPaymentSuccessData({
        trackingId,
        total,
        itemsCount: items.reduce((acc, curr) => acc + curr.quantity, 0),
        address: finalAddressText,
        date: new Date().toLocaleDateString()
      });

      // Clear the cart
      clearCart();
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message || 'Failed to process order. Please try again.');
    } finally {
      setLoading(false);
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
                      className={`p-4 border cursor-pointer flex flex-col justify-between ${
                        selectedAddressId === addr.id
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
                    className={`p-4 border cursor-pointer flex items-center justify-center border-dashed ${
                      selectedAddressId === 'new'
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              className="w-full bg-accent text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
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
                    <img src={item.image} alt={item.name} className="w-10 aspect-[3/4] object-cover object-center bg-white border border-border" />
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
                    className="bg-accent text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-accent-hover"
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
                Try <span className="font-bold text-text-primary">ZENPHIRE10</span> (10% off) or <span className="font-bold text-text-primary">ZENPHIRE50</span> ($50 off orders &gt; $200).
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
                onClick={triggerPayment}
                className="w-full bg-accent text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                Proceed to Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          STEP 3: SUCCESS PAYMENT CONFIRMATION RECEIPT
         ------------------------------------------------------------- */}
      {step === 'SUCCESS' && paymentSuccessData && (
        <div className="max-w-2xl mx-auto py-12 px-4">
          <div className="bg-white border border-border p-8 md:p-10 space-y-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 flex items-center justify-center rounded-full mx-auto">
              <CheckCircle size={36} className="stroke-[1.5]" />
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-widest bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1">
                Payment Success
              </span>
              <h2 className="text-2xl md:text-3xl font-heading font-black uppercase text-text-primary mt-3">
                Thank you for your order!
              </h2>
              <p className="text-sm text-text-secondary">
                Your order has been received and is being processed by our minimal atelier.
              </p>
            </div>

            {/* Receipt details */}
            <div className="bg-bg-subtle border border-border p-6 text-left space-y-3 text-sm">
              <div className="flex justify-between border-b border-border pb-2.5 text-xs uppercase tracking-wider font-bold text-text-secondary">
                <span>Receipt Summary</span>
                <span>Details</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Order ID / tracking:</span>
                <span className="font-mono font-semibold text-text-primary">{paymentSuccessData.trackingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Transaction Date:</span>
                <span className="font-semibold text-text-primary">{paymentSuccessData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Items Quantity:</span>
                <span className="font-semibold text-text-primary">{paymentSuccessData.itemsCount} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Total Paid:</span>
                <span className="font-bold text-text-primary">₹{paymentSuccessData.total.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3 mt-1">
                <span className="block text-xs uppercase tracking-wider font-bold text-text-secondary mb-1">
                  Shipping Destination:
                </span>
                <p className="text-xs text-text-primary leading-relaxed">{paymentSuccessData.address}</p>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/shop"
                className="bg-accent text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors text-center"
              >
                Continue Shopping
              </Link>
              <Link
                to="/account"
                className="border border-border bg-white text-text-primary px-8 py-3.5 text-xs font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors text-center"
              >
                Track Orders
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          RAZORPAY SIMULATED PAYMENT MODAL DIALOG
         ------------------------------------------------------------- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm"></div>

          {/* Dialog Panel */}
          <div className="relative w-full max-w-sm bg-[#111116] text-white border border-[#22222a] p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-[#22222a] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-bold bg-blue-600 text-white px-2 py-0.5">
                  Razorpay
                </span>
                <span className="text-xs font-semibold text-gray-400">Checkout Security</span>
              </div>
              <button
                onClick={() => finalizeOrder(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-gray-400">Merchant Payment</span>
              <h3 className="text-lg font-bold">Zenphire Collections</h3>
              <div className="flex justify-between items-baseline pt-2 border-t border-[#22222a]">
                <span className="text-xs text-gray-400">Amount Payable:</span>
                <span className="text-xl font-bold text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-[#1c1c24] border border-[#2a2a38] p-4 text-xs space-y-2 text-gray-300">
              <p className="font-semibold text-white">Select Simulated Status:</p>
              <p className="leading-relaxed">
                Click **Authorize** to mock a successful payment, or **Refuse** to mock payment rejection.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={loading}
                onClick={() => finalizeOrder(false)}
                className="flex-1 bg-transparent hover:bg-white/5 border border-gray-600 hover:border-white text-gray-300 hover:text-white py-3 text-xs font-bold uppercase tracking-wider transition-colors text-center"
              >
                Refuse
              </button>
              <button
                disabled={loading}
                onClick={() => finalizeOrder(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-xs font-bold uppercase tracking-wider transition-colors text-center flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <RefreshCw size={12} className="animate-spin" />
                ) : (
                  'Authorize'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
