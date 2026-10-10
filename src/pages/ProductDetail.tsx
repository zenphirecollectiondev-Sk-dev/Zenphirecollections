import { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, ChevronRight, ChevronLeft, AlertCircle, X, ZoomIn, Image, ArrowRight, Ruler } from 'lucide-react';
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
  const [heartAnim, setHeartAnim] = useState(false);
  const [isSizeModalOpen, setIsSizeModalOpen] = useState(false);
  const [sizeModalAction, setSizeModalAction] = useState<'add_to_bag' | 'buy_now'>('buy_now');
  const [modalSizeError, setModalSizeError] = useState(false);
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const cartItems = useCartStore((state) => state.items);

  const isInBag = useMemo(() => {
    if (!product) return false;
    return cartItems.some((item) => item.productId === product.id);
  }, [cartItems, product]);

  const productVariants = useMemo(() => {
    if (product?.product_variants && product.product_variants.length > 0) {
      return product.product_variants;
    }
    return [];
  }, [product]);

  useEffect(() => {
    if (productVariants.length > 0) setSelectedColor(productVariants[0].color);
  }, [productVariants]);

  // Lock body scroll when modal, size guide, or lightbox is open
  useEffect(() => {
    if (isLightboxOpen || isSizeGuideOpen || isSizeModalOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isLightboxOpen, isSizeGuideOpen, isSizeModalOpen]);

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

  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handlePrevImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!product?.product_images?.length) return;
    setActiveImageIdx((prev) => (prev - 1 + product.product_images.length) % product.product_images.length);
  }, [product]);

  const handleNextImage = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!product?.product_images?.length) return;
    setActiveImageIdx((prev) => (prev + 1) % product.product_images.length);
  }, [product]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || !product?.product_images || product.product_images.length <= 1) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNextImage();
      } else {
        handlePrevImage();
      }
    }
    setTouchStartX(null);
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
          Back to Shop
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

  const handleAddToCartClick = () => {
    if (isInBag || isAdded) {
      navigate('/cart');
      return;
    }
    if (isOutOfStock) return;
    if (productVariants.length === 0) {
      addItem({
        id: product.id,
        productId: product.id,
        variantId: '',
        name: product.name,
        size: '',
        color: selectedColor,
        price: product.base_price,
        image: product.product_images[0]?.url || '',
      });
      setIsAdded(true);
      return;
    }
    setSizeModalAction('add_to_bag');
    setModalSizeError(false);
    setIsSizeModalOpen(true);
  };

  const handleBuyNowClick = () => {
    if (isOutOfStock) return;
    if (productVariants.length === 0) {
      addItem({
        id: product.id,
        productId: product.id,
        variantId: '',
        name: product.name,
        size: '',
        color: selectedColor,
        price: product.base_price,
        image: product.product_images[0]?.url || '',
      });
      navigate('/checkout');
      return;
    }
    setSizeModalAction('buy_now');
    setModalSizeError(false);
    setIsSizeModalOpen(true);
  };

  const handleConfirmSizeModal = () => {
    if (!selectedSize) {
      setModalSizeError(true);
      return;
    }
    const variantToUse = selectedVariant || availableVariantsForColor.find((v: any) => v.size === selectedSize);
    if (variantToUse && variantToUse.stock_qty > 0) {
      addItem({
        id: `${product.id}-${variantToUse.id}`,
        productId: product.id,
        variantId: variantToUse.id,
        name: product.name,
        size: variantToUse.size,
        color: variantToUse.color,
        price: product.base_price,
        image: product.product_images[0]?.url || '',
      });
      setIsSizeModalOpen(false);
      if (sizeModalAction === 'buy_now') {
        navigate('/checkout');
      } else {
        setIsAdded(true);
      }
    }
  };

  const handleWishlistToggle = () => {
    toggleWishlist(product.id);
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 400);
  };

  return (
    <div className="bg-bg min-h-screen">

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-text-secondary/70">
          <Link to="/" className="hover:text-text-primary transition-colors">Home</Link>
          <span className="text-border">/</span>
          <Link to="/shop" className="hover:text-text-primary transition-colors">Shop</Link>
          <span className="text-border">/</span>
          <span className="text-text-primary font-medium truncate">{product.name}</span>
        </div>
      </nav>

      {/* ── MAIN PRODUCT SECTION (Properly scaled & aligned) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 pb-14 items-start">

        {/* LEFT: Image Gallery (Sticky on desktop, constrained max-height) */}
        <div className="lg:col-span-7 xl:col-span-7 lg:sticky lg:top-24 space-y-3.5">
          {/* Main image container with in-page navigation and touch swipe */}
          <div
            className="w-full aspect-[3/4] max-h-[75vh] bg-[#FBFBFB] border border-border/70 rounded-md overflow-hidden relative group flex items-center justify-center select-none shadow-xs"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {product.product_images[activeImageIdx]?.url ? (
              <img
                key={product.product_images[activeImageIdx]?.url || activeImageIdx}
                src={imgHero(product.product_images[activeImageIdx].url)}
                alt={product.name}
                fetchPriority="high"
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover object-top block transition-opacity duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-bg-subtle">
                <Image size={36} className="text-text-secondary/20" />
              </div>
            )}

            {/* In-page navigation arrows: effortlessly switch images without opening the gallery */}
            {product.product_images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevImage}
                  aria-label="Previous image"
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-text-primary border border-border/60 shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleNextImage}
                  aria-label="Next image"
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-text-primary border border-border/60 shadow-sm flex items-center justify-center transition-all opacity-80 hover:opacity-100 hover:scale-105 cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </>
            )}

            {/* Elevated Frosted Wishlist Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleWishlistToggle();
              }}
              aria-label="Toggle Wishlist"
              className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/85 hover:bg-white backdrop-blur-md border border-border/60 shadow-sm flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${
                heartAnim ? 'anim-heart-pop' : ''
              }`}
            >
              <Heart
                size={18}
                className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary hover:stroke-sale'}
              />
            </button>

            {/* Image counter indicator */}
            {product.product_images.length > 1 && (
              <div className="absolute bottom-4 left-4 z-10 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium tracking-wider px-2.5 py-1 rounded-full select-none pointer-events-none">
                {activeImageIdx + 1} / {product.product_images.length}
              </div>
            )}

            {/* Dedicated Zoom Hint / Lightbox Open Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox(activeImageIdx);
              }}
              aria-label="Open fullscreen gallery"
              className="absolute bottom-4 right-4 z-10 bg-white/85 hover:bg-white backdrop-blur-md border border-border/50 p-2 rounded-full text-text-secondary hover:text-text-primary transition-all shadow-xs cursor-pointer hover:scale-105"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Minimalist Thumbnails */}
          {product.product_images.length > 1 && (
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
              {product.product_images.map((img: any, idx: number) => (
                <button
                  key={img.id || img.url || idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 sm:w-20 aspect-[3/4] rounded-md overflow-hidden border transition-all duration-150 flex-shrink-0 cursor-pointer ${
                    activeImageIdx === idx
                      ? 'border-[#00221A] ring-1 ring-[#00221A] opacity-100'
                      : 'border-border/70 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgThumb(img.url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover object-top"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Product Information & Configuration */}
        <div className="lg:col-span-5 xl:col-span-5 flex flex-col space-y-6 pt-1">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#B8975A] font-bold">
              Zenphire
            </p>
            <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-heading font-medium tracking-tight text-text-primary leading-tight">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-text-primary tracking-tight pt-1">
              ₹{Number(product.base_price || 0).toFixed(2)}
            </p>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed border-b border-border/60 pb-5 font-normal">
            {product.description}
          </p>

          <div className="space-y-6">
            {/* Color swatches */}
            {availableColors.length > 1 && (
              <div className="space-y-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary block">
                  Color: <span className="text-text-primary font-normal">{selectedColor}</span>
                </span>
                <div className="flex gap-2">
                  {availableColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => { setSelectedColor(color); setSelectedSize(''); }}
                      className={`px-3.5 py-1.5 rounded-sm border text-[11px] font-medium tracking-wider transition-all ${
                        selectedColor === color
                          ? 'bg-[#00221A] border-[#00221A] text-white'
                          : 'border-border bg-white text-text-primary hover:border-text-primary'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Informative Available Sizes Badges (As requested: shows available sizes, selection occurs on Buy Now / Add to Bag click) */}
            {!variantsReady ? (
              <div className="space-y-3">
                <div className="h-3 w-24 bg-bg-subtle animate-pulse rounded" />
                <div className="flex gap-2">
                  {[44, 44, 44, 48].map((w, i) => (
                    <div key={i} className="h-9 bg-bg-subtle animate-pulse rounded border border-border/60" style={{ width: w }} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-text-primary">
                    Available Sizes
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(availableVariantsForColor.map((v: any) => v.size))).map((size) => {
                    const variant = availableVariantsForColor.find((v: any) => v.size === size);
                    const available = variant ? variant.stock_qty > 0 : false;
                    return (
                      <span
                        key={size}
                        className={`min-w-[42px] h-9 px-3 border text-xs font-medium rounded-sm flex items-center justify-center select-none ${
                          available
                            ? 'border-border/80 bg-white text-text-primary shadow-2xs'
                            : 'border-border/40 bg-bg-subtle text-text-secondary/40 line-through'
                        }`}
                      >
                        {size}
                      </span>
                    );
                  })}
                  {availableVariantsForColor.length === 0 && (
                    <p className="text-xs text-text-secondary font-medium py-1">No sizes currently listed.</p>
                  )}
                </div>
              </div>
            )}

            {/* Luxury High-End Action Buttons (Equal 50/50 proportioned pair with micro-animations) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              {/* Add to Bag / View Bag Button */}
              <button
                type="button"
                disabled={!isInBag && !isAdded && isOutOfStock && availableVariantsForColor.length > 0}
                onClick={handleAddToCartClick}
                className="w-full h-[52px] bg-[#00221A] hover:bg-[#063A2C] active:scale-[0.99] text-white text-xs font-semibold uppercase tracking-[0.16em] rounded-sm transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
              >
                <ShoppingBag size={16} className="transition-transform group-hover:scale-110" />
                <span>{isInBag || isAdded ? 'View Bag' : 'Add to Bag'}</span>
              </button>

              {/* Buy Now Button */}
              <button
                type="button"
                disabled={isOutOfStock && availableVariantsForColor.length > 0}
                onClick={handleBuyNowClick}
                className="w-full h-[52px] bg-white hover:bg-[#FAF8F5] active:scale-[0.99] text-[#00221A] border-2 border-[#00221A] hover:border-[#063A2C] text-xs font-semibold uppercase tracking-[0.16em] rounded-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-xs disabled:opacity-40 disabled:cursor-not-allowed group cursor-pointer"
              >
                <span>Buy Now</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>


          </div>
        </div>
      </section>

      {/* ── RECOMMENDATIONS ── */}
      {recommendations.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-border/60 mb-10">
          <h2 className="text-base font-heading font-medium uppercase tracking-wider text-text-primary mb-6 text-center">
            You May Also Like
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {recommendations.map((rec: any) => (
              <Link
                key={rec.id}
                to={`/product/${rec.slug}`}
                onClick={() => { setSelectedSize(''); setActiveImageIdx(0); }}
                className="group product-card block bg-[#FAFAFA] border border-border/60 overflow-hidden"
              >
                <div className="aspect-[3/4] w-full overflow-hidden relative">
                  {rec.product_images?.[0]?.url ? (
                    <img
                      src={imgCard(rec.product_images[0].url)}
                      alt={rec.name}
                      loading="lazy"
                      decoding="async"
                      className="card-img w-full h-full object-cover object-top block transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-subtle">
                      <Image size={24} className="text-text-secondary/20" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(rec.id); }}
                    aria-label="Toggle Wishlist"
                    className="wishlist-btn absolute top-2.5 right-2.5 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm border border-border/60 rounded-full z-10 shadow-xs"
                  >
                    <Heart size={14} className={isWishlisted(rec.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                  </button>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary/70 font-semibold">Zenphire</p>
                  <h3 className="text-xs font-medium text-text-primary group-hover:text-text-secondary transition-colors truncate">{rec.name}</h3>
                  <p className="text-xs font-medium text-text-primary">₹{Number(rec.base_price || 0).toFixed(2)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ANIMATED SIZE SELECTOR POP-UP MODAL (PORTALED DIRECTLY TO BODY) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSizeModalOpen && (
            <div className="fixed inset-0 z-[99998] flex items-end sm:items-center justify-center p-0 sm:p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
                onClick={() => setIsSizeModalOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />

              {/* Pop-up Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 20 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full sm:max-w-md bg-white border border-border/80 shadow-2xl z-10 flex flex-col rounded-t-2xl sm:rounded-xl overflow-hidden max-h-[90vh]"
              >
                {/* Header with mini-product preview */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/60 bg-[#FAFAFA]">
                  <div className="flex items-center gap-3 min-w-0">
                    {product.product_images?.[0]?.url && (
                      <div className="w-12 h-16 rounded-md overflow-hidden bg-bg-subtle flex-shrink-0 border border-border/60">
                        <img
                          src={imgThumb(product.product_images[0].url)}
                          alt={product.name}
                          className="w-full h-full object-cover object-top"
                        />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-[#B8975A] font-bold">
                        Zenphire
                      </p>
                      <h3 className="text-xs sm:text-sm font-heading font-medium text-text-primary truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs font-semibold text-text-primary mt-0.5">
                        ₹{Number(product.base_price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSizeModalOpen(false)}
                    aria-label="Close size selector"
                    className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-full transition-colors flex-shrink-0 ml-2"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
                  {/* Color selector if multiple colors exist */}
                  {availableColors.length > 1 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-semibold uppercase tracking-wider text-text-secondary">
                          Color: <span className="text-text-primary font-normal">{selectedColor}</span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {availableColors.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => { setSelectedColor(color); setSelectedSize(''); setModalSizeError(false); }}
                            className={`px-3 py-1 rounded-sm border text-[11px] font-medium transition-all ${
                              selectedColor === color
                                ? 'bg-[#00221A] border-[#00221A] text-white'
                                : 'border-border bg-white text-text-primary hover:border-text-primary'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Size selection */}
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                        <span>Select Size</span>
                        {selectedSize && (
                          <span className="text-[#00221A] font-bold">({selectedSize})</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsSizeGuideOpen(true)}
                        className="text-[11px] text-text-secondary hover:text-text-primary flex items-center gap-1 underline underline-offset-4 transition-colors"
                      >
                        <Ruler size={12} />
                        <span>Size Guide</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {Array.from(new Set(availableVariantsForColor.map((v: any) => v.size))).map((size) => {
                        const variant = availableVariantsForColor.find((v: any) => v.size === size);
                        const isAvailable = variant ? variant.stock_qty > 0 : false;
                        const isSelected = selectedSize === size;
                        const isLowStock = isAvailable && variant.stock_qty <= 3;

                        return (
                          <button
                            key={size}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => {
                              setSelectedSize(size);
                              setModalSizeError(false);
                            }}
                            className={`relative h-12 rounded-sm border text-xs font-semibold uppercase tracking-wider flex flex-col items-center justify-center transition-all ${
                              !isAvailable
                                ? 'border-border/40 bg-bg-subtle text-text-secondary/40 line-through cursor-not-allowed'
                                : isSelected
                                ? 'border-[#00221A] bg-[#00221A] text-white ring-2 ring-[#00221A]/30 shadow-xs'
                                : 'border-border/80 bg-white text-text-primary hover:border-[#00221A] hover:shadow-2xs'
                            }`}
                          >
                            <span>{size}</span>
                            {isLowStock && (
                              <span className={`text-[8px] font-normal leading-none mt-0.5 tracking-tight ${
                                isSelected ? 'text-emerald-200' : 'text-amber-700'
                              }`}>
                                {variant.stock_qty} left
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {modalSizeError && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 border border-rose-200/60 px-3 py-2 rounded-sm"
                      >
                        <AlertCircle size={14} className="flex-shrink-0" />
                        <span>Please choose a size to proceed.</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-4 sm:p-5 border-t border-border/60 bg-[#FAFAFA] space-y-2">
                  <button
                    type="button"
                    onClick={handleConfirmSizeModal}
                    className="w-full h-12 bg-[#00221A] hover:bg-[#063A2C] active:scale-[0.99] text-white text-xs font-semibold uppercase tracking-[0.16em] rounded-sm transition-all duration-150 flex items-center justify-center gap-2.5 shadow-sm cursor-pointer"
                  >
                    {sizeModalAction === 'buy_now' ? (
                      <>
                        <span>Proceed to Checkout</span>
                        <ArrowRight size={15} />
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={15} />
                        <span>Confirm & Add to Bag</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── SIZE GUIDE MODAL (PORTALED DIRECTLY TO BODY) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSizeGuideOpen && (
            <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DUR.base, ease: EASE }}
                onClick={() => setIsSizeGuideOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.98, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 8 }}
                transition={{ duration: DUR.base, ease: EASE_ENTER }}
                className="relative w-full max-w-lg bg-white border border-border/80 p-6 shadow-2xl z-10 flex flex-col max-h-[88vh] rounded-md"
              >
                <div className="flex justify-between items-center border-b border-border/60 pb-4 mb-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-text-secondary font-semibold">Reference Guide</p>
                    <h3 className="text-sm font-heading font-medium uppercase mt-0.5">Size Measurements</h3>
                  </div>
                  <button
                    onClick={() => setIsSizeGuideOpen(false)}
                    aria-label="Close size guide"
                    className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-subtle rounded-full transition-colors"
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
                      <div className="text-xs font-semibold uppercase tracking-wider text-text-primary border-b border-border/50 pb-1.5">
                        {parsedSizeGuide.title}
                      </div>
                      <div className="border border-border/70 bg-bg-subtle p-2 flex justify-center items-center rounded overflow-hidden">
                        <img
                          src={parsedSizeGuide.url}
                          alt={parsedSizeGuide.title}
                          className="max-w-full max-h-[60vh] object-contain rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="prose prose-sm max-w-none text-xs"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(parsedSizeGuide.content, {
                          ALLOWED_TAGS: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'span', 'div'],
                          ALLOWED_ATTR: ['class', 'style']
                        })
                      }}
                    />
                  )}
                </div>
                <div className="border-t border-border/60 pt-4 mt-4 flex justify-end">
                  <button
                    onClick={() => setIsSizeGuideOpen(false)}
                    className="px-5 py-2 rounded-sm bg-[#00221A] text-white text-[10px] font-semibold uppercase tracking-widest hover:bg-[#063A2C] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── FULLSCREEN IMAGE LIGHTBOX (PORTALED DIRECTLY TO BODY - ZERO SCROLL DEFECT) ── */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: DUR.base, ease: EASE }}
              className="fixed inset-0 z-[99999] w-screen h-screen flex items-center justify-center bg-black/95 backdrop-blur-md select-none overflow-hidden"
              onClick={() => setIsLightboxOpen(false)}
            >
              {/* Top bar: Counter & Close */}
              <div
                className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-5 z-20"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[11px] text-white/50 uppercase tracking-[0.2em] font-medium">
                  {product.product_images.length > 1 ? `${lightboxIdx + 1} / ${product.product_images.length}` : ''}
                </span>
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Close fullscreen view"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Previous Arrow */}
              {product.product_images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((i) => (i - 1 + product.product_images.length) % product.product_images.length);
                  }}
                  className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20"
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}

              {/* Centered Image (Always visible in viewport without scrolling) */}
              <div
                className="relative max-w-[90vw] max-h-[85vh] flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {product.product_images[lightboxIdx]?.url ? (
                  <motion.img
                    key={lightboxIdx}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: DUR.base, ease: EASE_ENTER }}
                    src={imgHero(product.product_images[lightboxIdx].url)}
                    alt={`${product.name} — view ${lightboxIdx + 1}`}
                    className="max-h-[85vh] max-w-[90vw] md:max-w-[70vw] object-contain select-none shadow-2xl"
                    draggable={false}
                  />
                ) : (
                  <div className="w-48 h-64 flex items-center justify-center">
                    <Image size={40} className="text-white/20" />
                  </div>
                )}
              </div>

              {/* Next Arrow */}
              {product.product_images.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLightboxIdx((i) => (i + 1) % product.product_images.length);
                  }}
                  className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors z-20"
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Bottom Thumbnail Strip */}
              {product.product_images.length > 1 && (
                <div
                  className="absolute bottom-6 flex items-center gap-2 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  {product.product_images.map((img: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setLightboxIdx(idx)}
                      className={`w-9 h-12 rounded overflow-hidden border transition-all ${
                        lightboxIdx === idx ? 'border-white opacity-100 scale-105' : 'border-white/30 opacity-50 hover:opacity-80'
                      }`}
                    >
                      <img src={imgThumb(img.url)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
