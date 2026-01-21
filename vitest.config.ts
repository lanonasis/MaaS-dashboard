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
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      { find: '@shared', replacement: path.resolve(__dirname, './shared') },
      { find: '@assets', replacement: path.resolve(__dirname, './attached_assets') },
      {
        find: /^@lanonasis\/mem-intel-sdk\/react$/,
        replacement: path.resolve(
          __dirname,
          '../../packages/mem-intel-sdk/mem-intelligence-sdk/src/react/index.ts'
        )
      },
      {
        find: /^@lanonasis\/mem-intel-sdk$/,
        replacement: path.resolve(
          __dirname,
          '../../packages/mem-intel-sdk/mem-intelligence-sdk/src/index-sdk.ts'
        )
      },
      // Match the app's Vite config for browser-only stubs.
      {
        find: 'child_process',
        replacement: path.resolve(__dirname, './src/lib/stubs/child_process.ts')
      },
      {
        find: 'util',
        replacement: path.resolve(__dirname, './src/lib/stubs/util.ts')
      }
    ]
  }
});
