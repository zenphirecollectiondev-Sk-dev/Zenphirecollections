import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { dataCache } from '../lib/dataCache';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  X,
  Search,
  Activity,
  DollarSign,
  Loader2,
  Calendar,
  LayoutDashboard,
  ShoppingBag,
  Tag,
  BarChart2,
  Layers,
  ClipboardList,
  Sparkles,
  Truck,
  Settings2,
  ShoppingCart,
} from 'lucide-react';


interface ProductImage {
  id?: string;
  url: string;
  sort_order: number;
}

interface ProductVariant {
  id?: string;
  size: string;
  color: string;
  stock_qty: number;
  sku: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  base_price: number;
  category_id: string | null;
  is_active: boolean;
  size_guide_type: string;
  custom_size_guide_html: string | null;
  product_images: ProductImage[];
  product_variants: ProductVariant[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_category_id: string | null;
  size_guide_html: string | null;
  image_url: string | null;
}

interface SizeGuideTemplate {
  id: string;
  name: string;
  image_url: string;
}



export default function Admin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'inventory' | 'orders' | 'coupons' | 'couriers' | 'homepage' | 'occasions'>('overview');

  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [isCouponModalOpen, setIsCouponModalOpen] = useState(false);
  const [couponCodeForm, setCouponCodeForm] = useState('');
  const [couponDiscountType, setCouponDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [couponValue, setCouponValue] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponMinOrder, setCouponMinOrder] = useState('');
  const [editingCoupon, setEditingCoupon] = useState<any | null>(null);

  // Courier Partners state
  const [courierPartners, setCourierPartners] = useState<any[]>([]);
  const [isCourierModalOpen, setIsCourierModalOpen] = useState(false);
  const [courierNameForm, setCourierNameForm] = useState('');
  const [courierTrackingTemplate, setCourierTrackingTemplate] = useState('');
  const [editingCourier, setEditingCourier] = useState<any | null>(null);

  // Order Fulfillment courier selection state
  const [selectedCourierPartner, setSelectedCourierPartner] = useState('');

  // Loading states
  const [loadingData, setLoadingData] = useState(true);
  const [isSavingProduct, setIsSavingProduct] = useState(false);

  // Stats
  const [revenue, setRevenue] = useState(0);
  const [ordersCount, setOrdersCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  // Collections
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Forms toggles
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Product Form State
  const [prodName, setProdName] = useState('');
  const [prodSlug, setProdSlug] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodActive, setProdActive] = useState(true);
  const [prodSizeGuideType, setProdSizeGuideType] = useState('category');
  const [prodCustomSizeGuide, setProdCustomSizeGuide] = useState('');
  const [prodImages, setProdImages] = useState<ProductImage[]>([]);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [prodOccasion, setProdOccasion] = useState<string>('');

