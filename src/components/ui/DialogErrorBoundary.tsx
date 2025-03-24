import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Optional callback for when an error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component specifically designed for dialogs
 * Captures errors in dialog components to prevent the entire UI from crashing
 */
class DialogErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Dialog Error:", error, errorInfo);
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div 
          className="p-4 border border-red-500 rounded bg-red-50 text-red-700"
          role="alert"
          aria-live="assertive"
        >
          <h3 className="font-bold">Dialog Error</h3>
          <p>{this.state.error?.message || "An unexpected error occurred"}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default DialogErrorBoundary; 