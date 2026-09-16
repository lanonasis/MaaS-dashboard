/* useInsightExtraction — data-fetching hook for insight extraction.
   Extracted from useMemoryIntelligence.tsx (F-040/S-1). */

import { useCallback, useEffect, useState } from "react";
import type { InsightResult } from "@/lib/intelligence/types";
import { useSdkProviderContext, useMemoryIntelligence } from "@/components/MemoryIntelligenceProvider";

export function useInsightExtraction(topic?: string) {
  const { isKeyLoading } = useSdkProviderContext();
  const { userId, isReady, extractInsights } = useMemoryIntelligence();
  const [data, setData] = useState<InsightResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await extractInsights(topic);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, extractInsights, topic]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, topic, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
