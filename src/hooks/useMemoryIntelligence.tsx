/* eslint-disable react-refresh/only-export-components */
/**
 * useMemoryIntelligence — thin re-export layer after F-040/S-1 extraction.
 *
 * All React-facing exports (provider, hooks, types) are re-exported from the
 * new modules created in this refactor so existing import paths keep working.
 *
 * Old consumers:
 *   import { MemoryIntelligenceProvider, useMemoryIntelligence, ... } from "@/hooks/useMemoryIntelligence"
 * Still works because we re-export everything below.
 */

// Types (re-export from the canonical types module)
export type {
  PatternAnalysis,
  PatternAnalysisRendered,
  PatternAnalysisWire,
  HealthCheckResult,
  InsightResult,
  DuplicatePair,
} from "@/lib/intelligence/types";

// Re-export PatternAnalysis type alias for backward compat
export type { PatternAnalysis as PatternAnalysisExport } from "@/lib/intelligence/types";

// Context + provider + core hook (the single source of truth now)
export {
  MemoryIntelligenceProvider,
  useMemoryIntelligence,
  useSdkProviderContext,
} from "@/components/MemoryIntelligenceProvider";

// IntelligenceQueryContext (type re-export)
export type { IntelligenceQueryContext } from "@/components/MemoryIntelligenceProvider";

// Data hooks (re-exported from the new modular hooks)
export {
  usePatternAnalysis,
  useHealthCheck,
  useInsightExtraction,
  useDuplicateDetection,
} from "@/hooks/intelligence";
