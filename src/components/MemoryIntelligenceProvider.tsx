/* MemoryIntelligenceProvider — SDK wrapper extracted from useMemoryIntelligence.tsx (F-040/S-1).
   Provides MemoryIntelligenceContext with core methods for data hooks to consume. */

import {
  createContext,
  useContext,
  useMemo,
  useCallback,
  type ReactNode,
} from "react";
import {
  MemoryIntelligenceProvider as SdkMemoryIntelligenceProvider,
  useMemoryIntelligence as useSdkMemoryIntelligence,
} from "@lanonasis/mem-intel-sdk/react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  normalizePatternAnalysis,
  mapHealthResult,
  mapInsights,
  mapDuplicates,
} from "@/lib/intelligence/normalize";
import {
  buildPatternAnalysis,
  buildHealthCheck,
} from "@/lib/intelligence/fallback";
import type {
  PatternAnalysis,
  PatternAnalysisWire,
  HealthCheckResult,
  InsightResult,
  DuplicatePair,
} from "@/lib/intelligence/types";
import type { QueryScopeValue, MemoryTypeValue } from "@lanonasis/mem-intel-sdk";

const DEFAULT_INTEL_API_URL = "https://api.lanonasis.com/api/v1";

const API_KEY_ENV_VARS = [
  "VITE_MEM_INTEL_API_KEY",
  "VITE_MEMORY_INTEL_API_KEY",
  "VITE_MEM_INTEL_SDK_KEY",
  "VITE_MEMORY_INTELLIGENCE_API_KEY",
] as const;

const API_URL_ENV_VARS = [
  "VITE_MEM_INTEL_API_URL",
  "VITE_MEMORY_INTEL_API_URL",
  "VITE_MEM_INTEL_SDK_URL",
  "VITE_MEMORY_INTELLIGENCE_API_URL",
  "VITE_MEM_INTEL_URL",
  "VITE_MEMORY_INTEL_URL",
] as const;

const getEnvValue = (keys: readonly string[]) => {
  const env = import.meta.env as Record<string, string | undefined>;
  for (const key of keys) {
    const value = env[key];
    if (value && value.trim()) return value.trim();
  }
  return null;
};

const normalizeApiUrl = (value: string) => value.replace(/\/$/, "");
const isUsableKey = (value?: string | null) =>
  Boolean(value && value.startsWith("lano_"));

const ENV_API_KEY = getEnvValue(API_KEY_ENV_VARS);
const ENV_API_URL = getEnvValue(API_URL_ENV_VARS) || DEFAULT_INTEL_API_URL;

/* ---- SdkProviderContext (lightweight auth state) ---- */
interface SdkProviderCtx {
  userId: string | null;
  canAuth: boolean;
  isKeyLoading: boolean;
}

const SdkProviderContext = createContext<SdkProviderCtx | null>(null);

export function useSdkProviderContext(): SdkProviderCtx {
  const ctx = useContext(SdkProviderContext);
  if (!ctx) {
    throw new Error(
      "useSdkProviderContext must be used within MemoryIntelligenceProvider",
    );
  }
  return ctx;
}

/* ---- MemoryIntelligenceContext (core methods + derived state) ---- */
export interface IntelligenceQueryContext {
  organizationId?: string;
  topicId?: string;
  queryScope?: QueryScopeValue;
  memoryTypes?: MemoryTypeValue[];
}

interface MemoryIntelligenceContextValue {
  userId: string | null;
  isReady: boolean;
  isKeyLoading: boolean;
  analyzePatterns: (
    timeRangeDays?: number,
    context?: IntelligenceQueryContext,
  ) => Promise<PatternAnalysis | null>;
  getHealthCheck: (
    context?: IntelligenceQueryContext,
  ) => Promise<HealthCheckResult | null>;
  extractInsights: (
    topic?: string,
    context?: IntelligenceQueryContext,
  ) => Promise<InsightResult[]>;
  detectDuplicates: (
    threshold?: number,
    context?: IntelligenceQueryContext,
  ) => Promise<DuplicatePair[]>;
}

const MemoryIntelligenceContext =
  createContext<MemoryIntelligenceContextValue | null>(null);

export function useMemoryIntelligence(): MemoryIntelligenceContextValue {
  const context = useContext(MemoryIntelligenceContext);
  if (!context) {
    throw new Error(
      "useMemoryIntelligence must be used within MemoryIntelligenceProvider",
    );
  }
  return context;
}

/* ---- Helper: getHealthTotalMemories (pure, no dependencies) ---- */
const getHealthTotalMemories = (health: unknown): number | null => {
  if (!health) return null;
  const h = health as {
    metrics?: { total_memories?: number };
    statistics?: { total_memories?: number };
  };
  return h.metrics?.total_memories ?? h.statistics?.total_memories ?? null;
};

