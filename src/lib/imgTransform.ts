/**
 * imgTransform
 *
 * Currently disabled because Image Transformation is a Supabase Pro feature.
 * Returning the original Storage URL.
 */

export interface ImgTransformOptions {
  width?: number;
  quality?: number;
}

export function imgTransform(
  url: string | null | undefined,
  options?: ImgTransformOptions
): string {
  if (!url) return '';
  return url;
}

/** Full-width hero / editorial banner */
export const imgHero  = (url: string | null | undefined) => imgTransform(url);
/** Product card grid thumbnail */
export const imgCard  = (url: string | null | undefined) => imgTransform(url);
/** 68px thumbnail strip */
export const imgThumb = (url: string | null | undefined) => imgTransform(url);
