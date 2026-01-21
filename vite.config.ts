import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Set base path for proper asset resolution
  base: '/', // Since we're deploying to dashboard.lanonasis.com root
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      clientPort: 5000
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@shared", replacement: path.resolve(__dirname, "./shared") },
      { find: "@assets", replacement: path.resolve(__dirname, "./attached_assets") },
      {
        find: /^@lanonasis\/mem-intel-sdk\/react$/,
        replacement: path.resolve(
          __dirname,
          "../../packages/mem-intel-sdk/mem-intelligence-sdk/src/react/index.ts",
        ),
      },
      {
        find: /^@lanonasis\/mem-intel-sdk$/,
        replacement: path.resolve(
          __dirname,
          "../../packages/mem-intel-sdk/mem-intelligence-sdk/src/index-sdk.ts",
        ),
      },
      // Stub out Node.js modules that shouldn't be bundled for browser
      {
        find: "child_process",
        replacement: path.resolve(__dirname, "./src/lib/stubs/child_process.ts"),
      },
      {
        find: "util",
        replacement: path.resolve(__dirname, "./src/lib/stubs/util.ts"),
      },
    ],
  },
  optimizeDeps: {
    exclude: ['@lanonasis/memory-client', '@lanonasis/mem-intel-sdk'],
  },
  build: {
    // Allow Rollup to determine optimal chunk boundaries to prevent
    // accidental circular dependencies between vendor bundles
    chunkSizeWarningLimit: 1500,
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
  },
}));
