import { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowRight, Heart, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroBanner from '../assets/hero_banner.png';
import { useWishlistStore } from '../store/useWishlistStore';
import { getActiveProducts, getCategories, supabase } from '../lib/supabase';

import linenShirt from '../assets/product_linen_shirt.png';
import minimalJacket from '../assets/product_minimal_jacket.png';
import categoryFemale from '../assets/category_female_fashion.png';
import productPants from '../assets/product_pants.png';
import productCoords from '../assets/product_coords.png';
import productTshirt from '../assets/product_tshirt.png';

// Image pool cycled per category index
const CATEGORY_IMAGES = [linenShirt, productPants, productTshirt, productCoords];

export default function Home() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [heartId, setHeartId] = useState<string | null>(null);
  const [homepageConfig, setHomepageConfig] = useState<any | null>(null);

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Reorder categories as requested: Shirts -> Pants -> T-shirts -> Co-ords / Accessories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const getIndex = (name: string) => {
        if (name.includes('shirt') && !name.includes('t-shirt') && !name.includes('tshirt')) return 0;
        if (name.includes('pant') || name.includes('trouser') || name.includes('women')) return 1;
        if (name.includes('t-shirt') || name.includes('tshirt') || name.includes('t shirt') || name.includes('coord') || name.includes('co-ord') || name.includes('co ord')) return 2;
        if (name.includes('accessories') || name.includes('bag') || name.includes('cap') || name.includes('hat')) return 3;
        return 99;
      };

      return getIndex(aName) - getIndex(bName);
    });
  }, [categories]);

  const handleCategoryScroll = () => {
    if (categoryScrollRef.current) {
      const container = categoryScrollRef.current;
      const children = container.children;
      const containerCenter = container.scrollLeft + container.clientWidth / 2;

      let closestIndex = 0;
      let minDistance = Infinity;

      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement;
        if (child.classList.contains('category-card')) {
          const childCenter = child.offsetLeft + child.clientWidth / 2;
          const distance = Math.abs(containerCenter - childCenter);
          if (distance < minDistance) {
            minDistance = distance;
            closestIndex = i;
          }
        }
      }
      setActiveCategoryIndex(closestIndex);
    }
  };

  const bestSellersScrollRef = useRef<HTMLDivElement>(null);

  const scrollBestSellers = (direction: 'left' | 'right') => {
    if (bestSellersScrollRef.current) {
      const { scrollLeft, clientWidth } = bestSellersScrollRef.current;
      const offset = direction === 'left' ? -clientWidth * 0.6 : clientWidth * 0.6;
      bestSellersScrollRef.current.scrollTo({ left: scrollLeft + offset, behavior: 'smooth' });
    }
  };

  const genderCollections = useMemo(() => {
    return [
      { id: 'men', name: 'Men', image: homepageConfig?.men_collection_image_url || linenShirt, link: '/shop?gender=male' },
      { id: 'women', name: 'Women', image: homepageConfig?.women_collection_image_url || categoryFemale, link: '/shop?gender=female' },
      { id: 'unisex', name: 'Unisex', image: homepageConfig?.unisex_collection_image_url || minimalJacket, link: '/shop?gender=unisex' },
    ];
  }, [homepageConfig]);

  useEffect(() => {
    async function load() {
      try {
        const [prodData, catData] = await Promise.all([getActiveProducts(), getCategories()]);
        setProducts(prodData || []);
        setCategories((catData || []).filter((c: any) => !c.parent_category_id));

        // Fetch homepage config gracefully
        try {
          const { data, error } = await supabase
            .from('homepage_config' as any)
            .select('*')
            .eq('id', 'global')
            .maybeSingle();
          if (!error && data) {
            setHomepageConfig(data);
          }
        } catch (dbErr) {
          console.warn('homepage_config table loading failed. Using fallback catalog query defaults.', dbErr);
        }
      } catch (err) {
        console.warn('Home load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleWishlist = (id: string) => {
    toggleWishlist(id);
    setHeartId(id);
    setTimeout(() => setHeartId(null), 400);
  };

  const newArrivals = useMemo(() => {
    if (homepageConfig?.new_arrivals_ids && homepageConfig.new_arrivals_ids.length > 0) {
      return homepageConfig.new_arrivals_ids
        .map((id: string) => products.find(p => p.id === id))
        .filter(Boolean);
    }
    return [...products]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 4);
  }, [products, homepageConfig]);

  const bestSellers = useMemo(() => {
    if (homepageConfig?.best_sellers_ids && homepageConfig.best_sellers_ids.length > 0) {
      return homepageConfig.best_sellers_ids
        .map((id: string) => products.find(p => p.id === id))
        .filter(Boolean);
    }
    return products.slice(0, 4);
  }, [products, homepageConfig]);

  const editorialImage = useMemo(() =>
    homepageConfig?.the_edit_image_url || products[0]?.product_images[0]?.url || linenShirt,
    [products, homepageConfig]
  );

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 size={28} className="animate-spin text-text-secondary mb-3" />
        <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold anim-fade-in">
          Loading Collections
        </p>
      </div>
    );
  }

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">

      {/* ── 1. HERO (EDITORIAL OVERLAY ON MOBILE / SPLIT ON DESKTOP) ── */}
      <section className="relative bg-[#F4F4F4] h-[75vh] md:h-[80vh] flex flex-col md:flex-row items-stretch overflow-hidden border-b border-border">

        {/* Left Content Column
            Mobile: Absolute overlay aligned to the bottom (last 25-30%)
            Desktop: Side-by-side flex column
        */}
        <div className="absolute inset-0 md:relative md:w-1/2 flex flex-col justify-end md:justify-center px-6 pb-12 pt-16 md:px-16 lg:px-24 bg-transparent md:bg-[#F4F4F4] z-20">
          <div className="max-w-md space-y-4 md:space-y-8 hero-content text-left">

            <h1 className="text-3xl md:text-6xl lg:text-7xl font-sans uppercase font-extralight tracking-tight leading-[1.05] text-white md:text-text-primary">
              Raw <span className="font-semibold block font-heading tracking-wide text-white md:text-text-primary">Textures</span>
              Minimal <span className="italic block font-serif tracking-normal text-white/90 md:text-text-secondary">Form</span>
            </h1>

            <p className="hidden sm:block text-xs md:text-sm text-white/80 md:text-text-secondary leading-relaxed max-w-sm font-sans tracking-wide">
              Organic fabrics, artisan weaves, and relaxed silhouettes designed to stand the test of time. Embodying the true essence of modern simplicity.
            </p>

            <div className="pt-2 md:pt-4">
              <Link
                to="/shop"
                className="btn ambient-green-gradient text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all duration-300 shadow-xs inline-flex items-center gap-2 group"
              >
                Discover Form
                <ArrowRight size={12} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Image Column (Visual Showcase)
            Mobile: Absolute full background
            Desktop: Side-by-side flex column
        */}
        <div className="absolute inset-0 md:relative md:w-1/2 group flex justify-center overflow-hidden z-0 self-stretch">
          <img
            src={homepageConfig?.hero_image_url || heroBanner}
            alt="Zenphire Editorial Showcase"
            className="w-full h-full object-cover transition-transform duration-[2000ms] ease-out group-hover:scale-105"
            style={{ objectPosition: homepageConfig?.hero_image_position || 'center' }}
          />
          {/* Curved radial vignette overlay on mobile bottom section (last 35% height), sweeping curve with soft polished edges */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[40%] md:hidden pointer-events-none z-10"
            style={{
              background: 'radial-gradient(160% 140% at 50% 135%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>
      </section>

      {/* ── 2. GENDER COLLECTIONS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 anim-fade-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">Curated Wardrobe</p>
            <h2 className="heading-primary text-2xl md:text-3xl font-heading font-medium mt-1 inline-block">Gender Collections</h2>
          </div>
          <Link to="/shop" className="nav-link text-xs font-semibold uppercase tracking-widest text-accent-gold hover:opacity-80 font-heading inline-flex items-center gap-1.5 whitespace-nowrap ml-4">
            View All <ArrowRight size={12} />
          </Link>
        </div>

        <div className="flex gap-4 md:gap-6 overflow-x-auto pb-5 custom-scrollbar snap-x snap-mandatory">
          {genderCollections.map((col) => (
            <Link
              key={col.id}
              to={col.link}
              onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
              className="flex-shrink-0 w-64 md:w-80 snap-start group product-card block"
            >
              <div className="relative w-full bg-bg-subtle overflow-hidden border border-border">
                <img src={col.image} alt={col.name} className="card-img w-full h-auto block" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                <div className="absolute bottom-5 left-5 text-white">
                  <p className="text-base font-heading font-bold tracking-widest uppercase">{col.name}</p>
                  <p className="card-overlay text-[10px] tracking-wider opacity-80 uppercase inline-flex items-center gap-1 mt-0.5">
                    Explore <ArrowRight size={9} />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 3. SHOP BY CATEGORY (The "Overlap Stack" Slider) ── */}
      {sortedCategories.length > 0 && (
        <section className="max-w-7xl mx-auto py-16 border-t border-border anim-fade-up">
          {/* Section Header */}
          <div className="px-4 sm:px-6 lg:px-8 mb-10 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent-gold font-bold block mb-1">
              COLLECTIONS
            </span>
            <h2 className="text-xl font-heading font-medium tracking-widest uppercase text-text-primary">
              SHOP BY CATEGORY
            </h2>
          </div>

          {/* Overlapping Flex Container */}
          <div
            ref={categoryScrollRef}
            onScroll={handleCategoryScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth -space-x-3 md:-space-x-4 px-[10vw] pb-6"
            style={{ scrollPadding: '0 10vw' }}
          >
            {sortedCategories.map((cat, idx) => {
              const isActive = activeCategoryIndex === idx;
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="category-card group block relative flex-shrink-0 w-60 md:w-80 snap-center transition-all duration-500 ease-out"
                  style={{
                    opacity: isActive ? 1 : 0.75,
                    transform: isActive ? 'scale(1.0)' : 'scale(0.92)',
                    zIndex: isActive ? 10 : 1,
                  }}
                >
                  {/* Image wrapper - strict architectural border and 3:4 aspect */}
                  <div className="aspect-[3/4] w-full bg-bg-subtle overflow-hidden border border-border rounded-none relative">
                    <img
                      src={cat.image_url || CATEGORY_IMAGES[idx % CATEGORY_IMAGES.length]}
                      alt={cat.name}
                      className="card-img w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-20 transition-opacity duration-300 group-hover:opacity-0" />
                  </div>

                  {/* Category Label below the image */}
                  <div className="mt-4 text-center">
                    <h3 className="text-xs uppercase tracking-widest font-medium text-neutral-800 transition-colors duration-300 group-hover:text-accent-gold">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
            {/* End spacing block for horizontal scroll alignment */}
            <div className="flex-shrink-0 w-[10vw]" />
          </div>
        </section>
      )}

      {/* ── 4. NEW ARRIVALS ──
           Mobile: uniform 2-col grid (same aspect, consistent).
           Desktop: editorial magazine — hero left (tall) + 3 compact right.
      */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 border-t border-border anim-fade-up">
        <div className="flex justify-between items-center mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">Just Released</p>
            <h2 className="heading-primary text-2xl md:text-3xl font-heading font-medium mt-1 inline-block">New Arrivals</h2>
          </div>
          <Link to="/shop" className="nav-link text-xs font-semibold uppercase tracking-widest text-accent-gold hover:opacity-80 font-heading inline-flex items-center gap-1.5 whitespace-nowrap ml-4">
            All <ArrowRight size={12} />
          </Link>
        </div>

        {newArrivals.length === 0 ? (
          <div className="text-center py-14 bg-bg-subtle border border-border">
            <p className="text-xs uppercase tracking-widest text-text-secondary font-bold">No products yet.</p>
          </div>
        ) : (
          <>
            {/* ── MOBILE: horizontal scroll (peek effect) ── */}
            <div className="flex overflow-x-auto gap-4 md:hidden pb-5 scrollbar-none snap-x snap-mandatory px-4">
              {newArrivals.map((product: any) => (
                <Link key={product.id} to={`/product/${product.slug}`} className="group product-card block flex-shrink-0 w-[80vw] snap-start">
                  <div className="w-full bg-bg-subtle overflow-hidden border border-border relative">
                    <img
                      src={product.product_images[0]?.url || linenShirt}
                      alt={product.name}
                      className="card-img w-full h-auto block relative z-10"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="absolute top-2 left-2 bg-text-primary text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5">
                      New
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-2 right-2 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={12} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                    <h3 className="text-xs font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{product.name}</h3>
                    <p className="text-xs font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
              <div className="w-4 shrink-0" />
            </div>

            {/* ── DESKTOP: editorial magazine grid ── */}
            <div className="hidden md:grid grid-cols-3 gap-4" style={{ gridTemplateRows: 'repeat(2, auto)' }}>
              {/* Hero — spans 2 rows */}
              {newArrivals[0] && (
                <Link
                  to={`/product/${newArrivals[0].slug}`}
                  className="group product-card block row-span-2"
                >
                  <div className="h-full bg-bg-subtle overflow-hidden border border-border relative" style={{ minHeight: '480px' }}>
                    <img
                      src={newArrivals[0].product_images[0]?.url || linenShirt}
                      alt={newArrivals[0].name}
                      className="card-img w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="absolute top-3 left-3 bg-text-primary text-white text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1">New</div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(newArrivals[0].id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-3 right-3 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === newArrivals[0].id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={13} className={isWishlisted(newArrivals[0].id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                    <div className="card-overlay absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold mb-0.5">Zenphire</p>
                      <h3 className="text-sm font-semibold text-white truncate">{newArrivals[0].name}</h3>
                      <p className="text-sm font-bold text-white mt-0.5">₹{Number(newArrivals[0].base_price || 0).toFixed(2)}</p>
                    </div>
                  </div>
                </Link>
              )}
              {/* 3 compact cards — 2 col × rows 1-2 */}
              {newArrivals.slice(1).map((product: any) => (
                <Link key={product.id} to={`/product/${product.slug}`} className="group product-card block">
                  <div className="aspect-[4/3] bg-bg-subtle overflow-hidden border border-border relative">
                    <img
                      src={product.product_images[0]?.url || linenShirt}
                      alt={product.name}
                      className="card-img w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <div className="absolute top-2 left-2 bg-text-primary text-white text-[8px] font-black uppercase tracking-[0.2em] px-2 py-0.5">New</div>
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-2 right-2 p-1 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={11} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                  </div>
                  <div className="mt-2 space-y-0.5">
                    <h3 className="text-xs font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{product.name}</h3>
                    <p className="text-xs font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ── 5. EDITORIAL BANNER ── */}
      <section className="bg-bg-subtle border-y border-border py-20 my-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-5 anim-fade-up">
            <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">The Edit</p>
            <h2 className="heading-primary text-4xl md:text-6xl font-pinyon normal-case leading-normal tracking-wide">
              Honest Materials,<br />Artisan Craft
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md">
              We design under the principle of reduction — removing embellishment to highlight the raw beauty of organic linen, long-staple cotton, and natural wool.
            </p>
            <Link
              to="/shop"
              onClick={() => window.scrollTo({ top: 0, behavior: 'instant' })}
              className="btn btn-primary inline-flex items-center gap-2 px-7 py-3 text-xs font-bold uppercase tracking-widest"
            >
              Discover Collection <ArrowRight size={13} />
            </Link>
          </div>
          <div className="overflow-hidden border border-border group w-full flex justify-center bg-[#F4F4F4]">
            <img
              src={editorialImage}
              alt="Artisan detail"
              className="w-full h-auto max-h-[75vh] object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.04]"
              style={{ objectPosition: homepageConfig?.the_edit_image_position || 'center' }}
            />
          </div>
        </div>
      </section>

      {/* ── 6. BEST SELLERS ── */}
      {bestSellers.length > 0 && (
        <section className="py-14 mb-12 border-t border-border anim-fade-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center mb-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">Customer Favorites</p>
              <h2 className="heading-primary text-2xl md:text-3xl font-heading font-medium mt-1 inline-block">Best Sellers</h2>
            </div>

            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => scrollBestSellers('left')}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent-gold hover:border-accent-gold transition-colors duration-300 focus:outline-none cursor-pointer hidden md:flex"
                aria-label="Scroll left"
              >
                &larr;
              </button>
              <button
                onClick={() => scrollBestSellers('right')}
                className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent-gold hover:border-accent-gold transition-colors duration-300 focus:outline-none cursor-pointer hidden md:flex"
                aria-label="Scroll right"
              >
                &rarr;
              </button>
              <Link to="/shop" className="nav-link text-xs font-semibold uppercase tracking-widest text-accent-gold hover:opacity-80 font-heading inline-flex items-center gap-1.5 whitespace-nowrap ml-4">
                Shop All <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* Scroll rail wrapper — vignette fade on the right edge hints at scrollability */}
          <div className="relative">
            {/* Right vignette */}
            <div
              className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 md:w-20 z-10"
              style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18) 0%, transparent 100%)' }}
            />

            {/* ── MOBILE: 2-column grid ── */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:hidden px-4">
              {bestSellers.map((product: any) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group product-card block w-full"
                >
                  <div className="w-full bg-bg-subtle overflow-hidden border border-border relative">
                    <img
                      src={product.product_images[0]?.url || linenShirt}
                      alt={product.name}
                      className="card-img w-full h-auto block relative z-10"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-2.5 right-2.5 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={13} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                  </div>
                  <div className="mt-2.5 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                    <h3 className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{product.name}</h3>
                    <p className="text-sm font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* ── DESKTOP: horizontal scroll ── */}
            <div
              ref={bestSellersScrollRef}
              className="hidden md:flex overflow-x-auto custom-scrollbar gap-0 pl-4 sm:pl-6 lg:pl-8 pb-5 scroll-smooth"
            >
              {bestSellers.map((product: any) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group product-card flex-shrink-0 flex flex-col pr-4 md:pr-6"
                  style={{ width: 'clamp(200px, 26vw, 300px)' }}
                >
                  <div className="w-full bg-bg-subtle overflow-hidden border border-border relative">
                    <img
                      src={product.product_images[0]?.url || linenShirt}
                      alt={product.name}
                      className="card-img w-full h-auto block relative z-10"
                    />
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-accent-line scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                      aria-label="Toggle Wishlist"
                      className={`wishlist-btn absolute top-2.5 right-2.5 p-1.5 bg-white/90 border border-border/60 rounded-full z-10 ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                    >
                      <Heart size={13} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                    </button>
                  </div>
                  <div className="mt-2.5 space-y-0.5">
                    <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                    <h3 className="text-sm font-medium text-text-primary group-hover:underline underline-offset-2 truncate">{product.name}</h3>
                    <p className="text-sm font-semibold text-text-primary">₹{Number(product.base_price || 0).toFixed(2)}</p>
                  </div>
                </Link>
              ))}
              {/* Right padding sentinel — sits behind the vignette */}
              <div className="flex-shrink-0 w-20 md:w-32" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