  // Image Size Guide States
  const defaultSizeGuides: SizeGuideTemplate[] = [
    {
      id: 'sg-hoodie',
      name: 'Size Guide for Hoodie / Sweatshirt',
      image_url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'sg-tshirt',
      name: 'Size Guide for Oversized T-Shirt',
      image_url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80'
    },
    {
      id: 'sg-pants',
      name: 'Size Guide for Trousers & Jeans',
      image_url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80'
    }
  ];
  const [sizeGuideTemplates, setSizeGuideTemplates] = useState<SizeGuideTemplate[]>(defaultSizeGuides);
  const [sizeGuideMode, setSizeGuideMode] = useState<'template' | 'new' | 'legacy'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newSizeGuideName, setNewSizeGuideName] = useState<string>('');
  const [newSizeGuideImageUrl, setNewSizeGuideImageUrl] = useState<string>('');
  const [isUploadingSizeGuide, setIsUploadingSizeGuide] = useState<boolean>(false);

  // Product creation wizard states
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | 'Unisex' | ''>('');
  const [newParentCatName, setNewParentCatName] = useState<string>('');

  // New Variant inputs inside form
  const [varSize, setVarSize] = useState('M');
  const [varColor, setVarColor] = useState('White');
  const [varStock, setVarStock] = useState('20');

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catParent, setCatParent] = useState('');
  const [catSizeGuide, setCatSizeGuide] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');
  const [isUploadingCategory, setIsUploadingCategory] = useState(false);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);

  // Inventory inline edit state
  const [inlineEditStock, setInlineEditStock] = useState<Record<string, number>>({});
  const [savingStockIds, setSavingStockIds] = useState<Record<string, boolean>>({});

  // Order Management states
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [orderUpdateStatus, setOrderUpdateStatus] = useState('');
  const [orderUpdateTracking, setOrderUpdateTracking] = useState('');
  const [loadingOrderItems, setLoadingOrderItems] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Toast notification queue
  const [toasts, setToasts] = useState<{ id: number; msg: string; isError: boolean }[]>([]);
  const toastCounter = useRef(0);



  // Homepage state variables
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroImagePosition, setHeroImagePosition] = useState('center');
  const [heroImageUrl2, setHeroImageUrl2] = useState('');
  const [heroImagePosition2, setHeroImagePosition2] = useState('center');
  const [theEditImageUrl, setTheEditImageUrl] = useState('');
  const [theEditImagePosition, setTheEditImagePosition] = useState('center');
  const [bestSellersIds, setBestSellersIds] = useState<string[]>([]);
  const [newArrivalsIds, setNewArrivalsIds] = useState<string[]>([]);
  const [menImageUrl, setMenImageUrl] = useState('');
  const [womenImageUrl, setWomenImageUrl] = useState('');
  const [unisexImageUrl, setUnisexImageUrl] = useState('');
  const [shirtImageUrl, setShirtImageUrl] = useState('');
  const [tshirtImageUrl, setTshirtImageUrl] = useState('');
  const [coordsImageUrl, setCoordsImageUrl] = useState('');
  const [pantsImageUrl, setPantsImageUrl] = useState('');
  const [isSavingHomepage, setIsSavingHomepage] = useState(false);
  const [isUploadingHero, setIsUploadingHero] = useState(false);
  const [isUploadingHero2, setIsUploadingHero2] = useState(false);
  const [isUploadingTheEdit, setIsUploadingTheEdit] = useState(false);
  const [isUploadingMen, setIsUploadingMen] = useState(false);
  const [isUploadingWomen, setIsUploadingWomen] = useState(false);
  const [isUploadingUnisex, setIsUploadingUnisex] = useState(false);
  const [isUploadingShirt, setIsUploadingShirt] = useState(false);
  const [isUploadingTshirt, setIsUploadingTshirt] = useState(false);
  const [isUploadingCoords, setIsUploadingCoords] = useState(false);
  const [isUploadingPants, setIsUploadingPants] = useState(false);

  const [heroDragActive, setHeroDragActive] = useState(false);
  const [hero2DragActive, setHero2DragActive] = useState(false);
  const [theEditDragActive, setTheEditDragActive] = useState(false);

  const heroContainerRef = useRef<HTMLDivElement>(null);
  const hero2ContainerRef = useRef<HTMLDivElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  // Search queries for selectors
  const [bestSellersSearch, setBestSellersSearch] = useState('');
  const [newArrivalsSearch, setNewArrivalsSearch] = useState('');

  // Occasions state variables
  const [occasionProducts, setOccasionProducts] = useState<any[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<'casuals' | 'formal' | 'ethnic' | 'party-wear'>('casuals');
  const [occasionSearch, setOccasionSearch] = useState('');
  const [isAddingOccasion, setIsAddingOccasion] = useState(false);


  // Fetch Dashboard Stats & Data
  const fetchData = async () => {
    setLoadingData(true);

    try {
      // 1. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (catErr) throw catErr;
      setCategories(catData || []);

      // 2. Fetch Products, variants and images as SEPARATE queries so a timeout
      //    on product_images doesn't bring down the entire data load.
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (prodErr) throw prodErr;

      // Fetch variants (fast, no lock)
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*');

      // Fetch images independently — if this times out, we still show products + variants
      let imagesData: any[] = [];
      try {
        const { data: imgData, error: imgErr } = await supabase
          .from('product_images')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!imgErr) imagesData = imgData || [];
        else console.warn('product_images fetch failed (non-critical):', imgErr.message);
      } catch (imgEx: any) {
        console.warn('product_images timed out (non-critical):', imgEx.message);
      }

      // Stitch together in memory
      const stitchedProducts = (prodData || []).map((p: any) => ({
        ...p,
        product_images: imagesData.filter((img: any) => img.product_id === p.id),
        product_variants: (variantsData || []).filter((v: any) => v.product_id === p.id)
      }));
      setProducts(stitchedProducts as any[]);
      setProductsCount(stitchedProducts.length);

      // 3. Fetch Orders
      const { data: orderData, error: orderErr } = await supabase
        .from('orders')
        .select(`
          *,
          profiles (name, phone),
          addresses (recipient_name, phone_primary, line1, city, state, pincode)
        `)
        .order('created_at', { ascending: false });
      if (orderErr) throw orderErr;
      setRecentOrders(orderData || []);
      setOrdersCount(orderData?.length || 0);

      // Sum Revenue
      const rev = (orderData || [])
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      setRevenue(rev);

      // 4. Fetch Low Stock Count
      const { data: varData, error: varErr } = await supabase
        .from('product_variants')
        .select('*')
        .lt('stock_qty', 10);
      if (varErr) throw varErr;
      setLowStockCount(varData?.length || 0);

      // 5. Fetch Coupons
      try {
        const { data: couponData, error: couponErr } = await supabase
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        if (couponErr) throw couponErr;
        setCoupons(couponData || []);
      } catch (cErr) {
        console.warn('Coupons table fetch failed or not yet created.', cErr);
        setCoupons([]);
      }

      // 6. Fetch Courier Partners (with safety fallback to default partners)
      const defaultPartners = [
        { id: '1', name: 'Delhivery', tracking_url_template: 'https://www.delhivery.com/track?id=' },
        { id: '2', name: 'Blue Dart', tracking_url_template: 'https://www.bluedart.com/tracking?id=' },
        { id: '3', name: 'DHL Express', tracking_url_template: 'https://www.dhl.com/en/express/tracking.html?AWB=' },
        { id: '4', name: 'FedEx', tracking_url_template: 'https://www.fedex.com/apps/fedextrack/?tracknumbers=' }
      ];
      try {
        const { data: partnerData, error: partnerErr } = await supabase
          .from('courier_partners' as any)
          .select('*')
          .order('name', { ascending: true });
        if (partnerErr) throw partnerErr;
        setCourierPartners(partnerData && partnerData.length > 0 ? partnerData : defaultPartners);
      } catch (pErr) {
        console.warn('Courier partners fetch failed. Using default placeholders.', pErr);
        setCourierPartners(defaultPartners);
      }

      // 7. Fetch Homepage Config (graceful table error fallback)
      try {
        const { data, error: hpErr } = await supabase
          .from('homepage_config' as any)
          .select('*')
          .eq('id', 'global')
          .maybeSingle();
        if (hpErr) throw hpErr;
        const hpData = data as any;
        
        let localBackup: any = null;
        try {
          const raw = localStorage.getItem('zenphire_homepage_config');
          if (raw) localBackup = JSON.parse(raw);
        } catch (e) {}

        const merged = hpData || localBackup
          ? {
              ...localBackup,
              ...hpData,
              hero_image_url_2: hpData?.hero_image_url_2 || localBackup?.hero_image_url_2 || '',
            }
          : null;

        if (merged) {
          let s1 = merged.hero_image_url || '';
          let s2 = merged.hero_image_url_2 || '';
          let p1 = merged.hero_image_position || 'center';
          let p2 = merged.hero_image_position_2 || 'center';

          if (s1.includes(':::')) {
            const parts = s1.split(':::');
            s1 = parts[0] || '';
            s2 = parts[1] || s2;
          }
          if (p1.includes(':::')) {
            const posParts = p1.split(':::');
            p1 = posParts[0] || 'center';
            p2 = posParts[1] || p2;
          }

          setHeroImageUrl(s1);
          setHeroImagePosition(p1);
          setHeroImageUrl2(s2);
          setHeroImagePosition2(p2);
          setTheEditImageUrl(merged.the_edit_image_url || '');
          setTheEditImagePosition(merged.the_edit_image_position || 'center');
          setBestSellersIds(merged.best_sellers_ids || []);
          setNewArrivalsIds(merged.new_arrivals_ids || []);
          setMenImageUrl(merged.men_collection_image_url || '');
          setWomenImageUrl(merged.women_collection_image_url || '');
          setUnisexImageUrl(merged.unisex_collection_image_url || '');
          setShirtImageUrl(merged.shirt_category_image_url || '');
          setTshirtImageUrl(merged.tshirt_category_image_url || '');
          setCoordsImageUrl(merged.coords_category_image_url || '');
          setPantsImageUrl(merged.pants_category_image_url || '');
        }
      } catch (hErr) {
        console.warn('homepage_config table fetch failed or not yet created. Using defaults.', hErr);
      }

      // 8. Fetch Occasion Products
      try {
        const { data: occData, error: occErr } = await supabase
          .from('occasion_products' as any)
          .select('*');
        if (!occErr && occData) {
          setOccasionProducts(occData);
        }
      } catch (occErr) {
        console.warn('occasion_products table fetch failed or not yet created.', occErr);
      }

      // 9. Fetch Size Guides from Supabase
      try {
        const { data: sgData, error: sgErr } = await supabase
          .from('size_guides' as any)
          .select('*')
          .order('name', { ascending: true });
        if (!sgErr && sgData && sgData.length > 0) {
          setSizeGuideTemplates(sgData as any);
        }
      } catch (sgErr) {
        console.warn('size_guides table fetch failed or not created yet.', sgErr);
      }

    } catch (err: any) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setOrderUpdateStatus(order.status);
    setOrderUpdateTracking(order.tracking_id || '');
    setSelectedCourierPartner(order.courier_name || '');
    setLoadingOrderItems(true);
    setIsOrderModalOpen(true);
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          *,
          product_variants (
            size,
            color,
            sku,
            products (
              name
            )
          )
        `)
        .eq('order_id', order.id);

      if (error) throw error;
      setSelectedOrderItems(data || []);
    } catch (err: any) {
      console.error('Error fetching order items:', err);
      triggerNotification(err.message || 'Could not fetch order items.', true);
    } finally {
      setLoadingOrderItems(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder) return;
    try {
      // Store the partner's base tracking website URL — customer will copy their ID and paste it there
      const partnerObj = courierPartners.find(p => p.name === selectedCourierPartner);
      const trackingWebsiteUrl = partnerObj ? partnerObj.tracking_url_template : null;

      const { error } = await supabase
        .from('orders' as any)
        .update({
          status: orderUpdateStatus as any,
          tracking_id: orderUpdateTracking || null,
          courier_name: selectedCourierPartner || null,
          courier_tracking_url: trackingWebsiteUrl
        } as any)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      triggerNotification('Order updated successfully.');
      setIsOrderModalOpen(false);
      fetchData(); // Refresh the list
    } catch (err: any) {
      console.error('Error updating order:', err);
      triggerNotification(err.message || 'Could not update order status.', true);
    }
  };

  // Handle Coupon Submit
  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCodeForm.trim() || !couponValue || !couponExpiry) {
      triggerNotification('Please fill out all coupon fields.', true);
      return;
    }

    const payload = {
      code: couponCodeForm.trim().toUpperCase(),
      discount_type: couponDiscountType,
      value: parseFloat(couponValue),
      expiry: new Date(couponExpiry).toISOString(),
      min_order_value: parseFloat(couponMinOrder || '0')
    };

    try {
      if (editingCoupon) {
        const { error } = await supabase
          .from('coupons')
          .update(payload)
          .eq('id', editingCoupon.id);
        if (error) throw error;
        triggerNotification(`Coupon "${couponCodeForm}" updated successfully.`);
      } else {
        const { error } = await supabase
          .from('coupons')
          .insert(payload);
        if (error) throw error;
        triggerNotification(`Coupon "${couponCodeForm}" created successfully.`);
      }
      setIsCouponModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving coupon:', err);
      triggerNotification(err.message || 'Failed to save coupon.', true);
    }
  };

  // Handle Courier Submit
  const handleCourierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierNameForm.trim() || !courierTrackingTemplate.trim()) {
      triggerNotification('Please fill out all courier partner fields.', true);
      return;
    }

    const payload = {
      name: courierNameForm.trim(),
      tracking_url_template: courierTrackingTemplate.trim()
    };

    // Check if editingCourier has a real UUID (36 chars with hyphens)
    // Fallback default partners have simple numeric string IDs like '1', '2'
    const isRealDbEntry = editingCourier &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(editingCourier.id);

    try {
      if (isRealDbEntry) {
        // Real DB record — update it
        const { error } = await supabase
          .from('courier_partners' as any)
          .update(payload)
          .eq('id', editingCourier.id);
        if (error) throw error;
        triggerNotification(`Courier Partner "${courierNameForm}" updated successfully.`);
      } else {
        // No real DB ID (new entry or fallback placeholder) — insert new record
        const { error } = await supabase
          .from('courier_partners' as any)
          .insert(payload as any);
        if (error) throw error;
        triggerNotification(`Courier Partner "${courierNameForm}" saved successfully.`);
      }
      setIsCourierModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving courier partner:', err);
      triggerNotification(err.message || 'Failed to save courier partner.', true);
    }
  };

  // Find product search matches for Best Sellers
  const bestSellersMatches = useMemo(() => {
    if (!bestSellersSearch.trim()) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(bestSellersSearch.toLowerCase()) &&
      !bestSellersIds.includes(p.id)
    );
  }, [products, bestSellersSearch, bestSellersIds]);

  // Find product search matches for New Arrivals
  const newArrivalsMatches = useMemo(() => {
    if (!newArrivalsSearch.trim()) return [];
    return products.filter(p =>
      p.name.toLowerCase().includes(newArrivalsSearch.toLowerCase()) &&
      !newArrivalsIds.includes(p.id)
    );
  }, [products, newArrivalsSearch, newArrivalsIds]);

  // Find product search matches for Occasions
  const occasionMatches = useMemo(() => {
    if (!occasionSearch.trim()) return [];
    const alreadyAdded = occasionProducts
      .filter(op => op.occasion === selectedOccasion)
      .map(op => op.product_id);
    return products.filter(p =>
      p.name.toLowerCase().includes(occasionSearch.toLowerCase()) &&
      !alreadyAdded.includes(p.id)
    ).slice(0, 8);
  }, [products, occasionSearch, selectedOccasion, occasionProducts]);

  // Helper to compress and resize image on the client side before storage/base64 upload
  const compressImage = async (
    file: File,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85
  ): Promise<{ blob: Blob; dataUrl: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            canvas.toBlob(
              (blob) => {
                resolve({
                  blob: blob || file,
                  dataUrl
                });
              },
              'image/jpeg',
              quality
            );
          } else {
            resolve({ blob: file, dataUrl: (e.target?.result as string) || '' });
          }
        };
        img.onerror = () => {
          resolve({ blob: file, dataUrl: (e.target?.result as string) || '' });
        };
        img.src = (e.target?.result as string) || '';
      };
      reader.onerror = () => {
        resolve({ blob: file, dataUrl: '' });
      };
      reader.readAsDataURL(file);
    });
  };

  // Helper to remove obsolete image assets from Supabase Storage when replaced or deleted
  const deleteOldStorageAsset = async (url?: string | null) => {
    if (!url || typeof url !== 'string' || !url.includes('/storage/v1/object/public/')) return;
    try {
      const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const rawPath = match[2].split('?')[0];
        const filePath = decodeURIComponent(rawPath);
        await supabase.storage.from(bucket).remove([filePath]);
      }
    } catch (err) {
      console.warn('Failed to delete old storage asset:', err);
    }
  };

  // Handle local image upload to Supabase Storage with Base64 fallback
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'hero' | 'hero2' | 'edit' | 'men' | 'women' | 'unisex' | 'category' | 'shirt' | 'tshirt' | 'coords' | 'pants' | 'sizeguide'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previousUrl =
      type === 'hero' ? heroImageUrl :
        type === 'hero2' ? heroImageUrl2 :
          type === 'edit' ? theEditImageUrl :
            type === 'men' ? menImageUrl :
              type === 'women' ? womenImageUrl :
                type === 'unisex' ? unisexImageUrl :
                  type === 'shirt' ? shirtImageUrl :
                    type === 'tshirt' ? tshirtImageUrl :
                      type === 'coords' ? coordsImageUrl :
                        type === 'pants' ? pantsImageUrl :
                          type === 'category' ? catImageUrl :
                            type === 'sizeguide' ? newSizeGuideImageUrl : '';

    const setLoader =
      type === 'hero' ? setIsUploadingHero :
        type === 'hero2' ? setIsUploadingHero2 :
          type === 'edit' ? setIsUploadingTheEdit :
            type === 'men' ? setIsUploadingMen :
              type === 'women' ? setIsUploadingWomen :
                type === 'unisex' ? setIsUploadingUnisex :
                  type === 'shirt' ? setIsUploadingShirt :
                    type === 'tshirt' ? setIsUploadingTshirt :
                      type === 'coords' ? setIsUploadingCoords :
                        type === 'pants' ? setIsUploadingPants :
                          type === 'sizeguide' ? setIsUploadingSizeGuide :
                            setIsUploadingCategory;
    setLoader(true);

    const assignUrl = (url: string) => {
      if (type === 'hero') setHeroImageUrl(url);
      else if (type === 'hero2') setHeroImageUrl2(url);
      else if (type === 'edit') setTheEditImageUrl(url);
      else if (type === 'men') setMenImageUrl(url);
      else if (type === 'women') setWomenImageUrl(url);
      else if (type === 'unisex') setUnisexImageUrl(url);
      else if (type === 'shirt') setShirtImageUrl(url);
      else if (type === 'tshirt') setTshirtImageUrl(url);
      else if (type === 'coords') setCoordsImageUrl(url);
      else if (type === 'pants') setPantsImageUrl(url);
      else if (type === 'category') setCatImageUrl(url);
      else if (type === 'sizeguide') setNewSizeGuideImageUrl(url);
    };

    const readableName =
      type === 'hero' ? 'Hero Slide 1' :
        type === 'hero2' ? 'Hero Slide 2' :
          type === 'edit' ? 'The Edit' :
            type === 'men' ? 'Men Collection' :
              type === 'women' ? 'Women Collection' :
                type === 'unisex' ? 'Unisex Collection' :
                  type === 'shirt' ? 'Shirt Category' :
                    type === 'tshirt' ? 'T-Shirt Category' :
                      type === 'coords' ? 'Co-ords Category' :
                        type === 'pants' ? 'Pants Category' :
                          type === 'sizeguide' ? 'Size Guide' : 'Category';

    try {
      // 1. Optimize / compress image client-side to ensure small payload size & fast upload
      const { blob: compressedBlob, dataUrl: compressedDataUrl } = await compressImage(file, 1920, 1920, 0.85);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      let publicUrl = '';
      try {
        const { error: uploadError } = await supabase.storage
          .from('homepage-assets')
          .upload(filePath, compressedBlob, {
            cacheControl: '3600',
            upsert: true
          });

        if (!uploadError) {
          const { data } = supabase.storage
            .from('homepage-assets')
            .getPublicUrl(filePath);
          publicUrl = data.publicUrl;
        } else {
          // Attempt fallback bucket if homepage-assets fails
          const { error: uploadError2 } = await supabase.storage
            .from('product-images')
            .upload(filePath, compressedBlob, {
              cacheControl: '3600',
              upsert: true
            });
          if (!uploadError2) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            publicUrl = data.publicUrl;
          }
        }
      } catch (storageErr) {
        console.warn('Supabase storage upload failed:', storageErr);
      }

      if (publicUrl) {
        if (previousUrl && previousUrl !== publicUrl) {
          deleteOldStorageAsset(previousUrl);
        }
        assignUrl(publicUrl);
        triggerNotification(`${readableName} image uploaded to cloud storage! Click "Save Homepage Settings" to persist.`);
      } else {
        // Safe compressed Data URL fallback
        assignUrl(compressedDataUrl);
        triggerNotification(`${readableName} image loaded & compressed. Click "Save Homepage Settings" to persist.`);
      }
    } catch (err: any) {
      console.error('Error processing image:', err);
      triggerNotification(err.message || 'Error processing image upload', true);
    } finally {
      setLoader(false);
      e.target.value = '';
    }
  };

  const handleSizeGuideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleImageUpload(e, 'sizeguide');
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingProductImage(true);

    try {
      const uploadedImages: ProductImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const { blob: compressedBlob, dataUrl: compressedDataUrl } = await compressImage(file, 1400, 1400, 0.85);

        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `product-${Date.now()}-${i}.${fileExt}`;
        const filePath = `products/${fileName}`;

        let publicUrl = '';
        try {
          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, compressedBlob, {
              cacheControl: '3600',
              upsert: true
            });

          if (!uploadError) {
            const { data } = supabase.storage
              .from('product-images')
              .getPublicUrl(filePath);
            publicUrl = data.publicUrl;
          } else {
            const { error: uploadError2 } = await supabase.storage
              .from('homepage-assets')
              .upload(filePath, compressedBlob, {
                cacheControl: '3600',
                upsert: true
              });
            if (!uploadError2) {
              const { data } = supabase.storage
                .from('homepage-assets')
                .getPublicUrl(filePath);
              publicUrl = data.publicUrl;
            }
          }
        } catch (storageErr) {
          console.warn('Storage bucket upload failed, using Data URL fallback.', storageErr);
        }

        if (publicUrl) {
          uploadedImages.push({
            url: publicUrl,
            sort_order: prodImages.length + uploadedImages.length
          });
        } else {
          uploadedImages.push({
            url: compressedDataUrl,
            sort_order: prodImages.length + uploadedImages.length
          });
        }
      }

      if (uploadedImages.length > 0) {
        setProdImages((prev) => [...prev, ...uploadedImages]);
        triggerNotification(`${uploadedImages.length} image(s) processed successfully!`);
      }
    } catch (err: any) {
      console.error('Error uploading product images:', err);
      triggerNotification(err.message || 'Error uploading product images', true);
    } finally {
      setIsUploadingProductImage(false);
      e.target.value = '';
    }
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    const nextImages = [...prodImages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextImages.length) return;

    const temp = nextImages[index];
    nextImages[index] = nextImages[targetIndex];
    nextImages[targetIndex] = temp;

    const reordered = nextImages.map((img, idx) => ({
      ...img,
      sort_order: idx
    }));

    setProdImages(reordered);
  };

  const getCategoryCode = (categoryName: string): string => {
    const name = categoryName.trim().toUpperCase();
    if (name.includes('SHIRT') || name.includes('TOP')) return 'SHR';
    if (name.includes('PANT') || name.includes('TROUSER') || name.includes('JEAN')) return 'PAN';
    if (name.includes('CO-ORD') || name.includes('COORD')) return 'CRD';
    if (name.includes('T-SHIRT') || name.includes('TSHIRT')) return 'TEE';
    if (name.includes('JACKET') || name.includes('COAT') || name.includes('OUTER')) return 'JKT';
    return name.replace(/[^A-Z]/g, '').slice(0, 3).padEnd(3, 'X');
  };

  const getNextDresscode = (categoryCode: string): string => {
    const codes = new Set<number>();
    products.forEach(p => {
      p.product_variants?.forEach(v => {
        if (v.sku) {
          const parts = v.sku.split('-');
          if (parts.length >= 4 && parts[1] === categoryCode) {
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) {
              codes.add(num);
            }
          }
        }
      });
    });

    prodVariants.forEach(v => {
      if (v.sku) {
        const parts = v.sku.split('-');
        if (parts.length >= 4 && parts[1] === categoryCode) {
          const num = parseInt(parts[2], 10);
          if (!isNaN(num)) {
            codes.add(num);
          }
        }
      }
    });

    let nextNum = 1;
    while (codes.has(nextNum)) {
      nextNum++;
    }
    return String(nextNum).padStart(3, '0');
  };

  const isPantsProduct = useMemo(() => {
    const nameLower = prodName?.toLowerCase() || '';
    const slugLower = prodSlug?.toLowerCase() || '';
    if (nameLower.includes('pant') || nameLower.includes('trouser') || nameLower.includes('jeans') || slugLower.includes('pant') || slugLower.includes('trouser') || slugLower.includes('jeans')) {
      return true;
    }
    if (selectedParentCatId) {
      const parentCat = categories.find(c => c.id === selectedParentCatId);
      const parentNameLower = parentCat?.name?.toLowerCase() || '';
      const parentSlugLower = parentCat?.slug?.toLowerCase() || '';
      if (parentNameLower.includes('pant') || parentNameLower.includes('trouser') || parentNameLower.includes('jeans') || parentSlugLower.includes('pant') || parentSlugLower.includes('trouser') || parentSlugLower.includes('jeans')) {
        return true;
      }
    }
    if (newParentCatName) {
      const newNameLower = newParentCatName.toLowerCase();
      if (newNameLower.includes('pant') || newNameLower.includes('trouser') || newNameLower.includes('jeans')) {
        return true;
      }
    }
    return false;
  }, [prodName, prodSlug, selectedParentCatId, newParentCatName, categories]);

  const computedDresscode = useMemo(() => {
    for (const v of prodVariants) {
      if (v.sku) {
        const parts = v.sku.split('-');
        if (parts.length >= 4) {
          return parts[2];
        }
      }
    }
    if (editingProduct && editingProduct.product_variants) {
      for (const v of editingProduct.product_variants) {
        if (v.sku) {
          const parts = v.sku.split('-');
          if (parts.length >= 4) {
            return parts[2];
          }
        }
      }
    }
    const catNameStr = newParentCatName.trim() || categories.find(c => c.id === selectedParentCatId)?.name || '';
    const catCode = getCategoryCode(catNameStr);
    return getNextDresscode(catCode);
  }, [prodVariants, editingProduct, newParentCatName, selectedParentCatId, categories, products]);

  const computedSku = useMemo(() => {
    const catNameStr = newParentCatName.trim() || categories.find(c => c.id === selectedParentCatId)?.name || '';
    const catCode = getCategoryCode(catNameStr);
    return `ZP-${catCode}-${computedDresscode}-${varSize}`;
  }, [selectedParentCatId, newParentCatName, categories, computedDresscode, varSize]);

  // Adjust default variant size when category switches between pants and other clothing
  useEffect(() => {
    if (isPantsProduct) {
      if (!['28', '30', '32', '34', '36', '38'].includes(varSize)) {
        setVarSize('30');
      }
    } else {
      if (!['S', 'M', 'L', 'XL'].includes(varSize)) {
        setVarSize('M');
      }
    }
  }, [isPantsProduct, varSize]);

  const handleHeroDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!heroDragActive || !heroContainerRef.current) return;
    const rect = heroContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setHeroImagePosition(`${posX}% ${posY}%`);
  };

  const handleHero2Drag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hero2DragActive || !hero2ContainerRef.current) return;
    const rect = hero2ContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setHeroImagePosition2(`${posX}% ${posY}%`);
  };

  const handleEditDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!theEditDragActive || !editContainerRef.current) return;
    const rect = editContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setTheEditImagePosition(`${posX}% ${posY}%`);
  };

  const handleHeroTouchDrag = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!heroContainerRef.current) return;
    const touch = e.touches[0];
    const rect = heroContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setHeroImagePosition(`${posX}% ${posY}%`);
  };

  const handleHero2TouchDrag = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!hero2ContainerRef.current) return;
    const touch = e.touches[0];
    const rect = hero2ContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setHeroImagePosition2(`${posX}% ${posY}%`);
  };

  const handleEditTouchDrag = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!editContainerRef.current) return;
    const touch = e.touches[0];
    const rect = editContainerRef.current.getBoundingClientRect();
    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;
    const posX = Math.max(0, Math.min(100, Math.round(x)));
    const posY = Math.max(0, Math.min(100, Math.round(y)));
    setTheEditImagePosition(`${posX}% ${posY}%`);
  };

  // Save Homepage Settings
  const handleSaveHomepage = async () => {
    setIsSavingHomepage(true);
    const combinedHeroUrl = heroImageUrl2.trim()
      ? `${heroImageUrl.trim()}:::${heroImageUrl2.trim()}`
      : (heroImageUrl.trim() || null);
    const combinedHeroPos =
      heroImagePosition2 !== 'center' || heroImagePosition !== 'center'
        ? `${heroImagePosition}:::${heroImagePosition2}`
        : heroImagePosition;

    const configPayload: any = {
      id: 'global',
      hero_image_url: combinedHeroUrl,
      hero_image_position: combinedHeroPos,
      hero_image_url_2: heroImageUrl2.trim() || null,
      hero_image_position_2: heroImagePosition2,
      the_edit_image_url: theEditImageUrl.trim() || null,
      the_edit_image_position: theEditImagePosition,
      best_sellers_ids: bestSellersIds,
      new_arrivals_ids: newArrivalsIds,
      men_collection_image_url: menImageUrl.trim() || null,
      women_collection_image_url: womenImageUrl.trim() || null,
      unisex_collection_image_url: unisexImageUrl.trim() || null,
      shirt_category_image_url: shirtImageUrl.trim() || null,
      tshirt_category_image_url: tshirtImageUrl.trim() || null,
      coords_category_image_url: coordsImageUrl.trim() || null,
      pants_category_image_url: pantsImageUrl.trim() || null,
      updated_at: new Date().toISOString()
    };
    try {
      const { error } = await supabase
        .from('homepage_config' as any)
        .upsert(configPayload);

      if (error) {
        console.warn('Full homepage upsert fallback to core columns:', error);
        // Fallback with core columns in case new columns are not yet added in Supabase schema
        const corePayload = {
          id: 'global',
          hero_image_url: combinedHeroUrl,
          hero_image_position: combinedHeroPos,
          the_edit_image_url: theEditImageUrl.trim() || null,
          the_edit_image_position: theEditImagePosition,
          best_sellers_ids: bestSellersIds,
          new_arrivals_ids: newArrivalsIds,
          men_collection_image_url: menImageUrl.trim() || null,
          women_collection_image_url: womenImageUrl.trim() || null,
          unisex_collection_image_url: unisexImageUrl.trim() || null,
          updated_at: new Date().toISOString()
        };
        const fallbackRes = await supabase
          .from('homepage_config' as any)
          .upsert(corePayload);
        if (fallbackRes.error) {
          throw fallbackRes.error;
        }
        triggerNotification('Homepage configuration saved successfully!');
      } else {
        triggerNotification('Homepage configuration saved successfully!');
      }

      dataCache.set('homepage_config', configPayload);
      try {
        localStorage.setItem('zenphire_homepage_config', JSON.stringify(configPayload));
      } catch (e) {}
    } catch (err: any) {
      console.error('Error saving homepage config:', err);
      triggerNotification(err.message || 'Failed to save homepage settings.', true);
    } finally {
      setIsSavingHomepage(false);
    }
  };

  const triggerNotification = (msg: string, isError = false) => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, msg, isError }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Helper to generate slug
  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Open Edit Product form
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdName(prod.name);
    setProdSlug(prod.slug);
    setProdPrice(prod.base_price.toString());
    setProdDesc(prod.description || '');
    setProdActive(prod.is_active);
    setProdSizeGuideType(prod.size_guide_type || 'category');
    setProdCustomSizeGuide(prod.custom_size_guide_html || '');
    setProdImages(prod.product_images || []);
    setProdVariants(prod.product_variants || []);

    const existingOcc = occasionProducts.find(op => op.product_id === prod.id);
    setProdOccasion(existingOcc ? existingOcc.occasion : '');

    // Parse Size Guide
    const sgVal = prod.custom_size_guide_html || '';
    if (sgVal.startsWith('SIZE_GUIDE_IMG::')) {
      const parts = sgVal.split('::');
      const imgUrl = parts[1] || '';
      const name = parts[2] || '';
      const matched = sizeGuideTemplates.find(t => t.image_url === imgUrl);
      if (matched) {
        setSizeGuideMode('template');
        setSelectedTemplateId(matched.id);
      } else {
        setSizeGuideMode('new');
        setNewSizeGuideName(name);
        setNewSizeGuideImageUrl(imgUrl);
      }
    } else if (sgVal.trim()) {
      setSizeGuideMode('legacy');
    } else {
      setSizeGuideMode('template');
      setSelectedTemplateId('');
    }

    // Wizard setup: resolve main & sub-category from prod.category_id
    const productCategoryObj = categories.find(c => c.id === prod.category_id);
    if (productCategoryObj) {
      if (productCategoryObj.parent_category_id) {
        setSelectedParentCatId(productCategoryObj.parent_category_id);
        setSelectedGender(productCategoryObj.name as any);
      } else {
        setSelectedParentCatId(productCategoryObj.id);
        setSelectedGender('');
      }
    } else {
      setSelectedParentCatId('');
      setSelectedGender('');
    }
    setNewParentCatName('');
    setWizardStep(3); // Start directly at step 3 when editing
    setIsProductModalOpen(true);
  };

  // Open Add Product form
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProdName('');
    setProdSlug('');
    setProdPrice('');
    setProdDesc('');
    setProdActive(true);
    setProdSizeGuideType('category');
    setProdCustomSizeGuide('');
    setProdImages([]);
    setProdVariants([]);
    setProdOccasion('');

    setSizeGuideMode('template');
    setSelectedTemplateId('');
    setNewSizeGuideName('');
    setNewSizeGuideImageUrl('');

    // Wizard resets
    setWizardStep(1);
    setSelectedParentCatId('');
    setSelectedGender('');
    setNewParentCatName('');
    setIsProductModalOpen(true);
  };



  // Delete image from list inside modal
  const handleDeleteImage = (index: number) => {
    const target = prodImages[index];
    if (target?.url) {
      deleteOldStorageAsset(target.url);
    }
    const updated = prodImages.filter((_, i) => i !== index);
    setProdImages(updated);
  };

  // Add variant inside modal
  const handleAddVariant = () => {
    const qty = parseInt(varStock);
    const targetSku = computedSku.trim();
    if (!targetSku) {
      alert('SKU generation failed. Please specify category details.');
      return;
    }
    if (prodVariants.some(v => v.sku === targetSku)) {
      alert(`Variant SKU "${targetSku}" already exists in the ledger.`);
      return;
    }
    const newVar: ProductVariant = {
      size: varSize,
      color: varColor,
      stock_qty: isNaN(qty) ? 0 : qty,
      sku: targetSku
    };
    setProdVariants([...prodVariants, newVar]);
  };

  // Delete variant from list inside modal
  const handleDeleteVariant = (index: number) => {
    const updated = prodVariants.filter((_, i) => i !== index);
    setProdVariants(updated);
  };

  // Save Product Submit (Add / Edit)
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice.trim()) {
      triggerNotification('Product Name and Price are required', true);
      return;
    }
    if (isSavingProduct) return; // Prevent double-submit

    setIsSavingProduct(true);
    try {
      let finalCategoryId: string | null = null;

      // 1. Resolve Category ID from wizard selections
      if (newParentCatName.trim()) {
        const parentSlug = generateSlug(newParentCatName);
        const existingParent = categories.find(c => c.slug === parentSlug && !c.parent_category_id);
        let parentId = existingParent?.id;

        if (!existingParent) {
          const { data: newParent, error: parentErr } = await supabase
            .from('categories')
            .insert({
              name: newParentCatName.trim(),
              slug: parentSlug
            })
            .select()
            .single();
          if (parentErr) throw parentErr;
          parentId = newParent.id;
        }

        if (selectedGender) {
          const childSlug = `${parentSlug}-${selectedGender.toLowerCase()}`;
          const { data: newChild, error: childErr } = await supabase
            .from('categories')
            .insert({
              name: selectedGender,
              slug: childSlug,
              parent_category_id: parentId
            })
            .select()
            .single();
          if (childErr) throw childErr;
          finalCategoryId = newChild.id;
        } else {
          finalCategoryId = parentId || null;
        }
      } else if (selectedParentCatId) {
        const parentCatObj = categories.find(c => c.id === selectedParentCatId);
        if (parentCatObj) {
          if (selectedGender) {
            const childSlug = `${parentCatObj.slug}-${selectedGender.toLowerCase()}`;
            const existingChild = categories.find(c => c.slug === childSlug && c.parent_category_id === parentCatObj.id);

            if (existingChild) {
              finalCategoryId = existingChild.id;
            } else {
              const { data: newChild, error: childErr } = await supabase
                .from('categories')
                .insert({
                  name: selectedGender,
                  slug: childSlug,
                  parent_category_id: parentCatObj.id
                })
                .select()
                .single();
              if (childErr) throw childErr;
              finalCategoryId = newChild.id;
            }
          } else {
            finalCategoryId = parentCatObj.id;
          }
        }
      }

      // Compute Size Guide output
      let computedSizeGuideHtml: string | null = null;
      if (sizeGuideMode === 'template' && selectedTemplateId) {
        const sg = sizeGuideTemplates.find(t => t.id === selectedTemplateId);
        if (sg) {
          computedSizeGuideHtml = `SIZE_GUIDE_IMG::${sg.image_url}::${sg.name}`;
        }
      } else if (sizeGuideMode === 'new' && newSizeGuideImageUrl) {
        const name = newSizeGuideName.trim() || 'Size Guide';
        computedSizeGuideHtml = `SIZE_GUIDE_IMG::${newSizeGuideImageUrl}::${name}`;

        const newTemplate: SizeGuideTemplate = {
          id: `sg-${Date.now()}`,
          name: name,
          image_url: newSizeGuideImageUrl
        };

        try {
          const { data: insertedSg } = await supabase
            .from('size_guides' as any)
            .insert({ name: name, image_url: newSizeGuideImageUrl })
            .select()
            .single();
          if (insertedSg) {
            newTemplate.id = (insertedSg as any).id;
          }
        } catch (sgInsErr) {
          console.warn('Could not insert to size_guides table, saving locally:', sgInsErr);
        }

        setSizeGuideTemplates(prev => [newTemplate, ...prev.filter(t => t.image_url !== newSizeGuideImageUrl)]);
      } else if (sizeGuideMode === 'legacy' && prodCustomSizeGuide.trim()) {
        computedSizeGuideHtml = prodCustomSizeGuide.trim();
      }

      let productId: string = '';
      const payload = {
        name: prodName.trim(),
        slug: prodSlug.trim() || generateSlug(prodName),
        base_price: parseFloat(prodPrice),
        description: prodDesc.trim() || null,
        category_id: finalCategoryId,
        is_active: prodActive,
        size_guide_type: computedSizeGuideHtml ? 'custom' : prodSizeGuideType || 'category',
        custom_size_guide_html: computedSizeGuideHtml
      };

      if (editingProduct) {
        productId = editingProduct.id;
        // 1. Update Product core details
        const { error: updateErr } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId);
        if (updateErr) throw new Error(`Failed to update product: ${updateErr.message}`);

        // 2. Delete existing images (with error check)
        const { error: delImgErr } = await supabase
          .from('product_images')
          .delete()
          .eq('product_id', productId);
        if (delImgErr) throw new Error(`Failed to clear old images: ${delImgErr.message}`);

        // 3. Delete existing variants (with error check)
        const { error: delVarErr } = await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId);
        if (delVarErr) throw new Error(`Failed to clear old variants: ${delVarErr.message}`);
      } else {
        // Insert new Product
        const { data, error: insertErr } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (insertErr) throw new Error(`Failed to create product: ${insertErr.message}`);
        productId = data.id;
      }

      // 4. Insert Images (non-critical — warn but don't fail)
      if (prodImages.length > 0) {
        const imagesInsert = prodImages.map((img, idx) => ({
          product_id: productId,
          url: img.url,
          sort_order: idx
        }));
        const { error: imgInsertErr } = await supabase.from('product_images').insert(imagesInsert);
        if (imgInsertErr) {
          console.warn('Images could not be saved (non-critical):', imgInsertErr.message);
          triggerNotification(`Product saved, but images failed to save: ${imgInsertErr.message}`, true);
        }
      }

      // 5. Insert Variants (Auto-generate standard S, M, L, XL with 50 stock if none explicitly specified)
      const variantsToSave = prodVariants.length > 0
        ? prodVariants
        : [
            { size: 'S', color: 'Default', stock_qty: 50, sku: `${payload.slug}-S` },
            { size: 'M', color: 'Default', stock_qty: 50, sku: `${payload.slug}-M` },
            { size: 'L', color: 'Default', stock_qty: 50, sku: `${payload.slug}-L` },
            { size: 'XL', color: 'Default', stock_qty: 50, sku: `${payload.slug}-XL` }
          ];

      const variantsInsert = variantsToSave.map((v) => ({
        product_id: productId,
        size: v.size,
        color: v.color,
        stock_qty: v.stock_qty,
        sku: v.sku
      }));
      const { error: varInsertErr } = await supabase.from('product_variants').insert(variantsInsert);
      if (varInsertErr) throw new Error(`Failed to save variants: ${varInsertErr.message}`);

      // 6. Sync Occasion mapping
      try {
        await supabase
          .from('occasion_products' as any)
          .delete()
          .eq('product_id', productId);

        if (prodOccasion) {
          await supabase
            .from('occasion_products' as any)
            .insert({
              product_id: productId,
              occasion: prodOccasion
            });
        }
      } catch (occSyncErr: any) {
        console.warn('Occasion sync non-critical warning:', occSyncErr);
      }

      setIsProductModalOpen(false);
      triggerNotification(`✅ Product "${prodName}" saved successfully!`);
      fetchData(); // Refresh using split-query approach (resilient)
    } catch (err: any) {
      console.error('Error saving product:', err);
      triggerNotification(err.message || 'Error occurred while saving product', true);
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product? All variants and images will be lost.')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      triggerNotification('Product deleted successfully');
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message || 'Error deleting product', true);
    }
  };

  // Open Edit Category
  const handleOpenEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatParent(cat.parent_category_id || '');
    setCatSizeGuide(cat.size_guide_html || '');
    setCatImageUrl(cat.image_url || '');
    setIsCategoryModalOpen(true);
  };

  // Open Add Category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatParent('');
    setCatSizeGuide('');
    setCatImageUrl('');
    setIsCategoryModalOpen(true);
  };

  // Save Category Submit (Add / Edit)
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      triggerNotification('Category Name is required', true);
      return;
    }

    try {
      const payload = {
        name: catName.trim(),
        slug: catSlug.trim() || generateSlug(catName),
        parent_category_id: catParent || null,
        size_guide_html: catSizeGuide.trim() || null,
        image_url: catImageUrl.trim() || null
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);
        if (error) throw error;
      }

      setIsCategoryModalOpen(false);
      triggerNotification(`Category "${catName}" saved successfully`);
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message || 'Error occurred saving category', true);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      triggerNotification('Category deleted successfully');
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message || 'Error deleting category', true);
    }
  };

  // Bulk Restock all product variants to 50 stock units
  const handleBulkRestockAllVariants = async () => {
    if (!confirm('Restock all products and size variants in the catalog to 50 units each?')) return;
    try {
      const allVariantIds = products.flatMap(p => p.product_variants.map(v => v.id)).filter(Boolean);
      if (allVariantIds.length > 0) {
        const { error } = await supabase
          .from('product_variants')
          .update({ stock_qty: 50 })
          .in('id', allVariantIds);
        if (error) throw error;
      }
      triggerNotification('All catalog variants restocked to 50 units!');
      fetchData();
    } catch (err: any) {
      triggerNotification(err.message || 'Error executing bulk restock', true);
    }
  };

  // Save Stock inline update
  const handleInlineStockSave = async (variantId: string, originalQty: number) => {
    const val = inlineEditStock[variantId];
    if (val === undefined || val === originalQty) return;

    setSavingStockIds(prev => ({ ...prev, [variantId]: true }));
    try {
      const { error } = await supabase
        .from('product_variants')
        .update({ stock_qty: val })
        .eq('id', variantId);
      if (error) throw error;

      triggerNotification('Stock level updated successfully');

      // Update local state locally to avoid full fetch
      setProducts(prevProducts => {
        return prevProducts.map(p => ({
          ...p,
          product_variants: p.product_variants.map(v =>
            v.id === variantId ? { ...v, stock_qty: val } : v
          )
        }));
      });

      // Clear inline edit state for this variant
      setInlineEditStock(prev => {
        const next = { ...prev };
        delete next[variantId];
        return next;
      });
    } catch (err: any) {
      triggerNotification(err.message || 'Failed to save variant stock', true);
    } finally {
      setSavingStockIds(prev => ({ ...prev, [variantId]: false }));
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.product_variants.some(v => v.sku.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchSearch;
    });
  }, [products, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-16 font-sans antialiased text-slate-800">

      {/* ── Premium Toast Notification Stack (fixed bottom-right) ── */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 60, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
              className={`pointer-events-auto relative flex items-start gap-3 min-w-[280px] max-w-sm px-4 py-3.5 shadow-2xl border overflow-hidden ${
                toast.isError
                  ? 'bg-white border-red-200 text-red-700'
                  : 'bg-white border-emerald-200 text-emerald-800'
              }`}
            >
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${toast.isError ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${toast.isError ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {toast.isError ? <AlertTriangle size={13} strokeWidth={2.5} /> : <Check size={13} strokeWidth={2.5} />}
              </div>
              <p className="text-[11px] font-semibold leading-snug flex-1 pr-1">{toast.msg}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className={`flex-shrink-0 mt-0.5 rounded-full p-0.5 transition-colors cursor-pointer ${toast.isError ? 'hover:bg-red-50 text-red-400' : 'hover:bg-emerald-50 text-emerald-400'}`}
              >
                <X size={12} />
              </button>
              <div className={`absolute bottom-0 left-0 right-0 h-[2px] ${toast.isError ? 'bg-red-100' : 'bg-emerald-100'}`}>
                <div className={`h-full ${toast.isError ? 'bg-red-400' : 'bg-emerald-400'} animate-[progress_4s_linear_forwards]`} style={{ transformOrigin: 'left' }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ══════════════ ADMIN SHELL ══════════════ */}
      <div className="border border-border/80 bg-white shadow-[0_1px_16px_rgba(0,0,0,0.06)] mb-8">

        {/* ── Header bar ── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-accent flex items-center justify-center flex-shrink-0">
              <Settings2 size={15} className="text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-[0.18em] text-text-secondary/70 font-black">Admin Console</p>
              <h1 className="text-base md:text-lg font-heading font-black uppercase tracking-wide text-text-primary leading-tight">
                Store Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Customer Orders — always-visible priority CTA */}
            <button
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest transition-all cursor-pointer border ${
                activeTab === 'orders'
                  ? 'bg-accent text-white border-accent shadow-md'
                  : 'bg-white text-text-primary border-border hover:border-accent/70 hover:bg-bg-subtle'
              }`}
            >
              <ShoppingCart size={12} />
              Orders
              <span className={`inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[9px] font-black rounded-sm ${
                activeTab === 'orders' ? 'bg-white/25 text-white' : 'bg-accent text-white'
              }`}>
                {recentOrders.length}
              </span>
            </button>

            <button
              onClick={fetchData}
              disabled={loadingData}
              className="inline-flex items-center gap-1.5 border border-border bg-white text-text-secondary px-3.5 py-2 text-[11px] font-bold uppercase tracking-widest hover:text-text-primary hover:bg-bg-subtle transition-all disabled:opacity-40"
            >
              <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} />
              Sync
            </button>
          </div>
        </div>

        {/* ── Desktop Nav Bar ── */}
        <div className="hidden md:flex items-stretch overflow-x-auto">

          {/* Group 1: Core */}
          {([
            { key: 'homepage',  label: 'Homepage',         Icon: LayoutDashboard },
            { key: 'products',  label: 'Product Catalog',  Icon: ShoppingBag,    badge: products.length },
            { key: 'coupons',   label: 'Coupons',          Icon: Tag,            badge: coupons.length },
            { key: 'overview',  label: 'Analytics',        Icon: BarChart2 },
          ] as { key: typeof activeTab; label: string; Icon: any; badge?: number }[]).map(({ key, label, Icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`group relative flex items-center gap-2 px-5 py-4 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-150 flex-shrink-0 border-b-2 ${
                activeTab === key
                  ? 'border-accent text-text-primary bg-bg-subtle'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-subtle/60'
              }`}
            >
              <Icon size={14} strokeWidth={activeTab === key ? 2.5 : 2} className="flex-shrink-0" />
              {label}
              {badge !== undefined && (
                <span className={`inline-flex items-center justify-center h-4 min-w-[18px] px-1.5 text-[9px] font-black rounded-sm ${
                  activeTab === key ? 'bg-accent text-white' : 'bg-border text-text-secondary'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px my-3 bg-border/70 flex-shrink-0" />

          {/* Group 2: Operations */}
          {([
            { key: 'categories', label: 'Categories',  Icon: Layers },
            { key: 'inventory',  label: 'Inventory',   Icon: ClipboardList },
            { key: 'occasions',  label: 'Occasions',   Icon: Sparkles },
            { key: 'couriers',   label: 'Couriers',    Icon: Truck, badge: courierPartners.length },
          ] as { key: typeof activeTab; label: string; Icon: any; badge?: number }[]).map(({ key, label, Icon, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`group relative flex items-center gap-2 px-4 py-4 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all duration-150 flex-shrink-0 border-b-2 ${
                activeTab === key
                  ? 'border-accent text-text-primary bg-bg-subtle'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-subtle/60'
              }`}
            >
              <Icon size={14} strokeWidth={activeTab === key ? 2.5 : 2} className="flex-shrink-0" />
              {label}
              {badge !== undefined && (
                <span className={`inline-flex items-center justify-center h-4 min-w-[18px] px-1.5 text-[9px] font-black rounded-sm ${
                  activeTab === key ? 'bg-accent text-white' : 'bg-border text-text-secondary'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          ))}

        </div>

        {/* ── Mobile Dropdown ── */}
        <div className="md:hidden px-4 py-3">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full px-3 py-2.5 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-accent appearance-none cursor-pointer"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}
          >
            <option value="homepage">Homepage Settings</option>
            <option value="products">Product Catalog ({products.length})</option>
            <option value="coupons">Coupons ({coupons.length})</option>
            <option value="overview">Analytics</option>
            <option value="orders">Customer Orders ({recentOrders.length})</option>
            <option value="categories">Categories</option>
            <option value="inventory">Inventory</option>
            <option value="occasions">Occasions</option>
            <option value="couriers">Couriers ({courierPartners.length})</option>
          </select>
        </div>

      </div>

      {/* TABS CONTAINER */}
      <div>

        {/* TAB 1: OVERVIEW STATISTICS */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Stat 1 */}
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black">
                    Aggregated Revenue
                  </span>
                  <p className="text-2xl font-black text-text-primary mt-2">
                    ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="w-12 h-12 bg-bg-subtle flex items-center justify-center border border-border">
                  <DollarSign size={20} className="text-text-secondary stroke-[1.5]" />
                </div>
              </motion.div>

              {/* Stat 2 */}
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black">
                    Transactions
                  </span>
                  <p className="text-2xl font-black text-text-primary mt-2">
                    {ordersCount} Orders
                  </p>
                </div>
                <div className="w-12 h-12 bg-bg-subtle flex items-center justify-center border border-border">
                  <Activity size={20} className="text-text-secondary stroke-[1.5]" />
                </div>
              </motion.div>

              {/* Stat 3 */}
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black">
                    Low Stock Alerts
                  </span>
                  <p className={`text-2xl font-black mt-2 ${lowStockCount > 0 ? 'text-sale' : 'text-text-primary'}`}>
                    {lowStockCount} Variants
                  </p>
                </div>
                <div className="w-12 h-12 bg-bg-subtle flex items-center justify-center border border-border">
                  <AlertTriangle size={20} className={lowStockCount > 0 ? 'text-sale' : 'text-text-secondary'} />
                </div>
              </motion.div>

              {/* Stat 4 */}
              <motion.div
                whileHover={{ y: -4 }}
                className="bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex items-center justify-between transition-all"
              >
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black">
                    Catalog Items
                  </span>
                  <p className="text-2xl font-black text-text-primary mt-2">
                    {productsCount} SKUs
                  </p>
                </div>
                <div className="w-12 h-12 bg-bg-subtle flex items-center justify-center border border-border">
                  <Package size={20} className="text-text-secondary stroke-[1.5]" />
                </div>
              </motion.div>
            </div>

            {/* Recents grids */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

              {/* Left Column: Recent orders */}
              <div className="lg:col-span-7 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary mb-4 pb-2 border-b border-border">
                  Recent Activity Logs
                </h3>
                {recentOrders.length === 0 ? (
                  <p className="text-xs text-text-secondary py-6 text-center">No orders logs recorded in the system.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border text-[9px] uppercase tracking-wider text-text-secondary">
                          <th className="py-2.5">Order ID</th>
                          <th className="py-2.5">Date</th>
                          <th className="py-2.5 text-right">Value</th>
                          <th className="py-2.5 pl-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {recentOrders.slice(0, 5).map((o) => (
                          <tr key={o.id} className="hover:bg-bg-subtle">
                            <td className="py-3 font-mono font-bold text-text-primary">{o.id.slice(0, 8)}...</td>
                            <td className="py-3 text-text-secondary">{new Date(o.created_at).toLocaleDateString()}</td>
                            <td className="py-3 text-right font-semibold text-text-primary">₹{Number(o.total).toLocaleString()}</td>
                            <td className="py-3 pl-6">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border ${o.status === 'delivered'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : o.status === 'cancelled'
                                  ? 'bg-red-50 text-sale border-red-200'
                                  : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Right Column: Low Stock warnings */}
              <div className="lg:col-span-5 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary mb-4 pb-2 border-b border-border flex items-center gap-1.5">
                  <AlertTriangle size={13} className="text-sale" /> Critical Stock Warning
                </h3>
                {products.length === 0 ? (
                  <p className="text-xs text-text-secondary py-6 text-center">No inventory variants loaded.</p>
                ) : (
                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {products.flatMap(p =>
                      p.product_variants
                        .filter(v => v.stock_qty < 10)
                        .map(v => (
                          <div key={v.sku} className="flex justify-between items-center bg-bg-subtle p-3.5 border-l-2 border-sale shadow-xs">
                            <div>
                              <p className="text-xs text-text-primary font-bold uppercase tracking-wide">{p.name}</p>
                              <p className="text-[10px] text-text-secondary mt-0.5 font-mono">
                                SKU: {v.sku} │ Size: {v.size} │ Color: {v.color}
                              </p>
                            </div>
                            <span className="text-[10px] uppercase tracking-wider bg-sale/10 border border-sale text-sale font-black px-2 py-0.5">
                              {v.stock_qty} left
                            </span>
                          </div>
                        ))
                    ).slice(0, 5)}
                    {products.flatMap(p => p.product_variants.filter(v => v.stock_qty < 10)).length === 0 && (
                      <p className="text-xs text-green-700 font-semibold text-center py-6">All variant stock levels healthy.</p>
                    )}
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* TAB 2: PRODUCT CATALOG */}
        {activeTab === 'products' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Action panel */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="relative flex-grow max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search catalog by name, slug, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border/80 bg-white text-xs focus:outline-none focus:border-accent shadow-xs"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleOpenAddProduct}
                  className="bg-accent text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus size={14} /> Add SKU Product
                </button>
              </div>
            </div>

            {/* Products Table */}
            <div className="bg-white border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              {filteredProducts.length === 0 ? (
                <div className="py-16 text-center text-xs text-text-secondary">
                  No products matched your search requirements.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-bg-subtle text-[9px] uppercase tracking-wider text-text-secondary">
                        <th className="py-3.5 pl-6">Details</th>
                        <th className="py-3.5">Category</th>
                        <th className="py-3.5">Price</th>
                        <th className="py-3.5">Images</th>
                        <th className="py-3.5">Stock</th>
                        <th className="py-3.5">Status</th>
                        <th className="py-3.5 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredProducts.map((p: Product) => {
                        const totalStock = p.product_variants.reduce((sum: number, v: ProductVariant) => sum + v.stock_qty, 0);
                        const categoryName = categories.find(c => c.id === p.category_id)?.name || 'Unassigned';

                        return (
                          <tr key={p.id} className="hover:bg-bg-subtle">
                            <td className="py-4 pl-6">
                              <div className="font-bold text-text-primary text-xs uppercase tracking-wide">{p.name}</div>
                              <div className="text-[10px] text-text-secondary mt-0.5 font-mono">{p.slug}</div>
                            </td>
                            <td className="py-4 text-text-secondary uppercase tracking-wider font-semibold text-[10px]">
                              <div>{categoryName}</div>
                              {(() => {
                                const assignedOcc = occasionProducts.find(op => op.product_id === p.id);
                                if (!assignedOcc) return null;
                                return (
                                  <span className="inline-block text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 mt-1 bg-accent/10 text-accent border border-accent/20">
                                    {assignedOcc.occasion}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="py-4 text-text-primary font-bold">
                              ₹{Number(p.base_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-4 text-text-secondary">
                              {p.product_images.length} images
                            </td>
                            <td className="py-4">
                              <span className={`font-semibold text-xs ${totalStock < 20 ? 'text-sale font-bold' : 'text-text-primary'}`}>
                                {totalStock} units
                              </span>
                            </td>
                            <td className="py-4">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${p.is_active
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-sale border-red-200'
                                }`}>
                                {p.is_active ? 'Active' : 'Draft'}
                              </span>
                            </td>
                            <td className="py-4 pr-6 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => handleOpenEditProduct(p)}
                                  className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-accent transition-colors"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-sale transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* TAB 3: CATEGORIES & SIZING */}
        {activeTab === 'categories' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left: categories table */}
            <div className="lg:col-span-7 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Sizing Categories Listing
                </h3>
                <button
                  onClick={handleOpenAddCategory}
                  className="bg-accent text-white px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                >
                  New Category
                </button>
              </div>

              {categories.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">No categories defined in catalog.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[9px] uppercase tracking-wider text-text-secondary">
                        <th className="py-2.5 w-14">Image</th>
                        <th className="py-2.5">Category Name</th>
                        <th className="py-2.5">Slug</th>
                        <th className="py-2.5">Size Guide</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-bg-subtle">
                          <td className="py-3">
                            {c.image_url ? (
                              <img src={c.image_url} alt={c.name} className="w-8 h-10 object-cover border border-border bg-bg-subtle" />
                            ) : (
                              <span className="text-[10px] text-text-secondary/70 italic">None</span>
                            )}
                          </td>
                          <td className="py-3 font-bold text-text-primary uppercase tracking-wide text-[11px]">{c.name}</td>
                          <td className="py-3 font-mono text-[10px] text-text-secondary">{c.slug}</td>
                          <td className="py-3 text-[10px]">
                            {c.size_guide_html ? (
                              <span className="text-green-700 font-semibold flex items-center gap-1">
                                <Check size={10} /> Configured
                              </span>
                            ) : (
                              <span className="text-text-secondary">None</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleOpenEditCategory(c)}
                                className="p-1 hover:bg-bg-subtle text-text-secondary hover:text-accent transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(c.id)}
                                className="p-1 hover:bg-bg-subtle text-text-secondary hover:text-sale transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right: Sizing instructions layout */}
            <div className="lg:col-span-5 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                Flexible Size Guide Logic
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Zenphire Collections implements a flexible, cascading size guide engine:
              </p>
              <div className="bg-bg-subtle p-4 border-l-2 border-accent space-y-3">
                <div className="flex gap-2.5 items-start">
                  <span className="text-[10px] font-black uppercase bg-accent text-white px-1.5 py-0.5">1</span>
                  <div className="text-xs text-text-primary leading-snug">
                    <strong>Custom Product Overrides</strong>: If a product's size guide type is set to <em>Custom</em>, it ignores category fallbacks and displays the custom HTML sizing tables directly.
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-[10px] font-black uppercase bg-accent text-white px-1.5 py-0.5">2</span>
                  <div className="text-xs text-text-primary leading-snug">
                    <strong>Category Sizing Table</strong>: If no custom override exists, the product retrieves the default size guide HTML defined on its parent category.
                  </div>
                </div>
                <div className="flex gap-2.5 items-start">
                  <span className="text-[10px] font-black uppercase bg-accent text-white px-1.5 py-0.5">3</span>
                  <div className="text-xs text-text-primary leading-snug">
                    <strong>Standard Default</strong>: If neither is configured, the system matches keywords in the product name (e.g. Pants vs Shirts) to fall back to general size charts.
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        )}

        {/* TAB 4: INVENTORY STOCK LEDGER */}
        {activeTab === 'inventory' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Header controls: Search & Bulk Restock */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="relative max-w-md flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search variant ledger by SKU or product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border/80 bg-white text-xs focus:outline-none focus:border-accent shadow-xs"
                />
              </div>

              <button
                onClick={handleBulkRestockAllVariants}
                className="btn btn-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 flex-shrink-0 shadow-sm"
              >
                <RefreshCw size={14} /> Bulk Restock All (50 Units)
              </button>
            </div>

            {/* Inventory table */}
            <div className="bg-white border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle text-[9px] uppercase tracking-wider text-text-secondary">
                      <th className="py-3.5 pl-6">Product Details</th>
                      <th className="py-3.5">Variant Specs</th>
                      <th className="py-3.5 font-mono">SKU ID Code</th>
                      <th className="py-3.5 w-44">Stock Count (Inline Edit)</th>
                      <th className="py-3.5 pr-6 text-right">Status Alert</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.flatMap(p =>
                      p.product_variants
                        .filter(v => {
                          const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            v.sku.toLowerCase().includes(searchQuery.toLowerCase());
                          return matchSearch;
                        })
                        .map(v => {
                          const currentVal = inlineEditStock[v.id || ''] !== undefined
                            ? inlineEditStock[v.id || '']
                            : v.stock_qty;
                          const isSaving = savingStockIds[v.id || ''];
                          const hasChanged = inlineEditStock[v.id || ''] !== undefined && inlineEditStock[v.id || ''] !== v.stock_qty;

                          return (
                            <tr key={v.id} className="hover:bg-bg-subtle">
                              <td className="py-4 pl-6">
                                <span className="font-bold text-text-primary text-xs uppercase tracking-wide">{p.name}</span>
                              </td>
                              <td className="py-4">
                                <span className="text-text-secondary text-xs uppercase tracking-wider">
                                  Size: {v.size} │ Color: {v.color}
                                </span>
                              </td>
                              <td className="py-4 font-mono text-text-primary font-medium">{v.sku}</td>
                              <td className="py-4">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    value={currentVal}
                                    onChange={(e) => {
                                      const n = parseInt(e.target.value);
                                      setInlineEditStock(prev => ({
                                        ...prev,
                                        [v.id || '']: isNaN(n) ? 0 : n
                                      }));
                                    }}
                                    className="w-20 px-2 py-1 border border-border text-center text-xs focus:outline-none focus:border-accent"
                                  />
                                  {hasChanged && (
                                    <button
                                      disabled={isSaving}
                                      onClick={() => handleInlineStockSave(v.id || '', v.stock_qty)}
                                      className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-sm transition-colors border border-emerald-200"
                                    >
                                      {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 pr-6 text-right">
                                {v.stock_qty === 0 ? (
                                  <span className="text-[8px] font-black uppercase bg-sale/10 border border-sale text-sale px-2 py-0.5">
                                    Out Of Stock
                                  </span>
                                ) : v.stock_qty < 10 ? (
                                  <span className="text-[8px] font-black uppercase bg-yellow-50 border border-yellow-200 text-yellow-700 px-2 py-0.5">
                                    Low Inventory
                                  </span>
                                ) : (
                                  <span className="text-[8px] font-bold uppercase bg-green-50 border border-green-200 text-green-700 px-2 py-0.5">
                                    Healthy Stock
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                    )}
                    {products.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-xs text-text-secondary">
                          No product variants registered.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 5: CUSTOMER ORDERS */}
        {activeTab === 'orders' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Search controls */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
              <div className="relative flex-grow max-w-md">
                <Search size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                <input
                  type="text"
                  placeholder="Search orders by Order ID or customer name..."
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-border/80 bg-white text-xs focus:outline-none focus:border-accent shadow-xs"
                />
              </div>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-border/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-bg-subtle text-[9px] uppercase tracking-wider text-text-secondary">
                      <th className="py-3.5 pl-6">Order ID</th>
                      <th className="py-3.5">Customer</th>
                      <th className="py-3.5">Date</th>
                      <th className="py-3.5 text-right">Total Amount</th>
                      <th className="py-3.5 pl-8">Status</th>
                      <th className="py-3.5">Tracking ID</th>
                      <th className="py-3.5 pr-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentOrders
                      .filter(o => {
                        const query = orderSearchQuery.toLowerCase().trim();
                        if (!query) return true;
                        const matchId = o.id.toLowerCase().includes(query);
                        const matchName = o.profiles?.name?.toLowerCase().includes(query);
                        return matchId || matchName;
                      })
                      .map((o) => (
                        <tr key={o.id} className="hover:bg-bg-subtle">
                          <td className="py-4 pl-6 font-mono font-bold text-text-primary text-[11px]">
                            {o.id.slice(0, 8)}...
                          </td>
                          <td className="py-4 text-text-primary font-medium">
                            <div className="font-bold">{o.profiles?.name || 'Guest / Anonymous'}</div>
                            <div className="text-[10px] text-text-secondary font-mono mt-0.5">{o.profiles?.phone || 'No phone'}</div>
                          </td>
                          <td className="py-4 text-text-secondary">
                            {new Date(o.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 text-right font-black text-text-primary">
                            ₹{Number(o.total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 pl-8">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border ${o.status === 'delivered'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : o.status === 'cancelled'
                                ? 'bg-red-50 text-sale border-red-200'
                                : o.status === 'shipped'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : o.status === 'processing'
                                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              }`}>
                              {o.status}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-text-secondary text-[11px]">
                            {o.tracking_id || (
                              <span className="text-[10px] text-text-secondary/50 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-4 pr-6 text-right">
                            <button
                              onClick={() => fetchOrderDetails(o)}
                              className="border border-border bg-white text-text-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider hover:bg-bg-subtle transition-all shadow-xs"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    {recentOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-xs text-text-secondary">
                          No order records registered in database.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 6: MANAGE COUPONS */}
        {activeTab === 'coupons' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Coupon list */}
            <div className="lg:col-span-8 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Coupon Discounts List
                </h3>
                <button
                  onClick={() => {
                    setEditingCoupon(null);
                    setCouponCodeForm('');
                    setCouponDiscountType('percentage');
                    setCouponValue('');
                    setCouponExpiry('');
                    setCouponMinOrder('');
                    setIsCouponModalOpen(true);
                  }}
                  className="bg-accent text-white px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Create Coupon
                </button>
              </div>

              {coupons.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">No coupons defined in database.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[9px] uppercase tracking-wider text-text-secondary">
                        <th className="py-2.5">Code</th>
                        <th className="py-2.5">Type</th>
                        <th className="py-2.5">Value</th>
                        <th className="py-2.5">Min Order</th>
                        <th className="py-2.5">Expiry Date</th>
                        <th className="py-2.5">Status</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {coupons.map((c) => {
                        const isExpired = new Date(c.expiry) < new Date();
                        return (
                          <tr key={c.id} className="hover:bg-bg-subtle">
                            <td className="py-3 font-bold text-text-primary uppercase tracking-wide text-[11px]">{c.code}</td>
                            <td className="py-3 text-[10px] text-text-secondary uppercase">{c.discount_type}</td>
                            <td className="py-3 font-bold text-text-primary">
                              {c.discount_type === 'percentage' ? `${c.value}%` : `₹${Number(c.value).toFixed(2)}`}
                            </td>
                            <td className="py-3 text-[10px] text-text-secondary">₹{Number(c.min_order_value || 0).toFixed(2)}</td>
                            <td className="py-3 text-[10px] text-text-secondary font-mono">{new Date(c.expiry).toLocaleDateString()}</td>
                            <td className="py-3 text-[10px]">
                              <span className={`px-2 py-0.5 border text-[8px] font-black uppercase tracking-widest ${isExpired
                                ? 'bg-red-50 text-sale border-red-200'
                                : 'bg-green-50 text-green-700 border-green-200'
                                }`}>
                                {isExpired ? 'Expired' : 'Active'}
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setEditingCoupon(c);
                                    setCouponCodeForm(c.code);
                                    setCouponDiscountType(c.discount_type);
                                    setCouponValue(c.value.toString());
                                    setCouponExpiry(new Date(c.expiry).toISOString().split('T')[0]);
                                    setCouponMinOrder(c.min_order_value.toString());
                                    setIsCouponModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-accent transition-colors"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Are you sure you want to delete this coupon?')) return;
                                    try {
                                      const { error } = await supabase.from('coupons').delete().eq('id', c.id);
                                      if (error) throw error;
                                      triggerNotification('Coupon deleted successfully.');
                                      fetchData();
                                    } catch (err: any) {
                                      triggerNotification(err.message || 'Could not delete coupon.', true);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-sale transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Conditions explanation info */}
            <div className="lg:col-span-4 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                Coupon Rules & Validation
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Configure promotional campaigns for customers. Rules validated at checkout:
              </p>
              <div className="space-y-3 text-xs leading-relaxed text-text-secondary">
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Calendar Expiration</strong>
                  Coupon codes expire automatically based on the UTC datetime saved in the database.
                </div>
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Minimum Order Value</strong>
                  Enforce a threshold. Customers cannot apply coupons unless their shopping subtotal meets this value.
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 7: COURIER PARTNERS */}
        {activeTab === 'couriers' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Courier list */}
            <div className="lg:col-span-8 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-border">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Courier Shipping Partners
                </h3>
                <button
                  onClick={() => {
                    setEditingCourier(null);
                    setCourierNameForm('');
                    setCourierTrackingTemplate('');
                    setIsCourierModalOpen(true);
                  }}
                  className="bg-accent text-white px-3.5 py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Add Partner
                </button>
              </div>

              {courierPartners.length === 0 ? (
                <p className="text-xs text-text-secondary text-center py-8">No courier partners defined in database.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[9px] uppercase tracking-wider text-text-secondary">
                        <th className="py-2.5">Name</th>
                        <th className="py-2.5">Tracking Link Template</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {courierPartners.map((p) => (
                        <tr key={p.id} className="hover:bg-bg-subtle">
                          <td className="py-3 font-bold text-text-primary uppercase tracking-wide text-[11px]">{p.name}</td>
                          <td className="py-3 font-mono text-[10px] text-text-secondary truncate max-w-md">{p.tracking_url_template}</td>
                          <td className="py-3 text-right">
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => {
                                  setEditingCourier(p);
                                  setCourierNameForm(p.name);
                                  setCourierTrackingTemplate(p.tracking_url_template);
                                  setIsCourierModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-accent transition-colors"
                              >
                                <Edit2 size={12} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Are you sure you want to delete this courier partner?')) return;
                                  try {
                                    const { error } = await supabase.from('courier_partners' as any).delete().eq('id', p.id);
                                    if (error) throw error;
                                    triggerNotification('Courier partner deleted successfully.');
                                    fetchData();
                                  } catch (err: any) {
                                    triggerNotification(err.message || 'Could not delete courier partner.', true);
                                  }
                                }}
                                className="p-1.5 hover:bg-bg-subtle text-text-secondary hover:text-sale transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right Column: Help details */}
            <div className="lg:col-span-4 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                Tracking Link Configuration
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Courier Partners define links used to track customer orders.
              </p>
              <div className="bg-bg-subtle p-3.5 border-l-2 border-accent text-xs text-text-secondary">
                <span className="font-bold text-text-primary block mb-1">Link Template Example</span>
                Use tracking parameters that accept the ID at the end:
                <br />
                <code className="bg-white px-1 border border-border mt-1 block py-1 font-mono text-[9px]">https://www.delhivery.com/track?id=</code>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 8: HOMEPAGE SETTINGS */}
        {activeTab === 'homepage' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Side: Configuration Fields */}
            <div className="lg:col-span-8 space-y-8 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div className="flex justify-between items-center pb-2 border-b border-border">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Banners & Creative Assets Settings
                </h3>
                <button
                  type="button"
                  disabled={isSavingHomepage}
                  onClick={handleSaveHomepage}
                  className="bg-accent text-white px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingHomepage ? <Loader2 size={10} className="animate-spin" /> : null}
                  Save Homepage Settings
                </button>
              </div>

              {/* Banners block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Hero Banner Slide 1 Setting */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Hero Banner Image (Slide 1)
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroImageUrl}
                          onChange={(e) => setHeroImageUrl(e.target.value)}
                          placeholder="Paste image URL (https://...)"
                          className="flex-1 px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                        />
                        {heroImageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              if (heroImageUrl) deleteOldStorageAsset(heroImageUrl);
                              setHeroImageUrl('');
                            }}
                            className="px-2.5 py-1 bg-bg-subtle text-sale border border-border text-[10px] font-bold hover:bg-sale/10 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase font-semibold">Or upload:</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingHero}
                          onChange={(e) => handleImageUpload(e, 'hero')}
                          className="text-xs text-text-primary file:mr-2 file:py-1 file:px-2.5 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                        />
                      </div>
                      {isUploadingHero && (
                        <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                          Optimizing & uploading image...
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-text-secondary mt-1 block font-semibold">
                      Recommended: 1920 × 1200px.
                    </span>
                  </div>

                  {/* Hero preview - Drag to adjust */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Crop Adjustment (Slide 1)
                    </span>
                    <div
                      ref={heroContainerRef}
                      onMouseDown={() => setHeroDragActive(true)}
                      onMouseMove={handleHeroDrag}
                      onMouseUp={() => setHeroDragActive(false)}
                      onMouseLeave={() => setHeroDragActive(false)}
                      onTouchMove={handleHeroTouchDrag}
                      className="border border-border bg-bg-subtle aspect-[16/9] relative overflow-hidden group select-none cursor-move"
                    >
                      {heroImageUrl ? (
                        <>
                          <img
                            src={heroImageUrl}
                            alt="Hero Preview 1"
                            className="w-full h-full object-cover pointer-events-none"
                            style={{ objectPosition: heroImagePosition }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5 border border-white/20">
                              Click &amp; Drag to adjust focus
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 border border-white/10 text-[9px] font-mono text-white/95 pointer-events-none rounded">
                            Pivot: {heroImagePosition === 'center' ? '50% 50%' : heroImagePosition}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold pointer-events-none">
                          No custom hero image loaded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Banner Slide 2 Setting */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Hero Banner Image (Slide 2 - Auto Slide)
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={heroImageUrl2}
                          onChange={(e) => setHeroImageUrl2(e.target.value)}
                          placeholder="Paste slide 2 image URL (https://...)"
                          className="flex-1 px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                        />
                        {heroImageUrl2 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (heroImageUrl2) deleteOldStorageAsset(heroImageUrl2);
                              setHeroImageUrl2('');
                            }}
                            className="px-2.5 py-1 bg-bg-subtle text-sale border border-border text-[10px] font-bold hover:bg-sale/10 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase font-semibold">Or upload:</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingHero2}
                          onChange={(e) => handleImageUpload(e, 'hero2')}
                          className="text-xs text-text-primary file:mr-2 file:py-1 file:px-2.5 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                        />
                      </div>
                      {isUploadingHero2 && (
                        <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                          Optimizing & uploading image...
                        </span>
                      )}
                    </div>
                    <span className="text-[9px] text-text-secondary mt-1 block font-semibold">
                      Slides automatically every 6 seconds on the storefront.
                    </span>
                  </div>

                  {/* Hero 2 preview - Drag to adjust */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Crop Adjustment (Slide 2)
                    </span>
                    <div
                      ref={hero2ContainerRef}
                      onMouseDown={() => setHero2DragActive(true)}
                      onMouseMove={handleHero2Drag}
                      onMouseUp={() => setHero2DragActive(false)}
                      onMouseLeave={() => setHero2DragActive(false)}
                      onTouchMove={handleHero2TouchDrag}
                      className="border border-border bg-bg-subtle aspect-[16/9] relative overflow-hidden group select-none cursor-move"
                    >
                      {heroImageUrl2 ? (
                        <>
                          <img
                            src={heroImageUrl2}
                            alt="Hero Preview 2"
                            className="w-full h-full object-cover pointer-events-none"
                            style={{ objectPosition: heroImagePosition2 }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5 border border-white/20">
                              Click &amp; Drag to adjust focus
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 border border-white/10 text-[9px] font-mono text-white/95 pointer-events-none rounded">
                            Pivot: {heroImagePosition2 === 'center' ? '50% 50%' : heroImagePosition2}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold pointer-events-none">
                          No custom slide 2 hero image loaded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* The Edit Banner Setting */}
                <div className="space-y-4 md:col-span-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      "The Edit" Banner Image
                    </label>
                    <div className="space-y-2 max-w-md">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={theEditImageUrl}
                          onChange={(e) => setTheEditImageUrl(e.target.value)}
                          placeholder="Paste image URL (https://...)"
                          className="flex-1 px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                        />
                        {theEditImageUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              if (theEditImageUrl) deleteOldStorageAsset(theEditImageUrl);
                              setTheEditImageUrl('');
                            }}
                            className="px-2.5 py-1 bg-bg-subtle text-sale border border-border text-[10px] font-bold hover:bg-sale/10 cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-secondary uppercase font-semibold">Or upload:</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={isUploadingTheEdit}
                          onChange={(e) => handleImageUpload(e, 'edit')}
                          className="text-xs text-text-primary file:mr-2 file:py-1 file:px-2.5 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                        />
                      </div>
                      {isUploadingTheEdit && (
                        <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                          Optimizing & uploading image...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* The Edit preview - Drag to adjust */}
                  <div className="space-y-1 max-w-md">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">
                      Crop Adjustment (Click & Drag Image to adjust positioning)
                    </span>
                    <div
                      ref={editContainerRef}
                      onMouseDown={() => setTheEditDragActive(true)}
                      onMouseMove={handleEditDrag}
                      onMouseUp={() => setTheEditDragActive(false)}
                      onMouseLeave={() => setTheEditDragActive(false)}
                      onTouchMove={handleEditTouchDrag}
                      className="border border-border bg-bg-subtle aspect-[16/9] relative overflow-hidden group select-none cursor-move"
                    >
                      {theEditImageUrl ? (
                        <>
                          <img
                            src={theEditImageUrl}
                            alt="The Edit Preview"
                            className="w-full h-full object-cover pointer-events-none"
                            style={{ objectPosition: theEditImagePosition }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                            <span className="text-[10px] text-white font-bold uppercase tracking-widest bg-black/60 px-3 py-1.5 border border-white/20">
                              Click &amp; Drag to adjust focus
                            </span>
                          </div>
                          <div className="absolute bottom-2 left-2 bg-black/80 px-2 py-0.5 border border-white/10 text-[9px] font-mono text-white/95 pointer-events-none rounded">
                            Pivot: {theEditImagePosition === 'center' ? '50% 50%' : theEditImagePosition}
                          </div>
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold pointer-events-none">
                          No custom "The Edit" image loaded.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender Mockups block */}
              <div className="border-t border-border pt-6 space-y-6">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Gender Collection Mockup Banners
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Men Collection image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Men Collection Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={menImageUrl}
                        onChange={(e) => setMenImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-3 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingMen}
                        onChange={(e) => handleImageUpload(e, 'men')}
                        className="w-full text-xs text-text-primary file:mr-2 file:py-1 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingMen && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {menImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[4/5] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={menImageUrl} alt="Men Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (menImageUrl) deleteOldStorageAsset(menImageUrl);
                            setMenImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[4/5] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Men mockup loaded
                      </div>
                    )}
                  </div>

                  {/* Women Collection image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Women Collection Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={womenImageUrl}
                        onChange={(e) => setWomenImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-3 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingWomen}
                        onChange={(e) => handleImageUpload(e, 'women')}
                        className="w-full text-xs text-text-primary file:mr-2 file:py-1 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingWomen && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {womenImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[4/5] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={womenImageUrl} alt="Women Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (womenImageUrl) deleteOldStorageAsset(womenImageUrl);
                            setWomenImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[4/5] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Women mockup loaded
                      </div>
                    )}
                  </div>

                  {/* Unisex Collection image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Unisex Collection Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={unisexImageUrl}
                        onChange={(e) => setUnisexImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-3 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingUnisex}
                        onChange={(e) => handleImageUpload(e, 'unisex')}
                        className="w-full text-xs text-text-primary file:mr-2 file:py-1 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingUnisex && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {unisexImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[4/5] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={unisexImageUrl} alt="Unisex Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (unisexImageUrl) deleteOldStorageAsset(unisexImageUrl);
                            setUnisexImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[4/5] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Unisex mockup loaded
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Category Showcase Images (Shirts, T-Shirts, Co-ords, Pants) */}
              <div className="border-t border-border pt-6 space-y-6">
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-text-primary">
                  Shop By Category Banner Images (Shirts, T-Shirts, Co-ords, Pants)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  {/* Shirts Image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Shirts Category Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={shirtImageUrl}
                        onChange={(e) => setShirtImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-2.5 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingShirt}
                        onChange={(e) => handleImageUpload(e, 'shirt')}
                        className="w-full text-[10px] text-text-primary file:mr-1 file:py-0.5 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingShirt && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {shirtImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[3/4] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={shirtImageUrl} alt="Shirts Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (shirtImageUrl) deleteOldStorageAsset(shirtImageUrl);
                            setShirtImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Shirts image
                      </div>
                    )}
                  </div>

                  {/* T-Shirts Image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      T-Shirts Category Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={tshirtImageUrl}
                        onChange={(e) => setTshirtImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-2.5 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingTshirt}
                        onChange={(e) => handleImageUpload(e, 'tshirt')}
                        className="w-full text-[10px] text-text-primary file:mr-1 file:py-0.5 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingTshirt && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {tshirtImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[3/4] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={tshirtImageUrl} alt="T-Shirts Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (tshirtImageUrl) deleteOldStorageAsset(tshirtImageUrl);
                            setTshirtImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No T-Shirts image
                      </div>
                    )}
                  </div>

                  {/* Co-ords Image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Co-ords Category Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={coordsImageUrl}
                        onChange={(e) => setCoordsImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-2.5 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingCoords}
                        onChange={(e) => handleImageUpload(e, 'coords')}
                        className="w-full text-[10px] text-text-primary file:mr-1 file:py-0.5 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingCoords && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {coordsImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[3/4] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={coordsImageUrl} alt="Co-ords Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (coordsImageUrl) deleteOldStorageAsset(coordsImageUrl);
                            setCoordsImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Co-ords image
                      </div>
                    )}
                  </div>

                  {/* Pants Image */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Pants Category Image
                    </label>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={pantsImageUrl}
                        onChange={(e) => setPantsImageUrl(e.target.value)}
                        placeholder="Paste image URL..."
                        className="w-full px-2.5 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        disabled={isUploadingPants}
                        onChange={(e) => handleImageUpload(e, 'pants')}
                        className="w-full text-[10px] text-text-primary file:mr-1 file:py-0.5 file:px-2 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                      />
                    </div>
                    {isUploadingPants && (
                      <span className="text-[9px] text-accent mt-1 block font-bold animate-pulse">
                        Uploading...
                      </span>
                    )}
                    {pantsImageUrl ? (
                      <div className="space-y-2">
                        <div className="aspect-[3/4] bg-bg-subtle relative overflow-hidden border border-border">
                          <img src={pantsImageUrl} alt="Pants Preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (pantsImageUrl) deleteOldStorageAsset(pantsImageUrl);
                            setPantsImageUrl('');
                          }}
                          className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <X size={10} className="stroke-[2]" /> Clear Image
                        </button>
                      </div>
                    ) : (
                      <div className="aspect-[3/4] border border-border bg-bg-subtle flex items-center justify-center text-[10px] text-text-secondary/70 italic font-semibold rounded-none">
                        No Pants image
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Highlights Collections */}
              <div className="border-t border-border pt-6 space-y-6">
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary">
                  Homepage Featured Collections
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Best Sellers Search-and-Select */}
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                        Best Sellers (Max 4 products)
                      </label>
                      <div className="relative">
                        <Search size={12} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                          type="text"
                          value={bestSellersSearch}
                          onChange={(e) => setBestSellersSearch(e.target.value)}
                          placeholder="Search dress name to add..."
                          className="w-full pl-9 pr-4 py-2 border border-border bg-white text-xs focus:outline-none focus:border-accent"
                        />
                      </div>
                      {/* Search Matches dropdown list */}
                      {bestSellersMatches.length > 0 && (
                        <div className="absolute z-20 w-full max-h-48 overflow-y-auto border border-border bg-white mt-1 shadow-lg divide-y divide-border/60">
                          {bestSellersMatches.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (bestSellersIds.length >= 4) {
                                  alert("Best Sellers is capped at 4 items.");
                                  return;
                                }
                                setBestSellersIds([...bestSellersIds, p.id]);
                                setBestSellersSearch('');
                              }}
                              className="w-full text-left p-3 hover:bg-bg-subtle text-xs flex justify-between items-center transition-colors font-semibold"
                            >
                              <span>{p.name}</span>
                              <span className="text-[10px] text-text-secondary font-bold font-mono">₹{p.base_price}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected Best Sellers List */}
                    <div className="border border-border bg-bg-subtle p-3 space-y-2 min-h-36 flex flex-col justify-start">
                      {bestSellersIds.length === 0 ? (
                        <p className="text-[10px] text-text-secondary/70 italic text-center my-auto font-semibold">
                          No custom Best Sellers. Falls back to default.
                        </p>
                      ) : (
                        bestSellersIds.map((id, index) => {
                          const p = products.find(prod => prod.id === id);
                          if (!p) return null;
                          return (
                            <div key={id} className="bg-white border border-border/80 p-2.5 flex justify-between items-center text-xs font-semibold">
                              <span className="truncate">{p.name}</span>
                              <div className="flex gap-2 items-center flex-shrink-0">
                                {/* Sort buttons */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const next = [...bestSellersIds];
                                    const temp = next[index];
                                    next[index] = next[index - 1];
                                    next[index - 1] = temp;
                                    setBestSellersIds(next);
                                  }}
                                  className="text-text-secondary hover:text-accent disabled:opacity-30 text-[9px] px-1 hover:bg-bg-subtle border border-transparent rounded cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={index === bestSellersIds.length - 1}
                                  onClick={() => {
                                    const next = [...bestSellersIds];
                                    const temp = next[index];
                                    next[index] = next[index + 1];
                                    next[index + 1] = temp;
                                    setBestSellersIds(next);
                                  }}
                                  className="text-text-secondary hover:text-accent disabled:opacity-30 text-[9px] px-1 hover:bg-bg-subtle border border-transparent rounded cursor-pointer"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBestSellersIds(bestSellersIds.filter(item => item !== id))}
                                  className="text-text-secondary hover:text-sale p-1 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* New Arrivals Search-and-Select */}
                  <div className="space-y-4">
                    <div className="relative">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                        New Arrivals (Max 4 products)
                      </label>
                      <div className="relative">
                        <Search size={12} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
                        <input
                          type="text"
                          value={newArrivalsSearch}
                          onChange={(e) => setNewArrivalsSearch(e.target.value)}
                          placeholder="Search dress name to add..."
                          className="w-full pl-9 pr-4 py-2 border border-border bg-white text-xs focus:outline-none focus:border-accent"
                        />
                      </div>
                      {/* Search Matches dropdown list */}
                      {newArrivalsMatches.length > 0 && (
                        <div className="absolute z-20 w-full max-h-48 overflow-y-auto border border-border bg-white mt-1 shadow-lg divide-y divide-border/60">
                          {newArrivalsMatches.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (newArrivalsIds.length >= 4) {
                                  alert("New Arrivals is capped at 4 items.");
                                  return;
                                }
                                setNewArrivalsIds([...newArrivalsIds, p.id]);
                                setNewArrivalsSearch('');
                              }}
                              className="w-full text-left p-3 hover:bg-bg-subtle text-xs flex justify-between items-center transition-colors font-semibold"
                            >
                              <span>{p.name}</span>
                              <span className="text-[10px] text-text-secondary font-bold font-mono">₹{p.base_price}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Selected New Arrivals List */}
                    <div className="border border-border bg-bg-subtle p-3 space-y-2 min-h-36 flex flex-col justify-start">
                      {newArrivalsIds.length === 0 ? (
                        <p className="text-[10px] text-text-secondary/70 italic text-center my-auto font-semibold">
                          No custom New Arrivals. Falls back to default.
                        </p>
                      ) : (
                        newArrivalsIds.map((id, index) => {
                          const p = products.find(prod => prod.id === id);
                          if (!p) return null;
                          return (
                            <div key={id} className="bg-white border border-border/80 p-2.5 flex justify-between items-center text-xs font-semibold">
                              <span className="truncate">{p.name}</span>
                              <div className="flex gap-2 items-center flex-shrink-0">
                                {/* Sort buttons */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const next = [...newArrivalsIds];
                                    const temp = next[index];
                                    next[index] = next[index - 1];
                                    next[index - 1] = temp;
                                    setNewArrivalsIds(next);
                                  }}
                                  className="text-text-secondary hover:text-accent disabled:opacity-30 text-[9px] px-1 hover:bg-bg-subtle border border-transparent rounded cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={index === newArrivalsIds.length - 1}
                                  onClick={() => {
                                    const next = [...newArrivalsIds];
                                    const temp = next[index];
                                    next[index] = next[index + 1];
                                    next[index + 1] = temp;
                                    setNewArrivalsIds(next);
                                  }}
                                  className="text-text-secondary hover:text-accent disabled:opacity-30 text-[9px] px-1 hover:bg-bg-subtle border border-transparent rounded cursor-pointer"
                                >
                                  ▼
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNewArrivalsIds(newArrivalsIds.filter(item => item !== id))}
                                  className="text-text-secondary hover:text-sale p-1 cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls save */}
              <div className="border-t border-border pt-6 flex justify-end">
                <button
                  type="button"
                  disabled={isSavingHomepage}
                  onClick={handleSaveHomepage}
                  className="bg-accent text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isSavingHomepage ? <Loader2 size={12} className="animate-spin" /> : null}
                  Save Homepage Settings
                </button>
              </div>
            </div>

            {/* Right Side: Quick Instructions/Help */}
            <div className="lg:col-span-4 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 h-fit">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                Content Manager Help
              </h3>
              <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Image URLs</strong>
                  Paste external HTTPS image URLs (e.g. from your cloud storage or Unsplash). The system loads them directly.
                </div>
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">View Focus Adjuster</strong>
                  Since banners are cropped based on viewport width (especially the split screen hero), you can select where the image should pivot (`center`, `top`, `bottom`) to keep focal features visible.
                </div>
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Highlight Fallbacks</strong>
                  If no custom Best Sellers or New Arrivals are selected here, the main page falls back to general catalog query defaults (e.g., first few products or latest releases).
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'occasions' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Column: Manage Products inside the selected Occasion */}
            <div className="lg:col-span-8 space-y-8 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
              <div>
                <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                  Occasion Collection Manager
                </h3>
              </div>

              {/* Selector tabs for Occasion Category */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  { key: 'casuals', label: 'Casuals' },
                  { key: 'formal', label: 'Formal' },
                  { key: 'ethnic', label: 'Ethnic' },
                  { key: 'party-wear', label: 'Party Wear' }
                ].map((occ) => (
                  <button
                    key={occ.key}
                    type="button"
                    onClick={() => {
                      setSelectedOccasion(occ.key as any);
                      setOccasionSearch('');
                    }}
                    className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider border transition-all ${selectedOccasion === occ.key
                        ? 'bg-accent border-accent text-white shadow-sm'
                        : 'bg-white border-border text-text-secondary hover:border-accent hover:text-text-primary'
                      }`}
                  >
                    {occ.label}
                  </button>
                ))}
              </div>

              {/* Add product by name search */}
              <div className="bg-bg-subtle border border-border p-4 space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary">
                  Add Product to{' '}
                  <span className="text-accent">
                    {selectedOccasion === 'party-wear' ? 'Party Wear' : selectedOccasion.charAt(0).toUpperCase() + selectedOccasion.slice(1)}
                  </span>
                </label>

                {/* Search input */}
                <div className="relative max-w-md">
                  <div className="flex items-center gap-2 px-3 py-2 bg-white border border-border focus-within:border-accent transition-colors">
                    <Search size={13} className="text-text-secondary flex-shrink-0" />
                    <input
                      type="text"
                      value={occasionSearch}
                      onChange={(e) => setOccasionSearch(e.target.value)}
                      placeholder="Search product by name..."
                      className="flex-1 bg-transparent text-xs font-medium text-text-primary focus:outline-none placeholder-text-secondary/50"
                    />
                    {occasionSearch && (
                      <button
                        type="button"
                        onClick={() => setOccasionSearch('')}
                        className="text-text-secondary hover:text-text-primary flex-shrink-0"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>

                  {/* Dropdown results */}
                  {occasionSearch.trim() && (
                    <div className="absolute top-full left-0 right-0 z-20 bg-white border border-border border-t-0 shadow-lg max-h-64 overflow-y-auto">
                      {occasionMatches.length === 0 ? (
                        <div className="px-4 py-6 text-center text-[11px] text-text-secondary italic">
                          No products found for &ldquo;{occasionSearch}&rdquo;
                        </div>
                      ) : (
                        occasionMatches.map((p) => {
                          const mainImage = p.product_images?.[0]?.url;
                          const catName = categories.find(c => c.id === p.category_id)?.name || '';
                          return (
                            <button
                              key={p.id}
                              type="button"
                              disabled={isAddingOccasion}
                              onClick={async () => {
                                setIsAddingOccasion(true);
                                try {
                                  const { error: insErr } = await supabase
                                    .from('occasion_products' as any)
                                    .insert({
                                      occasion: selectedOccasion,
                                      product_id: p.id
                                    });
                                  if (insErr) {
                                    if (insErr.code === '23505') {
                                      triggerNotification('This product is already in this occasion.', true);
                                    } else {
                                      throw insErr;
                                    }
                                  } else {
                                    triggerNotification(`"${p.name}" added to ${selectedOccasion}!`);
                                    setOccasionSearch('');
                                    fetchData();
                                  }
                                } catch (err: any) {
                                  console.error('Error adding occasion product:', err);
                                  triggerNotification(err.message || 'Error adding product.', true);
                                } finally {
                                  setIsAddingOccasion(false);
                                }
                              }}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-bg-subtle transition-colors text-left border-b border-border/50 last:border-0 disabled:opacity-50"
                            >
                              {/* Thumbnail */}
                              {mainImage ? (
                                <img
                                  src={mainImage}
                                  alt={p.name}
                                  className="w-8 h-10 object-cover border border-border flex-shrink-0 bg-bg-subtle"
                                />
                              ) : (
                                <div className="w-8 h-10 border border-border flex-shrink-0 bg-bg-subtle flex items-center justify-center">
                                  <Package size={10} className="text-text-secondary" />
                                </div>
                              )}
                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-text-primary truncate uppercase tracking-wide">{p.name}</p>
                                <p className="text-[9px] text-text-secondary mt-0.5">
                                  {catName && <span className="mr-1.5">{catName}</span>}
                                  <span className="font-mono">₹{Number(p.base_price).toLocaleString('en-IN')}</span>
                                </p>
                              </div>
                              {/* Add indicator */}
                              <div className="flex-shrink-0">
                                {isAddingOccasion ? (
                                  <Loader2 size={12} className="animate-spin text-accent" />
                                ) : (
                                  <Plus size={14} className="text-accent" />
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[9px] text-text-secondary">
                  Type a product name above — matching products appear instantly. Click any result to add it to this occasion.
                </p>
              </div>

              {/* List of products currently assigned */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary">
                    Products in this collection ({
                      occasionProducts.filter(op => op.occasion === selectedOccasion).length
                    })
                  </h4>
                </div>

                <div className="border border-border bg-bg-subtle divide-y divide-border/65">
                  {occasionProducts.filter(op => op.occasion === selectedOccasion).length === 0 ? (
                    <div className="p-8 text-center text-xs text-text-secondary/70 italic font-semibold">
                      No products added to this occasion yet. Enter a SKU above to populate.
                    </div>
                  ) : (
                    occasionProducts
                      .filter(op => op.occasion === selectedOccasion)
                      .map((op) => {
                        const p = products.find(prod => prod.id === op.product_id);
                        if (!p) return null;
                        const mainImage = p.product_images?.[0]?.url;
                        const categoryName = categories.find(c => c.id === p.category_id)?.name || 'Unassigned';

                        return (
                          <div key={op.id} className="bg-white p-3 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {mainImage ? (
                                <img
                                  src={mainImage}
                                  alt={p.name}
                                  className="w-11 h-14 object-cover border border-border flex-shrink-0 bg-bg-subtle"
                                />
                              ) : (
                                <div className="w-11 h-14 border border-border flex-shrink-0 bg-bg-subtle flex items-center justify-center text-text-secondary">
                                  <Package size={14} />
                                </div>
                              )}
                              <div className="min-w-0">
                                <h5 className="font-bold text-text-primary text-xs uppercase tracking-wide truncate">
                                  {p.name}
                                </h5>
                                <div className="flex items-center gap-2 mt-0.5 text-[9px] font-semibold text-text-secondary uppercase">
                                  <span>{categoryName}</span>
                                  <span>•</span>
                                  <span className="font-mono">₹{p.base_price}</span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {p.product_variants?.map(v => (
                                    <span key={v.id} className="text-[8px] font-mono bg-bg-subtle border border-border px-1 py-0.5" title={`Stock: ${v.stock_qty}`}>
                                      {v.sku} ({v.size}/{v.color})
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Remove "${p.name}" from ${selectedOccasion}?`)) {
                                  try {
                                    const { error } = await supabase
                                      .from('occasion_products' as any)
                                      .delete()
                                      .eq('id', op.id);
                                    if (error) throw error;
                                    triggerNotification('Product removed successfully.');
                                    fetchData();
                                  } catch (err: any) {
                                    console.error('Error removing occasion product:', err);
                                    alert(err.message || 'Error deleting product assignment.');
                                  }
                                }
                              }}
                              className="btn p-2 text-text-secondary hover:text-sale border border-transparent hover:border-border hover:bg-bg-subtle cursor-pointer flex-shrink-0"
                              title="Remove Product Assignment"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Help & Info */}
            <div className="lg:col-span-4 bg-white border border-border/80 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-4 h-fit">
              <h3 className="text-xs font-heading font-black uppercase tracking-wider text-text-primary pb-2 border-b border-border">
                Occasion Mapping Guide
              </h3>
              <div className="space-y-3.5 text-xs text-text-secondary leading-relaxed">
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Name Search</strong>
                  Type any part of the product name in the search box. Matching products appear instantly in a dropdown — click to add.
                </div>
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Already Added</strong>
                  Products already in the selected occasion are automatically hidden from search results to prevent duplicates.
                </div>
                <div className="bg-bg-subtle p-3.5 border-l-2 border-accent">
                  <strong className="text-text-primary block mb-1">Storefront Sync</strong>
                  Products added here are immediately displayed under the corresponding subcategory under "Occasions" in the shop.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* ==========================================
          PRODUCT EDIT/ADD DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {isProductModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >

              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    {editingProduct ? 'Update Item' : 'New Entry'}
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    {editingProduct ? 'Edit Catalog Product' : 'Register New Product'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-6">
                {/* Stepper indicators */}
                <div className="flex gap-4 items-center border-b border-border pb-4 mb-4">
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${wizardStep === 1 ? 'text-accent font-black' : 'text-text-secondary'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${wizardStep === 1 ? 'bg-accent text-white font-black' : 'bg-bg-subtle border border-border'}`}>1</span>
                    Product Type
                  </div>
                  <span className="text-border">/</span>
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${wizardStep === 2 ? 'text-accent font-black' : 'text-text-secondary'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${wizardStep === 2 ? 'bg-accent text-white font-black' : 'bg-bg-subtle border border-border'}`}>2</span>
                    Audience
                  </div>
                  <span className="text-border">/</span>
                  <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${wizardStep === 3 ? 'text-accent font-black' : 'text-text-secondary'}`}>
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[9px] ${wizardStep === 3 ? 'bg-accent text-white font-black' : 'bg-bg-subtle border border-border'}`}>3</span>
                    Details
                  </div>
                </div>

                {/* Step 1: Product Type / Main Category */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                        Step 1: Choose Product Type (Main Category)
                      </h4>
                      <p className="text-[10px] text-text-secondary">
                        Select an existing product type or add a new one.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {categories.filter(c => !c.parent_category_id).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedParentCatId(c.id);
                            setNewParentCatName('');
                            setWizardStep(2);
                          }}
                          className={`p-6 border text-center font-bold uppercase tracking-wider text-[11px] transition-all flex flex-col justify-center items-center h-28 rounded-none ${selectedParentCatId === c.id
                            ? 'bg-accent border-accent text-white shadow-md'
                            : 'bg-white border-border text-text-primary hover:border-accent'
                            }`}
                        >
                          <Package size={18} className="mb-2" />
                          {c.name}
                        </button>
                      ))}
                    </div>

                    <div className="border-t border-border pt-6 mt-6">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-2">
                        Or Create A New Product Type
                      </label>
                      <div className="flex gap-2 max-w-md">
                        <input
                          type="text"
                          value={newParentCatName}
                          onChange={(e) => {
                            setNewParentCatName(e.target.value);
                            setSelectedParentCatId('');
                          }}
                          placeholder="e.g. T-SHIRT, CO-ORDS, HOODIES..."
                          className="flex-1 px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent uppercase tracking-wider font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newParentCatName.trim()) {
                              alert('Please enter a type name.');
                              return;
                            }
                            setWizardStep(2);
                          }}
                          className="bg-accent text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors"
                        >
                          Continue
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Target Audience / Gender */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                        Step 2: Who is this product for? (Target Audience)
                      </h4>
                      <p className="text-[10px] text-text-secondary">
                        Specify if this is for Men, Women, or Unisex.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {['Male', 'Female', 'Unisex'].map((gender) => (
                        <button
                          key={gender}
                          type="button"
                          onClick={() => {
                            setSelectedGender(gender as any);
                            setWizardStep(3);
                          }}
                          className={`p-6 border text-center font-bold uppercase tracking-wider text-[11px] transition-all flex flex-col justify-center items-center h-28 rounded-none ${selectedGender === gender
                            ? 'bg-accent border-accent text-white shadow-md'
                            : 'bg-white border-border text-text-primary hover:border-accent'
                            }`}
                        >
                          <span className="text-lg font-black mb-1">
                            {gender === 'Male' ? '♂' : gender === 'Female' ? '♀' : '⚧'}
                          </span>
                          {gender === 'Male' ? 'Male / Men' : gender === 'Female' ? 'Female / Women' : 'Unisex'}
                        </button>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-6 border-t border-border mt-6">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="px-6 py-2 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Product Details */}
                {wizardStep === 3 && (
                  <div className="space-y-6">
                    {/* Category Selection Summary Badge */}
                    <div className="bg-bg-subtle border border-border p-4 mb-4 flex items-center justify-between">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider text-text-secondary font-bold">Category Setting</span>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1 text-text-primary flex items-center gap-1.5">
                          <span>{newParentCatName.trim() || categories.find(c => c.id === selectedParentCatId)?.name || 'Unassigned Type'}</span>
                          <span className="text-text-secondary">/</span>
                          <span>{selectedGender || 'Unassigned Gender'}</span>
                        </div>
                      </div>
                      {!editingProduct && (
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="text-[10px] uppercase font-bold text-accent hover:underline"
                        >
                          Change Category
                        </button>
                      )}
                    </div>

                    {/* 1. Basic specifications row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                          Product Name
                        </label>
                        <input
                          type="text"
                          required
                          value={prodName}
                          onChange={(e) => {
                            setProdName(e.target.value);
                            if (!editingProduct) setProdSlug(generateSlug(e.target.value));
                          }}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                          placeholder="e.g. Premium Linen Shirt"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                          Slug Identifier
                        </label>
                        <input
                          type="text"
                          required
                          value={prodSlug}
                          onChange={(e) => setProdSlug(e.target.value)}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                          placeholder="premium-linen-shirt"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                          Price (INR)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={prodPrice}
                          onChange={(e) => setProdPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-semibold"
                          placeholder="₹ 1,499.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                          Select Occasion
                        </label>
                        <select
                          value={prodOccasion}
                          onChange={(e) => setProdOccasion(e.target.value)}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent uppercase tracking-wider font-semibold"
                        >
                          <option value="">-- None (General) --</option>
                          <option value="casuals">Casuals</option>
                          <option value="formal">Formal</option>
                          <option value="ethnic">Ethnic</option>
                          <option value="party-wear">Party Wear</option>
                        </select>
                      </div>
                    </div>

                    {/* 2. Description & active status row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                          Product Description
                        </label>
                        <textarea
                          value={prodDesc}
                          onChange={(e) => setProdDesc(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent resize-none"
                          placeholder="Details about craftsmanship, weave, materials..."
                        />
                      </div>
                      <div className="flex items-center gap-2 md:mt-6 py-1">
                        <input
                          id="prod-active"
                          type="checkbox"
                          checked={prodActive}
                          onChange={(e) => setProdActive(e.target.checked)}
                          className="w-4 h-4 accent-accent cursor-pointer"
                        />
                        <label htmlFor="prod-active" className="text-[10px] font-bold uppercase tracking-wider text-text-primary select-none cursor-pointer">
                          Active & Publish in Catalog
                        </label>
                      </div>
                    </div>

                    {/* 3. Image Manager section */}
                    <div className="border border-border p-4 bg-bg-subtle space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Product Image Manager
                        </h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Add, view, and delete images associated with this product.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          disabled={isUploadingProductImage}
                          onChange={handleProductImageUpload}
                          className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent file:mr-4 file:py-1 file:px-2 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                        />
                        {isUploadingProductImage && (
                          <span className="text-[9px] text-text-secondary mt-1 block font-bold animate-pulse">
                            Uploading image files...
                          </span>
                        )}
                        <span className="text-[9px] text-text-secondary mt-1 block font-semibold">
                          Upload high-resolution photography. Choose multiple files to upload at once. File is uploaded full size without crop.
                        </span>
                      </div>

                      {prodImages.length === 0 ? (
                        <p className="text-[10px] text-text-secondary text-center py-2">No product images added yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {prodImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-[2/3] bg-white border border-border overflow-hidden group">
                              <img src={img.url} alt="product swatch" className="w-full h-full object-contain bg-bg-subtle" />
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(idx)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white hover:bg-sale transition-colors shadow-sm z-10"
                                title="Delete Image"
                              >
                                <Trash2 size={12} />
                              </button>

                              {/* Reorder controls overlay on hover */}
                              <div className="absolute inset-x-0 bottom-0 bg-black/70 p-1 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveImage(idx, 'left')}
                                  className="text-white hover:text-accent disabled:opacity-30 text-[10px] font-bold p-1 cursor-pointer"
                                  title="Move Left"
                                >
                                  ◀
                                </button>
                                <span className="text-[9px] font-mono text-white/90">
                                  Pos: {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  disabled={idx === prodImages.length - 1}
                                  onClick={() => handleMoveImage(idx, 'right')}
                                  className="text-white hover:text-accent disabled:opacity-30 text-[10px] font-bold p-1 cursor-pointer"
                                  title="Move Right"
                                >
                                  ▶
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Sizing guide configuration */}
                    <div className="border border-border p-4 bg-bg-subtle space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Size Guide Configuration
                        </h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Select a pre-existing size chart template or upload a new size guide image.
                        </p>
                      </div>

                      {/* Mode Tabs */}
                      <div className="flex border-b border-border text-[11px] font-bold uppercase tracking-wider">
                        <button
                          type="button"
                          onClick={() => setSizeGuideMode('template')}
                          className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${sizeGuideMode === 'template' ? 'border-accent text-accent bg-white' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                          Use Saved Size Guide
                        </button>
                        <button
                          type="button"
                          onClick={() => setSizeGuideMode('new')}
                          className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${sizeGuideMode === 'new' ? 'border-accent text-accent bg-white' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                          Upload New Size Guide Image
                        </button>
                        <button
                          type="button"
                          onClick={() => setSizeGuideMode('legacy')}
                          className={`px-3 py-2 border-b-2 transition-all cursor-pointer ${sizeGuideMode === 'legacy' ? 'border-accent text-accent bg-white' : 'border-transparent text-text-secondary hover:text-text-primary'}`}
                        >
                          HTML Code (Advanced)
                        </button>
                      </div>

                      {/* Option A: Saved Template */}
                      {sizeGuideMode === 'template' && (
                        <div className="space-y-3 pt-1">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                            Select Pre-existing Size Guide
                          </label>
                          <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-semibold uppercase tracking-wider"
                          >
                            <option value="">-- Select Size Guide Template --</option>
                            {sizeGuideTemplates.map((sg) => (
                              <option key={sg.id} value={sg.id}>
                                {sg.name}
                              </option>
                            ))}
                          </select>

                          {selectedTemplateId && (() => {
                            const selectedSg = sizeGuideTemplates.find(sg => sg.id === selectedTemplateId);
                            if (!selectedSg) return null;
                            return (
                              <div className="p-3 border border-border bg-white flex items-center gap-4 rounded">
                                <img src={selectedSg.image_url} alt={selectedSg.name} className="w-16 h-16 object-contain bg-bg-subtle border border-border flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-text-primary">{selectedSg.name}</p>
                                  <p className="text-[10px] text-text-secondary mt-0.5">Template selected. This chart image will be displayed in the size guide modal on the product page.</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Option B: Upload New Image */}
                      {sizeGuideMode === 'new' && (
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                              Size Guide Name (e.g. Size Guide for Hoodie)
                            </label>
                            <input
                              type="text"
                              value={newSizeGuideName}
                              onChange={(e) => setNewSizeGuideName(e.target.value)}
                              placeholder="e.g. Size Guide for Hoodie"
                              className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                              Upload Size Chart Image File
                            </label>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingSizeGuide}
                              onChange={handleSizeGuideImageUpload}
                              className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent file:mr-4 file:py-1 file:px-2 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                            />
                            {isUploadingSizeGuide && (
                              <span className="text-[9px] text-text-secondary mt-1 block font-bold animate-pulse">
                                Uploading size guide image...
                              </span>
                            )}
                          </div>

                          <div>
                            <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                              Or Provide Image URL Directly
                            </label>
                            <input
                              type="text"
                              value={newSizeGuideImageUrl}
                              onChange={(e) => setNewSizeGuideImageUrl(e.target.value)}
                              placeholder="https://..."
                              className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                            />
                          </div>

                          {newSizeGuideImageUrl && (
                            <div className="p-3 border border-border bg-white flex items-center gap-4 rounded">
                              <img src={newSizeGuideImageUrl} alt="preview" className="w-20 h-20 object-contain bg-bg-subtle border border-border flex-shrink-0" />
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-text-primary">{newSizeGuideName || 'New Size Guide'}</p>
                                <p className="text-[10px] text-text-secondary mt-0.5">Preview of size chart image. Will be automatically saved to template library for future products.</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Option C: Legacy HTML */}
                      {sizeGuideMode === 'legacy' && (
                        <div className="pt-1">
                          <label className="block text-[9px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                            Custom Size Guide (HTML Table)
                          </label>
                          <textarea
                            value={prodCustomSizeGuide}
                            onChange={(e) => setProdCustomSizeGuide(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                            placeholder='<table class="w-full text-left text-xs">...</table>'
                          />
                        </div>
                      )}
                    </div>

                    {/* 5. Variant details (SKU inventory list) */}
                    <div className="border border-border p-4 bg-bg-subtle space-y-4">
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                          Product Variant Ledger
                        </h4>
                        <p className="text-[10px] text-text-secondary mt-0.5">
                          Configure stock levels per size, color, and SKU.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                            Size
                          </label>
                          <select
                            value={varSize}
                            onChange={(e) => setVarSize(e.target.value)}
                            className="w-full px-2 py-1.5 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                          >
                            {isPantsProduct ? (
                              <>
                                <option value="28">28</option>
                                <option value="30">30</option>
                                <option value="32">32</option>
                                <option value="34">34</option>
                                <option value="36">36</option>
                                <option value="38">38</option>
                              </>
                            ) : (
                              <>
                                <option value="S">S</option>
                                <option value="M">M</option>
                                <option value="L">L</option>
                                <option value="XL">XL</option>
                              </>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                            Color
                          </label>
                          <input
                            type="text"
                            value={varColor}
                            onChange={(e) => setVarColor(e.target.value)}
                            className="w-full px-2 py-1 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                            placeholder="e.g. Black"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                            Initial Stock Level
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={varStock}
                            onChange={(e) => setVarStock(e.target.value)}
                            className="w-full px-2 py-1 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                            placeholder="20"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1 text-accent font-bold">
                            Automated SKU (Auto)
                          </label>
                          <input
                            type="text"
                            readOnly
                            disabled
                            value={computedSku}
                            className="w-full px-2 py-1 border border-border bg-bg-subtle text-text-secondary text-xs font-mono font-bold select-all"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="w-full border border-accent bg-white text-text-primary py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors shadow-xs"
                      >
                        + Append Variant to Product
                      </button>

                      {prodVariants.length === 0 ? (
                        <p className="text-[10px] text-text-secondary text-center py-2">No variants created for this product.</p>
                      ) : (
                        <div className="max-h-40 overflow-y-auto divide-y divide-border border border-border bg-white">
                          {prodVariants.map((v, idx) => (
                            <div key={idx} className="flex justify-between items-center p-3 text-xs">
                              <span className="font-mono font-medium text-text-primary">{v.sku}</span>
                              <span className="text-text-secondary">
                                Size: {v.size} │ Color: {v.color} │ Stock: {v.stock_qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteVariant(idx)}
                                className="text-text-secondary hover:text-sale p-1 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Form Controls */}
                    <div className="flex justify-end gap-3 pt-6 border-t border-border">
                      {!editingProduct && (
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-6 py-3 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors mr-auto"
                        >
                          Back
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsProductModalOpen(false)}
                        className="px-6 py-3 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors"
                      >
                        Discard Changes
                      </button>
                      <button
                        type="submit"
                        disabled={isSavingProduct}
                        className="px-6 py-3 bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isSavingProduct ? (
                          <>
                            <Loader2 size={13} className="animate-spin" />
                            Saving...
                          </>
                        ) : (
                          editingProduct ? 'Update Product' : 'Save Catalog Product'
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CATEGORY EDIT/ADD DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >

              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    {editingCategory ? 'Update Group' : 'New Group'}
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    {editingCategory ? 'Edit Category' : 'Create Category Group'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCategorySubmit} className="space-y-4">

                {/* Category Name */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => {
                      setCatName(e.target.value);
                      if (!editingCategory) setCatSlug(generateSlug(e.target.value));
                    }}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    placeholder="e.g. Shirts"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={catSlug}
                    onChange={(e) => setCatSlug(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder="shirts"
                  />
                </div>

                {/* Parent category */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Parent Category Group
                  </label>
                  <select
                    value={catParent}
                    onChange={(e) => setCatParent(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent uppercase font-semibold"
                  >
                    <option value="">None (Top Level)</option>
                    {categories
                      .filter(c => c.id !== editingCategory?.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>

                {/* Category Cover Image */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Category Cover Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingCategory}
                    onChange={(e) => handleImageUpload(e, 'category')}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent file:mr-4 file:py-1 file:px-2 file:border-0 file:text-[10px] file:font-bold file:uppercase file:bg-accent file:text-white hover:file:bg-accent-hover cursor-pointer"
                  />
                  {isUploadingCategory && (
                    <span className="text-[9px] text-text-secondary mt-1 block font-bold animate-pulse">
                      Uploading image file...
                    </span>
                  )}
                  {catImageUrl ? (
                    <div className="mt-2 space-y-2">
                      <div className="w-24 aspect-[4/5] bg-bg-subtle relative overflow-hidden border border-border">
                        <img src={catImageUrl} alt="Category Preview" className="w-full h-full object-cover" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setCatImageUrl('')}
                        className="text-[10px] text-sale font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <X size={10} className="stroke-[2]" /> Clear Cover Image
                      </button>
                    </div>
                  ) : (
                    <span className="text-[9px] text-text-secondary mt-1 block font-semibold">
                      Upload a cover image representing this category (used for storefront catalog grids).
                    </span>
                  )}
                </div>

                {/* Category size guide html */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Category Default Size Guide (HTML Table)
                  </label>
                  <textarea
                    value={catSizeGuide}
                    onChange={(e) => setCatSizeGuide(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder='<table class="w-full text-left text-xs border-collapse">...</table>'
                  />
                </div>

                {/* Controls */}
                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="px-4 py-2 border border-border bg-white text-text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Save Category
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          CUSTOMER ORDER DETAILS OVERLAY MODAL
          ========================================== */}
      <AnimatePresence>
        {isOrderModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOrderModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    Transaction Detail Explorer
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    Order ID: {selectedOrder.id}
                  </h3>
                </div>
                <button
                  onClick={() => setIsOrderModalOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left Side: Info blocks */}
                <div className="md:col-span-7 space-y-6">
                  {/* Shipping Address details */}
                  <div className="bg-bg-subtle p-5 border border-border">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary mb-3 pb-1 border-b border-border">
                      Customer & Shipping Details
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-text-secondary font-medium">Buyer: </span>
                        <span className="text-text-primary font-bold">{selectedOrder.profiles?.name || 'Guest / Anonymous'}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary font-medium">Phone: </span>
                        <span className="text-text-primary font-mono font-bold">{selectedOrder.profiles?.phone || 'No phone provided'}</span>
                      </div>
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-text-secondary font-medium">Recipient Name: </span>
                        <span className="text-text-primary font-semibold">{selectedOrder.addresses?.recipient_name || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary font-medium">Shipping Phone: </span>
                        <span className="text-text-primary font-mono font-semibold">{selectedOrder.addresses?.phone_primary || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-text-secondary font-medium">Address: </span>
                        <span className="text-text-primary font-semibold">
                          {selectedOrder.addresses?.line1 || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-text-secondary font-medium">City / State: </span>
                        <span className="text-text-primary font-semibold">
                          {selectedOrder.addresses?.city || 'N/A'}, {selectedOrder.addresses?.state || 'N/A'} - {selectedOrder.addresses?.pincode || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Breakdown / Coupon info */}
                  <div className="bg-bg-subtle p-5 border border-border">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary mb-3 pb-1 border-b border-border">
                      Financial Transaction Receipt
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Subtotal:</span>
                        <span className="font-semibold text-text-primary font-mono">₹{Number(selectedOrder.subtotal || selectedOrder.total).toFixed(2)}</span>
                      </div>
                      {selectedOrder.coupon_code && (
                        <div className="flex justify-between text-emerald-700 font-bold">
                          <span>Coupon Discount ({selectedOrder.coupon_code}):</span>
                          <span className="font-mono">-₹{Number(selectedOrder.discount_amount || 0).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Shipping Cost:</span>
                        <span className="font-semibold text-text-primary font-mono">₹{Number(selectedOrder.shipping_cost || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                        <span>Grand Total Paid:</span>
                        <span className="text-accent font-mono">₹{Number(selectedOrder.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order Items list */}
                  <div className="border border-border">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary p-4 bg-bg-subtle border-b border-border">
                      Ordered SKU Items ({selectedOrderItems.length})
                    </h4>
                    {loadingOrderItems ? (
                      <div className="p-8 text-center text-xs text-text-secondary flex flex-col items-center gap-2">
                        <Loader2 size={20} className="animate-spin text-text-secondary" />
                        Fetching order items...
                      </div>
                    ) : selectedOrderItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-secondary">
                        No items found for this order.
                      </div>
                    ) : (
                      <div className="divide-y divide-border max-h-64 overflow-y-auto">
                        {selectedOrderItems.map((item: any) => (
                          <div key={item.id} className="p-4 flex items-center justify-between text-xs hover:bg-bg-subtle transition-colors">
                            <div className="space-y-1 pr-4">
                              <span className="font-bold text-text-primary uppercase tracking-wide">
                                {item.product_variants?.products?.name || 'Unknown Product'}
                              </span>
                              <div className="text-[10px] text-text-secondary font-mono">
                                Size: {item.product_variants?.size || 'N/A'} │ Color: {item.product_variants?.color || 'N/A'}
                              </div>
                              <div className="text-[9px] text-text-secondary/80 font-mono">
                                SKU: {item.product_variants?.sku || 'N/A'}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="font-mono text-text-secondary">
                                {item.quantity} x ₹{Number(item.price_at_purchase).toFixed(2)}
                              </div>
                              <div className="font-bold text-text-primary font-mono mt-0.5">
                                ₹{Number(item.quantity * item.price_at_purchase).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Update status controls */}
                <div className="md:col-span-5 bg-bg-subtle p-5 border border-border flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-text-primary mb-3 pb-1 border-b border-border">
                      Fulfillment Controls
                    </h4>

                    {/* Status selection */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                        Order Status
                      </label>
                      <select
                        value={orderUpdateStatus}
                        onChange={(e) => setOrderUpdateStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      >
                        <option value="pending">Pending (Unfulfilled)</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped (Dispatched)</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled (Voided)</option>
                      </select>
                    </div>

                    {/* Courier Partner Selection */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                        Courier Partner
                      </label>
                      <select
                        value={selectedCourierPartner}
                        onChange={(e) => setSelectedCourierPartner(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      >
                        <option value="">Select Carrier...</option>
                        {courierPartners.map((partner) => (
                          <option key={partner.id} value={partner.name}>
                            {partner.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tracking ID */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                        Shipping Tracking ID
                      </label>
                      <input
                        type="text"
                        value={orderUpdateTracking}
                        onChange={(e) => setOrderUpdateTracking(e.target.value)}
                        className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                        placeholder="e.g. TRK123456789"
                      />
                    </div>
                  </div>

                  <div className="pt-8 border-t border-border flex gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOrderModalOpen(false)}
                      className="flex-1 py-2.5 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors shadow-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateOrder}
                      className="flex-1 py-2.5 bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          COUPON EDIT/ADD DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {isCouponModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCouponModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    {editingCoupon ? 'Edit Campaign' : 'New Campaign'}
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    {editingCoupon ? 'Modify Coupon' : 'Create Coupon Code'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsCouponModalOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCouponSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    required
                    value={couponCodeForm}
                    onChange={(e) => setCouponCodeForm(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono uppercase"
                    placeholder="e.g. EXTRA20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Discount Type
                    </label>
                    <select
                      value={couponDiscountType}
                      onChange={(e: any) => setCouponDiscountType(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Value
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="any"
                      value={couponValue}
                      onChange={(e) => setCouponValue(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                      placeholder={couponDiscountType === 'percentage' ? 'e.g. 10 for 10%' : 'e.g. 100 for ₹100'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1 flex items-center gap-1">
                      <Calendar size={11} /> Expiry Date
                    </label>
                    <input
                      type="date"
                      required
                      value={couponExpiry}
                      onChange={(e) => setCouponExpiry(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent cursor-pointer font-bold uppercase text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Min Order Value (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={couponMinOrder}
                      onChange={(e) => setCouponMinOrder(e.target.value)}
                      className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-bold"
                      placeholder="e.g. 1000"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCouponModalOpen(false)}
                    className="px-4 py-2 border border-border bg-white text-text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Save Coupon
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==========================================
          COURIER PARTNER EDIT/ADD DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {isCourierModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCourierModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    {editingCourier ? 'Edit Partner' : 'New Carrier'}
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    {editingCourier ? 'Modify Courier Partner' : 'Register Courier Partner'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsCourierModalOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCourierSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Courier Partner Name
                  </label>
                  <input
                    type="text"
                    required
                    value={courierNameForm}
                    onChange={(e) => setCourierNameForm(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-bold"
                    placeholder="e.g. Delhivery"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                    Tracking URL Template Link
                  </label>
                  <input
                    type="url"
                    required
                    value={courierTrackingTemplate}
                    onChange={(e) => setCourierTrackingTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                    placeholder="e.g. https://www.delhivery.com/track?id="
                  />
                  <p className="text-[10px] text-text-secondary mt-1">
                    Enter the carrier tracking page URL. The tracking ID will be appended directly to the end of this link.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsCourierModalOpen(false)}
                    className="px-4 py-2 border border-border bg-white text-text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-bg-subtle transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent text-white text-[10px] font-bold uppercase tracking-wider hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Save Partner
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
