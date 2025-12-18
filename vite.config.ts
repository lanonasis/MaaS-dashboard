import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Set base path for proper asset resolution
  base: '/', // Since we're deploying to dashboard.LanOnasis.com root
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    hmr: {
      clientPort: 5000
    },
    watch: {
      // Ignore cache directories to prevent file descriptor exhaustion
      ignored: ['**/.cache/**', '**/node_modules/.cache/**', '**/.local/**']
    }
  },
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./attached_assets"),
      // Stub out Node.js modules that shouldn't be bundled for browser
      'child_process': path.resolve(__dirname, "./src/lib/stubs/child_process.ts"),
      'util': path.resolve(__dirname, "./src/lib/stubs/util.ts"),
    },
  },
  optimizeDeps: {
    exclude: ['@lanonasis/memory-client', '@lanonasis/mem-intel-sdk'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks to avoid circular dependencies
          vendor: ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Ensure proper module resolution
    target: 'esnext',
    minify: 'esbuild',
  },
}));
