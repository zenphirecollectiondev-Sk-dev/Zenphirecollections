import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, getUserAddresses, getUserOrders } from '../lib/supabase';
import type { AddressRow } from '../lib/supabase';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { EASE, EASE_ENTER } from '../lib/motion';
import PaymentDispatchNotice from '../components/PaymentDispatchNotice';
import {
  User,
  Phone,
  Calendar,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Edit2,
  LogOut,
  Loader2,
  Check,
  Package,
  AlertCircle,
  Copy,
  ExternalLink,
  Truck,
  ArrowRight,
  Clock,
  XCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price_at_purchase: number;
  product_variants: {
    size: string;
    color: string;
    products: {
      name: string;
      slug: string;
      product_images: { url: string }[];
    } | null;
  } | null;
}

interface OrderWithItems {
  id: string;
  order_number?: string | null;
  status: string;
  payment_status?: string | null;
  total: number;
  tracking_id: string | null;
  courier_name?: string | null;
  courier_tracking_url?: string | null;
  created_at: string;
  order_items: OrderItem[];
}

// Zod Validation Schema for Indian Mobile Numbers & Address Fields
const phoneRegex = /^[6-9]\d{9}$/;
const addressSchema = z.object({
  recipient_name: z.string().trim().min(1, 'Recipient name is required'),
  phone_primary: z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number'),
  phone_secondary: z.string().trim().regex(phoneRegex, 'Enter a valid 10-digit Indian mobile number').or(z.literal('')),
  line1: z.string().trim().min(1, 'Street address is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a valid 6-digit pincode')
});

