import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ChevronRight, Check, AlertCircle, X, Loader2 } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { getProductDetails, supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import linenShirt from '../assets/product_linen_shirt.png';

export default function ProductDetail() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const { id } = useParams(); // id is the slug
  
  const [dbProduct, setDbProduct] = useState<any>(null);
  const [categorySizeGuide, setCategorySizeGuide] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!id) return;
      setLoading(true);
      try {
        const data = await getProductDetails(id, true);
        if (data) {
          setDbProduct(data);
          
          // Fetch category default size guide if product belongs to category
          if (data.category_id) {
            const { data: catData } = await supabase
              .from('categories')
              .select('size_guide_html')
              .eq('id', data.category_id)
              .maybeSingle();
            if (catData) {
              setCategorySizeGuide(catData.size_guide_html);
            }
          }
        } else {
          setDbProduct(null);
        }
      } catch (err) {
        console.warn('Could not fetch product from Supabase DB:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  // Scroll to top on navigation transition
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const product = useMemo<any>(() => {
    if (!dbProduct) return null;
    return {
      ...dbProduct,
      product_images: dbProduct.product_images || [],
      product_variants: dbProduct.product_variants || []
    };
  }, [dbProduct]);

  const sizeGuideHtml = useMemo(() => {
    // 1. Product custom size guide override
    if (product?.size_guide_type === 'custom' && product.custom_size_guide_html) {
      return product.custom_size_guide_html;
    }
    // 2. Category level default
    if (categorySizeGuide) {
      return categorySizeGuide;
    }
    // 3. Fallback based on category / name
    const isPants = product?.name?.toLowerCase()?.includes('pant') || 
                    product?.name?.toLowerCase()?.includes('trouser') || 
                    (product?.name?.toLowerCase()?.includes('linen shirt') === false && 
                     (product?.name?.toLowerCase()?.includes('pants') || 
                      product?.name?.toLowerCase()?.includes('trousers')));
    if (isPants) {
      return `
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-border font-bold text-text-primary">
              <th class="py-2.5">Size</th>
              <th class="py-2.5">Waist (in)</th>
              <th class="py-2.5">Hip (in)</th>
              <th class="py-2.5">Inseam (in)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border text-text-secondary">
            <tr><td class="py-2.5 font-bold text-text-primary">S</td><td class="py-2.5">30</td><td class="py-2.5">38</td><td class="py-2.5">30</td></tr>
            <tr><td class="py-2.5 font-bold text-text-primary">M</td><td class="py-2.5">32</td><td class="py-2.5">40</td><td class="py-2.5">31</td></tr>
            <tr><td class="py-2.5 font-bold text-text-primary">L</td><td class="py-2.5">34</td><td class="py-2.5">42</td><td class="py-2.5">32</td></tr>
            <tr><td class="py-2.5 font-bold text-text-primary">XL</td><td class="py-2.5">36</td><td class="py-2.5">44</td><td class="py-2.5">32</td></tr>
          </tbody>
        </table>
      `;
    }

    // Default: Tops (shirts, jackets)
    return `
      <table class="w-full text-left text-xs border-collapse">
        <thead>
          <tr class="border-b border-border font-bold text-text-primary">
            <th class="py-2.5">Size</th>
            <th class="py-2.5">Chest (in)</th>
            <th class="py-2.5">Front Length (in)</th>
            <th class="py-2.5">Across Shoulder (in)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border text-text-secondary">
          <tr><td class="py-2.5 font-bold text-text-primary">S</td><td class="py-2.5">38</td><td class="py-2.5">27.5</td><td class="py-2.5">17.5</td></tr>
          <tr><td class="py-2.5 font-bold text-text-primary">M</td><td class="py-2.5">40</td><td class="py-2.5">28.5</td><td class="py-2.5">18.5</td></tr>
          <tr><td class="py-2.5 font-bold text-text-primary">L</td><td class="py-2.5">42</td><td class="py-2.5">29.5</td><td class="py-2.5">19.5</td></tr>
          <tr><td class="py-2.5 font-bold text-text-primary">XL</td><td class="py-2.5">44</td><td class="py-2.5">30.5</td><td class="py-2.5">20.5</td></tr>
        </tbody>
      </table>
    `;
  }, [product, categorySizeGuide]);

  // Load recommendations dynamically from Supabase
  useEffect(() => {
    async function loadRecommendations() {
      if (!dbProduct) {
        setRecommendations([]);
        return;
      }
      try {
        let query = supabase
          .from('products')
          .select(`
            *,
            product_images (*),
            product_variants (*)
          `)
          .eq('is_active', true)
          .neq('id', dbProduct.id)
          .limit(4);

        if (dbProduct.category_id) {
          query = query.eq('category_id', dbProduct.category_id);
        }

        const { data, error } = await query;
        if (error) throw error;
        setRecommendations(data || []);
      } catch (err) {
        console.warn('Could not load recommendations from Supabase:', err);
      }
    }
    loadRecommendations();
  }, [dbProduct]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isAdded, setIsAdded] = useState(false);
  const [viewBag, setViewBag] = useState(false);
  const navigate = useNavigate();

  const addItem = useCartStore((state) => state.addItem);

  // Set default color when product loaded
  useEffect(() => {
    if (product && product.product_variants.length > 0) {
      setSelectedColor(product.product_variants[0].color);
    }
  }, [product]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={32} className="animate-spin text-text-secondary mb-2" />
        <p className="text-xs uppercase tracking-widest text-text-secondary font-bold">
          Loading Details...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <h2 className="text-xl font-heading font-bold uppercase mb-2">Product Not Found</h2>
        <p className="text-text-secondary text-sm mb-6">The product you are looking for does not exist or has been removed.</p>
        <Link to="/shop" className="bg-accent text-white px-6 py-2.5 text-xs font-semibold uppercase tracking-wider hover:bg-accent-hover transition-colors">
          Back to Catalog
        </Link>
      </div>
    );
  }

  // Get unique sizes and colors for this product
  const availableVariantsForColor: any[] = product.product_variants.filter((v: any) => v.color === selectedColor);
  const availableColors: string[] = Array.from(new Set(product.product_variants.map((v: any) => v.color))) as string[];

  // Selected variant details
  const selectedVariant = product.product_variants.find(
    (v: any) => v.color === selectedColor && v.size === selectedSize
  );

  const isOutOfStock = selectedSize 
    ? (selectedVariant?.stock_qty === 0)
    : availableVariantsForColor.every((v: any) => v.stock_qty === 0);



  const handleAddToCart = () => {
    if (!selectedSize) {
      alert('Please select a size first.');
      return;
    }

    if (selectedVariant) {
      addItem({
        id: `${product.id}-${selectedVariant.id}`,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: product.base_price,
        image: product.product_images[0]?.url || linenShirt
      });

      // Phase 1: Green 'Added ✓' for 1.5s
      setIsAdded(true);
      setViewBag(false);
      setTimeout(() => {
        setIsAdded(false);
        // Phase 2: 'View Bag' button
        setViewBag(true);
      }, 1500);
    }
  };

  const handleViewBag = () => {
    navigate('/cart');
  };

  return (
    <div className="bg-bg min-h-screen">
      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-secondary">
          <Link to="/" className="hover:text-text-primary">Home</Link>
          <ChevronRight size={10} />
          <Link to="/shop" className="hover:text-text-primary">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-text-primary font-bold truncate">{product.name}</span>
        </div>
      </div>

      {/* Main product detail section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pb-24 md:pb-16">
        
        {/* Left Side: Product Images */}
        <div className="space-y-4">
          <div className="aspect-[3/4] bg-bg-subtle border border-border overflow-hidden relative">
            <img
              src={product.product_images[activeImageIdx]?.url || linenShirt}
              alt={`${product.name} active`}
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* Thumbnails Row */}
          {product.product_images.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {product.product_images.map((img: any, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-20 aspect-[3/4] bg-bg-subtle border flex-shrink-0 transition-colors ${
                    activeImageIdx === idx ? 'border-accent' : 'border-border'
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Configuration */}
        <div className="flex flex-col space-y-6 justify-start">
          <div>
            <span className="text-xs uppercase tracking-[0.25em] text-text-secondary font-bold">Zenphire</span>
            <h1 className="text-2xl md:text-4xl font-heading font-black uppercase text-text-primary mt-1 mb-2">
              {product.name}
            </h1>
            <p className="text-xl font-bold text-text-primary">
              ₹{Number(product.base_price || 0).toFixed(2)}
            </p>
          </div>

          {/* Description */}
          <div className="text-sm text-text-secondary leading-relaxed border-b border-border pb-6">
            {product.description}
          </div>

          {/* Configuration Form */}
          <div className="space-y-6">
            
            {/* Color swatches */}
            {availableColors.length > 1 && (
              <div>
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary mb-3">
                  Color: <span className="text-text-secondary font-normal">{selectedColor}</span>
                </h3>
                <div className="flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setSelectedColor(color);
                        setSelectedSize(''); // Reset size when changing color
                      }}
                      className={`px-4 py-2 border text-xs font-semibold uppercase tracking-wider transition-colors ${
                        selectedColor === color
                          ? 'bg-accent border-accent text-white'
                          : 'border-border bg-white text-text-primary hover:border-accent'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size selection */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-text-primary">
                  Select Size
                </h3>
                <button 
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs text-text-secondary hover:text-text-primary underline underline-offset-4"
                >
                  Size Guide
                </button>
              </div>
              <div className="flex gap-2.5">
                {['S', 'M', 'L', 'XL'].map((size) => {
                  const variant = availableVariantsForColor.find((v: any) => v.size === size);
                  const isAvailable = variant ? variant.stock_qty > 0 : false;
                  
                  return (
                    <button
                      key={size}
                      disabled={!variant}
                      onClick={() => setSelectedSize(size)}
                      className={`w-12 h-12 border text-xs font-semibold flex items-center justify-center transition-colors relative ${
                        !variant 
                          ? 'opacity-30 cursor-not-allowed border-dashed border-border'
                          : !isAvailable 
                            ? 'opacity-40 cursor-not-allowed bg-bg-subtle text-text-secondary line-through border-border'
                            : selectedSize === size
                              ? 'bg-accent border-accent text-white'
                              : 'bg-white border-border text-text-primary hover:border-accent'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Variant stock feedback */}
            {selectedSize && (
              <div className="flex items-center gap-2 text-xs">
                {isOutOfStock ? (
                  <div className="text-sale font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Sold Out in selected size
                  </div>
                ) : selectedVariant && selectedVariant.stock_qty <= 4 ? (
                  <div className="text-sale font-bold flex items-center gap-1.5">
                    <AlertCircle size={14} /> Only {selectedVariant.stock_qty} left in stock
                  </div>
                ) : (
                  <div className="text-emerald-600 font-semibold flex items-center gap-1.5">
                    <Check size={14} /> In Stock & Ready to ship
                  </div>
                )}
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-4 pt-4">
              {viewBag ? (
                <button
                  onClick={handleViewBag}
                  className="flex-1 bg-emerald-600 text-white py-4 font-bold uppercase text-xs tracking-widest hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={16} />
                  View Bag
                </button>
              ) : (
                <button
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`flex-1 py-4 font-bold uppercase text-xs tracking-widest transition-colors flex items-center justify-center gap-2 ${
                    isAdded
                      ? 'bg-emerald-600 text-white'
                      : isOutOfStock
                      ? 'bg-border text-text-secondary cursor-not-allowed'
                      : 'bg-accent text-white hover:bg-accent-hover'
                  }`}
                >
                  <ShoppingBag size={16} />
                  {isAdded ? 'Added ✓' : isOutOfStock ? 'Sold Out' : selectedSize ? 'Add to Cart' : 'Select Size'}
                </button>
              )}
              
              <button 
                onClick={() => toggleWishlist(product.id)}
                aria-label="Toggle Wishlist"
                className="px-5 border border-border bg-white text-text-primary hover:bg-bg-subtle transition-colors flex items-center justify-center"
              >
                <Heart 
                  size={18} 
                  className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} 
                />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Recommendations Section */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border mb-12">
          <h2 className="text-xl font-heading font-black uppercase tracking-wider text-text-primary mb-8 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
            {recommendations.map((rec: any) => (
              <Link
                key={rec.id}
                to={`/product/${rec.slug}`}
                onClick={() => {
                  setSelectedSize('');
                  setActiveImageIdx(0);
                }}
                className="group"
              >
                <div className="aspect-[3/4] bg-bg-subtle overflow-hidden border border-border relative mb-4">
                  <img
                    src={rec.product_images && rec.product_images[0]?.url || linenShirt}
                    alt={rec.name}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                  />
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleWishlist(rec.id);
                    }}
                    aria-label="Toggle Wishlist"
                    className="absolute top-3 right-3 p-1.5 bg-white/85 hover:bg-white text-text-primary border border-border shadow-sm rounded-full transition-colors z-10"
                  >
                    <Heart
                      size={14}
                      className={isWishlisted(rec.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'}
                    />
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold">
                    Zenphire
                  </p>
                  <h3 className="text-sm font-medium text-text-primary group-hover:underline truncate">
                    {rec.name}
                  </h3>
                  <p className="text-sm font-semibold text-text-primary">
                    ₹{Number(rec.base_price || 0).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 6. MOBILE STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-border p-4 flex items-center justify-between gap-4 md:hidden shadow-lg">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-text-secondary">Price</span>
          <span className="text-base font-bold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</span>
        </div>
        {viewBag ? (
          <button
            onClick={handleViewBag}
            className="flex-grow bg-emerald-600 text-white py-3.5 px-4 font-bold uppercase text-xs tracking-wider hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag size={14} />
            View Bag
          </button>
        ) : (
          <button
            disabled={isOutOfStock}
            onClick={handleAddToCart}
            className={`flex-grow py-3.5 px-4 font-bold uppercase text-xs tracking-wider transition-colors flex items-center justify-center gap-2 ${
              isAdded
                ? 'bg-emerald-600 text-white'
                : isOutOfStock
                ? 'bg-border text-text-secondary cursor-not-allowed'
                : 'bg-accent text-white hover:bg-accent-hover'
            }`}
          >
            <ShoppingBag size={14} />
            {isAdded ? 'Added ✓' : isOutOfStock ? 'Sold Out' : selectedSize ? 'Add to Cart' : 'Select Size'}
          </button>
        )}
      </div>

      {/* SIZE GUIDE OVERLAY DIALOG MODAL */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.4 }}
              className="relative w-full max-w-lg bg-white border border-border p-6 shadow-2xl z-10 flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-4">
                <div>
                  <span className="text-[9px] uppercase tracking-widest text-text-secondary font-black bg-bg-subtle px-2 py-0.5 border border-border">
                    Reference Guide
                  </span>
                  <h3 className="text-base font-heading font-black uppercase mt-1 text-text-primary">
                    Size Measurements
                  </h3>
                </div>
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="p-1 text-text-secondary hover:text-text-primary hover:bg-bg-subtle transition-colors rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Sizing Table Body */}
              <div className="overflow-y-auto py-2 leading-relaxed">
                <p className="text-[11px] text-text-secondary mb-4">
                  Find your correct size configuration from our benchmark sizing table below. All dimensions are stated in inches.
                </p>
                <div 
                  className="prose prose-sm max-w-none text-text-primary"
                  dangerouslySetInnerHTML={{ __html: sizeGuideHtml }}
                />
              </div>

              <div className="border-t border-border pt-4 mt-4 flex justify-end">
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  className="bg-accent text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors shadow-sm"
                >
                  Close Guide
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
