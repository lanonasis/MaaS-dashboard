// Deferred auth work queue — pure, testable, no React.
// Extracted from useSupabaseAuth.tsx + useCentralAuth.tsx to eliminate verbatim duplication.

export interface DeferredWorkQueue {
  /** Set of pending timers that can be cleared on unmount/reinit */
  timers: Set<ReturnType<typeof setTimeout>>;
  /** Sequential SSO work queue — ensures serialization */
  ssoQueue: Promise<void>;
  /** Clear all pending deferred work and timers */
  clear: () => void;
  /** Schedule work that runs after a microtask, only if generation hasn't changed */
  defer: (generation: number, work: () => void | Promise<void>) => void;
  /** Queue work for sequential SSO execution */
  enqueueSso: (work: () => Promise<unknown>) => Promise<void>;
}

export interface DeferredWorkQueueOptions {
  /** Mutable generation counter — callers increment this on reinit to invalidate in-flight work */
  generationRef: { current: number };
}

export function createDeferredWorkQueue(
  opts: DeferredWorkQueueOptions
): DeferredWorkQueue {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let ssoQueue: Promise<void> = Promise.resolve();

  return {
    get timers() {
      return timers;
    },
    get ssoQueue() {
      return ssoQueue;
    },
    clear() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    },
    defer(generation: number, work: () => void | Promise<void>) {
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (generation !== opts.generationRef.current) return;
        void work();
      }, 0);
      timers.add(timer);
    },
    enqueueSso(work: () => Promise<unknown>) {
      ssoQueue = ssoQueue
        .catch(() => undefined)
        .then(async () => {
          await work();
        });
      return ssoQueue;
    },
  };
}
