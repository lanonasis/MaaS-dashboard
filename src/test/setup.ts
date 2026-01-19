import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
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
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_AUTH_GATEWAY_URL: 'https://api.lanonasis.com',
    VITE_CORE_API_BASE_URL: 'https://api.lanonasis.com',
    MODE: 'test'
  }
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
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
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