export default function Account() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, profile, updateProfile, signOut } = useAuthStore();

  // Tabs - initialized from query param ?tab=orders
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>(() => {
    return searchParams.get('tab') === 'orders' ? 'orders' : 'profile';
  });

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'orders') {
      setActiveTab('orders');
    }
  }, [searchParams]);

  // Loading States
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Profile View/Edit Toggle State
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Profile Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Address State
  const [addresses, setAddresses] = useState<AddressRow[]>([]);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  // Address Form fields
  const [recipientName, setRecipientName] = useState('');
  const [phonePrimary, setPhonePrimary] = useState('');
  const [phoneSecondary, setPhoneSecondary] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Validation Errors state (for inline inputs)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [addressError, setAddressError] = useState<string | null>(null);

  // Orders State
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Pre-fill profile state on mount/update
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setDob(profile.dob || '');
      setGender(profile.gender || '');
    }
  }, [profile]);

  // Fetch Addresses
  const fetchAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const data = await getUserAddresses(user.id);
      setAddresses(data);
    } catch (err) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Fetch Orders
  const fetchOrders = async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const data = await getUserOrders(user.id);
      setOrders(data as any[]);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAddresses();
      fetchOrders();
    }
  }, [user]);

  // Sign out handler
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Profile Save
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate phone number format if provided
    if (phone.trim()) {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(phone.trim())) {
        setProfileError('Please enter a valid 10-digit Indian mobile number.');
        return;
      }
    }

    setLoadingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          phone: phone.trim(),
          dob: dob || null,
          gender: gender || null
        })
        .eq('id', user.id);

      if (error) throw error;

      updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        dob: dob || null,
        gender: gender || null
      });

      setProfileSuccess(true);
      setIsEditingProfile(false); // Automatically revert back to view mode on success
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to update profile.');
    } finally {
      setLoadingProfile(false);
    }
  };

  // Set default address (with Optimistic State Updates)
  const handleSetDefaultAddress = async (addressId: string) => {
    if (!user) return;

    const fallbackAddresses = [...addresses];

    // Optimistic Update: instantly set target default and toggle off others
    const optimisticallyUpdated = addresses.map(addr => ({
      ...addr,
      is_default: addr.id === addressId
    }));
    setAddresses(optimisticallyUpdated);

    try {
      const { error } = await supabase
        .from('addresses')
        .update({ is_default: true })
        .eq('id', addressId);

      if (error) throw error;

      // Pull fresh data to verify local state matches DB
      const data = await getUserAddresses(user.id);
      setAddresses(data);
    } catch (err: any) {
      console.error('Error setting default address:', err);
      // Revert back on error
      setAddresses(fallbackAddresses);
    }
  };

  // Delete address
  const handleDeleteAddress = async (addressId: string) => {
    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', addressId);

      if (error) throw error;
      fetchAddresses();
    } catch (err: any) {
      console.error('Error deleting address:', err);
    }
  };

  // Open Add Address form
  const handleOpenAddForm = () => {
    setEditingAddressId(null);
    setRecipientName('');
    setPhonePrimary('');
    setPhoneSecondary('');
    setLine1('');
    setCity('');
    setState('');
    setPincode('');
    setIsDefault(addresses.length === 0); // First address is default by default
    setAddressError(null);
    setValidationErrors({});
    setAddressFormOpen(true);
  };

  // Open Edit Address form
  const handleOpenEditForm = (addr: AddressRow) => {
    setEditingAddressId(addr.id);
    setRecipientName(addr.recipient_name);
    setPhonePrimary(addr.phone_primary);
    setPhoneSecondary(addr.phone_secondary || '');
    setLine1(addr.line1);
    setCity(addr.city);
    setState(addr.state);
    setPincode(addr.pincode);
    setIsDefault(addr.is_default);
    setAddressError(null);
    setValidationErrors({});
    setAddressFormOpen(true);
  };

  // Handle Address Submit
  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setValidationErrors({});
    setAddressError(null);

    // Validate using Zod schema
    const result = addressSchema.safeParse({
      recipient_name: recipientName,
      phone_primary: phonePrimary,
      phone_secondary: phoneSecondary,
      line1,
      city,
      state,
      pincode
    });
    if (!result.success) {
      const formattedErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const path = String(issue.path[0] || '');
        if (path) {
          formattedErrors[path] = issue.message;
        }
      });
      setValidationErrors(formattedErrors);
      return;
    }

    try {
      if (editingAddressId) {
        // Edit Mode
        const { error } = await supabase
          .from('addresses')
          .update({
            recipient_name: recipientName.trim(),
            phone_primary: phonePrimary.trim(),
            phone_secondary: phoneSecondary.trim() || null,
            line1: line1.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            is_default: isDefault
          })
          .eq('id', editingAddressId);

        if (error) throw error;
      } else {
        // Add Mode
        const { error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            recipient_name: recipientName.trim(),
            phone_primary: phonePrimary.trim(),
            phone_secondary: phoneSecondary.trim() || null,
            line1: line1.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            is_default: isDefault
          });

        if (error) throw error;
      }

      setAddressFormOpen(false);
      fetchAddresses();
    } catch (err: any) {
      setAddressError(err.message || 'Failed to save address.');
    }
  };

  // Formatted date string (e.g. "24 Oct 2026")
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Unified status helper: Guarantees unpaid or cancelled orders never display "Processing"
  const getUnifiedOrderStatus = (order: OrderWithItems) => {
    const paymentStatus = (order.payment_status || 'unpaid').toLowerCase();
    const fulfillmentStatus = (order.status || 'pending').toLowerCase();

    // 1. Payment failed or order explicitly cancelled
    if (paymentStatus === 'failed' || fulfillmentStatus === 'cancelled') {
      return {
        label: paymentStatus === 'failed' ? 'Payment Failed' : 'Cancelled',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
        dotClass: 'bg-rose-500',
        description: 'Payment was not completed or transaction was voided.',
        isFailedOrCancelled: true,
        isPaid: false,
      };
    }

    // 2. Unpaid / awaiting checkout completion
    if (paymentStatus === 'unpaid') {
      return {
        label: 'Awaiting Payment',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
        dotClass: 'bg-amber-500',
        description: 'Order initiated but payment is pending.',
        isFailedOrCancelled: false,
        isPaid: false,
      };
    }

    // 3. Paid orders — reflect actual dispatch milestones
    if (fulfillmentStatus === 'delivered') {
      return {
        label: 'Delivered',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
        dotClass: 'bg-emerald-600',
        description: 'Consignment successfully delivered at your door.',
        isFailedOrCancelled: false,
        isPaid: true,
      };
    }

    if (fulfillmentStatus === 'shipped') {
      return {
        label: 'In Transit',
        badgeClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
        dotClass: 'bg-sky-600',
        description: 'Dispatched with carrier and currently in transit.',
        isFailedOrCancelled: false,
        isPaid: true,
      };
    }

    // Default for paid order undergoing fulfillment
    return {
      label: 'Processing',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      dotClass: 'bg-emerald-600',
      description: 'Payment verified. Our team is preparing your package.',
      isFailedOrCancelled: false,
      isPaid: true,
    };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 md:py-14 anim-fade-up">
      {/* Title & Banner Header */}
      <div className="bg-white border border-border/60 rounded-2xl p-6 md:p-8 mb-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-widest bg-bg-subtle border border-border/70 text-text-secondary font-semibold px-3 py-1 rounded-full">
            Customer Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-tight uppercase mt-3 text-text-primary">
            Welcome, {profile?.name || 'Guest'}
          </h1>
          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5 font-medium">
            <Mail size={13} /> {user?.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-xl border border-border/80 bg-white text-text-primary px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-sale hover:text-white hover:border-sale transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center gap-2 shadow-2xs"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>

      {/* Modern Rounded Tab Selector */}
      <div className="flex bg-bg-subtle p-1.5 rounded-2xl border border-border/60 mb-8 max-w-md">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 py-3 px-4 text-xs font-bold tracking-wider uppercase rounded-xl transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeTab === 'profile'
              ? 'bg-white text-text-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Profile & Addresses
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 px-4 text-xs font-bold tracking-wider uppercase rounded-xl transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            activeTab === 'orders'
              ? 'bg-white text-text-primary shadow-xs'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Order History ({orders.length})
        </button>
      </div>

      {/* Tab Contents with Clean Transition */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === 'profile' ? (
          <motion.div
            key="tab-profile"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE_ENTER }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >

          {/* Left Column: Personal Profile Card */}
          <div className="lg:col-span-5 bg-white border border-border/60 rounded-2xl p-6 md:p-7 shadow-xs hover:shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">

            {!isEditingProfile ? (
              /* VIEW MODE */
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border/60 pb-4">
                  <div>
                    <h2 className="text-base font-heading font-bold uppercase tracking-wider text-text-primary">
                      Personal Profile
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Your personal account details and info.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileError(null);
                      setIsEditingProfile(true);
                    }}
                    className="rounded-lg border border-border/80 text-text-primary bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-bg-subtle transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center gap-1.5 shadow-2xs"
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                    <Check size={14} className="flex-shrink-0" />
                    Profile updated successfully.
                  </div>
                )}

                <div className="space-y-3.5">
                  {/* Full Name */}
                  <div className="bg-bg-subtle/70 border border-border/50 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold block mb-0.5">
                      Full Name
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {profile?.name || 'Not provided'}
                    </span>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-bg-subtle/70 border border-border/50 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold block mb-0.5">
                      Phone Number
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {profile?.phone || 'Not provided'}
                    </span>
                  </div>

                  {/* Date of Birth */}
                  <div className="bg-bg-subtle/70 border border-border/50 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold block mb-0.5">
                      Date of Birth
                    </span>
                    <span className="text-sm font-bold text-text-primary">
                      {profile?.dob ? formatDate(profile.dob) : 'Not provided'}
                    </span>
                  </div>

                  {/* Gender */}
                  <div className="bg-bg-subtle/70 border border-border/50 rounded-xl p-4">
                    <span className="text-xs uppercase tracking-wider text-text-secondary font-semibold block mb-0.5">
                      Gender
                    </span>
                    <span className="text-sm font-bold text-text-primary uppercase tracking-wide">
                      {profile?.gender || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                <div className="border-b border-border/60 pb-4">
                  <h2 className="text-base font-heading font-bold uppercase tracking-wider text-text-primary">
                    Edit Profile
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Update your account details below.
                  </p>
                </div>

                {profileError && (
                  <div className="p-3 bg-sale/10 border border-sale/30 text-sale text-xs rounded-lg flex items-center gap-2 font-medium">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="p-name" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <User size={13} className="text-text-secondary" /> Full Name
                    </label>
                    <input
                      id="p-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="p-phone" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <Phone size={13} className="text-text-secondary" /> Phone Number
                    </label>
                    <input
                      id="p-phone"
                      type="tel"
                      placeholder="e.g. 9999999999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label htmlFor="p-dob" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <Calendar size={13} className="text-text-secondary" /> Date of Birth
                    </label>
                    <input
                      id="p-dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label htmlFor="p-gender" className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <User size={13} className="text-text-secondary" /> Gender
                    </label>
                    <select
                      id="p-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-white text-text-primary text-sm focus:outline-none focus:border-accent appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25234A5568%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_10px_center] bg-no-repeat pr-8 uppercase tracking-wide font-semibold shadow-2xs"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="unisex">Unisex</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border/60">
                    <button
                      type="button"
                      onClick={() => {
                        if (profile) {
                          setName(profile.name || '');
                          setPhone(profile.phone || '');
                          setDob(profile.dob || '');
                          setGender(profile.gender || '');
                        }
                        setProfileError(null);
                        setIsEditingProfile(false);
                      }}
                      className="w-1/2 rounded-xl border border-border bg-white text-text-primary py-3 font-bold uppercase text-xs tracking-wider hover:bg-bg-subtle transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingProfile}
                      className="btn btn-primary w-1/2 rounded-xl py-3 font-bold uppercase text-xs tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingProfile ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : 'Save Details'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Address Book Card */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-border/60 rounded-2xl p-6 md:p-7 shadow-xs hover:shadow-sm transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]">
              <div className="flex justify-between items-center border-b border-border/60 pb-4 mb-6">
                <div>
                  <h2 className="text-base font-heading font-bold uppercase tracking-wider text-text-primary">
                    Address Book
                  </h2>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Manage your billing and shipping destinations.
                  </p>
                </div>
                {!addressFormOpen && (
                  <button
                    onClick={handleOpenAddForm}
                    className="rounded-lg border border-border/80 text-text-primary bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-bg-subtle transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] flex items-center gap-1.5 shadow-2xs"
                  >
                    <Plus size={13} /> Add Address
                  </button>
                )}
              </div>

              {/* Address Form (Inline toggled with clean slide & fade) */}
              <AnimatePresence>
                {addressFormOpen && (
                  <motion.div
                    key="account-address-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                    transition={{ duration: 0.22, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-xl border border-border/80 p-5 bg-bg-subtle/70 mb-6 space-y-4 shadow-2xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        {editingAddressId ? 'Edit Saved Address' : 'Add New Address'}
                      </h3>

                  {addressError && (
                    <div className="p-3 bg-sale/10 border border-sale/30 text-sale text-xs rounded-lg flex items-center gap-2 font-medium">
                      <AlertCircle size={14} className="flex-shrink-0" />
                      {addressError}
                    </div>
                  )}

                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    {/* Recipient Name */}
                    <div>
                      <label htmlFor="addr-name" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                        Recipient Name
                      </label>
                      <input
                        id="addr-name"
                        type="text"
                        placeholder="Name of the person receiving the delivery"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.recipient_name ? 'border-sale' : 'border-border'
                          }`}
                      />
                      {validationErrors.recipient_name && (
                        <p className="text-xs text-sale font-medium mt-1">{validationErrors.recipient_name}</p>
                      )}
                    </div>

                    {/* Mobile Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="addr-phone1" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                          Mobile Number
                        </label>
                        <input
                          id="addr-phone1"
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phonePrimary}
                          onChange={(e) => setPhonePrimary(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.phone_primary ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.phone_primary && (
                          <p className="text-xs text-sale font-medium mt-1">{validationErrors.phone_primary}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-phone2" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                          Alternate Mobile (Optional)
                        </label>
                        <input
                          id="addr-phone2"
                          type="tel"
                          placeholder="Alternate 10-digit mobile"
                          value={phoneSecondary}
                          onChange={(e) => setPhoneSecondary(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.phone_secondary ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.phone_secondary && (
                          <p className="text-xs text-sale font-medium mt-1">{validationErrors.phone_secondary}</p>
                        )}
                      </div>
                    </div>

                    {/* Street Address */}
                    <div>
                      <label htmlFor="addr-line1" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                        Street Address / Line 1
                      </label>
                      <input
                        id="addr-line1"
                        type="text"
                        placeholder="Flat/House No, Building, Street Name"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.line1 ? 'border-sale' : 'border-border'
                          }`}
                      />
                      {validationErrors.line1 && (
                        <p className="text-xs text-sale font-medium mt-1">{validationErrors.line1}</p>
                      )}
                    </div>

                    {/* City, State, Pincode */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="addr-city" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                          City
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.city ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.city && (
                          <p className="text-xs text-sale font-medium mt-1">{validationErrors.city}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-state" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                          State
                        </label>
                        <input
                          id="addr-state"
                          type="text"
                          placeholder="e.g. Maharashtra"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.state ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.state && (
                          <p className="text-xs text-sale font-medium mt-1">{validationErrors.state}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-pincode" className="block text-xs font-bold uppercase tracking-wider text-text-secondary mb-1">
                          Pincode
                        </label>
                        <input
                          id="addr-pincode"
                          type="text"
                          placeholder="6-digit pincode"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className={`w-full px-3.5 py-2.5 rounded-lg border bg-white text-text-primary text-sm focus:outline-none focus:border-accent shadow-2xs ${validationErrors.pincode ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.pincode && (
                          <p className="text-xs text-sale font-medium mt-1">{validationErrors.pincode}</p>
                        )}
                      </div>
                    </div>

                    {/* Default Toggler */}
                    <div className="flex items-center gap-2 py-1">
                      <input
                        id="addr-default"
                        type="checkbox"
                        checked={isDefault}
                        onChange={(e) => setIsDefault(e.target.checked)}
                        disabled={addresses.length === 0 || (editingAddressId !== null && addresses.find(a => a.id === editingAddressId)?.is_default)}
                        className="rounded border-border text-accent focus:ring-0 cursor-pointer h-4 w-4"
                      />
                      <label htmlFor="addr-default" className="text-xs font-bold uppercase tracking-wider text-text-primary select-none cursor-pointer">
                        Set as Default Shipping Address
                      </label>
                    </div>

                    {/* Form Controls */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-border/60">
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(false)}
                        className="rounded-lg px-4 py-2.5 min-h-[40px] border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary rounded-lg px-4 py-2.5 min-h-[40px] text-xs font-bold uppercase tracking-wider"
                      >
                        {editingAddressId ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

              {/* Address List */}
              {loadingAddresses ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-text-secondary" />
                </div>
              ) : addresses.length === 0 ? (
                /* POLISHED EMPTY STATE */
                <div className="border border-dashed border-border/80 rounded-2xl bg-bg-subtle/50 py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-xs border border-border mb-3">
                    <MapPin size={20} className="text-text-secondary stroke-[1.5]" />
                  </div>
                  <p className="text-xs text-text-primary font-heading font-bold uppercase tracking-wider">
                    No addresses saved yet
                  </p>
                  <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed">
                    Add a shipping destination to speed up your checkout.
                  </p>
                  <button
                    onClick={handleOpenAddForm}
                    className="btn btn-primary mt-4 rounded-xl px-5 py-2.5 text-xs font-bold uppercase tracking-widest shadow-xs min-h-[44px]"
                  >
                    Add your first address
                  </button>
                </div>
              ) : (
                /* Saved Address List Cards */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`border rounded-xl p-5 bg-white relative transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-2xs hover:shadow-xs ${addr.is_default
                          ? 'border-accent ring-1 ring-accent/30'
                          : 'border-border/70 hover:border-text-secondary'
                        }`}
                    >
                      {addr.is_default && (
                        <span className="absolute top-4 right-4 bg-accent text-white font-bold text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                          Default
                        </span>
                      )}

                      <div className="flex items-start gap-2.5 mb-3">
                        <MapPin size={15} className="text-text-secondary mt-0.5 flex-shrink-0" />
                        <div className="space-y-1">
                          <p className="text-xs text-text-primary font-bold uppercase tracking-wider pr-14">
                            {addr.recipient_name || 'No Name'}
                          </p>
                          <p className="text-xs text-text-primary leading-relaxed pr-8 font-medium">
                            {addr.line1}
                          </p>
                          <p className="text-xs text-text-secondary font-medium">
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                          <div className="text-xs text-text-secondary pt-2 leading-normal border-t border-border/50">
                            <span className="font-semibold text-text-primary">Phone:</span> {addr.phone_primary}
                            {addr.phone_secondary && (
                              <>
                                <br />
                                <span className="font-semibold text-text-primary">Alt:</span> {addr.phone_secondary}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-5 pt-3 border-t border-border/60">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] min-h-[36px] flex items-center"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1 min-h-[36px]">
                            <Check size={12} /> Active Default
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditForm(addr)}
                            aria-label="Edit address"
                            className="text-text-secondary hover:text-accent p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-lg hover:bg-bg-subtle"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            aria-label="Delete address"
                            className="text-text-secondary hover:text-sale p-2 min-w-[36px] min-h-[36px] flex items-center justify-center transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-lg hover:bg-bg-subtle"
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
          </div>
        </motion.div>
      ) : (
        /* Tab 2: Orders History (Minimal Modern Redesign) */
        <motion.div
          key="tab-orders"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: EASE_ENTER }}
          className="space-y-6"
        >
          {/* Header Bar */}
          <div className="bg-white border border-border/60 rounded-2xl p-6 md:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-heading font-bold uppercase tracking-wider text-text-primary">
                  Order History
                </h2>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-bg-subtle border border-border/60 text-text-secondary">
                  {orders.length}
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                View your previous orders, real-time tracking, and receipts.
              </p>
            </div>
            <button
              onClick={() => navigate('/shop')}
              className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-accent hover:text-accent-hover transition-colors"
            >
              <span>Explore Collection</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {loadingOrders ? (
            <div className="bg-white border border-border/60 rounded-2xl py-16 flex flex-col items-center justify-center text-text-secondary">
              <Loader2 size={24} className="animate-spin mb-2" />
              <p className="text-xs font-medium">Loading your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border border-dashed border-border/80 rounded-2xl py-16 px-6 text-center">
              <div className="w-12 h-12 bg-bg-subtle rounded-full flex items-center justify-center mx-auto mb-3">
                <Package size={22} className="text-text-secondary stroke-[1.5]" />
              </div>
              <p className="text-sm font-heading font-bold uppercase tracking-wider text-text-primary">
                No orders placed yet
              </p>
              <p className="text-xs text-text-secondary mt-1 max-w-sm mx-auto">
                Once you place an order, its progress, tracking numbers, and receipt details will appear here.
              </p>
              <button
                onClick={() => navigate('/shop')}
                className="btn btn-primary mt-5 rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-widest shadow-2xs"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order, orderIdx) => {
                const statusInfo = getUnifiedOrderStatus(order);
                const orderRefId =
                  order.order_number?.trim() ||
                  (order.tracking_id &&
                  (order.tracking_id.toUpperCase().startsWith('ZPN-') ||
                    order.tracking_id.toUpperCase().startsWith('ZP-'))
                    ? order.tracking_id
                    : `ZPN-${String(orders.length - orderIdx).padStart(3, '0')}`);

                const isCourierAssigned = Boolean(
                  order.tracking_id &&
                    !order.tracking_id.toUpperCase().startsWith('ZPN-') &&
                    !order.tracking_id.toUpperCase().startsWith('ZP-')
                );

                const isExpanded = expandedOrderId === order.id;
                const itemsCount = order.order_items?.reduce((acc, i) => acc + (i.quantity || 1), 0) || 0;

                const activeStepIdx =
                  order.status?.toLowerCase() === 'delivered'
                    ? 3
                    : order.status?.toLowerCase() === 'shipped'
                    ? 2
                    : 1;

                return (
                  <div
                    key={order.id}
                    className="bg-white border border-border/70 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition-all duration-200"
                  >
                    {/* Top Summary Bar */}
                    <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 bg-bg-subtle/30">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-text-primary uppercase tracking-tight">
                            #{orderRefId}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(orderRefId);
                              setCopiedOrderId(order.id);
                              setTimeout(() => setCopiedOrderId(null), 2000);
                            }}
                            className="text-text-secondary hover:text-text-primary p-1 rounded transition-colors"
                            title="Copy Order Reference ID"
                          >
                            {copiedOrderId === order.id ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <span className="text-border/80 hidden sm:inline">•</span>
                        <span className="text-xs text-text-secondary">
                          {formatDate(order.created_at)}
                        </span>
                        <span className="text-border/80 hidden sm:inline">•</span>
                        <span className="text-xs text-text-secondary">
                          {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${statusInfo.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                          {statusInfo.label}
                        </span>

                        {/* Order Total */}
                        <span className="text-sm font-bold text-text-primary font-heading">
                          ₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div className="p-4 sm:p-5 divide-y divide-border/40">
                      {order.order_items?.map((item) => {
                        const product = item.product_variants?.products;
                        const image = product?.product_images?.[0]?.url;

                        return (
                          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                              <div className="w-12 h-14 sm:w-14 sm:h-16 bg-bg-subtle rounded-lg overflow-hidden border border-border/60 flex-shrink-0 flex items-center justify-center">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={product?.name || 'Product'}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  <Package size={18} className="text-text-secondary stroke-[1.2]" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-semibold text-text-primary tracking-wide truncate">
                                  {product?.name || 'Minimal Essential'}
                                </h4>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-secondary mt-0.5">
                                  {item.product_variants?.size && (
                                    <span>Size: {item.product_variants.size}</span>
                                  )}
                                  {item.product_variants?.color && (
                                    <>
                                      <span>•</span>
                                      <span>Color: {item.product_variants.color}</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span>Qty: {item.quantity}</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs sm:text-sm font-bold text-text-primary">
                                ₹{Number(item.quantity * item.price_at_purchase).toLocaleString('en-IN')}
                              </p>
                              {item.quantity > 1 && (
                                <p className="text-[10px] text-text-secondary">
                                  ₹{Number(item.price_at_purchase).toLocaleString('en-IN')} each
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Minimal Contextual Bottom Area */}
                    <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-bg-subtle/40 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {statusInfo.isFailedOrCancelled ? (
                        /* Failed / Cancelled Notice */
                        <div className="flex items-center gap-2 text-rose-700">
                          <XCircle size={15} className="flex-shrink-0 text-rose-500" />
                          <span className="font-medium text-[11px] sm:text-xs">
                            Payment was not completed. Your items remain preserved in your cart.
                          </span>
                        </div>
                      ) : isCourierAssigned ? (
                        /* Live Courier Tracking Pill */
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <div className="inline-flex items-center gap-1.5 text-text-secondary">
                            <Truck size={14} className="text-accent" />
                            <span className="font-medium text-text-primary">{order.courier_name || 'Courier'}</span>
                            <span className="font-mono text-text-secondary">AWB: {order.tracking_id}</span>
                          </div>
                          {order.courier_tracking_url && (
                            <a
                              href={
                                order.courier_tracking_url.includes('{id}') || order.courier_tracking_url.includes('{tracking_id}')
                                  ? order.courier_tracking_url.replace('{id}', encodeURIComponent(order.tracking_id || '')).replace('{tracking_id}', encodeURIComponent(order.tracking_id || ''))
                                  : order.courier_tracking_url.endsWith('=') || order.courier_tracking_url.endsWith('/')
                                    ? `${order.courier_tracking_url}${encodeURIComponent(order.tracking_id || '')}`
                                    : order.courier_tracking_url
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-accent hover:underline"
                            >
                              <span>Track Live</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ) : statusInfo.isPaid ? (
                        /* Minimal Progress Milestone */
                        <div className="flex items-center gap-2 sm:gap-3 text-text-secondary">
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {statusInfo.description}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-amber-800">
                          <Clock size={14} className="text-amber-600" />
                          <span className="font-medium text-[11px] sm:text-xs">{statusInfo.description}</span>
                        </div>
                      )}

                      {/* Right action: Toggle Details / Help */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                        {statusInfo.isFailedOrCancelled && (
                          <button
                            onClick={() => navigate('/checkout')}
                            className="text-[11px] font-bold uppercase tracking-wider text-accent hover:underline flex items-center gap-1"
                          >
                            <span>Resume Checkout</span>
                            <ArrowRight size={11} />
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="text-text-secondary hover:text-text-primary text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                        >
                          <span>{isExpanded ? 'Hide Details' : 'Details'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Order Details Drawer */}
                    {isExpanded && (
                      <div className="px-4 py-4 sm:px-5 sm:py-5 bg-white border-t border-border/50 text-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
                              Payment Status
                            </span>
                            <span className="font-medium text-text-primary capitalize">
                              {order.payment_status || 'Unpaid'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
                              Fulfillment
                            </span>
                            <span className="font-medium text-text-primary capitalize">
                              {order.status || 'Pending'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
                              Support Reference
                            </span>
                            <span className="font-mono text-text-primary">
                              #{orderRefId}
                            </span>
                          </div>
                        </div>

                        {/* Minimal horizontal stepper for paid active orders */}
                        {statusInfo.isPaid && (
                          <div className="pt-3 border-t border-border/40">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-2.5">
                              Milestones
                            </span>
                            <div className="flex items-center justify-between max-w-md text-[11px]">
                              {['Confirmed', 'Processing', 'Dispatched', 'Delivered'].map((step, idx) => {
                                const isPassed = idx <= activeStepIdx;
                                const isCurrent = idx === activeStepIdx;
                                return (
                                  <div key={step} className="flex flex-col items-center flex-1 relative">
                                    {idx > 0 && (
                                      <div
                                        className={`absolute top-2 -left-1/2 w-full h-[2px] -z-0 ${
                                          idx <= activeStepIdx ? 'bg-accent' : 'bg-border/60'
                                        }`}
                                      />
                                    )}
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center relative z-10 ${
                                        isCurrent
                                          ? 'bg-accent ring-2 ring-accent/30 text-white'
                                          : isPassed
                                          ? 'bg-accent text-white'
                                          : 'bg-white border-2 border-border'
                                      }`}
                                    >
                                      {isPassed && <Check size={10} className="stroke-[2.5]" />}
                                    </div>
                                    <span
                                      className={`mt-1.5 text-[10px] tracking-tight ${
                                        isCurrent
                                          ? 'font-bold text-text-primary'
                                          : isPassed
                                          ? 'font-medium text-text-primary'
                                          : 'text-text-secondary/70'
                                      }`}
                                    >
                                      {step}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                            {/* Settlement & Dispatch notice for paid orders prior to delivery */}
                            {activeStepIdx < 3 && (
                              <PaymentDispatchNotice variant="account" className="mt-3.5" />
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
  );
}
