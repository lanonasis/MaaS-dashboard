/* useDuplicateDetection — data-fetching hook for duplicate detection.
   Extracted from useMemoryIntelligence.tsx (F-040/S-1). */

import { useCallback, useEffect, useState } from "react";
import type { DuplicatePair } from "@/lib/intelligence/types";
import { useSdkProviderContext, useMemoryIntelligence } from "@/components/MemoryIntelligenceProvider";

export function useDuplicateDetection(threshold = 0.9) {
  const { isKeyLoading } = useSdkProviderContext();
  const { userId, isReady, detectDuplicates } = useMemoryIntelligence();
  const [data, setData] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await detectDuplicates(threshold);
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, detectDuplicates, threshold]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, threshold, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
