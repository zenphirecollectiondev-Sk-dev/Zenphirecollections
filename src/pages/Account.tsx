import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { supabase, getUserAddresses, getUserOrders } from '../lib/supabase';
import type { AddressRow } from '../lib/supabase';
import { z } from 'zod';
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
  ExternalLink
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
  status: string;
  total: number;
  subtotal: number | null;
  discount_amount: number | null;
  coupon_code: string | null;
  shipping_cost: number | null;
  courier_name: string | null;
  courier_tracking_url: string | null;
  tracking_id: string | null;
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
  const { user, profile, updateProfile, signOut } = useAuthStore();

  // Tabs
  const [activeTab, setActiveTab] = useState<'profile' | 'orders'>('profile');

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

  // Formatted date string
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Returns order timeline steps and status index
  const getTimelineInfo = (status: string) => {
    const steps = ['pending', 'processing', 'shipped', 'delivered'];
    const displayNames = ['Ordered', 'Processing', 'Shipped', 'Delivered'];

    let activeIndex = steps.indexOf(status.toLowerCase());

    // Fallback/boundary checking
    if (status.toLowerCase() === 'cancelled') {
      return { steps: ['Ordered', 'Cancelled'], activeIndex: 1, isCancelled: true };
    }

    if (activeIndex === -1) activeIndex = 0; // Default to first step
    return { steps: displayNames, activeIndex, isCancelled: false };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
      {/* Title & Banner */}
      <div className="border border-border/80 p-6 md:p-8 bg-white mb-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest bg-bg-subtle border border-border text-text-secondary font-black px-2.5 py-1">
            Customer Dashboard
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-wide uppercase mt-3 text-text-primary">
            Welcome, {profile?.name || 'Guest'}
          </h1>
          <p className="text-xs text-text-secondary mt-1 flex items-center gap-1.5">
            <Mail size={12} /> {user?.email}
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="border border-border bg-white text-text-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-sale hover:text-white hover:border-sale transition-colors flex items-center gap-2"
        >
          <LogOut size={13} /> Log Out
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 transition-all ${activeTab === 'profile'
              ? 'border-accent text-text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          Profile & Addresses
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 transition-all ${activeTab === 'orders'
              ? 'border-accent text-text-primary'
              : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
        >
          Order History ({orders.length})
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'profile' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Left Column: Personal Profile */}
          <div className="lg:col-span-5 bg-white border border-border/80 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all">

            {!isEditingProfile ? (
              /* VIEW MODE */
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4">
                  <div>
                    <h2 className="text-sm font-heading font-black uppercase tracking-wider text-text-primary">
                      Personal Profile
                    </h2>
                    <p className="text-[11px] text-text-secondary mt-0.5">
                      Your personal account profile details.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setProfileError(null);
                      setIsEditingProfile(true);
                    }}
                    className="border border-border text-text-primary bg-white px-3.5 py-1.5 text-[10px] font-black uppercase tracking-wider hover:bg-bg-subtle transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Edit2 size={11} /> Edit
                  </button>
                </div>

                {profileSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs flex items-center gap-2">
                    <Check size={14} className="flex-shrink-0" />
                    Profile updated successfully.
                  </div>
                )}

                <div className="space-y-4">
                  {/* Full Name */}
                  <div className="bg-bg-subtle p-3.5 border-l-[3px] border-[#B8975A]">
                    <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold block mb-1">
                      Full Name
                    </span>
                    <span className="text-xs font-semibold text-text-primary">
                      {profile?.name || 'Not provided'}
                    </span>
                  </div>

                  {/* Phone Number */}
                  <div className="bg-bg-subtle p-3.5 border-l-[3px] border-[#B8975A]">
                    <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold block mb-1">
                      Phone Number
                    </span>
                    <span className="text-xs font-semibold text-text-primary">
                      {profile?.phone || 'Not provided'}
                    </span>
                  </div>

                  {/* Date of Birth */}
                  <div className="bg-bg-subtle p-3.5 border-l-[3px] border-[#B8975A]">
                    <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold block mb-1">
                      Date of Birth
                    </span>
                    <span className="text-xs font-semibold text-text-primary">
                      {profile?.dob ? formatDate(profile.dob) : 'Not provided'}
                    </span>
                  </div>

                  {/* Gender */}
                  <div className="bg-bg-subtle p-3.5 border-l-[3px] border-[#B8975A]">
                    <span className="text-[9px] uppercase tracking-widest text-text-secondary font-bold block mb-1">
                      Gender
                    </span>
                    <span className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                      {profile?.gender || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* EDIT MODE */
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-sm font-heading font-black uppercase tracking-wider text-text-primary">
                    Edit Profile
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Update your account info and personal details.
                  </p>
                </div>

                {profileError && (
                  <div className="p-3 bg-sale/10 border border-sale text-sale text-xs flex items-center gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {profileError}
                  </div>
                )}

                <form onSubmit={handleProfileSave} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="p-name" className="block text-[10px] font-heading font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <User size={12} className="text-text-secondary" /> Full Name
                    </label>
                    <input
                      id="p-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Phone Number */}
                  <div>
                    <label htmlFor="p-phone" className="block text-[10px] font-heading font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <Phone size={12} className="text-text-secondary" /> Phone Number
                    </label>
                    <input
                      id="p-phone"
                      type="tel"
                      placeholder="e.g. +91 99999 99999"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div>
                    <label htmlFor="p-dob" className="block text-[10px] font-heading font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <Calendar size={12} className="text-text-secondary" /> Date of Birth
                    </label>
                    <input
                      id="p-dob"
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label htmlFor="p-gender" className="block text-[10px] font-heading font-bold uppercase tracking-wider text-text-primary mb-1.5 flex items-center gap-1.5">
                      <User size={12} className="text-text-secondary" /> Gender
                    </label>
                    <select
                      id="p-gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%3E%3Cpath%20d%3D%22M7%209l3%203%203-3%22%20stroke%3D%22%25234A5568%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:20px_20px] bg-[right_8px_center] bg-no-repeat pr-8 uppercase tracking-wide font-semibold"
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="unisex">Unisex</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t border-border">
                    <button
                      type="button"
                      onClick={() => {
                        // Reset forms to DB defaults and close editor
                        if (profile) {
                          setName(profile.name || '');
                          setPhone(profile.phone || '');
                          setDob(profile.dob || '');
                          setGender(profile.gender || '');
                        }
                        setProfileError(null);
                        setIsEditingProfile(false);
                      }}
                      className="w-1/2 border border-border bg-white text-text-primary py-3 font-bold uppercase text-[10px] tracking-widest hover:bg-bg-subtle transition-colors text-center"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loadingProfile}
                      className="btn btn-primary w-1/2 py-3 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {loadingProfile ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : 'Save Details'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Address Book */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-border/80 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all">
              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <h2 className="text-sm font-heading font-black uppercase tracking-wider text-text-primary">
                    Address Book
                  </h2>
                  <p className="text-[11px] text-text-secondary mt-0.5">
                    Manage your billing and delivery destinations.
                  </p>
                </div>
                {!addressFormOpen && (
                  <button
                    onClick={handleOpenAddForm}
                    className="border border-border text-text-primary bg-white px-3.5 py-2 text-[10px] font-black uppercase tracking-wider hover:bg-bg-subtle transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Plus size={12} /> Add Address
                  </button>
                )}
              </div>

              {/* Address Form (Inline toggled) */}
              {addressFormOpen && (
                <div className="border border-border p-5 bg-bg-subtle mb-6 space-y-4 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    {editingAddressId ? 'Edit Saved Address' : 'Add New Address'}
                  </h3>

                  {addressError && (
                    <div className="p-2.5 bg-sale/10 border border-sale text-sale text-xs flex items-center gap-2">
                      <AlertCircle size={13} className="flex-shrink-0" />
                      {addressError}
                    </div>
                  )}

                  <form onSubmit={handleAddressSubmit} className="space-y-4">
                    {/* Recipient Name */}
                    <div>
                      <label htmlFor="addr-name" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                        Recipient Name
                      </label>
                      <input
                        id="addr-name"
                        type="text"
                        placeholder="Name of the person receiving the delivery"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.recipient_name ? 'border-sale' : 'border-border'
                          }`}
                      />
                      {validationErrors.recipient_name && (
                        <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.recipient_name}</p>
                      )}
                    </div>

                    {/* Mobile Numbers */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="addr-phone1" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                          Mobile Number
                        </label>
                        <input
                          id="addr-phone1"
                          type="tel"
                          placeholder="10-digit mobile number"
                          value={phonePrimary}
                          onChange={(e) => setPhonePrimary(e.target.value)}
                          className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.phone_primary ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.phone_primary && (
                          <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.phone_primary}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-phone2" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                          Alternate Mobile (Optional)
                        </label>
                        <input
                          id="addr-phone2"
                          type="tel"
                          placeholder="Alternate 10-digit mobile"
                          value={phoneSecondary}
                          onChange={(e) => setPhoneSecondary(e.target.value)}
                          className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.phone_secondary ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.phone_secondary && (
                          <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.phone_secondary}</p>
                        )}
                      </div>
                    </div>

                    {/* Street Address */}
                    <div>
                      <label htmlFor="addr-line1" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                        Street Address / Line 1
                      </label>
                      <input
                        id="addr-line1"
                        type="text"
                        placeholder="Flat/House No, Building, Street Name"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.line1 ? 'border-sale' : 'border-border'
                          }`}
                      />
                      {validationErrors.line1 && (
                        <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.line1}</p>
                      )}
                    </div>

                    {/* City, State, Pincode */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="addr-city" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                          City
                        </label>
                        <input
                          id="addr-city"
                          type="text"
                          placeholder="e.g. Mumbai"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.city ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.city && (
                          <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.city}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-state" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                          State
                        </label>
                        <input
                          id="addr-state"
                          type="text"
                          placeholder="e.g. Maharashtra"
                          value={state}
                          onChange={(e) => setState(e.target.value)}
                          className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.state ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.state && (
                          <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.state}</p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="addr-pincode" className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                          Pincode
                        </label>
                        <input
                          id="addr-pincode"
                          type="text"
                          placeholder="6-digit pincode"
                          value={pincode}
                          onChange={(e) => setPincode(e.target.value)}
                          className={`w-full px-3 py-2 border bg-white text-text-primary text-xs focus:outline-none focus:border-accent ${validationErrors.pincode ? 'border-sale' : 'border-border'
                            }`}
                        />
                        {validationErrors.pincode && (
                          <p className="text-[10px] text-sale font-medium mt-1">{validationErrors.pincode}</p>
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
                        className="rounded-none border-border text-accent focus:ring-0 focus:ring-offset-0 cursor-pointer h-3.5 w-3.5"
                      />
                      <label htmlFor="addr-default" className="text-[10px] font-bold uppercase tracking-wider text-text-primary select-none cursor-pointer">
                        Set as Default Shipping Address
                      </label>
                    </div>

                    {/* Form Controls */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <button
                        type="button"
                        onClick={() => setAddressFormOpen(false)}
                        className="px-4 py-2.5 border border-border bg-white text-text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider"
                      >
                        {editingAddressId ? 'Update Address' : 'Save Address'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Address List */}
              {loadingAddresses ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={24} className="animate-spin text-text-secondary" />
                </div>
              ) : addresses.length === 0 ? (
                /* POLISHED EMPTY STATE */
                <div className="border border-dashed border-border/80 bg-bg-subtle/50 py-16 px-6 text-center flex flex-col items-center justify-center">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border mb-3">
                    <MapPin size={20} className="text-text-secondary stroke-[1.5]" />
                  </div>
                  <p className="text-xs text-text-primary font-heading font-black uppercase tracking-wider">
                    No addresses saved yet
                  </p>
                  <p className="text-[11px] text-text-secondary mt-1 max-w-xs leading-relaxed">
                    Add a new shipping destination below to make checkout faster next time.
                  </p>
                  <button
                    onClick={handleOpenAddForm}
                    className="btn btn-primary mt-4 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest shadow-sm"
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
                      className={`border p-5 bg-white relative transition-all shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] ${addr.is_default
                          ? 'border-accent shadow-sm ring-1 ring-accent'
                          : 'border-border hover:border-text-secondary'
                        }`}
                    >
                      {addr.is_default && (
                        <span className="absolute top-4 right-4 bg-accent text-white font-heading font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                          Default
                        </span>
                      )}

                      <div className="flex items-start gap-2 mb-3">
                        <MapPin size={14} className="text-text-secondary mt-0.5 flex-shrink-0" />
                        <div className="space-y-1.5">
                          <p className="text-xs text-text-primary font-black uppercase tracking-wider pr-14">
                            {addr.recipient_name || 'No Name'}
                          </p>
                          <p className="text-xs text-text-primary leading-relaxed pr-10">
                            {addr.line1}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {addr.city}, {addr.state} — {addr.pincode}
                          </p>
                          <div className="text-[10px] text-text-secondary pt-1 leading-normal border-t border-border/50">
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

                      <div className="flex justify-between items-center mt-6 pt-3 border-t border-border">
                        {!addr.is_default ? (
                          <button
                            onClick={() => handleSetDefaultAddress(addr.id)}
                            className="text-[9px] font-bold uppercase tracking-wider text-text-secondary hover:text-accent transition-colors"
                          >
                            Set Default
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-green-700 flex items-center gap-1">
                            <Check size={10} /> Active Default
                          </span>
                        )}

                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleOpenEditForm(addr)}
                            aria-label="Edit address"
                            className="text-text-secondary hover:text-accent p-1 transition-colors"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            aria-label="Delete address"
                            className="text-text-secondary hover:text-sale p-1 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Orders History */
        <div className="bg-white border border-border/80 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] transition-all">
          <div className="border-b border-border pb-4 mb-8">
            <h2 className="text-sm font-heading font-black uppercase tracking-wider text-text-primary">
              Order Transactions
            </h2>
            <p className="text-[11px] text-text-secondary mt-0.5">
              Review your purchase logs and check delivery milestones.
            </p>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-text-secondary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="border border-dashed border-border py-16 text-center">
              <Package size={32} className="mx-auto text-text-secondary stroke-[1.2] mb-3" />
              <p className="text-xs text-text-secondary uppercase tracking-widest font-black">No purchase logs found</p>
              <p className="text-[10px] text-text-secondary mt-1">Start shopping our collection of minimalist apparel.</p>
              <button
                onClick={() => navigate('/shop')}
                className="btn btn-primary mt-5 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest"
              >
                Go to Shop
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {orders.map((order) => {
                const { steps, activeIndex, isCancelled } = getTimelineInfo(order.status);

                return (
                  <div key={order.id} className="border border-border/80 bg-white hover:shadow-md shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all">
                    {/* Order summary header */}
                    <div className="border-b border-border p-4 md:p-5 bg-bg-subtle flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                      <div className="grid grid-cols-2 md:flex md:items-center gap-x-4 gap-y-1">
                        <div>
                          <p className="text-[9px] font-heading font-bold uppercase tracking-wider text-text-secondary">
                            Order Placed
                          </p>
                          <p className="text-xs text-text-primary font-bold mt-0.5">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="md:border-l border-border md:pl-4">
                          <p className="text-[9px] font-heading font-bold uppercase tracking-wider text-text-secondary">
                            Reference ID
                          </p>
                          <p className="text-xs text-text-primary font-mono font-medium mt-0.5 select-all uppercase">
                            {order.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div className="md:border-l border-border md:pl-4">
                          <p className="text-[9px] font-heading font-bold uppercase tracking-wider text-text-secondary">
                            Total Value
                          </p>
                          <p className="text-xs text-text-primary font-black mt-0.5">
                            ₹{Number(order.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>

                      {/* Status Badging */}
                      <span className={`text-[9px] font-heading font-black uppercase tracking-widest px-2.5 py-1 border ${order.status.toLowerCase() === 'delivered'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : order.status.toLowerCase() === 'cancelled'
                            ? 'bg-red-50 text-sale border-red-200'
                            : order.status.toLowerCase() === 'shipped'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : order.status.toLowerCase() === 'processing'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {order.status}
                      </span>
                    </div>

                    {/* Order details grid */}
                    <div className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                      {/* Left: Items list */}
                      <div className="lg:col-span-7 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary border-b border-border pb-1.5">
                          Ordered Items
                        </h4>

                        <div className="space-y-3">
                          {order.order_items?.map((item) => {
                            const product = item.product_variants?.products;
                            const image = product?.product_images?.[0]?.url;

                            return (
                              <div key={item.id} className="flex gap-4 items-center">
                                {/* Thumbnail */}
                                <div className="w-12 h-16 bg-bg-subtle flex-shrink-0 overflow-hidden border border-border flex items-center justify-center">
                                  {image ? (
                                    <img
                                      src={image}
                                      alt={product?.name || 'Product'}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <Package size={20} className="text-text-secondary stroke-[1.2]" />
                                  )}
                                </div>

                                {/* Info */}
                                <div className="flex-grow">
                                  <h5 className="text-xs font-semibold text-text-primary uppercase tracking-wide leading-snug">
                                    {product?.name || 'Unknown Product'}
                                  </h5>
                                  <p className="text-[10px] text-text-secondary mt-0.5 uppercase tracking-wider">
                                    Size: {item.product_variants?.size || 'N/A'} │ Color: {item.product_variants?.color || 'N/A'}
                                  </p>
                                  <p className="text-[10px] text-text-secondary mt-0.5">
                                    Qty: {item.quantity} × ₹{Number(item.price_at_purchase).toLocaleString('en-IN')}
                                  </p>
                                </div>

                                <div className="text-right">
                                  <p className="text-xs text-text-primary font-bold">
                                    ₹{Number(item.quantity * item.price_at_purchase).toLocaleString('en-IN')}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* If a coupon was applied to this order */}
                        {order.coupon_code && (
                          <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs text-text-secondary">
                            <span>Coupon Used: <strong className="text-emerald-700 font-bold uppercase">{order.coupon_code}</strong></span>
                            <span>Discount: <strong className="text-emerald-600 font-bold">-₹{Number(order.discount_amount || 0).toFixed(2)}</strong></span>
                          </div>
                        )}

                        {/* Courier Partner & tracking info */}
                        {(order.courier_name || order.tracking_id) && (
                          <div className="mt-4 p-4 border border-border bg-bg-subtle space-y-3">
                            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-bold pb-2 border-b border-border">
                              Shipment Tracking
                            </p>

                            {/* Tracking website link */}
                            {order.courier_tracking_url && (
                              <div>
                                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">Courier Partner</p>
                                <a
                                  href={order.courier_tracking_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 border border-accent text-accent text-xs font-bold uppercase tracking-wider hover:bg-accent hover:text-white transition-all group"
                                >
                                  <ExternalLink size={11} className="group-hover:translate-x-0.5 transition-transform" />
                                  {order.courier_name || 'Open Tracking Website'}
                                </a>
                              </div>
                            )}

                            {/* Tracking ID + copy */}
                            {order.tracking_id && (
                              <div>
                                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider mb-1.5">Your Tracking ID</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-text-primary bg-white border border-border px-2.5 py-1.5 select-all flex-1 break-all">
                                    {order.tracking_id}
                                  </span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(order.tracking_id || '');
                                      alert('Tracking ID copied! Paste it on the courier website to track your package.');
                                    }}
                                    className="p-2 border border-border bg-white hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-all flex-shrink-0"
                                    title="Copy Tracking ID"
                                  >
                                    <Copy size={12} />
                                  </button>
                                </div>
                                <p className="text-[10px] text-text-secondary mt-1.5 leading-relaxed">
                                  → Open the courier website above, paste this ID to track your order.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Graphical Delivery Tracking Timeline */}
                      <div className="lg:col-span-5 border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-border pb-1.5">
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-text-secondary">
                            Delivery Timeline
                          </h4>
                          {order.tracking_id && (
                            <span className="text-[9px] font-mono bg-bg-subtle px-2 py-0.5 text-text-secondary border border-border">
                              TRK: {order.tracking_id}
                            </span>
                          )}
                        </div>

                        {/* Visual timeline */}
                        <div className="relative pl-6 space-y-6 py-2">
                          {/* Timeline vertical bar */}
                          <div className="absolute left-2.5 top-2.5 bottom-2.5 w-[2px] bg-border"></div>

                          {steps.map((step, idx) => {
                            const isCompleted = idx <= activeIndex;
                            const isActive = idx === activeIndex;

                            return (
                              <div key={step} className="relative flex items-center gap-3">
                                {/* Timeline Dot */}
                                <div className={`absolute -left-[19.5px] w-3 h-3 rounded-full border-2 transition-all flex items-center justify-center ${isCancelled && idx === 1
                                    ? 'bg-sale border-sale scale-110'
                                    : isCompleted
                                      ? 'bg-accent border-accent scale-110'
                                      : 'bg-white border-border'
                                  }`}>
                                  {isCompleted && !isCancelled && (
                                    <span className="w-1 h-1 bg-white rounded-full"></span>
                                  )}
                                </div>

                                <div>
                                  <p className={`text-xs font-bold uppercase tracking-wider ${isCancelled && idx === 1
                                      ? 'text-sale'
                                      : isCompleted
                                        ? 'text-text-primary'
                                        : 'text-text-secondary opacity-60'
                                    }`}>
                                    {step}
                                  </p>
                                  {isActive && !isCancelled && (
                                    <p className="text-[9px] text-text-secondary mt-0.5 leading-relaxed">
                                      {idx === 0 && 'Your order has been recorded successfully.'}
                                      {idx === 1 && 'Our operations team is prepping your packaging.'}
                                      {idx === 2 && 'Package handed over to local sorting hub.'}
                                      {idx === 3 && 'Consignment delivered successfully at your door.'}
                                    </p>
                                  )}
                                  {isCancelled && idx === 1 && (
                                    <p className="text-[9px] text-sale mt-0.5 leading-relaxed">
                                      This transaction has been voided.
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
