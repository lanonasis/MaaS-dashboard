import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '2rem', 
          margin: '2rem', 
          border: '2px solid red',
          borderRadius: '8px',
          backgroundColor: '#fee',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <h1 style={{ color: 'red', marginBottom: '1rem' }}>Something went wrong</h1>
          <details style={{ whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
            <summary style={{ cursor: 'pointer', marginBottom: '1rem', fontWeight: 'bold' }}>
              Click for error details
            </summary>
            <p><strong>Error:</strong></p>
            <pre style={{ 
              backgroundColor: '#fff', 
              padding: '1rem', 
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.error?.stack}
            </pre>
          </details>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
