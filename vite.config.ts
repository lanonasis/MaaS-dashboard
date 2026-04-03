import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
    mcpRouterDocsAliasPlugin(),
    react(),
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
