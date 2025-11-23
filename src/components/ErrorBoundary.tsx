import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

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
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Filter out Chrome extension errors (they're not app errors)
    const isExtensionError = 
      error.message?.includes('No tab with id') ||
      error.message?.includes('chrome-extension://') ||
      error.stack?.includes('chrome-extension://');
    
    if (isExtensionError) {
      // Silently ignore extension errors - they don't affect the app
      if (process.env.NODE_ENV === 'development') {
        console.warn('Chrome extension error (ignored):', error.message);
      }
      return;
    }
    
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className={styles.errorContainer}>
          <h1 className={styles.errorTitle}>Something went wrong</h1>
          <details className={styles.errorDetails}>
            <summary className={styles.errorSummary}>
              Click for error details
            </summary>
            <p><strong>Error:</strong></p>
            <pre className={styles.errorPre}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className={styles.reloadButton}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
