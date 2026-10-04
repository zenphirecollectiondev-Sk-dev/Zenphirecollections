import { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ChevronRight, ChevronLeft, Check, AlertCircle, X, ZoomIn, Image, Zap } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useWishlistStore } from '../store/useWishlistStore';
import { getProductDetails, supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { DUR, EASE, EASE_ENTER } from '../lib/motion';
import { dataCache } from '../lib/dataCache';
import { imgHero, imgCard, imgThumb } from '../lib/imgTransform';
import DOMPurify from 'dompurify';
import { usePageSEO } from '../hooks/usePageSEO';

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
  // variantsReady: false until we've confirmed the product has its real variant rows
  const [variantsReady, setVariantsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      if (!id) return;

      // ── Cache hit: render instantly (pre-populated by Home/Shop listing fetch) ──
      const cached = dataCache.get<any>(`product:${id}`);
      if (cached) {
        if (!cancelled) {
          setDbProduct(cached);
          setLoading(false);
          // If cache has real variants (from a previous getProductDetails call), mark ready immediately
          if (cached.product_variants && cached.product_variants.length > 0) {
            setVariantsReady(true);
          }
        }
        // Fire size guide + recommendations in parallel in the background.
        // Both are non-blocking — product is already visible.
        const [sizeGuideRes, recsRes] = await Promise.allSettled([
          cached.category_id
            ? supabase
              .from('categories')
              .select('size_guide_html')
              .eq('id', cached.category_id)
              .maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from('products')
            .select('id, name, slug, base_price, product_images(url, sort_order)')
            .eq('is_active', true)
            .neq('id', cached.id)
            .eq('category_id', cached.category_id ?? '')
            .limit(4),
        ]);
        if (cancelled) return;
        if (sizeGuideRes.status === 'fulfilled') {
          const catData = (sizeGuideRes.value as any)?.data;
          if (catData) setCategorySizeGuide(catData.size_guide_html);
        }
        if (recsRes.status === 'fulfilled') {
          setRecommendations((recsRes.value as any)?.data || []);
        }
        // Skip network product re-fetch only if the cache is fresh AND already has variants.
        // If variants are missing (cache was populated by a listing fetch), we must still
        // fetch full product details so the size selector can render.
        const hasVariants = cached.product_variants && cached.product_variants.length > 0;
        if (!dataCache.isStale(`product:${id}`) && hasVariants) return;
      }

      // ── Fetch (first direct URL access or stale revalidation) ──
      if (!cached && !cancelled) setLoading(true);
      try {
        const data = await getProductDetails(id, true);
        if (cancelled) return;
        if (data) {
          dataCache.set(`product:${id}`, data);
          setDbProduct(data);
          if (!cancelled) setVariantsReady(true);


          // Fire size guide + recommendations in parallel now that we have the product
          const [sizeGuideRes, recsRes] = await Promise.allSettled([
            data.category_id
              ? supabase
                .from('categories')
                .select('size_guide_html')
                .eq('id', data.category_id)
                .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from('products')
              .select('id, name, slug, base_price, product_images(url, sort_order)')
              .eq('is_active', true)
              .neq('id', data.id)
              .eq('category_id', data.category_id ?? '')
              .limit(4),
          ]);
          if (cancelled) return;
          if (sizeGuideRes.status === 'fulfilled') {
            const catData = (sizeGuideRes.value as any)?.data;
            if (catData) setCategorySizeGuide(catData.size_guide_html);
          }
          if (recsRes.status === 'fulfilled') {
            setRecommendations((recsRes.value as any)?.data || []);
          }
        } else {
          if (!cancelled) setDbProduct(null);
        }
      } catch (err) {
        console.warn('ProductDetail load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProduct();
    return () => { cancelled = true; setVariantsReady(false); };
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

  const parsedSizeGuide = useMemo(() => {
    let raw = product?.custom_size_guide_html || categorySizeGuide || '';

    if (raw.startsWith('SIZE_GUIDE_IMG::')) {
      const parts = raw.split('::');
      return {
        type: 'image' as const,
        url: parts[1] || '',
        title: parts[2] || 'Size Measurement Chart'
      };
    }

    if (raw.startsWith('http') || raw.startsWith('data:image')) {
      return {
        type: 'image' as const,
        url: raw,
        title: 'Size Measurement Chart'
      };
    }

    if (raw.trim() && !raw.includes('<table')) {
      return { type: 'html' as const, content: raw };
    }

    // Standard template image chart for products without custom upload
    return {
      type: 'image' as const,
      url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=1000&auto=format&fit=crop',
      title: 'Zenphire Standard Size & Measurement Guide'
    };
  }, [product, categorySizeGuide]);

  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [activeImageIdx, setActiveImageIdx] = useState<number>(0);
  const [isAdded, setIsAdded] = useState(false);
  const [_viewBag, setViewBag] = useState(false);
  const [heartAnim, setHeartAnim] = useState(false);
  const [_sizeError, setSizeError] = useState(false);
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'buy_now' | 'add_to_bag'>('buy_now');
  const [modalSizeError, setModalSizeError] = useState(false);
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);

  const productVariants = useMemo(() => {
    if (product?.product_variants && product.product_variants.length > 0) {
      return product.product_variants;
    }
    // No variants in DB — return empty array so no sizes are shown
    return [];
  }, [product]);

  useEffect(() => {
    if (productVariants.length > 0) setSelectedColor(productVariants[0].color);
  }, [productVariants]);

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

  // Dynamic SEO & Structured Data
  usePageSEO({
    title: product ? product.name : 'Product Details',
    description: product ? product.description : 'Explore luxury clothing and essentials on Zenphire.',
    image: product?.product_images?.[0]?.url || undefined,
    jsonLd: product ? {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: product.name,
      image: product.product_images?.map((img: any) => img.url) || [],
      description: product.description,
      brand: {
        '@type': 'Brand',
        name: 'Zenphire'
      },
      offers: {
        '@type': 'Offer',
        priceCurrency: 'INR',
        price: product.base_price,
        availability: productVariants.some((v: any) => v.stock_qty > 0)
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock'
      }
    } : undefined
  });

  if (loading && !product) {
    return (
      <div className="bg-bg min-h-screen overflow-x-hidden">
        {/* Breadcrumb skeleton */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
          <div className="flex items-center gap-2">
            {[40, 8, 40, 8, 120].map((w, i) => (
              <div key={i} className={`h-2.5 bg-bg-subtle animate-pulse rounded`} style={{ width: w }} />
            ))}
          </div>
        </div>
        {/* Main 2-column skeleton — matches exact layout of the real page */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 pb-16">
          {/* Left: image + thumbnails */}
          <div className="space-y-3">
            <div className="w-full aspect-[3/4] bg-bg-subtle border border-border animate-pulse" />
            <div className="flex gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-[68px] aspect-[2/3] bg-bg-subtle border border-border animate-pulse flex-shrink-0" />
              ))}
            </div>
          </div>
          {/* Right: product info */}
          <div className="space-y-5 pt-2">
            <div className="space-y-3">
              <div className="h-2.5 w-16 bg-bg-subtle animate-pulse rounded" />
              <div className="h-9 w-4/5 bg-bg-subtle animate-pulse rounded" />
              <div className="h-6 w-28 bg-bg-subtle animate-pulse rounded" />
            </div>
            <div className="space-y-2 border-b border-border pb-5">
              <div className="h-3 w-full bg-bg-subtle animate-pulse rounded" />
              <div className="h-3 w-full bg-bg-subtle animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-bg-subtle animate-pulse rounded" />
            </div>
            <div className="space-y-3">
              <div className="h-2.5 w-20 bg-bg-subtle animate-pulse rounded" />
              <div className="flex gap-2">
                {['S', 'M', 'L', 'XL'].map((s) => (
                  <div key={s} className="w-12 h-12 bg-bg-subtle border border-border animate-pulse" />
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <div className="flex-1 h-14 bg-bg-subtle animate-pulse" />
              <div className="w-14 h-14 bg-bg-subtle border border-border animate-pulse" />
            </div>
          </div>
        </section>
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

  const availableVariantsForColor: any[] = productVariants.filter((v: any) => v.color === selectedColor);
  const availableColors: string[] = Array.from(new Set(productVariants.map((v: any) => v.color))) as string[];
  const selectedVariant = productVariants.find((v: any) => v.color === selectedColor && v.size === selectedSize);
  const isOutOfStock = selectedSize
    ? selectedVariant?.stock_qty === 0
    : availableVariantsForColor.every((v: any) => v.stock_qty === 0);

  const handleAddToCart = () => {
    if (!selectedSize) {
      setSizeError(true);
      setTimeout(() => setSizeError(false), 2000);
      return;
    }
    if (isOutOfStock || (selectedVariant && selectedVariant.stock_qty <= 0)) {
      return;
    }
    setSizeError(false);
    if (selectedVariant) {
      addItem({
        id: `${product.id}-${selectedVariant.id}`,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: product.base_price,
        image: product.product_images[0]?.url || '',
      });
      setIsAdded(true);
      setViewBag(false);
      setTimeout(() => { setIsAdded(false); setViewBag(true); }, 1500);
    }
  };

  const handleBuyNowClick = () => {
    if (isOutOfStock) return;
    if (selectedSize && selectedVariant && selectedVariant.stock_qty > 0) {
      addItem({
        id: `${product.id}-${selectedVariant.id}`,
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        size: selectedVariant.size,
        color: selectedVariant.color,
        price: product.base_price,
        image: product.product_images[0]?.url || '',
      });
      navigate('/checkout');
    } else {
      setModalAction('buy_now');
      setModalSizeError(false);
      setIsBuyModalOpen(true);
    }
  };

  const handleAddToCartClick = () => {
    if (isOutOfStock) return;
    if (selectedSize && selectedVariant) {
      handleAddToCart();
    } else {
      setModalAction('add_to_bag');
      setModalSizeError(false);
      setIsBuyModalOpen(true);
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  };

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden anim-fade-up">

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
            className="w-full max-h-[60vh] sm:max-h-[70vh] md:max-h-none bg-bg-subtle border border-border overflow-hidden relative group cursor-zoom-in flex items-center justify-center"
            onClick={() => openLightbox(activeImageIdx)}
            role="button"
            aria-label="Enlarge image"
          >
            {product.product_images[activeImageIdx]?.url ? (
              <img
                src={imgHero(product.product_images[activeImageIdx].url)}
                alt={product.name}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full max-h-[60vh] sm:max-h-[70vh] md:max-h-none object-cover object-top block relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.03]"
              />
            ) : (
              <div className="aspect-[3/4] w-full flex items-center justify-center bg-bg-subtle">
                <Image size={36} className="text-text-secondary/20" />
              </div>
            )}
            {/* Top-Left Wishlist Heart Floating Badge */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWishlistToggle();
              }}
              aria-label="Toggle Wishlist"
              className={`wishlist-btn absolute top-4 left-4 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-md border border-border/80 shadow-md flex items-center justify-center ${heartAnim ? 'anim-heart-pop' : ''
                }`}
            >
              <Heart
                size={19}
                className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary hover:stroke-sale'}
              />
            </button>

            {/* Zoom hint */}
            <div className="absolute bottom-3 right-3 bg-white/80 border border-border/60 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]">
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
                  <img src={imgThumb(img.url)} alt="thumbnail" loading="lazy" decoding="async" className="w-full h-full object-cover object-center" />
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

            {/* Available Sizes Badges (Informative Stock Display) */}
            {!variantsReady ? (
              /* Skeleton while real variants are loading from DB */
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="h-2.5 w-24 bg-bg-subtle animate-pulse rounded" />
                  <div className="h-2.5 w-16 bg-bg-subtle animate-pulse rounded" />
                </div>
                <div className="flex gap-2">
                  {[44, 44, 44, 48].map((w, i) => (
                    <div key={i} className="h-10 bg-bg-subtle animate-pulse rounded border border-border" style={{ width: w }} />
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <div className="flex-1 h-[50px] bg-bg-subtle animate-pulse rounded" />
                  <div className="w-36 h-[50px] bg-bg-subtle animate-pulse rounded border border-border" />
                </div>
              </div>
            ) : (
              <>
                {/* Available Sizes Badges */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-primary">Available Sizes</h3>
                    <button onClick={() => setIsSizeGuideOpen(true)} className="btn text-[10px] text-text-secondary underline underline-offset-4 hover:text-text-primary">
                      Size Guide
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Derive sizes from actual variants in DB — non-clickable stock pills */}
                    {Array.from(new Set(availableVariantsForColor.map((v: any) => v.size))).map((size) => {
                      const variant = availableVariantsForColor.find((v: any) => v.size === size);
                      const available = variant ? variant.stock_qty > 0 : false;
                      return (
                        <div
                          key={size}
                          className={`min-w-[48px] h-10 px-3.5 border text-xs font-bold flex items-center justify-center rounded select-none transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${!available
                              ? 'opacity-40 bg-bg-subtle text-text-secondary line-through border-border cursor-not-allowed'
                              : selectedSize === size
                                ? 'ambient-green-gradient text-white border-transparent'
                                : 'bg-white border-border text-text-primary cursor-default'
                            }`}
                        >
                          {size}
                          {available && variant?.stock_qty <= 4 && (
                            <span className={`ml-1 text-[9px] font-bold ${selectedSize === size ? 'text-emerald-100' : 'text-sale'}`}>({variant.stock_qty} left)</span>
                          )}
                        </div>
                      );
                    })}
                    {availableVariantsForColor.length === 0 && (
                      <p className="text-xs text-text-secondary font-medium py-1">No sizes available for this product yet.</p>
                    )}
                  </div>
                </div>

                {/* Selected size feedback if chosen */}
                {selectedSize && (
                  <div className="text-[11px] flex items-center gap-1.5 anim-fade-in">
                    {isOutOfStock ? (
                      <span className="text-sale font-bold flex items-center gap-1.5"><AlertCircle size={13} /> Sold out in this size</span>
                    ) : selectedVariant?.stock_qty <= 4 ? (
                      <span className="text-sale font-bold flex items-center gap-1.5"><AlertCircle size={13} /> Selected Size: {selectedSize} &middot; Only {selectedVariant.stock_qty} left</span>
                    ) : (
                      <span className="text-accent-gold font-semibold flex items-center gap-1.5"><Check size={13} /> Selected Size: {selectedSize} &middot; In Stock</span>
                    )}
                  </div>
                )}

                {/* Main CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    disabled={isOutOfStock && availableVariantsForColor.length > 0}
                    onClick={handleBuyNowClick}
                    className={`btn btn-primary flex-1 min-h-[50px] py-4 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-md ${isOutOfStock && availableVariantsForColor.length > 0 ? '!bg-border !text-text-secondary cursor-not-allowed opacity-50' : ''
                      }`}
                  >
                    <Zap size={16} className="fill-current" />
                    {isOutOfStock && availableVariantsForColor.length > 0 ? 'Sold Out' : 'Buy Now'}
                  </button>

                  <button
                    disabled={isOutOfStock && availableVariantsForColor.length > 0}
                    onClick={handleAddToCartClick}
                    className="btn border border-border bg-white text-text-primary hover:border-accent min-h-[50px] py-4 px-6 font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 flex-1 sm:flex-none"
                  >
                    <ShoppingBag size={16} />
                    {isAdded ? 'Added ✓' : 'Add to Bag'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── RECOMMENDATIONS ── */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-border mb-10">
          <h2 className="text-lg font-heading font-black uppercase tracking-widest text-text-primary mb-8 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 md:gap-6 anim-stagger">
            {recommendations.map((rec: any) => (
              <Link
                key={rec.id}
                to={`/product/${rec.slug}`}
                onClick={() => { setSelectedSize(''); setActiveImageIdx(0); }}
                className="group product-card block bg-bg-subtle border border-border overflow-hidden"
              >
                <div className="aspect-[3/4] w-full bg-bg-subtle overflow-hidden relative">
                  {rec.product_images?.[0]?.url ? (
                    <img
                      src={imgCard(rec.product_images[0].url)}
                      alt={rec.name}
                      loading="lazy"
                      decoding="async"
                      className="card-img w-full h-full object-cover object-top block relative z-10"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-subtle">
                      <Image size={24} className="text-text-secondary/20" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(rec.id); }}
                    aria-label="Toggle Wishlist"
                    className="wishlist-btn absolute top-2.5 right-2.5 min-w-[36px] min-h-[36px] flex items-center justify-center p-2 bg-white/90 border border-border/60 rounded-full z-10 shadow-xs"
                  >
                    <Heart size={14} className={isWishlisted(rec.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                  </button>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                  <h3 className="text-xs font-medium text-text-primary group-hover:text-accent-gold transition-colors duration-150 truncate">{rec.name}</h3>
                  <p className="text-xs font-semibold text-text-primary">₹{Number(rec.base_price || 0).toFixed(2)}</p>
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
              transition={{ duration: DUR.base, ease: EASE }}
              onClick={() => setIsSizeGuideOpen(false)}
              className="fixed inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: DUR.base, ease: EASE_ENTER }}
              className="relative w-full max-w-lg bg-white border border-border p-6 shadow-xl z-10 flex flex-col max-h-[88vh]"
            >
              <div className="flex justify-between items-center border-b border-border pb-4 mb-5">
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Reference Guide</p>
                  <h3 className="text-sm font-heading font-black uppercase mt-0.5">Size Measurements</h3>
                </div>
                <button
                  onClick={() => setIsSizeGuideOpen(false)}
                  aria-label="Close size guide"
                  className="btn-icon min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto">
                <p className="text-[11px] text-text-secondary mb-3 leading-relaxed">
                  All dimensions are in inches. Measure over a light base layer for best accuracy.
                </p>
                {parsedSizeGuide.type === 'image' ? (
                  <div className="space-y-2.5">
                    <div className="text-xs font-bold uppercase tracking-wider text-accent border-b border-border/60 pb-1.5">
                      {parsedSizeGuide.title}
                    </div>
                    <div className="border border-border bg-bg-subtle p-2 flex justify-center items-center rounded overflow-hidden">
                      <img
                        src={parsedSizeGuide.url}
                        alt={parsedSizeGuide.title}
                        className="max-w-full max-h-[60vh] object-contain rounded"
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(parsedSizeGuide.content, {
                        ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'span', 'div'],
                        ALLOWED_ATTR: ['class', 'style']
                      })
                    }}
                  />
                )}
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
            transition={{ duration: DUR.base, ease: EASE }}
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
                className="btn-icon min-w-[44px] min-h-[44px] flex items-center justify-center p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
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
            {product.product_images[lightboxIdx]?.url ? (
              <motion.img
                key={lightboxIdx}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: DUR.base, ease: EASE_ENTER }}
                src={imgHero(product.product_images[lightboxIdx].url)}
                alt={`${product.name} — view ${lightboxIdx + 1}`}
                className="max-h-[88vh] max-w-[85vw] md:max-w-[55vw] object-contain select-none"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            ) : (
              <div className="w-48 h-64 flex items-center justify-center">
                <Image size={40} className="text-white/20" />
              </div>
            )}

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
                    className={`rounded-full transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${lightboxIdx === idx
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

      {/* ── SIZE SELECTION POPUP UI MODAL ── */}
      <AnimatePresence>
        {isBuyModalOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              onClick={() => setIsBuyModalOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: DUR.base, ease: EASE_ENTER }}
              className="relative w-full max-w-md bg-white border border-border shadow-2xl p-6 sm:p-7 rounded-xl space-y-6 z-10 text-left overflow-hidden"
            >
              {/* Top Header */}
              <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                  <h3 className="text-sm font-heading font-black uppercase tracking-wider text-text-primary">
                    Select Your Size
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {modalAction === 'buy_now' ? 'Choose size to proceed directly to checkout' : 'Choose size to add to your bag'}
                  </p>
                </div>
                <button
                  onClick={() => setIsBuyModalOpen(false)}
                  className="p-2 rounded-full hover:bg-bg-subtle text-text-secondary hover:text-text-primary transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Product Info Summary */}
              <div className="flex gap-3.5 bg-bg-subtle p-3.5 rounded-lg border border-border/70 items-center">
                <img
                  src={imgThumb(product.product_images?.[0]?.url || '')}
                  alt={product.name}
                  className="w-14 h-16 object-cover object-top rounded border border-border bg-white flex-shrink-0"
                />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="text-xs font-bold uppercase truncate text-text-primary">{product.name}</h4>
                  <p className="text-xs font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  {selectedColor && (
                    <span className="text-[10px] uppercase tracking-wider text-text-secondary font-medium block">
                      Color: {selectedColor}
                    </span>
                  )}
                </div>
              </div>

              {/* Interactive Size Grid */}
              <div className="space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-primary">Sizes Available</span>
                  <button
                    onClick={() => {
                      setIsBuyModalOpen(false);
                      setIsSizeGuideOpen(true);
                    }}
                    className="text-[11px] text-text-secondary underline hover:text-text-primary transition-colors duration-150"
                  >
                    Size Measurement Guide
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2.5 pt-1">
                  {Array.from(new Set(availableVariantsForColor.map((v: any) => v.size))).map((size) => {
                    const variant = availableVariantsForColor.find((v: any) => v.size === size);
                    const available = variant ? variant.stock_qty > 0 : false;
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        disabled={!available}
                        onClick={() => {
                          if (!available) return;
                          setSelectedSize(size as string);
                          setModalSizeError(false);
                        }}
                        className={`h-12 border text-xs font-bold rounded-lg flex flex-col items-center justify-center transition-all duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] ${!available
                            ? 'opacity-30 bg-bg-subtle text-text-secondary line-through border-border cursor-not-allowed'
                            : isSelected
                              ? 'ambient-green-gradient text-white border-transparent ring-2 ring-emerald-500/50 shadow-md scale-[1.02]'
                              : 'bg-white border-border text-text-primary hover:border-accent hover:bg-bg-subtle'
                          }`}
                      >
                        <span>{size}</span>
                        {available && variant?.stock_qty <= 4 && (
                          <span className={`text-[8px] font-medium ${isSelected ? 'text-emerald-100' : 'text-sale'}`}>
                            {variant.stock_qty} left
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {modalSizeError && (
                  <p className="text-xs font-bold text-sale flex items-center gap-1.5 pt-1 anim-fade-in">
                    <AlertCircle size={13} /> Please select a size to continue.
                  </p>
                )}
              </div>

              {/* Action Button inside Modal */}
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (!selectedSize) {
                      setModalSizeError(true);
                      return;
                    }
                    const variant = availableVariantsForColor.find((v: any) => v.size === selectedSize);
                    if (variant) {
                      addItem({
                        id: `${product.id}-${variant.id}`,
                        productId: product.id,
                        variantId: variant.id,
                        name: product.name,
                        size: variant.size,
                        color: variant.color,
                        price: product.base_price,
                        image: product.product_images?.[0]?.url || '',
                      });
                      setIsBuyModalOpen(false);
                      if (modalAction === 'buy_now') {
                        navigate('/checkout');
                      } else {
                        setIsAdded(true);
                        setViewBag(true);
                      }
                    }
                  }}
                  className="btn btn-primary w-full py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg"
                >
                  {modalAction === 'buy_now' ? (
                    <>
                      <Zap size={16} className="fill-current" /> Proceed to Checkout
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={16} /> Confirm & Add to Bag
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
