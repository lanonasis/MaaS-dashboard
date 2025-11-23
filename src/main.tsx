import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './i18n'
import { ErrorBoundary } from './components/ErrorBoundary'

// Global error handler to filter out Chrome extension errors
window.addEventListener('error', (event) => {
  const isExtensionError = 
    event.message?.includes('No tab with id') ||
    event.message?.includes('chrome-extension://') ||
    event.filename?.includes('chrome-extension://');
  
  if (isExtensionError) {
    event.preventDefault(); // Prevent error from showing in console
    if (process.env.NODE_ENV === 'development') {
      console.warn('Chrome extension error (suppressed):', event.message);
    }
  }
});

// Handle unhandled promise rejections from extensions
window.addEventListener('unhandledrejection', (event) => {
  const error = event.reason;
  const isExtensionError = 
    (typeof error === 'string' && error.includes('No tab with id')) ||
    (error?.message?.includes('No tab with id')) ||
    (error?.message?.includes('chrome-extension://')) ||
    (error?.stack?.includes('chrome-extension://'));
  
  if (isExtensionError) {
    event.preventDefault(); // Prevent error from showing in console
    if (process.env.NODE_ENV === 'development') {
      console.warn('Chrome extension promise rejection (suppressed):', error);
    }
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
