/**
 * ErrorState
 * Reusable error panel with a Retry button.
 * Used by: Shop (query failure / RLS returning 0 rows), Search errors, etc.
 */

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "We had trouble loading products. Please check your connection and try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-bg-subtle border border-border anim-fade-in rounded-sm">
      <div className="w-16 h-16 rounded-full bg-white border border-border flex items-center justify-center mb-5">
        <AlertTriangle size={28} className="text-sale/60" />
      </div>
      <h3 className="font-heading font-medium text-lg text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-secondary max-w-xs leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-6 btn btn-primary px-6 py-2.5 text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <RefreshCw size={13} />
          Try again
        </button>
      )}
    </div>
  );
}
