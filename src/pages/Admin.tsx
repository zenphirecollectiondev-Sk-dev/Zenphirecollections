import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
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
  Sliders,
  Copy
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
}



export default function Admin() {
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'categories' | 'inventory' | 'orders'>('overview');

  // Loading states
  const [loadingData, setLoadingData] = useState(true);

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
  const [newImageUrl, setNewImageUrl] = useState('');
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);

  // Product creation wizard states
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [selectedParentCatId, setSelectedParentCatId] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<'Male' | 'Female' | 'Unisex' | ''>('');
  const [newParentCatName, setNewParentCatName] = useState<string>('');
  
  // New Variant inputs inside form
  const [varSize, setVarSize] = useState('M');
  const [varColor, setVarColor] = useState('White');
  const [varStock, setVarStock] = useState('20');
  const [varSku, setVarSku] = useState('');

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catParent, setCatParent] = useState('');
  const [catSizeGuide, setCatSizeGuide] = useState('');

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

  // Global messages
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Size Guide Builder states
  const [isSizeBuilderOpen, setIsSizeBuilderOpen] = useState(false);
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderCategory, setBuilderCategory] = useState<'pants' | 'shirts' | 'coords' | 'custom'>('shirts');
  const [builderColumns, setBuilderColumns] = useState<string[]>(['Brand Size', 'Shoulder (in)', 'Chest (in)', 'Length (in)']);
  const [builderRows, setBuilderRows] = useState<any[]>([
    { 'Brand Size': 'S' },
    { 'Brand Size': 'M' },
    { 'Brand Size': 'L' },
    { 'Brand Size': 'XL' }
  ]);
  const [generatedHtml, setGeneratedHtml] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const getCategoryColumns = (category: string) => {
    switch (category) {
      case 'pants':
        return ['Brand Size', 'Waist (in)', 'Inseam (in)'];
      case 'shirts':
        return ['Brand Size', 'Shoulder (in)', 'Chest (in)', 'Length (in)'];
      case 'coords':
        return ['Brand Size', 'Shoulder (in)', 'Chest (in)', 'Waist (in)', 'Length (in)'];
      default:
        return ['Brand Size'];
    }
  };

  const handleOpenSizeBuilder = () => {
    setBuilderTitle('');
    setBuilderCategory('shirts');
    setBuilderColumns(['Brand Size', 'Shoulder (in)', 'Chest (in)', 'Length (in)']);
    setBuilderRows([
      { 'Brand Size': 'S' },
      { 'Brand Size': 'M' },
      { 'Brand Size': 'L' },
      { 'Brand Size': 'XL' }
    ]);
    setGeneratedHtml('');
    setIsCopied(false);
    setIsSizeBuilderOpen(true);
  };

  const handleBuilderCategoryChange = (cat: 'pants' | 'shirts' | 'coords' | 'custom') => {
    setBuilderCategory(cat);
    const cols = getCategoryColumns(cat);
    setBuilderColumns(cols);
    setBuilderRows([
      { 'Brand Size': 'S' },
      { 'Brand Size': 'M' },
      { 'Brand Size': 'L' },
      { 'Brand Size': 'XL' }
    ]);
    setGeneratedHtml('');
    setIsCopied(false);
  };

  const handleAddColumn = () => {
    let suffix = 1;
    let colName = `Column ${suffix}`;
    while (builderColumns.includes(colName)) {
      suffix++;
      colName = `Column ${suffix}`;
    }
    setBuilderColumns([...builderColumns, colName]);
  };

  const handleRemoveColumn = (colName: string) => {
    if (colName === 'Brand Size') return;
    setBuilderColumns(builderColumns.filter(c => c !== colName));
    // Clean up
    setBuilderRows(builderRows.map(r => {
      const copy = { ...r };
      delete copy[colName];
      return copy;
    }));
  };

  const generateSizeGuideHtml = () => {
    // Filter out any columns that are empty
    const activeCols = builderColumns.filter(c => c.trim() !== '');

    const titleHtml = builderTitle.trim()
      ? `  <caption class="text-xs font-bold text-text-primary mb-2.5 text-left uppercase tracking-widest">${builderTitle.trim()}</caption>\n`
      : '';
      
    const headersHtml = activeCols
      .map(c => `<th class="py-2.5">${c}</th>`)
      .join('\n      ');
      
    const rowsHtml = builderRows.map(r => {
      const tds = activeCols.map((col, idx) => {
        const isBrand = idx === 0;
        const val = r[col] || '-';
        return `<td class="py-2.5${isBrand ? ' font-bold text-text-primary' : ''}">${val}</td>`;
      }).join('\n      ');
      return `\n    <tr>\n      ${tds}\n    </tr>`;
    }).join('');

    const html = `
<table class="w-full text-left text-xs border-collapse">
${titleHtml}  <thead>
    <tr class="border-b border-border font-bold text-text-primary">
      ${headersHtml}
    </tr>
  </thead>
  <tbody class="divide-y divide-border text-text-secondary">
    ${rowsHtml.trim()}
  </tbody>
</table>`.trim();

    setGeneratedHtml(html);
    setIsCopied(false);
  };

  // Fetch Dashboard Stats & Data
  const fetchData = async () => {
    setLoadingData(true);
    setErrorMsg(null);

    try {
      // 1. Fetch Categories
      const { data: catData, error: catErr } = await supabase
        .from('categories')
        .select('*')
        .order('name', { ascending: true });
      if (catErr) throw catErr;
      setCategories(catData || []);

      // 2. Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .select(`
          *,
          product_images (*),
          product_variants (*)
        `)
        .order('created_at', { ascending: false });
      if (prodErr) throw prodErr;
      setProducts((prodData || []) as any[]);
      setProductsCount(prodData?.length || 0);

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

    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      setErrorMsg(err.message || 'Error occurred while loading data.');
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
      const { error } = await supabase
        .from('orders')
        .update({
          status: orderUpdateStatus as any,
          tracking_id: orderUpdateTracking || null
        })
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

  const triggerNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(null), 4000);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
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
    setNewImageUrl('');
    
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
    setNewImageUrl('');
    
    // Wizard resets
    setWizardStep(1);
    setSelectedParentCatId('');
    setSelectedGender('');
    setNewParentCatName('');
    setIsProductModalOpen(true);
  };

  // Add image to list inside modal
  const handleAddImage = () => {
    if (!newImageUrl.trim()) return;
    const newImage: ProductImage = {
      url: newImageUrl.trim(),
      sort_order: prodImages.length
    };
    setProdImages([...prodImages, newImage]);
    setNewImageUrl('');
  };

  // Delete image from list inside modal
  const handleDeleteImage = (index: number) => {
    const updated = prodImages.filter((_, i) => i !== index);
    setProdImages(updated);
  };

  // Add variant inside modal
  const handleAddVariant = () => {
    const qty = parseInt(varStock);
    if (!varSku.trim()) {
      alert('SKU is required to add variant');
      return;
    }
    const newVar: ProductVariant = {
      size: varSize,
      color: varColor,
      stock_qty: isNaN(qty) ? 0 : qty,
      sku: varSku.trim()
    };
    setProdVariants([...prodVariants, newVar]);
    setVarSku('');
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

      let productId: string = '';
      const payload = {
        name: prodName.trim(),
        slug: prodSlug.trim() || generateSlug(prodName),
        base_price: parseFloat(prodPrice),
        description: prodDesc.trim() || null,
        category_id: finalCategoryId,
        is_active: prodActive,
        size_guide_type: prodSizeGuideType,
        custom_size_guide_html: prodSizeGuideType === 'custom' ? prodCustomSizeGuide.trim() : null
      };

      if (editingProduct) {
        productId = editingProduct.id;
        // 1. Update Product details
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', productId);
        if (error) throw error;
        
        // 2. Remove all existing variants & images, then re-insert to simplify sync
        await supabase.from('product_images').delete().eq('product_id', productId);
        await supabase.from('product_variants').delete().eq('product_id', productId);
      } else {
        // 1. Insert new Product
        const { data, error } = await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        productId = data.id;
      }

      // 2. Insert Images
      if (prodImages.length > 0) {
        const imagesInsert = prodImages.map((img) => ({
          product_id: productId,
          url: img.url,
          sort_order: img.sort_order
        }));
        const { error } = await supabase.from('product_images').insert(imagesInsert);
        if (error) throw error;
      }

      // 3. Insert Variants
      if (prodVariants.length > 0) {
        const variantsInsert = prodVariants.map((v) => ({
          product_id: productId,
          size: v.size,
          color: v.color,
          stock_qty: v.stock_qty,
          sku: v.sku
        }));
        const { error } = await supabase.from('product_variants').insert(variantsInsert);
        if (error) throw error;
      }

      setIsProductModalOpen(false);
      triggerNotification(`Product "${prodName}" saved successfully`);
      fetchData();
    } catch (err: any) {
      console.error('Error saving product:', err);
      triggerNotification(err.message || 'Error occurred while saving product', true);
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
    setIsCategoryModalOpen(true);
  };

  // Open Add Category
  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatSlug('');
    setCatParent('');
    setCatSizeGuide('');
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
        size_guide_html: catSizeGuide.trim() || null
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
    <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
      
      {/* Top Banner Header */}
      <div className="border border-border/80 p-6 md:p-8 bg-white mb-10 shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest bg-accent text-white font-black px-2.5 py-1">
            System Console
          </span>
          <h1 className="text-2xl md:text-3xl font-heading font-black tracking-wide uppercase mt-3 text-text-primary">
            Store Management Cockpit
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage your catalog items, inventory levels, sizing rules, and stat analysis.
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loadingData}
          className="border border-border bg-white text-text-primary px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={12} className={loadingData ? 'animate-spin' : ''} /> Sync Data
        </button>
      </div>

      {/* Notifications banner */}
      <AnimatePresence>
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Check size={14} className="flex-shrink-0" />
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 bg-sale/10 border border-sale text-sale text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <AlertTriangle size={14} className="flex-shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation sub-tabs */}
      <div className="flex border-b border-border mb-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'overview'
              ? 'border-accent text-text-primary font-black'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Overview Statistics
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'products'
              ? 'border-accent text-text-primary font-black'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Product Catalog ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'categories'
              ? 'border-accent text-text-primary font-black'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Categories & Sizing
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'inventory'
              ? 'border-accent text-text-primary font-black'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Inventory Stock Ledger
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3.5 px-6 text-xs font-bold tracking-widest uppercase border-b-2 whitespace-nowrap transition-all ${
            activeTab === 'orders'
              ? 'border-accent text-text-primary font-black'
              : 'border-transparent text-text-secondary hover:text-text-primary'
          }`}
        >
          Customer Orders ({recentOrders.length})
        </button>
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
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                                o.status === 'delivered' 
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
                  onClick={handleOpenSizeBuilder}
                  className="border border-border bg-white text-text-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Sliders size={14} /> Size Guide Generator
                </button>
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
                              {categoryName}
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
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                                p.is_active 
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
                        <th className="py-2.5">Category Name</th>
                        <th className="py-2.5">Slug</th>
                        <th className="py-2.5">Size Guide</th>
                        <th className="py-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {categories.map((c) => (
                        <tr key={c.id} className="hover:bg-bg-subtle">
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
            {/* Search filter for variants */}
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-text-secondary" />
              <input
                type="text"
                placeholder="Search variant ledger by SKU or product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-border/80 bg-white text-xs focus:outline-none focus:border-accent shadow-xs"
              />
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
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border ${
                              o.status === 'delivered' 
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
                          className={`p-6 border text-center font-bold uppercase tracking-wider text-[11px] transition-all flex flex-col justify-center items-center h-28 rounded-none ${
                            selectedParentCatId === c.id
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
                          className={`p-6 border text-center font-bold uppercase tracking-wider text-[11px] transition-all flex flex-col justify-center items-center h-28 rounded-none ${
                            selectedGender === gender
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste Image URL..."
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          className="flex-1 px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                        />
                        <button
                          type="button"
                          onClick={handleAddImage}
                          className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors"
                        >
                          Add Image
                        </button>
                      </div>

                      {prodImages.length === 0 ? (
                        <p className="text-[10px] text-text-secondary text-center py-2">No product images added yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {prodImages.map((img, idx) => (
                            <div key={idx} className="relative aspect-[3/4] bg-white border border-border overflow-hidden group">
                              <img src={img.url} alt="product swatch" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => handleDeleteImage(idx)}
                                className="absolute top-2 right-2 p-1.5 bg-black/60 text-white hover:bg-sale transition-colors shadow-sm"
                              >
                                <Trash2 size={12} />
                              </button>
                              <span className="absolute bottom-2 left-2 bg-black/60 text-white font-mono text-[8px] px-1 py-0.25">
                                Idx: {idx}
                              </span>
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
                          Configure standard category tables or write a custom override.
                        </p>
                      </div>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            name="size-guide-chk"
                            checked={prodSizeGuideType === 'custom'}
                            onChange={(e) => setProdSizeGuideType(e.target.checked ? 'custom' : 'category')}
                            className="accent-accent w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-text-primary">Configure custom Size table override</span>
                        </label>
                      </div>

                      {prodSizeGuideType === 'custom' && (
                        <div>
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
                            <option value="S">S</option>
                            <option value="M">M</option>
                            <option value="L">L</option>
                            <option value="XL">XL</option>
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
                          <label className="block text-[9px] font-bold uppercase tracking-wide text-text-secondary mb-1">
                            Variant SKU
                          </label>
                          <input
                            type="text"
                            value={varSku}
                            onChange={(e) => setVarSku(e.target.value)}
                            className="w-full px-2 py-1 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent font-mono"
                            placeholder="ZP-SHRT-W-M"
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
                        className="px-6 py-3 bg-accent text-white text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                      >
                        Save Catalog Product
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
          SIZE GUIDE GENERATOR DIALOG MODAL
          ========================================== */}
      <AnimatePresence>
        {isSizeBuilderOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeBuilderOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-white border border-border p-6 md:p-8 shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    Interactive Tool
                  </span>
                  <h3 className="text-lg font-heading font-black uppercase mt-1 text-text-primary">
                    Size Guide Generator
                  </h3>
                </div>
                <button
                  onClick={() => setIsSizeBuilderOpen(false)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Left Column: Row Builder */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Table Title Input */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-1">
                      Table Title (Optional Caption)
                    </label>
                    <input
                      type="text"
                      value={builderTitle}
                      onChange={(e) => setBuilderTitle(e.target.value)}
                      placeholder="e.g. Slim Fit Denim Sizing Guide"
                      className="w-full px-3 py-2 border border-border bg-white text-text-primary text-xs focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary mb-2">
                      1. Category Columns Config
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={builderCategory}
                        onChange={(e: any) => handleBuilderCategoryChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-border bg-white text-xs font-bold uppercase tracking-wider text-text-primary focus:outline-none focus:border-accent"
                      >
                        <option value="shirts">Shirts & Tops Preset (Shoulder, Chest, Length)</option>
                        <option value="pants">Pants & Bottoms Preset (Waist, Inseam)</option>
                        <option value="coords">Co-ords Preset (Shoulder, Chest, Waist, Length)</option>
                        <option value="custom">Custom Columns Blank</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleAddColumn}
                        className="bg-accent text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors"
                      >
                        + Add Column
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary">
                        2. Declare Sizes & Measurements
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const newRow: any = {};
                          builderColumns.forEach(c => {
                            newRow[c] = '';
                          });
                          setBuilderRows([...builderRows, newRow]);
                        }}
                        className="text-[10px] font-bold text-accent hover:underline uppercase tracking-wider"
                      >
                        + Add Size Row
                      </button>
                    </div>

                    <div className="overflow-x-auto border border-border bg-bg-subtle p-3">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="text-[9px] uppercase tracking-wider text-text-secondary border-b border-border">
                            {builderColumns.map((col, idx) => (
                              <th key={idx} className="pb-2 px-1.5 align-middle">
                                <div className="flex items-center gap-1">
                                  {idx === 0 ? (
                                    <span className="font-bold text-text-primary text-[10px]">{col}</span>
                                  ) : (
                                    <input
                                      type="text"
                                      value={col}
                                      onChange={(e) => {
                                        const newName = e.target.value;
                                        const updatedCols = [...builderColumns];
                                        const oldName = updatedCols[idx];
                                        updatedCols[idx] = newName;
                                        setBuilderColumns(updatedCols);
                                        
                                        // Update keys in rows
                                        setBuilderRows(builderRows.map(r => {
                                          const copy = { ...r };
                                          copy[newName] = copy[oldName] || '';
                                          delete copy[oldName];
                                          return copy;
                                        }));
                                      }}
                                      className="border border-border/80 bg-white px-1.5 py-0.5 text-[9px] font-bold uppercase text-text-primary focus:outline-none focus:border-accent w-20"
                                      placeholder="Header"
                                    />
                                  )}
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveColumn(col)}
                                      className="text-text-secondary hover:text-sale font-normal text-[8px] ml-0.5"
                                      title="Delete Column"
                                    >
                                      ✕
                                    </button>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="pb-2 px-1.5 align-middle w-24">
                              <button
                                type="button"
                                onClick={handleAddColumn}
                                className="text-[9px] font-bold text-accent hover:underline uppercase tracking-wider"
                              >
                                + Add Column
                              </button>
                            </th>
                            <th className="pb-2 w-10 text-right">Delete</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {builderRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="align-middle">
                              {builderColumns.map((colName, colIdx) => (
                                <td key={colIdx} className="py-2.5 px-1.5">
                                  <input
                                    type="text"
                                    value={row[colName] || ''}
                                    onChange={(e) => {
                                      const updated = [...builderRows];
                                      updated[rowIdx] = {
                                        ...updated[rowIdx],
                                        [colName]: e.target.value
                                      };
                                      setBuilderRows(updated);
                                    }}
                                    placeholder={colIdx === 0 ? "e.g. M" : "in"}
                                    className={`px-2 py-1 border border-border bg-white text-xs focus:outline-none focus:border-accent ${
                                      colIdx === 0 ? 'w-16 text-center font-bold' : 'w-full max-w-[80px]'
                                    }`}
                                  />
                                </td>
                              ))}
                              {/* Empty cell to align with '+ Add Column' th header */}
                              <td className="py-2.5 px-1.5 w-24"></td>
                              <td className="py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => setBuilderRows(builderRows.filter((_, i) => i !== rowIdx))}
                                  className="text-text-secondary hover:text-sale p-1 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={generateSizeGuideHtml}
                    className="w-full bg-accent text-white py-3 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                  >
                    Generate HTML Table Markup
                  </button>
                </div>

                {/* Right Column: HTML Output & Preview */}
                <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-text-primary">
                      3. Generated HTML & Clipboard
                    </label>
                    {generatedHtml ? (
                      <div className="space-y-3">
                        <textarea
                          readOnly
                          value={generatedHtml}
                          rows={10}
                          className="w-full p-3 border border-border bg-bg-subtle text-text-primary text-[10px] font-mono focus:outline-none resize-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedHtml);
                            setIsCopied(true);
                            triggerNotification('Size Guide HTML copied to clipboard!');
                          }}
                          className="w-full border border-accent bg-white text-text-primary py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-all flex items-center justify-center gap-2 shadow-xs"
                        >
                          {isCopied ? <Check size={12} className="text-emerald-700" /> : <Copy size={12} />}
                          {isCopied ? 'Copied Successfully' : 'Copy HTML Code'}
                        </button>
                      </div>
                    ) : (
                      <div className="border border-dashed border-border p-12 text-center text-xs text-text-secondary flex flex-col items-center justify-center gap-2 bg-bg-subtle h-60">
                        <Sliders size={20} className="text-text-secondary stroke-[1.2] mb-1" />
                        <p>Fill in sizes on the left, then click Generate to preview HTML code here.</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-6 border-t border-border flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsSizeBuilderOpen(false)}
                      className="px-5 py-2.5 border border-border bg-white text-text-primary text-xs font-bold uppercase tracking-widest hover:bg-bg-subtle transition-colors"
                    >
                      Close Generator
                    </button>
                  </div>
                </div>

              </div>

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

    </div>
  );
}
