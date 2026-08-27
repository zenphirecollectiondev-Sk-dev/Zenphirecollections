/**
 * EmptyState
 * Reusable branded empty-state panel.
 * Used by: Shop (zero active products), Search (no hits), Wishlist (empty).
 */

import { PackageSearch } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({
  title = "Nothing here yet",
  message = "We couldn't find any products for this selection.",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-bg-subtle border border-border anim-fade-in rounded-sm">
      <div className="w-16 h-16 rounded-full bg-white border border-border flex items-center justify-center mb-5">
        <PackageSearch size={28} className="text-text-secondary/40" />
      </div>
      <h3 className="font-heading font-medium text-lg text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 btn btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
