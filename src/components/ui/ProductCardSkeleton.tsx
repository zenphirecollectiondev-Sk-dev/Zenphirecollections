/**
 * ProductCardSkeleton
 * Layout-matched skeleton for the Shop grid cards.
 * Uses the exact same aspect-ratio and text placeholder structure as
 * the real product card, so there is zero layout shift when data arrives.
 */

interface Props {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse" aria-hidden="true">
          {/* Image placeholder — matches aspect-[3/4] of real card */}
          <div className="aspect-[3/4] w-full bg-zinc-100 border border-zinc-200 mb-3 rounded-sm" />
          {/* Text placeholders */}
          <div className="space-y-2">
            <div className="h-2 w-10 bg-zinc-100 rounded" />
            <div className="h-3 w-3/4 bg-zinc-200 rounded" />
            <div className="h-3 w-1/4 bg-zinc-200 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
