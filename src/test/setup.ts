import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock localStorage — real Map-backed implementation for auth tests
// that need setItem/getItem to actually store/retrieve data.
// ---------------------------------------------------------------------------
const localStorageStore = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { localStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { localStorageStore.delete(key); }),
  clear: vi.fn(() => { localStorageStore.clear(); }),
  get length() { return localStorageStore.size; },
  key: vi.fn((index: number) => Array.from(localStorageStore.keys())[index] ?? null),
};

// Mock sessionStorage — same real Map-backed implementation
const sessionStorageStore = new Map<string, string>();
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStorageStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStorageStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { sessionStorageStore.delete(key); }),
  clear: vi.fn(() => { sessionStorageStore.clear(); }),
  get length() { return sessionStorageStore.size; },
  key: vi.fn((index: number) => Array.from(sessionStorageStore.keys())[index] ?? null),
};

// Ensure localStorage is available globally
if (typeof global.localStorage === 'undefined') {
  global.localStorage = localStorageMock as unknown as Storage;
}

if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = sessionStorageMock as unknown as Storage;
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
  configurable: true,
});

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock window.location
delete (window as any).location;
(window as any).location = { 
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn()
};

// Mock environment variables
// Also set fallback values for variables that direct-auth.ts and other
// modules require even in test mode (not all VITE_ vars are defined by defineConfig)
Object.defineProperty(import.meta, 'env', {
  value: {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([k]) => k.startsWith('VITE_') || k === 'NODE_ENV')
    ),
    VITEST: true,
    VITE_AUTH_GATEWAY_URL: 'https://api.lanonasis.com',
    VITE_CORE_API_BASE_URL: 'https://api.lanonasis.com',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key',
    MODE: 'test',
  },
  configurable: true,
  writable: true,
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
global.ResizeObserver = MockResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  root: Element | null = null;
  rootMargin: string = '';
  thresholds: number[] = [];
  
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
global.IntersectionObserver = MockIntersectionObserver;

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

if (!HTMLElement.prototype.hasPointerCapture) {
  HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.setPointerCapture) {
  HTMLElement.prototype.setPointerCapture = () => {};
}
if (!HTMLElement.prototype.releasePointerCapture) {
  HTMLElement.prototype.releasePointerCapture = () => {};
}
if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

beforeAll(() => {
  // Clear all mocks before each test suite
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});
