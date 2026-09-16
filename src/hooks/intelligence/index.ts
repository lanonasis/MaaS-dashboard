/* Barrel export for intelligence data hooks.

All re-exported from the new modules so consumers can use:
  import { usePatternAnalysis, ... } from "@/hooks/intelligence";

Backward compatibility: useMemoryIntelligence.tsx also re-exports these.
*/

export { usePatternAnalysis } from "./usePatternAnalysis";
export { useHealthCheck } from "./useHealthCheck";
export { useInsightExtraction } from "./useInsightExtraction";
export { useDuplicateDetection } from "./useDuplicateDetection";
