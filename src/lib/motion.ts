/**
 * Zenphire — Shared Motion Constants
 *
 * Single source of truth for Framer Motion animations.
 * Mirrors the CSS design tokens in index.css:
 *   --ease          → EASE
 *   --ease-enter    → EASE_ENTER
 *   --dur-fast      → DUR.fast   (150ms)
 *   --dur-base      → DUR.base   (300ms)
 *   --dur-enter     → DUR.enter  (500ms)
 *
 * Usage:
 *   import { EASE, EASE_ENTER, DUR, t, backdropVariants, modalVariants } from '../lib/motion';
 */

// ─── Easing ───────────────────────────────────────────────────────────────────

/** Standard easing — natural deceleration (matches --ease in CSS) */
export const EASE = [0.4, 0, 0.2, 1] as const;

/** Entrance spring — confident, no overshoot (matches --ease-enter in CSS) */
export const EASE_ENTER = [0.22, 1, 0.36, 1] as const;

// ─── Durations (in seconds, for Framer Motion) ────────────────────────────────

export const DUR = {
  /** 150ms — micro-interactions: hover states, small reveals */
  fast: 0.15,
  /** 300ms — enter/exit: drawers, modals, overlays */
  base: 0.30,
  /** 500ms — page-level: section entrances, large reveals */
  enter: 0.50,
} as const;

// ─── Shorthand transition objects ─────────────────────────────────────────────

export const t = {
  fast:   { duration: DUR.fast,  ease: EASE },
  base:   { duration: DUR.base,  ease: EASE },
  enter:  { duration: DUR.enter, ease: EASE_ENTER },
  spring: { type: 'tween' as const, duration: DUR.base, ease: EASE_ENTER },
} as const;

// ─── Shared variants ──────────────────────────────────────────────────────────

/** Simple opacity backdrop */
export const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base,  ease: EASE } },
  exit:    { opacity: 0, transition: { duration: DUR.fast,  ease: EASE } },
};

/** Slide-in from the right (Cart Drawer) */
export const drawerRightVariants = {
  hidden:  { x: '100%' },
  visible: { x: 0,    transition: { type: 'tween' as const, duration: 0.32, ease: EASE_ENTER } },
  exit:    { x: '100%', transition: { type: 'tween' as const, duration: DUR.base, ease: EASE } },
};

/** Slide-in from the left (Mobile Menu) */
export const drawerLeftVariants = {
  hidden:  { x: '-100%' },
  visible: { x: 0,      transition: { type: 'tween' as const, duration: 0.32, ease: EASE_ENTER } },
  exit:    { x: '-100%', transition: { type: 'tween' as const, duration: DUR.base, ease: EASE } },
};

/** Modal / dialog panel — scale + fade */
export const modalVariants = {
  hidden:  { opacity: 0, scale: 0.97, y: 10 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: DUR.base, ease: EASE_ENTER } },
  exit:    { opacity: 0, scale: 0.97, y: 10, transition: { duration: DUR.fast, ease: EASE } },
};

/** Bottom sheet — slides up from screen bottom */
export const sheetVariants = {
  hidden:  { y: '100%', opacity: 0 },
  visible: { y: 0,      opacity: 1, transition: { type: 'tween' as const, duration: DUR.base, ease: EASE_ENTER } },
  exit:    { y: '100%', opacity: 0, transition: { type: 'tween' as const, duration: DUR.fast, ease: EASE } },
};

/** Accordion height expand (FAQ, mobile nav sections) */
export const accordionVariants = {
  hidden:  { height: 0,      opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: DUR.fast, ease: EASE } },
  exit:    { height: 0,      opacity: 0, transition: { duration: DUR.fast, ease: EASE } },
};

/** Container that staggers its children */
export const staggerContainer = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.04 } },
};

/** Individual stagger child (fade + tiny rise) */
export const staggerChild = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: DUR.fast, ease: EASE_ENTER } },
};

/** Simple fade in / out */
export const fadeInVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
  exit:    { opacity: 0, transition: { duration: DUR.fast, ease: EASE } },
};
