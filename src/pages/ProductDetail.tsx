import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ChevronRight, ChevronLeft, Check, AlertCircle, X, Loader2, ZoomIn } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { getProductDetails, supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import linenShirt from '../assets/product_linen_shirt.png';

export default function ProductDetail() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const { id } = useParams();

  const [dbProduct, setDbProduct] = useState<any>(null);
  const [categorySizeGuide, setCategorySizeGuide] = useState<string | null>(null);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);
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
          if (data.category_id) {
            const { data: catData } = await supabase
              .from('categories')
              .select('size_guide_html')
              .eq('id', data.category_id)
              .maybeSingle();
            if (catData) setCategorySizeGuide(catData.size_guide_html);
          }
        } else {
          setDbProduct(null);
        }
      } catch (err) {
        console.warn('ProductDetail load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [id]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  const product = useMemo<any>(() => {
    if (!dbProduct) return null;
    return {
      ...dbProduct,
      product_images: dbProduct.product_images || [],
      product_variants: dbProduct.product_variants || [],
    };
  }, [dbProduct]);

  const sizeGuideHtml = useMemo(() => {
    if (product?.size_guide_type === 'custom' && product.custom_size_guide_html) return product.custom_size_guide_html;
    if (categorySizeGuide) return categorySizeGuide;
    const isPants = product?.name?.toLowerCase()?.includes('pant') || product?.name?.toLowerCase()?.includes('trouser');
    if (isPants) {
      return `<table class="w-full text-left text-xs border-collapse"><thead><tr class="border-b border-border font-bold text-text-primary"><th class="py-2.5">Size</th><th class="py-2.5">Waist (in)</th><th class="py-2.5">Hip (in)</th><th class="py-2.5">Inseam (in)</th></tr></thead><tbody class="divide-y divide-border text-text-secondary"><tr><td class="py-2.5 font-bold text-text-primary">S</td><td class="py-2.5">30</td><td class="py-2.5">38</td><td class="py-2.5">30</td></tr><tr><td class="py-2.5 font-bold text-text-primary">M</td><td class="py-2.5">32</td><td class="py-2.5">40</td><td class="py-2.5">31</td></tr><tr><td class="py-2.5 font-bold text-text-primary">L</td><td class="py-2.5">34</td><td class="py-2.5">42</td><td class="py-2.5">32</td></tr><tr><td class="py-2.5 font-bold text-text-primary">XL</td><td class="py-2.5">36</td><td class="py-2.5">44</td><td class="py-2.5">32</td></tr></tbody></table>`;
    }
    return `<table class="w-full text-left text-xs border-collapse"><thead><tr class="border-b border-border font-bold text-text-primary"><th class="py-2.5">Size</th><th class="py-2.5">Chest (in)</th><th class="py-2.5">Front Length (in)</th><th class="py-2.5">Across Shoulder (in)</th></tr></thead><tbody class="divide-y divide-border text-text-secondary"><tr><td class="py-2.5 font-bold text-text-primary">S</td><td class="py-2.5">38</td><td class="py-2.5">27.5</td><td class="py-2.5">17.5</td></tr><tr><td class="py-2.5 font-bold text-text-primary">M</td><td class="py-2.5">40</td><td class="py-2.5">28.5</td><td class="py-2.5">18.5</td></tr><tr><td class="py-2.5 font-bold text-text-primary">L</td><td class="py-2.5">42</td><td class="py-2.5">29.5</td><td class="py-2.5">19.5</td></tr><tr><td class="py-2.5 font-bold text-text-primary">XL</td><td class="py-2.5">44</td><td class="py-2.5">30.5</td><td class="py-2.5">20.5</td></tr></tbody></table>`;
  }, [product, categorySizeGuide]);

  useEffect(() => {
    async function loadRecommendations() {
      if (!dbProduct) { setRecommendations([]); return; }
      try {
        let query = supabase
          .from('products')
          .select('*, product_images (*), product_variants (*)')
          .eq('is_active', true)
          .neq('id', dbProduct.id)
          .limit(4);
        if (dbProduct.category_id) query = query.eq('category_id', dbProduct.category_id);
        const { data, error } = await query;
        if (error) throw error;
        setRecommendations(data || []);
      } catch (err) {
        console.warn('Recommendations load error:', err);
      }
    }
    loadRecommendations();
  }, [dbProduct]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isAdded, setIsAdded] = useState(false);
  const [viewBag, setViewBag] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (product?.product_variants?.length > 0) setSelectedColor(product.product_variants[0].color);
  }, [product]);

  // Lightbox keyboard navigation
  const handleLightboxKey = useCallback((e: KeyboardEvent) => {
    if (!isLightboxOpen) return;
    if (e.key === 'Escape') setIsLightboxOpen(false);
    if (e.key === 'ArrowRight') setLightboxIdx((i) => (i + 1) % (product?.product_images?.length || 1));
    if (e.key === 'ArrowLeft') setLightboxIdx((i) => (i - 1 + (product?.product_images?.length || 1)) % (product?.product_images?.length || 1));
  }, [isLightboxOpen, product]);

  useEffect(() => {
    window.addEventListener('keydown', handleLightboxKey);
    return () => window.removeEventListener('keydown', handleLightboxKey);
  }, [handleLightboxKey]);

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setIsLightboxOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-secondary mb-3" />
        <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold anim-fade-in">Loading</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-xl font-heading font-bold uppercase mb-2">Product Not Found</h2>
        <p className="text-text-secondary text-sm mb-6">This product doesn't exist or has been removed.</p>
        <Link to="/shop" className="btn btn-primary px-6 py-3 text-xs font-bold uppercase tracking-widest">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const availableVariantsForColor: any[] = product.product_variants.filter((v: any) => v.color === selectedColor);
  const availableColors: string[] = Array.from(new Set(product.product_variants.map((v: any) => v.color))) as string[];
  const selectedVariant = product.product_variants.find((v: any) => v.color === selectedColor && v.size === selectedSize);
  const isOutOfStock = selectedSize
    ? selectedVariant?.stock_qty === 0
    : availableVariantsForColor.every((v: any) => v.stock_qty === 0);

  const handleAddToCart = () => {
    if (!selectedSize) { alert('Please select a size first.'); return; }
    if (selectedVariant) {
      addItem({
        id: `${product.id}-${selectedVariant.id}`,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: product.base_price,
        image: product.product_images[0]?.url || linenShirt,
      });
      setIsAdded(true);
      setViewBag(false);
      setTimeout(() => { setIsAdded(false); setViewBag(true); }, 1500);
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  };

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">

      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary">
          <Link to="/" className="nav-link hover:text-text-primary">Home</Link>
          <ChevronRight size={10} />
          <Link to="/shop" className="nav-link hover:text-text-primary">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-text-primary font-bold truncate">{product.name}</span>
        </div>
      </div>

      {/* ── MAIN SECTION ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pb-10 md:pb-16">

        {/* LEFT: Images */}
        <div className="space-y-3">
          {/* Main image — clickable for lightbox */}
          <div
            className="w-full bg-bg-subtle border border-border overflow-hidden relative group cursor-zoom-in"
            onClick={() => openLightbox(activeImageIdx)}
            role="button"
            aria-label="Enlarge image"
          >
            <img
              src={product.product_images[activeImageIdx]?.url || linenShirt}
              alt={product.name}
              className="w-full h-auto block relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
            />
            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-white/80 border border-border/60 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <ZoomIn size={14} className="text-text-secondary" />
            </div>
          </div>

          {/* Thumbnails */}
          {product.product_images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {product.product_images.map((img: any, idx: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIdx(idx)}
                  className={`size-btn flex-shrink-0 w-[68px] aspect-[2/3] bg-bg-subtle border overflow-hidden ${activeImageIdx === idx ? 'border-accent selected' : 'border-border'
                    }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Configuration */}
        <div className="flex flex-col space-y-5">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-text-secondary font-bold">Zenphire</p>
            <h1 className="text-2xl md:text-4xl font-heading font-black uppercase mt-1 mb-2 leading-tight">{product.name}</h1>
            <p className="text-xl font-bold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed border-b border-border pb-5">
            {product.description}
          </p>

          <div className="space-y-5">
            {/* Color swatches */}
            {availableColors.length > 1 && (
              <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary mb-3">
                  Color: <span className="text-text-secondary font-normal normal-case">{selectedColor}</span>
                </h3>
                <div className="flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
                      className={`btn px-4 py-2 border text-[10px] font-bold uppercase tracking-widest ${selectedColor === color
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

            {/* Size */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Select Size</h3>
                <button onClick={() => setIsSizeGuideOpen(true)} className="btn text-[10px] text-text-secondary underline underline-offset-4 hover:text-text-primary">
                  Size Guide
                </button>
              </div>
              <div className="flex gap-2">
                {['S', 'M', 'L', 'XL'].map((size) => {
                  const variant = availableVariantsForColor.find((v: any) => v.size === size);
                  const available = variant ? variant.stock_qty > 0 : false;
                  return (
                    <button
                      key={size}
                      disabled={!variant}
                      onClick={() => setSelectedSize(size)}
                      className={`size-btn w-12 h-12 border text-xs font-bold flex items-center justify-center transition-all ${!variant
                        ? 'opacity-30 cursor-not-allowed border-dashed border-border'
                        : !available
                          ? 'opacity-40 cursor-not-allowed bg-bg-subtle text-text-secondary line-through border-border'
                          : selectedSize === size
                            ? 'ambient-green-gradient text-white border-transparent selected'
                            : 'bg-white border-border text-text-primary hover:border-accent'
                        }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stock feedback */}
            {selectedSize && (
              <div className="text-[11px] flex items-center gap-1.5 anim-fade-in">
                {isOutOfStock ? (
                  <span className="text-sale font-bold flex items-center gap-1.5"><AlertCircle size={13} /> Sold out in this size</span>
                ) : selectedVariant?.stock_qty <= 4 ? (
                  <span className="text-sale font-bold flex items-center gap-1.5"><AlertCircle size={13} /> Only {selectedVariant.stock_qty} left</span>
                ) : (
                  <span className="text-emerald-600 font-semibold flex items-center gap-1.5"><Check size={13} /> In Stock · Ready to ship</span>
                )}
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              {viewBag ? (
                <button
                  onClick={() => navigate('/cart')}
                  className="btn btn-primary flex-1 py-4 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                >
                  <ShoppingBag size={15} /> View Bag
                </button>
              ) : (
                <button
                  disabled={isOutOfStock}
                  onClick={handleAddToCart}
                  className={`btn btn-primary flex-1 py-4 font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 ${isAdded
                    ? 'bg-emerald-600 text-white'
                    : isOutOfStock
                      ? 'bg-border text-text-secondary cursor-not-allowed opacity-50'
                      : ''
                    }`}
                >
                  <ShoppingBag size={15} />
                  {isAdded ? 'Added ✓' : isOutOfStock ? 'Sold Out' : selectedSize ? 'Add to Cart' : 'Select Size'}
                </button>
              )}

              <button
                onClick={handleWishlistToggle}
                aria-label="Toggle Wishlist"
                className={`wishlist-btn px-5 border border-border bg-white text-text-primary hover:bg-bg-subtle flex items-center justify-center ${heartAnim ? 'anim-heart-pop' : ''}`}
              >
                <Heart size={18} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMMENDATIONS ── */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-border mb-10">
          <h2 className="text-lg font-heading font-black uppercase tracking-widest text-text-primary mb-8 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 anim-stagger">
            {recommendations.map((rec: any) => (
              <Link
                key={rec.id}
                to={`/product/${rec.slug}`}
                onClick={() => { setSelectedSize(''); setActiveImageIdx(0); }}
                className="group product-card block"
              >
                <div className="w-full bg-bg-subtle overflow-hidden border border-border relative mb-3">
                  <img
                    src={rec.product_images?.[0]?.url || linenShirt}
                    alt={rec.name}
                    className="card-img w-full h-auto block relative z-10"
                  />
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(rec.id); }}
                    aria-label="Toggle Wishlist"
                    className="wishlist-btn absolute top-2.5 right-2.5 p-1.5 bg-white/90 border border-border/60 rounded-full z-10"
                  >
                    <Heart size={13} className={isWishlisted(rec.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                  </button>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                  <h3 className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{rec.name}</h3>
                  <p className="text-sm font-semibold text-text-primary">₹{Number(rec.base_price || 0).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}


      {/* ── SIZE GUIDE MODAL ── */}
      <AnimatePresence>
        {isSizeGuideOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-lg bg-white border border-border p-6 shadow-xl z-10 flex flex-col max-h-[88vh]"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Reference Guide</p>
                  <h3 className="text-sm font-heading font-black uppercase mt-0.5">Size Measurements</h3>
                </div>
                <button onClick={() => setIsSizeGuideOpen(false)} className="btn-icon p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-full">
                  <X size={16} />
                </button>
              </div>
              <div className="overflow-y-auto">
                <p className="text-[11px] text-text-secondary mb-4 leading-relaxed">
                  All dimensions are in inches. Measure over a light base layer for best accuracy.
                </p>
                <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sizeGuideHtml }} />
              </div>
              <div className="border-t border-border pt-4 mt-4 flex justify-end">
                <button onClick={() => setIsSizeGuideOpen(false)} className="btn btn-primary px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── FULL-SCREEN IMAGE LIGHTBOX ── */}
      <AnimatePresence>
        {isLightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.96)' }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            onClick={() => setIsLightboxOpen(false)}
          >
            {/* ── Top bar: counter + close ── */}
            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-4 z-10" onClick={(e) => e.stopPropagation()}>
              <p className="text-[11px] text-white/50 uppercase tracking-[0.2em] font-semibold select-none">
                {product.product_images.length > 1 ? `${lightboxIdx + 1} / ${product.product_images.length}` : ''}
              </p>
              <button
                onClick={() => setIsLightboxOpen(false)}
                className="btn-icon p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Prev arrow (multi-image only) ── */}
            {product.product_images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => (i - 1 + product.product_images.length) % product.product_images.length);
                }}
                className="btn-icon absolute left-4 md:left-8 p-3 text-white/50 hover:text-white hover:bg-white/8 rounded-full z-10"
                aria-label="Previous image"
              >
                <ChevronLeft size={28} />
              </button>
            )}

            {/* ── Main image ── */}
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              src={product.product_images[lightboxIdx]?.url || linenShirt}
              alt={`${product.name} — view ${lightboxIdx + 1}`}
              className="max-h-[88vh] max-w-[85vw] md:max-w-[55vw] object-contain select-none"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />

            {/* ── Next arrow (multi-image only) ── */}
            {product.product_images.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((i) => (i + 1) % product.product_images.length);
                }}
                className="btn-icon absolute right-4 md:right-8 p-3 text-white/50 hover:text-white hover:bg-white/8 rounded-full z-10"
                aria-label="Next image"
              >
                <ChevronRight size={28} />
              </button>
            )}

            {/* ── Dot / thumbnail strip at bottom (multi-image only) ── */}
            {product.product_images.length > 1 && (
              <div
                className="absolute bottom-6 flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                {product.product_images.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setLightboxIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                    className={`rounded-full transition-all duration-200 ${lightboxIdx === idx
                      ? 'bg-white w-2 h-2'
                      : 'bg-white/30 hover:bg-white/60 w-1.5 h-1.5'
                      }`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
