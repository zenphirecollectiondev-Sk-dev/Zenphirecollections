/**
 * ProductCardSkeleton
 * Layout-matched skeleton for the Shop grid cards.
 * Uses the exact same aspect-ratio and text placeholder structure as
 * the real product card, so there is zero layout shift when data arrives.
 */

interface Props {
  count?: number;
  viewMode?: "grid" | "list";
}

export function ProductCardSkeleton({ count = 1, viewMode = "grid" }: Props) {
  if (viewMode === "list") {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse flex flex-col rounded-xl overflow-hidden border border-border/60 bg-white w-full min-w-0"
            aria-hidden="true"
          >
            {/* Tall image placeholder */}
            <div className="relative aspect-[3/4] sm:aspect-[4/5] w-full bg-neutral-100" />
            {/* Content placeholders below image */}
            <div className="px-4 pt-3.5 pb-4 space-y-2">
              <div className="h-4 w-3/4 bg-neutral-200 rounded" />
              <div className="h-4 w-1/3 bg-neutral-200 rounded" />
              <div className="flex gap-1 mt-1">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-5 w-7 bg-neutral-100 rounded" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse flex flex-col w-full min-w-0" aria-hidden="true">
          {/* Image placeholder — matches aspect-[3/4] of real card */}
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-neutral-100" />
          {/* Text placeholders matching card pt-3.5 text block */}
          <div className="pt-3.5 space-y-2 w-full min-w-0">
            <div className="h-4 w-3/4 bg-neutral-200 rounded" />
            <div className="h-4 w-1/4 bg-neutral-200 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}
