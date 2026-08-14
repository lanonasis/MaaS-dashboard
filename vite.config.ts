import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

const MCP_ROUTER_DOCS_PATH = "/docs/mcp-router";
const MCP_ROUTER_DOCS_TARGET = "/docs/mcp-router/index.html";

const mcpRouterDocsAliasPlugin = (): Plugin => ({
  name: "mcp-router-docs-alias",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === MCP_ROUTER_DOCS_PATH) {
        req.url = MCP_ROUTER_DOCS_TARGET;
      }
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === MCP_ROUTER_DOCS_PATH) {
        req.url = MCP_ROUTER_DOCS_TARGET;
      }
      next();
    });
  },
});

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // Set base path for proper asset resolution
  base: '/', // Since we're deploying to dashboard.lanonasis.com root
  server: {
    host: "0.0.0.0",
    port: parseInt(process.env.PORT ?? "5000"),
    allowedHosts: true,
    hmr: {
      clientPort: parseInt(process.env.PORT ?? "5000"),
    },
    watch: {
      // Ignore cache directories to prevent file descriptor exhaustion
      ignored: ['**/.cache/**', '**/node_modules/.cache/**', '**/.local/**']
    }
  },
  plugins: [
    mcpRouterDocsAliasPlugin(),
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      strategies: 'generateSW',
      workbox: {
        // Precache only the hashed build assets and the application shell.
        // Do not add runtime caching routes for API responses, auth tokens,
        // user memories, or any private tenant data.
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff,woff2,json}',
        ],
        globIgnores: [
          // Exclude development/test helpers from the installable shell
          '**/test-token-exchange.html',
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          // Never serve the app shell for API/auth/provider callbacks or diagnostics
          /^\/api\//,
          /^\/auth\//,
          /^\/oauth\//,
          /^\/mcp\//,
          /^\/device\//,
          /^\/\.well-known\//,
          /^\/test-/,
          // Exclude Supabase and other OAuth callback paths
          /\/callback/,
          /\/authorize/,
        ],
        runtimeCaching: [
          {
            // Public build assets only; stale-while-revalidate with immutable hash
            urlPattern: ({ request }) => request.destination === 'image' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-media',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
        ],
        // Do not cache opaque responses that might contain user data
        ignoreURLParametersMatching: [/^utm_/, /^fbclid$/],
      },
      manifest: false, // Use the existing public/manifest.json
      includeAssets: ['robots.txt'],
      devOptions: {
        enabled: false, // Do not register SW in dev to avoid stale shells
      },
    }),
  ],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: "@shared", replacement: path.resolve(__dirname, "./shared") },
      { find: "@assets", replacement: path.resolve(__dirname, "./attached_assets") },
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
    entries: ['index.html'],
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
