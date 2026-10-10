/**
 * HeroCarousel.tsx
 *
 * ── STEPS 2 + 3 ──
 *
 * Accepts a `slides` prop (HeroSlide[]) and a `copy` prop (HeroSlideCopy[]).
 * Performance characteristics:
 *   - Slide 1 img: fetchpriority="high" + loading="eager"
 *   - Slide 2 img: preloaded via JS after slide 1 onLoad
 *   - Slides 3+:   lazy-loaded just before they become active
 *   - 0 slides:    designed fallback banner, no broken content
 *   - 1 slide:     no controls, no autoplay, no dots
 *   - 2+ slides:   crossfade, 5s autoplay, dots, arrows, swipe, keyboard
 *   - Placeholder: #00221A background until image decoded, then fade in
 *   - CLS:         fixed aspect-ratio container, zero layout shift
 *   - reduced-motion: crossfade retained but autoplay disabled
 */

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeroSlide, HeroSlideCopy } from '../lib/heroSlides';
import { imgHero } from '../lib/imgTransform';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  slides: HeroSlide[];
  copy: HeroSlideCopy[];
  /** Called once the first image has decoded — parent can dismiss its loader */
  onFirstImageReady?: () => void;
  /** Whether to show the diamond preloader overlay (controlled by parent) */
  showLoader?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCopy(copy: HeroSlideCopy[], slide: HeroSlide): HeroSlideCopy {
  if (slide.titlePart1 || slide.titleHighlight1) {
    return {
      id: slide.id,
      titlePart1: slide.titlePart1 || '',
      titleHighlight1: slide.titleHighlight1 || '',
      titlePart2: slide.titlePart2 || '',
      titleHighlight2: slide.titleHighlight2 || '',
      description: slide.description || '',
      buttonText: slide.buttonText || 'Discover More',
      buttonLink: slide.buttonLink || '/shop',
    };
  }
  return (
    copy.find((c) => c.id === slide.id) ??
    copy[0] ?? {
      id: slide.id,
      titlePart1: 'New',
      titleHighlight1: 'Collection',
      titlePart2: 'Discover',
      titleHighlight2: 'More',
      description: 'Explore our latest pieces.',
      buttonText: 'Shop Now',
      buttonLink: '/shop',
    }
  );
}

/** Resolve image URL via imgHero (currently a passthrough; ready for transforms). */
function resolveUrl(url: string | null): string {
  if (!url) return '';
  if (!url.startsWith('http') && !url.startsWith('data:')) return url;
  return imgHero(url) ?? url;
}

// ─── Slide image state reducer ────────────────────────────────────────────────

type SlideState = 'idle' | 'loading' | 'loaded' | 'error';
type ImgStateMap = Record<string, SlideState>;

type ImgAction =
  | { type: 'start'; id: string }
  | { type: 'loaded'; id: string }
  | { type: 'error'; id: string };

function imgReducer(state: ImgStateMap, action: ImgAction): ImgStateMap {
  switch (action.type) {
    case 'start':
      return state[action.id] ? state : { ...state, [action.id]: 'loading' };
    case 'loaded':
      return { ...state, [action.id]: 'loaded' };
    case 'error':
      return { ...state, [action.id]: 'error' };
    default:
      return state;
  }
}

// ─── Fallback banner ──────────────────────────────────────────────────────────

function FallbackBanner() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[#001510] via-[#063A2C] to-[#00221A] flex items-center justify-center">
      <div className="text-center space-y-4 px-6">
        <p className="text-[10px] uppercase tracking-[0.35em] text-[#B8975A] font-bold">
          Zenphire
        </p>
        <h1 className="text-4xl md:text-6xl font-sans uppercase font-extralight tracking-tight text-white">
          Luxury <span className="font-semibold font-heading">Essentials</span>
        </h1>
        <Link
          to="/shop"
          className="btn ambient-green-gradient text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 shadow-xs inline-flex items-center gap-2 group/btn mt-4"
        >
          Shop Collection
          <ArrowRight size={12} className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}

// ─── Single slide image ───────────────────────────────────────────────────────

interface SlideImageProps {
  slide: HeroSlide;
  isActive: boolean;
  priority: 'high' | 'low' | 'lazy';
  state: SlideState;
  onLoad: (id: string) => void;
  onError: (id: string) => void;
}

