/**
 * heroSlides.ts
 *
 * ── STEP 1: DATA SHAPE ──
 *
 * The carousel accepts an array of HeroSlide objects.
 * Today we derive them from the existing homepage_config columns via
 * `buildHeroSlidesFromConfig`. In the future, the backend can supply
 * a richer data source and the carousel component needs zero changes.
 *
 * ── BACKEND REQUIREMENT NOTE ──
 * To let the client add unlimited hero images without a code deploy,
 * the backend needs ONE of:
 *
 *   (a) A new JSONB column on homepage_config:
 *         hero_slides jsonb   -- stores HeroSlide[] directly
 *         e.g. [{ "url": "...", "position": "center", "alt": "..." }, ...]
 *
 *   (b) A new dedicated table (preferred for large N / drag-to-reorder):
 *         CREATE TABLE hero_slides (
 *           id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *           image_url   text NOT NULL,
 *           position    text NOT NULL DEFAULT 'center',
 *           alt         text,
 *           sort_order  integer NOT NULL DEFAULT 0,
 *           is_active   boolean NOT NULL DEFAULT true,
 *           created_at  timestamptz DEFAULT now()
 *         );
 *       RLS: anon can SELECT where is_active = true; admin role can INSERT/UPDATE/DELETE.
 *
 * DO NOT implement either option without a backend/migration review.
 */

/** One slide in the hero carousel. */
export interface HeroSlide {
  /** Unique stable key (used as React key + loaded-state map key). */
  id: string;
  /** Absolute storage URL. null = no image (fallback banner shown). */
  url: string | null;
  /** CSS object-position value, e.g. "center", "top", "50% 20%". */
  position: string;
  /** Accessible alt text. */
  alt: string;
  /** Optional custom slide copy */
  titlePart1?: string;
  titleHighlight1?: string;
  titlePart2?: string;
  titleHighlight2?: string;
  description?: string;
  buttonText?: string;
  buttonLink?: string;
}

/**
 * Slide-level copy shown in the text panel.
 * Kept separate from HeroSlide so the image shape stays backend-friendly
 * (the DB should not store presentation copy).
 */
export interface HeroSlideCopy {
  id: string;
  titlePart1: string;
  titleHighlight1: string;
  titlePart2: string;
  titleHighlight2: string;
  description: string;
  buttonText: string;
  buttonLink: string;
}

/** Static copy for the first two slides (matches current hardcoded content). */
export const HERO_SLIDE_COPY: HeroSlideCopy[] = [
  {
    id: 'slide-1',
    titlePart1: 'Raw',
    titleHighlight1: 'Textures',
    titlePart2: 'Minimal',
    titleHighlight2: 'Form',
    description:
      'Organic fabrics, artisan weaves, and relaxed silhouettes designed to stand the test of time. Embodying the true essence of modern simplicity.',
    buttonText: 'Discover Form',
    buttonLink: '/shop',
  },
  {
    id: 'slide-2',
    titlePart1: 'Timeless',
    titleHighlight1: 'Elegance',
    titlePart2: 'Curated',
    titleHighlight2: 'Craft',
    description:
      'Sculpted cuts and versatile essentials engineered for everyday luxury. Elevate your personal style with our latest seasonal collection.',
    buttonText: 'Explore Collection',
    buttonLink: '/shop?sort=newest',
  },
  {
    id: 'slide-3',
    titlePart1: 'Modern',
    titleHighlight1: 'Silhouettes',
    titlePart2: 'Effortless',
    titleHighlight2: 'Grace',
    description:
      'Contemporary silhouettes tailored with meticulous attention to detail. Designed for comfort, styled for everyday presence.',
    buttonText: 'Explore More',
    buttonLink: '/shop?sort=featured',
  },
];

/**
 * Adapter: builds a HeroSlide[] from homepage_config.
 *
 * 1. Checks `cfg.hero_slides` (JSONB array of unlimited slides)
 * 2. Falls back to multi-packed ":::" in `hero_image_url`
 * 3. Falls back to individual `hero_image_url` and `hero_image_url_2` columns
 */
export function buildHeroSlidesFromConfig(cfg: any): HeroSlide[] {
  if (!cfg) return [];

  // 1. First priority: JSONB hero_slides array
  if (Array.isArray(cfg.hero_slides) && cfg.hero_slides.length > 0) {
    return cfg.hero_slides.map((s: any, idx: number) => ({
      id: s.id || `slide-${idx + 1}`,
      url: s.url || null,
      position: s.position || 'center',
      alt: s.alt || `Zenphire Showcase Slide ${idx + 1}`,
      titlePart1: s.titlePart1,
      titleHighlight1: s.titleHighlight1,
      titlePart2: s.titlePart2,
      titleHighlight2: s.titleHighlight2,
      description: s.description,
      buttonText: s.buttonText,
      buttonLink: s.buttonLink,
    }));
  }

  // 2. Second priority: packed ":::" URLs or individual columns
  let rawUrls: string[] = [];
  if (typeof cfg.hero_image_url === 'string' && cfg.hero_image_url.trim()) {
    if (cfg.hero_image_url.includes(':::')) {
      rawUrls = cfg.hero_image_url.split(':::').map((u: string) => u.trim()).filter(Boolean);
    } else {
      rawUrls = [cfg.hero_image_url.trim()];
    }
  }

  if (typeof cfg.hero_image_url_2 === 'string' && cfg.hero_image_url_2.trim()) {
    const url2 = cfg.hero_image_url_2.trim();
    if (!rawUrls.includes(url2)) {
      if (rawUrls.length === 1) {
        rawUrls.push(url2);
      } else if (rawUrls.length > 1) {
        rawUrls[1] = url2;
      } else {
        rawUrls.push(url2);
      }
    }
  }

  let rawPositions: string[] = [];
  if (typeof cfg.hero_image_position === 'string' && cfg.hero_image_position.trim()) {
    if (cfg.hero_image_position.includes(':::')) {
      rawPositions = cfg.hero_image_position.split(':::').map((p: string) => p.trim());
    } else {
      rawPositions = [cfg.hero_image_position.trim()];
    }
  }

  if (typeof cfg.hero_image_position_2 === 'string' && cfg.hero_image_position_2.trim()) {
    const pos2 = cfg.hero_image_position_2.trim();
    if (rawPositions.length <= 1) {
      rawPositions[1] = pos2;
    }
  }

  if (rawUrls.length === 0) {
    return [
      { id: 'slide-1', url: null, position: 'center', alt: 'Zenphire Editorial Showcase' },
    ];
  }

  return rawUrls.map((url, idx) => ({
    id: `slide-${idx + 1}`,
    url: url || null,
    position: rawPositions[idx] || 'center',
    alt: `Zenphire Showcase Slide ${idx + 1}`,
  }));
}

/**
 * Returns the first slide URL from localStorage (if any) so we can start
 * preloading before the Supabase fetch resolves on cold renders.
 */
export function getPersistedFirstSlideUrl(): string | null {
  try {
    const raw = localStorage.getItem('zenphire_homepage_config');
    if (!raw) return null;
    const cfg = JSON.parse(raw);
    const slides = buildHeroSlidesFromConfig(cfg);
    return slides[0]?.url ?? null;
  } catch {
    return null;
  }
}
