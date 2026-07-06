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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-2xl mx-auto mt-10 border border-sale/20 bg-bg-subtle text-text-primary">
          <h2 className="text-base font-heading font-black uppercase text-sale mb-2">Application Render Error</h2>
          <p className="text-xs font-semibold mb-4">{this.state.error?.message}</p>
          <pre className="text-[10px] overflow-x-auto p-4 bg-white border border-border font-mono text-text-secondary">
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-accent text-white px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-accent-hover transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
