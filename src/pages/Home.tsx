import { useEffect, useState, useMemo, useRef } from 'react';
import { ArrowRight, Heart, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWishlistStore } from '../store/useWishlistStore';
import { getActiveProducts, getCategories, supabase } from '../lib/supabase';
import { dataCache } from '../lib/dataCache';
import { imgHero, imgCard } from '../lib/imgTransform';

export default function Home() {
  const { toggleWishlist, isWishlisted } = useWishlistStore();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  // configLoading gates the hero + category skeleton (resolves fast ~2-4s)
  const [configLoading, setConfigLoading] = useState(
    () => !dataCache.get('homepage_config') && !dataCache.get('categories')
  );
  // productsLoading gates the new-arrivals / best-sellers sections
  const [productsLoading, setProductsLoading] = useState(
    () => !(dataCache.get<any[]>('products')?.length)
  );
  // Keep `loading` alias so existing JSX that uses it still works
  const loading = productsLoading;
  const [heartId, setHeartId] = useState<string | null>(null);
  const [homepageConfig, setHomepageConfig] = useState<any | null>(() => {
    const cached = dataCache.get<any>('homepage_config');
    if (cached) return cached;
    try {
      const raw = localStorage.getItem('zenphire_homepage_config');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
  });

  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  // Hero Slider State
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const heroSlides = useMemo(() => {
    const slide1Image = homepageConfig?.hero_image_url || null;
    const slide2Image = homepageConfig?.hero_image_url_2 || null;

    const slides: any[] = [
      {
        id: 1,
        image: slide1Image,
        position: homepageConfig?.hero_image_position || 'center',
        titlePart1: 'Raw',
        titleHighlight1: 'Textures',
        titlePart2: 'Minimal',
        titleHighlight2: 'Form',
        description: 'Organic fabrics, artisan weaves, and relaxed silhouettes designed to stand the test of time. Embodying the true essence of modern simplicity.',
        buttonText: 'Discover Form',
        buttonLink: '/shop',
      }
    ];

    if (slide2Image) {
      slides.push({
        id: 2,
        image: slide2Image,
        position: homepageConfig?.hero_image_position_2 || 'center',
        titlePart1: 'Timeless',
        titleHighlight1: 'Elegance',
        titlePart2: 'Curated',
        titleHighlight2: 'Craft',
        description: 'Sculpted cuts and versatile essentials engineered for everyday luxury. Elevate your personal style with our latest seasonal collection.',
        buttonText: 'Explore Collection',
        buttonLink: '/shop?sort=newest',
      });
    }

    return slides;
  }, [homepageConfig]);

  // Auto-slide effect every 6 seconds (if more than 1 slide)
  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [activeSlide, heroSlides.length]);

  const handlePrevSlide = () => {
    setActiveSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const handleNextSlide = () => {
    setActiveSlide((prev) => (prev + 1) % heroSlides.length);
  };

  // Mobile Touch Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNextSlide();
    } else if (distance < -50) {
      handlePrevSlide();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Reorder categories: Shirts -> Pants -> T-shirts -> Co-ords / Accessories
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

  // Only render gender collections that have a real image URL configured in homepage_config
  const genderCollections = useMemo(() => {
    const all = [
      { id: 'men', name: 'Men', image: homepageConfig?.men_collection_image_url, link: '/shop?gender=male' },
      { id: 'women', name: 'Women', image: homepageConfig?.women_collection_image_url, link: '/shop?gender=female' },
      { id: 'unisex', name: 'Unisex', image: homepageConfig?.unisex_collection_image_url, link: '/shop?gender=unisex' },
    ];
    // Filter to only show cards that have an image configured by the admin
    return all.filter(col => !!col.image);
  }, [homepageConfig]);

  useEffect(() => {
    let cancelled = false;

    // ── Step 1: Hydrate from cache synchronously (return visits: zero flash) ──
    const cachedProds = dataCache.get<any[]>('products');
    const cachedCats = dataCache.get<any[]>('categories');
    // homepageConfig already initialised from cache in useState lazy init

    if (cachedProds && cachedProds.length > 0) setProducts(cachedProds);
    if (cachedCats) setCategories(cachedCats.filter((c: any) => !c.parent_category_id));

    // ── Step 2a: Fast fetch — homepage_config + categories (small tables, ~2-4s) ──
    // These two resolve quickly and unblock hero image + category cards immediately.
    async function loadConfig() {
      try {
        const [catResult, hpResult] = await Promise.allSettled([
          dataCache.isStale('categories') ? getCategories() : Promise.resolve(cachedCats || []),
          dataCache.isStale('homepage_config')
            ? supabase.from('homepage_config' as any).select('*').eq('id', 'global').maybeSingle()
            : Promise.resolve({ data: dataCache.get<any>('homepage_config'), error: null }),
        ]);

        if (cancelled) return;

        if (catResult.status === 'fulfilled' && catResult.value && catResult.value.length > 0) {
          dataCache.set('categories', catResult.value);
          setCategories(catResult.value.filter((c: any) => !c.parent_category_id));
        }
        let hpData =
          hpResult.status === 'fulfilled' && !(hpResult.value as any)?.error
            ? ((hpResult.value as any)?.data ?? null)
            : null;

        let localBackup: any = null;
        try {
          const raw = localStorage.getItem('zenphire_homepage_config');
          if (raw) localBackup = JSON.parse(raw);
        } catch (e) {}

        const merged = hpData || localBackup
          ? {
              ...localBackup,
              ...hpData,
              hero_image_url_2: hpData?.hero_image_url_2 || localBackup?.hero_image_url_2 || null,
            }
          : null;

        if (merged) {
          dataCache.set('homepage_config', merged);
          setHomepageConfig(merged);
        }
      } catch (err) {
        console.warn('Home config load error:', err);
      } finally {
        if (!cancelled) setConfigLoading(false);
      }
    }

    // ── Step 2b: Slow fetch — products (heavy join, may take 5-30s on cold start) ──
    // Runs in parallel with loadConfig but does NOT block the hero or categories.
    async function loadProducts() {
      // If cache is fresh, skip network entirely
      if (cachedProds && cachedProds.length > 0 && !dataCache.isStale('products')) {
        setProductsLoading(false);
        return;
      }
      try {
        const prods = await getActiveProducts();
        if (cancelled) return;
        if (prods?.length > 0) {
          dataCache.set('products', prods);
          setProducts(prods);
          // Pre-populate per-slug caches so ProductDetail renders instantly on click
          prods.forEach((p: any) => dataCache.set(`product:${p.slug}`, p));
        }
      } catch (err) {
        console.warn('Home products load error:', err);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    }

    // Fire both in parallel — config finishes first and immediately shows the UI
    loadConfig();
    loadProducts();
    return () => { cancelled = true; };
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
      .slice(0, 8);
  }, [products, homepageConfig]);

  const bestSellers = useMemo(() => {
    if (homepageConfig?.best_sellers_ids && homepageConfig.best_sellers_ids.length > 0) {
      return homepageConfig.best_sellers_ids
        .map((id: string) => products.find(p => p.id === id))
        .filter(Boolean);
    }
    return products.slice(0, 4);
  }, [products, homepageConfig]);

  // Editorial image: only use admin-configured URLs, no local asset fallbacks
  const editorialImage = useMemo(() =>
    homepageConfig?.the_edit_image_url || null,
    [homepageConfig]
  );

  return (
    <div className="bg-bg min-h-screen overflow-x-hidden">

      {/* ── 1. HERO SLIDER ── */}
      <section
        className="relative bg-bg-subtle h-[75vh] md:h-[80vh] flex flex-col md:flex-row items-stretch overflow-hidden border-b border-border group/hero select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >

        <div className="absolute inset-0 md:relative md:w-1/2 flex flex-col justify-end md:justify-center px-6 pb-14 pt-16 md:px-16 lg:px-24 bg-transparent md:bg-bg-subtle z-20">
          <div className="max-w-md hero-content text-left relative min-h-[250px] flex flex-col justify-center">
            {heroSlides.map((slide, index) => {
              const isActive = index === activeSlide;
              return (
                <div
                  key={slide.id}
                  className={`transition-all duration-1000 ease-out space-y-4 md:space-y-8 ${isActive
                      ? 'opacity-100 translate-y-0 relative z-20 pointer-events-auto'
                      : 'opacity-0 translate-y-6 absolute inset-0 z-0 pointer-events-none'
                    }`}
                >
                  <h1 className="text-3xl md:text-6xl lg:text-7xl font-sans uppercase font-extralight tracking-tight leading-[1.05] text-white md:text-text-primary">
                    {slide.titlePart1} <span className="font-semibold block font-heading tracking-wide text-white md:text-text-primary">{slide.titleHighlight1}</span>
                    {slide.titlePart2} <span className="italic block font-serif tracking-normal text-white/90 md:text-text-secondary">{slide.titleHighlight2}</span>
                  </h1>

                  <p className="hidden sm:block text-xs md:text-sm text-white/80 md:text-text-secondary leading-relaxed max-w-sm font-sans tracking-wide">
                    {slide.description}
                  </p>

                  <div className="pt-2 md:pt-4">
                    <Link
                      to={slide.buttonLink}
                      className="btn ambient-green-gradient text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all duration-300 shadow-xs inline-flex items-center gap-2 group/btn"
                    >
                      {slide.buttonText}
                      <ArrowRight size={12} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls & Indicators */}
          <div className="flex items-center gap-4 mt-6 md:mt-8 z-30">
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => {
                const isActive = idx === activeSlide;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Go to slide ${idx + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer overflow-hidden relative ${isActive
                        ? 'w-8 bg-accent'
                        : 'w-2 bg-white/40 md:bg-text-secondary/30 hover:bg-white/70 md:hover:bg-text-secondary/60'
                      }`}
                  >
                    {isActive && heroSlides.length > 1 && (
                      <span
                        key={`prog-${activeSlide}`}
                        className="absolute inset-0 bg-white/60 animate-[progress_6s_linear_infinite]"
                        style={{
                          transformOrigin: 'left',
                          animationDuration: '6000ms'
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] tracking-widest uppercase font-mono text-white/70 md:text-text-secondary/70 font-semibold">
              0{activeSlide + 1} / 0{heroSlides.length}
            </span>

            {heroSlides.length > 1 && (
              <div className="flex items-center gap-1.5 ml-auto md:ml-4">
                <button
                  onClick={handlePrevSlide}
                  aria-label="Previous slide"
                  className="p-2 text-white md:text-text-primary hover:bg-white/10 md:hover:bg-black/5 transition-colors rounded-full cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextSlide}
                  aria-label="Next slide"
                  className="p-2 text-white md:text-text-primary hover:bg-white/10 md:hover:bg-black/5 transition-colors rounded-full cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="absolute inset-0 md:relative md:w-1/2 flex justify-center overflow-hidden z-0 self-stretch">
          {heroSlides.map((slide, index) => {
            const isActive = index === activeSlide;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                  }`}
              >
                {slide.image ? (
                  <img
                    src={typeof slide.image === 'string' && (slide.image.startsWith('http') || slide.image.startsWith('data:')) ? imgHero(slide.image) : slide.image}
                    alt="Zenphire Editorial Showcase"
                    fetchPriority={index === 0 ? "high" : "low"}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${isActive ? 'scale-105' : 'scale-100'
                      }`}
                    style={{ objectPosition: slide.position }}
                  />
                ) : configLoading ? (
                  <div className="w-full h-full animate-pulse bg-gradient-to-br from-zinc-100 via-zinc-200 to-zinc-100" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#001510] via-[#063A2C] to-[#00221A]" />
                )}
              </div>
            );
          })}
          <div
            className="absolute bottom-0 left-0 right-0 h-[40%] md:hidden pointer-events-none z-10"
            style={{
              background: 'radial-gradient(160% 140% at 50% 135%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0) 100%)'
            }}
          />
        </div>
      </section>

      {/* ── 2. GENDER COLLECTIONS ── */}
      {/* GENDER COLLECTIONS — only rendered once config is loaded and images are configured */}
      {!configLoading && genderCollections.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 anim-fade-up">
          <div className="flex justify-between items-center mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">Curated Wardrobe</p>
              <h2 className="heading-primary text-2xl md:text-3xl font-mending font-medium mt-1 inline-block">Gender Collections</h2>
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
                  <img src={imgCard(col.image)} alt={col.name} loading="lazy" decoding="async" className="card-img w-full h-auto block" />
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
      )}

      {/* Skeleton for Gender Collections while config loads */}
      {configLoading && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex gap-4 md:gap-6 overflow-x-hidden pb-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-64 md:w-80 bg-bg-subtle border border-border animate-pulse">
                <div className="aspect-[3/4] w-full bg-black/5" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 3. SHOP BY CATEGORY ── */}
      {sortedCategories.length > 0 && (
        <section className="max-w-7xl mx-auto py-16 border-t border-border anim-fade-up">
          <div className="px-4 sm:px-6 lg:px-8 mb-10 text-center md:text-left">
            <span className="text-[10px] uppercase tracking-[0.3em] text-accent-gold font-bold block mb-1">
              COLLECTIONS
            </span>
            <h2 className="text-xl font-mending font-medium tracking-widest uppercase text-text-primary">
              SHOP BY CATEGORY
            </h2>
          </div>

          <div
            ref={categoryScrollRef}
            onScroll={handleCategoryScroll}
            className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none scroll-smooth -space-x-3 md:-space-x-4 px-[10vw] pb-6"
            style={{ scrollPadding: '0 10vw' }}
          >
            {sortedCategories.map((cat, idx) => {
              const isActive = activeCategoryIndex === idx;
              const catName = cat.name.toLowerCase();
              const customCatImage =
                (catName.includes('t-shirt') || catName.includes('tshirt') || catName.includes('t shirt') || catName.includes('t shirts') ? homepageConfig?.tshirt_category_image_url : null) ||
                (catName.includes('shirt') && !catName.includes('t-shirt') && !catName.includes('tshirt') && !catName.includes('t shirt') && !catName.includes('t shirts') ? homepageConfig?.shirt_category_image_url : null) ||
                (catName.includes('coord') || catName.includes('co-ord') || catName.includes('co ord') ? homepageConfig?.coords_category_image_url : null) ||
                (catName.includes('pant') || catName.includes('trouser') ? homepageConfig?.pants_category_image_url : null);

              // The real image: DB image_url first, then admin config match, then null
              const catImageSrc = cat.image_url || customCatImage || null;

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
                  <div className="aspect-[3/4] w-full bg-bg-subtle overflow-hidden border border-border rounded-none relative">
                    {catImageSrc ? (
                      <img
                        src={imgCard(catImageSrc)}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        className="card-img w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      /* No-image placeholder — shown when admin hasn't set a category image yet */
                      <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-bg-subtle">
                        <Image size={28} className="text-text-secondary/30" />
                        <span className="text-[9px] uppercase tracking-widest text-text-secondary/40 font-bold">
                          {cat.name}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/5 opacity-20 transition-opacity duration-300 group-hover:opacity-0" />
                  </div>

                  <div className="mt-4 text-center">
                    <h3 className="text-xs uppercase tracking-widest font-medium text-neutral-800 transition-colors duration-300 group-hover:text-accent-gold">
                      {cat.name}
                    </h3>
                  </div>
                </Link>
              );
            })}
            <div className="flex-shrink-0 w-[10vw]" />
          </div>
        </section>
      )}

      {/* ── 4. NEW ARRIVALS ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-border anim-fade-up">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold block mb-1">
              JUST RELEASED
            </span>
            <h2 className="heading-primary text-2xl md:text-4xl font-mending font-medium tracking-wide">
              New Arrivals
            </h2>
          </div>
          <Link
            to="/shop"
            className="nav-link text-xs font-semibold uppercase tracking-widest text-accent-gold hover:opacity-80 font-heading inline-flex items-center gap-1.5 whitespace-nowrap self-start md:self-auto"
          >
            Explore All New Arrivals <ArrowRight size={12} />
          </Link>
        </div>

        {loading && products.length === 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-bg-subtle border border-border overflow-hidden animate-pulse">
                <div className="aspect-[3/4] w-full bg-black/5" />
                <div className="p-3.5 space-y-2">
                  <div className="h-2.5 w-16 bg-black/10" />
                  <div className="h-3 w-3/4 bg-black/10" />
                  <div className="h-3 w-1/3 bg-black/10" />
                </div>
              </div>
            ))}
          </div>
        ) : newArrivals.length === 0 ? (
          <div className="text-center py-14 bg-bg-subtle border border-border">
            <p className="text-xs uppercase tracking-widest text-text-secondary font-bold">No new products available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {newArrivals.slice(0, 8).map((product: any) => (
              <Link
                key={product.id}
                to={`/product/${product.slug}`}
                className="group product-card block bg-bg-subtle border border-border overflow-hidden transition-all duration-300 hover:shadow-md"
              >
                <div className="aspect-[3/4] w-full bg-bg-subtle overflow-hidden relative">
                  {product.product_images?.[0]?.url ? (
                    <img
                      src={imgCard(product.product_images[0].url)}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="card-img w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-bg-subtle">
                      <Image size={24} className="text-text-secondary/20" />
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleWishlist(product.id); }}
                    aria-label="Toggle Wishlist"
                    className={`wishlist-btn absolute top-3 right-3 p-2 bg-bg/90 border border-border/80 rounded-full shadow-xs z-10 transition-transform ${heartId === product.id ? 'anim-heart-pop' : ''}`}
                  >
                    <Heart size={14} className={isWishlisted(product.id) ? 'fill-sale stroke-sale' : 'stroke-text-primary'} />
                  </button>
                </div>
                <div className="p-3.5 space-y-1">
                  <p className="text-[9px] uppercase tracking-widest text-text-secondary font-bold">Zenphire</p>
                  <h3 className="text-xs font-medium text-text-primary group-hover:text-accent-gold transition-colors duration-200 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs font-semibold text-text-primary">
                    ₹{Number(product.base_price || 0).toFixed(2)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── 5. EDITORIAL BANNER ── */}
      {/* Only rendered when admin has configured an editorial image */}
      {editorialImage && (
        <section className="bg-bg-subtle border-y border-border py-20 my-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-5 anim-fade-up">
              <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">The Edit</p>
              <h2 className="heading-primary text-4xl md:text-6xl font-kugile normal-case leading-normal tracking-wide">
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
            <div className="overflow-hidden border border-border group w-full flex justify-center bg-bg-subtle">
              <img
                src={imgHero(editorialImage)}
                alt="Artisan detail"
                loading="lazy"
                decoding="async"
                className="w-full h-auto max-h-[75vh] object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:scale-[1.04]"
                style={{ objectPosition: homepageConfig?.the_edit_image_position || 'center' }}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── 6. BEST SELLERS ── */}
      {bestSellers.length > 0 && (
        <section className="py-14 mb-12 border-t border-border anim-fade-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center mb-10">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] subheading-primary font-bold">Customer Favorites</p>
              <h2 className="heading-primary text-2xl md:text-3xl font-mending font-medium mt-1 inline-block">Best Sellers</h2>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:block">
                <button
                  onClick={() => scrollBestSellers('left')}
                  className="btn-icon w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent-gold hover:border-accent-gold transition-colors duration-300 focus:outline-none cursor-pointer"
                  aria-label="Scroll left"
                >
                  <ChevronLeft size={16} />
                </button>
              </div>
              <div className="hidden md:block">
                <button
                  onClick={() => scrollBestSellers('right')}
                  className="btn-icon w-9 h-9 rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-accent-gold hover:border-accent-gold transition-colors duration-300 focus:outline-none cursor-pointer"
                  aria-label="Scroll right"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <Link to="/shop" className="nav-link text-xs font-semibold uppercase tracking-widest text-accent-gold hover:opacity-80 font-heading inline-flex items-center gap-1.5 whitespace-nowrap ml-4">
                Shop All <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          <div className="relative">
            <div
              className="pointer-events-none absolute top-0 right-0 bottom-0 w-12 md:w-20 z-10"
              style={{ background: 'linear-gradient(to left, rgba(0,0,0,0.18) 0%, transparent 100%)' }}
            />

            {/* MOBILE: 2-column grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:hidden px-4">
              {bestSellers.map((product: any) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group product-card block w-full"
                >
                  <div className="w-full bg-bg-subtle overflow-hidden border border-border relative">
                    {product.product_images?.[0]?.url ? (
                      <img
                        src={imgCard(product.product_images[0].url)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="card-img w-full h-auto block relative z-10"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full flex items-center justify-center bg-bg-subtle">
                        <Image size={20} className="text-text-secondary/20" />
                      </div>
                    )}
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

            {/* DESKTOP: horizontal scroll */}
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
                    {product.product_images?.[0]?.url ? (
                      <img
                        src={imgCard(product.product_images[0].url)}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="card-img w-full h-auto block relative z-10"
                      />
                    ) : (
                      <div className="aspect-[3/4] w-full flex items-center justify-center bg-bg-subtle">
                        <Image size={20} className="text-text-secondary/20" />
                      </div>
                    )}
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
              <div className="flex-shrink-0 w-20 md:w-32" />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
