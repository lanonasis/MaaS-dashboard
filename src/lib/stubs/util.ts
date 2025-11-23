// Browser stub for Node.js util module
// These stubs prevent errors when Node.js modules are imported in browser code
// They return no-op functions instead of throwing to avoid breaking the app

export const promisify = <T extends (...args: any[]) => any>(fn: T) => {
  // Return a function that returns a rejected promise
  // This prevents runtime errors while clearly indicating the function isn't available
  return (...args: Parameters<T>): Promise<any> => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('util.promisify is not available in browser. This is expected for browser-only code.');
    }
    return Promise.reject(new Error('util.promisify is not available in browser'));
  };
};

export const inspect = (obj: any, options?: any): string => {
  if (process.env.NODE_ENV === 'development') {
    console.warn('util.inspect is not available in browser. Using JSON.stringify instead.');
  }
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
};

export const format = (format: string, ...args: any[]): string => {
  // Simple format implementation for browser
  return format.replace(/%[sdj%]/g, (match) => {
    if (match === '%%') return '%';
    const arg = args.shift();
    if (match === '%s') return String(arg);
    if (match === '%d') return Number(arg).toString();
    if (match === '%j') return JSON.stringify(arg);
    return match;
  });
};

export const types = {
  isPromise: (obj: any): boolean => {
    return obj instanceof Promise || (obj && typeof obj.then === 'function');
  }
};

// Export default to match Node.js util module structure
export default {
  promisify,
  inspect,
  format,
  types
};
