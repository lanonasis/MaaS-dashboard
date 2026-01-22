import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SupabaseAuthProvider } from "@/hooks/useSupabaseAuth";
import { CentralAuthProvider } from "@/hooks/useCentralAuth";
import { MemoryIntelligenceProvider } from "@/hooks/useMemoryIntelligence";
import { ThemeProvider } from "@/hooks/useTheme";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AIAssistant } from "@/components/ai/AIAssistant";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import ApiDocs from "./pages/ApiDocs";
import ApiAnalytics from "./pages/ApiAnalytics";
import OAuthAuthorize from "./pages/OAuthAuthorize";
import SupabaseAuthRedirect from "./components/auth/SupabaseAuthRedirect";
import {
  createIDBPersister,
  MAX_CACHE_AGE,
  CACHE_BUSTER_VERSION,
} from "@/lib/query-persister";

/**
 * Optimized QueryClient configuration for fast page loads
 *
 * Key optimizations:
 * - staleTime: Data considered fresh for 5 min (reduces refetches)
 * - gcTime: Keep unused data for 30 min (enables instant back-navigation)
 * - refetchOnWindowFocus: Disabled (prevents unnecessary refetches)
 * - refetchOnReconnect: Enabled (sync after network recovery)
 * - retry with backoff: Handles transient failures gracefully
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
    },
  },
});

/**
 * IndexedDB persister for cache persistence across page reloads
 * Excludes sensitive data (API keys, auth tokens, profiles)
 */
const persister = createIDBPersister();

/**
 * Persistence options - controls how cache is restored
 */
const persistOptions = {
  persister,
  maxAge: MAX_CACHE_AGE,
  buster: String(CACHE_BUSTER_VERSION),
};

const App = () => (
  <PersistQueryClientProvider
    client={queryClient}
    persistOptions={persistOptions}
  >
    <ThemeProvider>
      <TooltipProvider>
        <BrowserRouter>
          <SupabaseAuthProvider>
            <MemoryIntelligenceProvider>
              <CentralAuthProvider>
                <Toaster />
                <Sonner />
                <AIAssistant />
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/auth/*" element={<SupabaseAuthRedirect />} />
                  <Route path="/login" element={<SupabaseAuthRedirect />} />
                  <Route path="/register" element={<SupabaseAuthRedirect />} />
                  <Route path="/signin" element={<SupabaseAuthRedirect />} />
                  <Route path="/signup" element={<SupabaseAuthRedirect />} />
                  <Route path="/landing" element={<Index />} />
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/memory-visualizer"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/memory-analytics"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/mcp-tracking"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/scheduler"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/api-keys"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/orchestrator"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/ai-tools"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/extensions"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/mcp-services"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/dashboard/mcp-usage"
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/docs" element={<ApiDocs />} />
                  <Route path="/api-analytics" element={<ApiAnalytics />} />
                  <Route path="/mcp/connect" element={<Index />} />
                  <Route path="/oauth/authorize" element={<OAuthAuthorize />} />
                  <Route path="/device" element={<OAuthAuthorize />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </CentralAuthProvider>
            </MemoryIntelligenceProvider>
          </SupabaseAuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;
