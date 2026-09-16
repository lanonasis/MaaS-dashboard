/* usePatternAnalysis — data-fetching hook for pattern analysis.
   Extracted from useMemoryIntelligence.tsx (F-040/S-1). */

import { useCallback, useEffect, useState } from "react";
import type { PatternAnalysis } from "@/lib/intelligence/types";
import { useSdkProviderContext, useMemoryIntelligence } from "@/components/MemoryIntelligenceProvider";

export function usePatternAnalysis(timeRangeDays = 30) {
  const { isKeyLoading } = useSdkProviderContext();
  const { userId, isReady, analyzePatterns } = useMemoryIntelligence();
  const [data, setData] = useState<PatternAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await analyzePatterns(timeRangeDays);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, analyzePatterns, timeRangeDays]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, timeRangeDays, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
