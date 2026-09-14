import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log internally for developer debugging — never exposed to the user
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-md mx-auto mt-20 text-center text-text-primary">
          <h2 className="text-base font-heading font-bold uppercase tracking-wider mb-3">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed mb-6">
            We encountered an unexpected error. Please reload the page or return to the homepage.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="btn px-5 py-2.5 text-xs font-bold uppercase tracking-widest border border-border hover:bg-bg-subtle transition-colors"
            >
              Go Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
