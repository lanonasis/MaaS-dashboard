import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import styles from "./ErrorBoundary.module.css";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate a unique error ID for tracking
    const errorId = `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return { 
      hasError: true, 
      error,
      errorId,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Enhanced extension error detection
    const isExtensionError =
      error.message?.includes("No tab with id") ||
      error.message?.includes("chrome-extension://") ||
      error.message?.includes("moz-extension://") ||
      error.message?.includes("safari-extension://") ||
      error.message?.includes("jamToggleDumpStore") ||
      error.message?.includes("runtime.lastError") ||
      error.message?.includes("message port closed") ||
      error.message?.includes("mobx-state-tree") ||
      error.message?.includes("detectedLibs") ||
      error.message?.includes("ScreenshotMachineModel") ||
      error.stack?.includes("chrome-extension://") ||
      error.stack?.includes("moz-extension://") ||
      error.stack?.includes("safari-extension://");

    if (isExtensionError) {
      // Silently ignore extension errors - they don't affect the app
      return;
    }

    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI with theme-aware styling
      return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
          <div className="w-full max-w-2xl space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="text-xl font-semibold">
                Something went wrong
              </AlertTitle>
              <AlertDescription className="mt-2">
                An unexpected error occurred. You can try again or reload the page.
                {this.state.errorId && (
                  <span className="block mt-2 text-xs text-muted-foreground">
                    Error ID: {this.state.errorId}
                  </span>
                )}
              </AlertDescription>
            </Alert>

            <details className="border rounded-lg p-4 bg-card">
              <summary className="cursor-pointer font-medium text-sm mb-2">
                Technical Details (for debugging)
              </summary>
              <div className="mt-2 space-y-2">
                <p className="text-sm font-medium">Error Message:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {this.state.error?.toString()}
                </pre>
                {this.state.error?.stack && (
                  <>
                    <p className="text-sm font-medium mt-4">Stack Trace:</p>
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-60">
                      {this.state.error.stack}
                    </pre>
                  </>
                )}
              </div>
            </details>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