/* ---- Inner SDK wrapper — defines core methods AND provides both contexts ---- */
function MemoryIntelligenceProviderInner({
  children,
  userId,
  canAuth,
  isKeyLoading,
}: {
  children: ReactNode;
  userId: string | null;
  canAuth: boolean;
  isKeyLoading: boolean;
}) {
  const client = useSdkMemoryIntelligence();
  const isReady = Boolean(userId && canAuth);

  const analyzePatterns = useCallback(
    async (
      timeRangeDays = 30,
      context: IntelligenceQueryContext = {},
    ): Promise<PatternAnalysis | null> => {
      if (!userId || !canAuth) return null;
      let apiResult: PatternAnalysis | null = null;
      try {
        const response = await client.analyzePatterns({
          userId,
          timeRangeDays,
          responseFormat: "json",
          ...context,
        });
        apiResult = normalizePatternAnalysis(
          response.data as PatternAnalysisWire | null | undefined,
        );
      } catch (error) {
        console.error("Memory intelligence pattern analysis error:", error);
      }
      if (apiResult && apiResult.total_memories > 0) {
        return apiResult;
      }
      const fallback = await buildPatternAnalysis(userId, timeRangeDays);
      return fallback ?? apiResult;
    },
    [client, userId, canAuth],
  );

  const getHealthCheck = useCallback(
    async (
      context: IntelligenceQueryContext = {},
    ): Promise<HealthCheckResult | null> => {
      if (!userId || !canAuth) return null;
      let apiResult: unknown = null;
      try {
        const response = await client.healthCheck({
          userId,
          responseFormat: "json",
          ...context,
        });
        apiResult = response.data ?? null;
      } catch (error) {
        console.error("Memory intelligence health check error:", error);
      }
      const totalMemories = getHealthTotalMemories(apiResult);
      if (apiResult && totalMemories && totalMemories > 0) {
        return mapHealthResult(apiResult as Record<string, unknown>);
      }
      const fallback = await buildHealthCheck(userId);
      return fallback ?? (apiResult ? mapHealthResult(apiResult as Record<string, unknown>) : null);
    },
    [client, userId, canAuth],
  );

  const extractInsights = useCallback(
    async (
      topic?: string,
      context: IntelligenceQueryContext = {},
    ): Promise<InsightResult[]> => {
      if (!userId || !canAuth) return [];
      try {
        const response = await client.extractInsights({
          userId,
          topic,
          responseFormat: "json",
          ...context,
        });
        return mapInsights(response.data as unknown as Record<string, unknown> | null);
      } catch (error) {
        console.error("Memory intelligence insight extraction error:", error);
        return [];
      }
    },
    [client, userId, canAuth],
  );

  const detectDuplicates = useCallback(
    async (
      threshold = 0.9,
      context: IntelligenceQueryContext = {},
    ): Promise<DuplicatePair[]> => {
      if (!userId || !canAuth) return [];
      try {
        const response = await client.detectDuplicates({
          userId,
          similarityThreshold: threshold,
          maxPairs: 10,
          responseFormat: "json",
          ...context,
        });
        return mapDuplicates(response.data as unknown as Record<string, unknown> | null);
      } catch (error) {
        console.error("Memory intelligence duplicate detection error:", error);
        return [];
      }
    },
    [client, userId, canAuth],
  );

  const value = useMemo(
    () => ({
      userId,
      isReady,
      isKeyLoading,
      analyzePatterns,
      getHealthCheck,
      extractInsights,
      detectDuplicates,
    }),
    [
      userId,
      isReady,
      isKeyLoading,
      analyzePatterns,
      getHealthCheck,
      extractInsights,
      detectDuplicates,
    ],
  );

  return (
    <SdkProviderContext.Provider value={{ userId, canAuth, isKeyLoading }}>
      <MemoryIntelligenceContext.Provider value={value}>
        {children}
      </MemoryIntelligenceContext.Provider>
    </SdkProviderContext.Provider>
  );
}

/* ---- Public provider — resolves auth, configures SDK, renders inner ---- */
interface MemoryIntelligenceProviderProps {
  children: ReactNode;
}

export function MemoryIntelligenceProvider({
  children,
}: MemoryIntelligenceProviderProps) {
  const { user, session, isLoading: isAuthLoading } = useSupabaseAuth();
  const userId = user?.id || null;
  const authToken = session?.access_token || null;
  const apiKey = isUsableKey(ENV_API_KEY) ? ENV_API_KEY : null;
  const apiUrl = useMemo(() => normalizeApiUrl(ENV_API_URL), []);
  const canAuth = Boolean(authToken || apiKey);
  const sdkConfig = useMemo(
    () => ({
      apiUrl,
      apiKey: apiKey ?? undefined,
      authToken: authToken ?? undefined,
      authType: (authToken ? "bearer" : apiKey ? "apiKey" : "bearer") as "apiKey" | "bearer",
      allowMissingAuth: true,
      responseFormat: "json" as const,
    }),
    [apiUrl, authToken, apiKey],
  );

  return (
    <SdkMemoryIntelligenceProvider config={sdkConfig}>
      <MemoryIntelligenceProviderInner
        userId={userId}
        canAuth={canAuth}
        isKeyLoading={isAuthLoading}
      >
        {children}
      </MemoryIntelligenceProviderInner>
    </SdkMemoryIntelligenceProvider>
  );
}

export default MemoryIntelligenceProvider;