function SlideImage({ slide, isActive, priority, state, onLoad, onError }: SlideImageProps) {
  const src = resolveUrl(slide.url);
  const loaded = state === 'loaded';

  return (
    <div
      aria-hidden={!isActive}
      className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
        isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
      }`}
    >
      {/* Brand-coloured placeholder — always visible until image fades in */}
      <div className="absolute inset-0 bg-[#00221A]" />

      {slide.url && (
        <img
          src={src}
          alt={slide.alt}
          // @ts-ignore — fetchpriority not in all TS lib versions yet
          fetchpriority={priority === 'high' ? 'high' : 'low'}
          loading={priority === 'lazy' ? 'lazy' : 'eager'}
          decoding="async"
          width={1920}
          height={1080}
          onLoad={() => onLoad(slide.id)}
          onError={() => onError(slide.id)}
          className={[
            'absolute inset-0 w-full h-full object-cover',
            'transition-opacity duration-700 ease-in-out',
            loaded ? 'opacity-100' : 'opacity-0',
            isActive ? 'scale-105' : 'scale-100',
            'transition-transform',
          ].join(' ')}
          style={{
            objectPosition: slide.position,
            transitionProperty: 'transform, opacity',
            transitionDuration: isActive ? '6000ms, 700ms' : '1000ms, 700ms',
          }}
        />
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function HeroCarousel({
  slides,
  copy,
  onFirstImageReady,
  showLoader = false,
}: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [imgState, dispatchImg] = useReducer(imgReducer, {} as ImgStateMap);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const firstReadyCalled = useRef(false);
  const prefetchedRef = useRef<Set<string>>(new Set());

  // Respects prefers-reduced-motion
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hasSlides = slides.length > 0;
  const isMulti = slides.length > 1;

  // ── Determine which slides have survived (have loaded or have no image) ──
  const isSlideViable = useCallback(
    (idx: number) => {
      const s = slides[idx];
      if (!s) return false;
      if (!s.url) return true; // no image → still viable (shows fallback colour)
      const st = imgState[s.id];
      return st === 'loaded' || st === undefined || st === 'idle'; // not yet failed
    },
    [slides, imgState]
  );

  const allFailed =
    hasSlides &&
    slides.every(
      (s) => s.url && (imgState[s.id] === 'error')
    );

  // ── Navigation ──
  const goTo = useCallback(
    (idx: number) => {
      if (!slides[idx]) return;
      // Don't advance to a slide whose image has already failed
      const state = imgState[slides[idx].id];
      if (slides[idx].url && state === 'error') return;
      setActiveIdx(idx);
    },
    [slides, imgState]
  );

  const goPrev = useCallback(() => {
    let prev = (activeIdx - 1 + slides.length) % slides.length;
    // Skip failed slides
    for (let i = 0; i < slides.length; i++) {
      if (isSlideViable(prev)) break;
      prev = (prev - 1 + slides.length) % slides.length;
    }
    goTo(prev);
  }, [activeIdx, slides.length, isSlideViable, goTo]);

  const goNext = useCallback(() => {
    let next = (activeIdx + 1) % slides.length;
    for (let i = 0; i < slides.length; i++) {
      if (isSlideViable(next)) break;
      next = (next + 1) % slides.length;
    }
    goTo(next);
  }, [activeIdx, slides.length, isSlideViable, goTo]);

  // ── Autoplay ──
  useEffect(() => {
    if (!isMulti || paused || prefersReduced) return;
    const slide = slides[activeIdx];
    const state = imgState[slide?.id];
    // Don't tick until the active slide's image is loaded
    if (slide?.url && state !== 'loaded') return;

    const timer = setInterval(goNext, 5000);
    return () => clearInterval(timer);
  }, [isMulti, paused, prefersReduced, activeIdx, slides, imgState, goNext]);

  // ── Keyboard navigation ──
  useEffect(() => {
    if (!isMulti) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isMulti, goPrev, goNext]);

  // ── Image state handlers ──
  const handleLoad = useCallback(
    async (id: string) => {
      dispatchImg({ type: 'loaded', id });
      // Tell parent the first image is ready
      if (!firstReadyCalled.current && id === slides[0]?.id) {
        firstReadyCalled.current = true;
        onFirstImageReady?.();
      }
      // After slide 1 loads → preload slide 2
      if (id === slides[0]?.id && slides[1]?.url) {
        const s2 = slides[1];
        if (!prefetchedRef.current.has(s2.id)) {
          prefetchedRef.current.add(s2.id);
          const img = new window.Image();
          img.src = resolveUrl(s2.url);
          img.onload = () => dispatchImg({ type: 'loaded', id: s2.id });
          img.onerror = () => dispatchImg({ type: 'error', id: s2.id });
        }
      }
    },
    [slides, onFirstImageReady]
  );

  const handleError = useCallback(
    (id: string) => {
      dispatchImg({ type: 'error', id });
      // If slide 0 fails, still notify parent so loader dismisses
      if (!firstReadyCalled.current && id === slides[0]?.id) {
        firstReadyCalled.current = true;
        onFirstImageReady?.();
      }
      // Auto-skip: if the current active slide failed, advance
      const failedIdx = slides.findIndex((s) => s.id === id);
      if (failedIdx === activeIdx && isMulti) {
        goNext();
      }
    },
    [slides, activeIdx, isMulti, goNext, onFirstImageReady]
  );

  // ── Lazily start loading slide N when it's about to be shown ──
  useEffect(() => {
    const slide = slides[activeIdx];
    if (!slide?.url) return;
    const st = imgState[slide.id];
    if (!st || st === 'idle') {
      dispatchImg({ type: 'start', id: slide.id });
    }
  }, [activeIdx, slides, imgState]);

  // ── Touch / swipe ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = () => {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const d = touchStartX.current - touchEndX.current;
    if (d > 50) goNext();
    else if (d < -50) goPrev();
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // ── Determine priority for each img ──
  function imgPriority(idx: number): 'high' | 'low' | 'lazy' {
    if (idx === 0) return 'high';
    if (idx === 1) return 'low'; // will be preloaded after slide 1 loads, but don't lazy-block it
    return 'lazy';
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <section
      aria-label="Hero banner"
      aria-roledescription="carousel"
      className="relative bg-[#001510] h-[75vh] md:h-[80vh] flex flex-col md:flex-row items-stretch overflow-hidden border-b border-border group/hero select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Diamond loader overlay (controlled by parent) ── */}
      <AnimatePresence>
        {showLoader && (
          <motion.div
            key="hero-diamond-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 z-40 bg-[#001510] flex flex-col items-center justify-center pointer-events-none"
          >
            <div className="preloader-diamond-container mb-4">
              <div className="preloader-diamond" />
              <div className="preloader-diamond-inner" />
            </div>
            <div className="preloader-text">Zenphire</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Text panel ── */}
      <div className="absolute inset-0 md:relative md:w-1/2 flex flex-col justify-end md:justify-center px-6 pb-14 pt-16 md:px-16 lg:px-24 bg-transparent md:bg-bg-subtle z-20">
        <div className="max-w-md hero-content text-left relative min-h-[250px] flex flex-col justify-center">

          {/* All-failed fallback text */}
          {allFailed && (
            <div className="space-y-4 md:space-y-8">
              <h1 className="text-3xl md:text-6xl lg:text-7xl font-sans uppercase font-extralight tracking-tight leading-[1.05] text-white md:text-text-primary">
                Luxury{' '}
                <span className="font-semibold block font-heading tracking-wide text-white md:text-text-primary">
                  Essentials
                </span>
              </h1>
              <div className="pt-2 md:pt-4">
                <Link
                  to="/shop"
                  className="btn ambient-green-gradient text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 shadow-xs inline-flex items-center gap-2 group/btn"
                >
                  Shop Collection
                  <ArrowRight size={12} className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:translate-x-1" />
                </Link>
              </div>
            </div>
          )}

          {/* Per-slide copy */}
          {!allFailed &&
            slides.map((slide, idx) => {
              const isActive = idx === activeIdx;
              const c = getCopy(copy, slide);
              return (
                <div
                  key={slide.id}
                  aria-hidden={!isActive}
                  className={`transition-all duration-1000 ease-out space-y-4 md:space-y-8 ${
                    isActive
                      ? 'opacity-100 translate-y-0 relative z-20 pointer-events-auto'
                      : 'opacity-0 translate-y-6 absolute inset-0 z-0 pointer-events-none'
                  }`}
                >
                  <h1 className="text-3xl md:text-6xl lg:text-7xl font-sans uppercase font-extralight tracking-tight leading-[1.05] text-white md:text-text-primary">
                    {c.titlePart1}{' '}
                    <span className="font-semibold block font-heading tracking-wide text-white md:text-text-primary">
                      {c.titleHighlight1}
                    </span>
                    {c.titlePart2}{' '}
                    <span className="italic block font-serif tracking-normal text-white/90 md:text-text-secondary">
                      {c.titleHighlight2}
                    </span>
                  </h1>
                  <p className="hidden sm:block text-xs md:text-sm text-white/80 md:text-text-secondary leading-relaxed max-w-sm font-sans tracking-wide">
                    {c.description}
                  </p>
                  <div className="pt-2 md:pt-4">
                    <Link
                      to={c.buttonLink}
                      className="btn ambient-green-gradient text-white px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:opacity-90 shadow-xs inline-flex items-center gap-2 group/btn"
                    >
                      {c.buttonText}
                      <ArrowRight size={12} className="transition-transform duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover/btn:translate-x-1" />
                    </Link>
                  </div>
                </div>
              );
            })}
        </div>

        {/* ── Controls & dots ── */}
        {isMulti && !allFailed && (
          <div className="flex items-center gap-4 mt-6 md:mt-8 z-30">
            {/* Dot indicators */}
            <div className="flex items-center gap-2" role="tablist" aria-label="Slide indicators">
              {slides.map((slide, idx) => {
                const isActive = idx === activeIdx;
                const viable = isSlideViable(idx);
                const slideLoaded = imgState[slide.id] === 'loaded' || !slide.url;
                return (
                  <button
                    key={slide.id}
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Go to slide ${idx + 1}`}
                    aria-controls={`hero-slide-${slide.id}`}
                    disabled={!viable}
                    onClick={() => goTo(idx)}
                    className={`h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden relative ${
                      !viable
                        ? 'w-1.5 bg-white/20 opacity-40 cursor-not-allowed'
                        : isActive
                        ? 'w-8 bg-accent cursor-pointer'
                        : 'w-2 bg-white/40 md:bg-text-secondary/30 hover:bg-white/70 md:hover:bg-text-secondary/60 cursor-pointer'
                    }`}
                  >
                    {isActive && slideLoaded && !prefersReduced && (
                      <span
                        key={`prog-${activeIdx}`}
                        className="absolute inset-0 bg-white/60 animate-[progress_5s_linear_forwards]"
                        style={{ transformOrigin: 'left' }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            <span className="text-[10px] tracking-widest uppercase font-mono text-white/70 md:text-text-secondary/70 font-semibold">
              {String(activeIdx + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
            </span>

            {/* Arrow buttons (desktop only) */}
            <div className="hidden md:flex items-center gap-1.5 ml-auto md:ml-4">
              <button
                onClick={goPrev}
                aria-label="Previous slide"
                className="p-2 text-white md:text-text-primary hover:bg-white/10 md:hover:bg-black/5 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-full cursor-pointer"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goNext}
                aria-label="Next slide"
                className="p-2 text-white md:text-text-primary hover:bg-white/10 md:hover:bg-black/5 transition-colors duration-150 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-full cursor-pointer"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Image panel ── */}
      <div className="absolute inset-0 md:relative md:w-1/2 flex justify-center overflow-hidden z-0 self-stretch bg-[#00221A]">
        {/* 0-slides fallback */}
        {!hasSlides && <FallbackBanner />}

        {/* All failed fallback */}
        {allFailed && <FallbackBanner />}

        {/* Slide images */}
        {!allFailed &&
          slides.map((slide, idx) => {
            // Only mount DOM node for: active slide, slide just before/after, and slide 0 always
            const shouldMount =
              idx === 0 ||
              idx === activeIdx ||
              Math.abs(idx - activeIdx) <= 1;

            if (!shouldMount) return null;

            return (
              <SlideImage
                key={slide.id}
                slide={slide}
                isActive={idx === activeIdx}
                priority={imgPriority(idx)}
                state={imgState[slide.id] ?? 'idle'}
                onLoad={handleLoad}
                onError={handleError}
              />
            );
          })}

        {/* Mobile gradient overlay */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[40%] md:hidden pointer-events-none z-10"
          style={{
            background:
              'radial-gradient(160% 140% at 50% 135%, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0) 100%)',
          }}
        />
      </div>
    </section>
  );
}
