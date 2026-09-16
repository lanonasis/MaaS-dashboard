/* useHealthCheck — data-fetching hook for health check.
   Extracted from useMemoryIntelligence.tsx (F-040/S-1). */

import { useCallback, useEffect, useState } from "react";
import type { HealthCheckResult } from "@/lib/intelligence/types";
import { useSdkProviderContext, useMemoryIntelligence } from "@/components/MemoryIntelligenceProvider";

export function useHealthCheck() {
  const { isKeyLoading } = useSdkProviderContext();
  const { userId, isReady, getHealthCheck } = useMemoryIntelligence();
  const [data, setData] = useState<HealthCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refetch = useCallback(async () => {
    if (!isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await getHealthCheck();
      setData(result);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [isReady, getHealthCheck]);

  useEffect(() => {
    if (isReady) {
      refetch();
    }
  }, [isReady, userId, refetch]);

  return { data, isLoading, error, refetch, isReady, isKeyLoading };
}
