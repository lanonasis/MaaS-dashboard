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
    // #region agent log
    const logEndpoint = 'http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd';
    const isExt = (
      error.message?.includes('No tab with id') ||
      error.message?.includes('chrome-extension://') ||
      error.message?.includes('moz-extension://') ||
      error.message?.includes('safari-extension://') ||
      error.message?.includes('jamToggleDumpStore') ||
      error.message?.includes('runtime.lastError') ||
      error.message?.includes('mobx-state-tree') ||
      error.message?.includes('detectedLibs') ||
      error.message?.includes('ScreenshotMachineModel') ||
      error.stack?.includes('chrome-extension://') ||
      error.stack?.includes('moz-extension://') ||
      error.stack?.includes('safari-extension://')
    );
    
    const logEntry = {
      location: 'ErrorBoundary:componentDidCatch',
      message: 'Error caught by boundary',
      data: {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        isExtension: isExt
      },
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'initial',
      hypothesisId: 'C'
    };
    
    try {
      fetch(logEndpoint, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(logEntry)
      }).catch(() => {
        // CSP blocked - use localStorage fallback
        try {
          const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
          logs.push(logEntry);
          if (logs.length > 100) logs.shift();
          localStorage.setItem('debug_logs', JSON.stringify(logs));
        } catch(e) {}
      });
    } catch(e) {
      // Fallback to localStorage
      try {
        const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
        logs.push(logEntry);
        if (logs.length > 100) logs.shift();
        localStorage.setItem('debug_logs', JSON.stringify(logs));
      } catch(e2) {}
    }
    // #endregion
    
    // Enhanced extension error detection
    const isExtensionError = 
      error.message?.includes('No tab with id') ||
      error.message?.includes('chrome-extension://') ||
      error.message?.includes('moz-extension://') ||
      error.message?.includes('safari-extension://') ||
      error.message?.includes('jamToggleDumpStore') ||
      error.message?.includes('runtime.lastError') ||
      error.message?.includes('message port closed') ||
      error.message?.includes('mobx-state-tree') ||
      error.message?.includes('detectedLibs') ||
      error.message?.includes('ScreenshotMachineModel') ||
      error.stack?.includes('chrome-extension://') ||
      error.stack?.includes('moz-extension://') ||
      error.stack?.includes('safari-extension://');
    
    if (isExtensionError) {
      // Silently ignore extension errors - they don't affect the app
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
