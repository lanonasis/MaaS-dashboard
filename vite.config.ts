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
    exclude: ['@lanonasis/memory-client'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Node modules
          if (id.includes('node_modules')) {
            // React and core dependencies
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            // Supabase
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            // Radix UI components
            if (id.includes('@radix-ui')) {
              return 'vendor-radix';
            }
            // Chart libraries
            if (id.includes('recharts') || id.includes('victory')) {
              return 'vendor-charts';
            }
            // Form libraries
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
              return 'vendor-forms';
            }
            // Query libraries
            if (id.includes('@tanstack/react-query')) {
              return 'vendor-query';
            }
            // Date libraries
            if (id.includes('date-fns')) {
              return 'vendor-dates';
            }
            // Other large dependencies
            if (id.includes('i18next') || id.includes('react-i18next')) {
              return 'vendor-i18n';
            }
            // Everything else from node_modules
            return 'vendor-other';
          }
          // Large local modules
          if (id.includes('/orchestrator/') || id.includes('/components/orchestrator/')) {
            return 'chunk-orchestrator';
          }
          if (id.includes('/mcp/') || id.includes('/components/mcp/')) {
            return 'chunk-mcp';
          }
          if (id.includes('/dashboard/') && !id.includes('/components/dashboard/')) {
            return 'chunk-dashboard';
          }
        },
      },
    },
    // Increase chunk size warning limit to 1500kb (gzipped will be much smaller)
    chunkSizeWarningLimit: 1500,
    // Ensure proper module resolution
    target: 'esnext',
    minify: 'esbuild',
    // Enable source maps for production debugging
    sourcemap: false,
  },
}));
