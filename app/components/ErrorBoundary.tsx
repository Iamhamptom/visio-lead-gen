'use client';

import React from 'react';
import { logError } from '@/lib/error-logger';

interface Props {
  children: React.ReactNode;
  /** Optional context label for error logs (e.g. "ChatView", "Billing") */
  context?: string;
}

interface State {
  hasError: boolean;
  errorId?: string;
}

/**
 * Catches unhandled React render errors and shows a friendly recovery UI
 * instead of a blank white screen. Logs the full error internally.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    const entry = logError(error, this.props.context ?? 'ErrorBoundary');
    this.setState({ errorId: entry.id });

    // Also log the component stack for debugging
    if (info.componentStack) {
      logError(`Component stack: ${info.componentStack}`, `${this.props.context ?? 'ErrorBoundary'}:componentStack`);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorId: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center">
          <div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-white/90 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-white/50 mb-6 max-w-md">
            An unexpected error occurred. Our team has been notified.
          </p>
          <button
            onClick={this.handleRetry}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white/80 text-sm rounded-lg transition-colors border border-white/10"
          >
            Try again
          </button>
          {this.state.errorId && (
            <p className="mt-4 text-[10px] text-white/20 font-mono select-all">
              Ref: {this.state.errorId.slice(0, 8)}
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
