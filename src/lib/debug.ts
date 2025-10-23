/**
 * Debug utility for conditional logging
 * Set VITE_DEBUG=true in .env to enable debug logs
 */

const DEBUG = import.meta.env.VITE_DEBUG === 'true' || import.meta.env.DEV;

export const debug = {
  log: (...args: unknown[]) => {
    if (DEBUG) {
      console.log(...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (DEBUG) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]) => {
    // Always log errors
    console.error(...args);
  },
  info: (...args: unknown[]) => {
    if (DEBUG) {
      console.info(...args);
    }
  },
};
