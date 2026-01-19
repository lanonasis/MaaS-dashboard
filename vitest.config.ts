import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 15000, // Increase timeout for async component tests
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'src/archived/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/archived/',
        'src/test/',
        '**/*.d.ts'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
      '@assets': path.resolve(__dirname, './attached_assets'),
      // Match the app's Vite config for browser-only stubs.
      child_process: path.resolve(__dirname, './src/lib/stubs/child_process.ts'),
      util: path.resolve(__dirname, './src/lib/stubs/util.ts')
    }
  }
});
