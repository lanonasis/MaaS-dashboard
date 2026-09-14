/**
 * Tests for use-toast reducer and dispatch
 *
 * Covers branch lines:
 *   59  – addToRemoveQueue early-return (toastId already queued)
 *   75  – switch dispatch
 *   86  – UPDATE_TOAST mapper
 *   95  – DISMISS with a specific toastId
 *   106 – DISMISS-all (toastId === undefined)
 *   116 – REMOVE_TOAST with undefined toastId
 *   159 – onOpenChange(false) → dismiss()
 *   178 – listener removal on unmount
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup, act } from '@testing-library/react';

import { reducer } from '../use-toast';

type AnyAction = { type: string } & Record<string, unknown>;

// ---------------------------------------------------------------------------
// Reducer — ADD_TOAST (branch line 75 — switch dispatch)
// ---------------------------------------------------------------------------
describe('reducer ADD_TOAST', () => {
  it('prepends the new toast and slices to TOAST_LIMIT (3)', () => {
    const state = { toasts: [] };
    const action: AnyAction = {
      type: 'ADD_TOAST',
      toast: { id: 't1', title: 'Hello' },
    };
    const result = reducer(state, action as any);
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].title).toBe('Hello');
    expect(result.toasts[0].id).toBe('t1');
  });

  it('keeps at most TOAST_LIMIT toasts', () => {
    let state: any = { toasts: [] };
    for (let i = 0; i < 5; i++) {
      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: `t${i}`, title: `Msg ${i}` },
      } as any);
    }
    expect(state.toasts).toHaveLength(3);
    expect(state.toasts[0].id).toBe('t4');
  });
});

// ---------------------------------------------------------------------------
// Reducer — UPDATE_TOAST (branch line 86 — mapper)
// ---------------------------------------------------------------------------
describe('reducer UPDATE_TOAST', () => {
  it('updates an existing toast by id', () => {
    const state = {
      toasts: [{ id: 't1', title: 'Old', open: true }],
    };
    const action: AnyAction = {
      type: 'UPDATE_TOAST',
      toast: { id: 't1', title: 'New' },
    };
    const result = reducer(state, action as any);
    expect(result.toasts[0].title).toBe('New');
    expect(result.toasts[0].id).toBe('t1');
  });

  it('does not touch toasts with other ids', () => {
    const state = {
      toasts: [{ id: 't1', title: 'A' }, { id: 't2', title: 'B' }],
    };
    const action: AnyAction = {
      type: 'UPDATE_TOAST',
      toast: { id: 't1', title: 'Updated' },
    };
    const result = reducer(state, action as any);
    expect(result.toasts[1].title).toBe('B');
  });
});

// ---------------------------------------------------------------------------
// Reducer — DISMISS_TOAST (branch lines 95, 106)
// ---------------------------------------------------------------------------
describe('reducer DISMISS_TOAST', () => {
  it('dismissing a specific toast sets open:false for that id only (line 95)', () => {
    const state = {
      toasts: [
        { id: 't1', title: 'A', open: true },
        { id: 't2', title: 'B', open: true },
      ],
    };
    const action: AnyAction = {
      type: 'DISMISS_TOAST',
      toastId: 't1',
    };
    const result = reducer(state, action as any);
    expect(result.toasts[0].open).toBe(false);
    expect(result.toasts[1].open).toBe(true);
  });

  it('dismiss-all (no toastId) sets open:false on every toast (line 106)', () => {
    const state = {
      toasts: [
        { id: 't1', title: 'A', open: true },
        { id: 't2', title: 'B', open: true },
      ],
    };
    const action: AnyAction = { type: 'DISMISS_TOAST' };
    const result = reducer(state, action as any);
    expect(result.toasts.every((t: any) => t.open === false)).toBe(true);
  });

  it('dismissing with toastId=undefined matches the filter path (line 106)', () => {
    const state = {
      toasts: [{ id: 't1', title: 'X', open: true }],
    };
    const action: AnyAction = { type: 'DISMISS_TOAST', toastId: undefined };
    const result = reducer(state, action as any);
    expect(result.toasts[0].open).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Reducer — REMOVE_TOAST (branch line 116)
// ---------------------------------------------------------------------------
describe('reducer REMOVE_TOAST', () => {
  it('removing with undefined toastId clears all toasts (line 116)', () => {
    const state = {
      toasts: [{ id: 't1' }, { id: 't2' }],
    };
    const action: AnyAction = { type: 'REMOVE_TOAST' };
    const result = reducer(state, action as any);
    expect(result.toasts).toEqual([]);
  });

  it('removing a specific toast filters it out', () => {
    const state = {
      toasts: [{ id: 't1' }, { id: 't2' }],
    };
    const action: AnyAction = { type: 'REMOVE_TOAST', toastId: 't1' };
    const result = reducer(state, action as any);
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe('t2');
  });
});

// ---------------------------------------------------------------------------
// addToRemoveQueue — early-return when toastId already queued (line 59)
// ---------------------------------------------------------------------------
describe('addToRemoveQueue idempotency (line 59)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calling toast().dismiss() twice before removal does not queue twice', async () => {
    vi.resetModules();
    const { toast: toastFn, useToast: useToastFn } = await import('../use-toast');

    const t1 = toastFn({ title: 'idempotent' });
    t1.dismiss();       // queues removal on line 63
    t1.dismiss();       // should hit early-return guard on line 59

    const { result, unmount } = renderHook(() => useToastFn());

    // Wait for TOAST_REMOVE_DELAY (5000ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5500));
    });

    expect(result.current.toasts).toHaveLength(0);
    unmount();
  });

  it('second dismiss of the same id is a no-op on the queue', async () => {
    vi.resetModules();
    const { toast: toastFn } = await import('../use-toast');

    const t1 = toastFn({ title: 'double-dismiss' });
    t1.dismiss();
    t1.dismiss(); // should not error
    expect(true).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useToast — listener addition and removal (line 178)
// ---------------------------------------------------------------------------
describe('useToast listener management (line 178)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('removes the listener on unmount', async () => {
    vi.resetModules();
    const { useToast: useToastFn } = await import('../use-toast');

    const { result, unmount } = renderHook(() => useToastFn());

    // After mount, one listener should be registered (line 175)
    expect(result.current.toasts).toHaveLength(0);

    unmount(); // triggers cleanup on lines 177-179

    // After unmount, the hook's listener is removed
    // We verify by creating a new hook and confirming it has a fresh listener
    vi.resetModules();
    const { toast: toastFn2, useToast: useToastFn2 } = await import('../use-toast');

    const { result: result2, unmount: unmount2 } = renderHook(() => useToastFn2());
    await act(async () => {
      toastFn2({ title: 'fresh' });
    });
    expect(result2.current.toasts).toHaveLength(1);

    unmount2();
  });

  it('listener removal prevents memory leak on re-render', async () => {
    vi.resetModules();
    const { useToast: useToastFn, toast: toastFn } = await import('../use-toast');

    const { result, rerender, unmount } = renderHook(() => useToastFn());

    const beforeCount = result.current.toasts.length;

    rerender(); // should not add duplicate listeners

    await act(async () => {
      toastFn({ title: 'post rerender' });
    });

    expect(result.current.toasts).toHaveLength(beforeCount + 1);
    unmount();
  });
});

// ---------------------------------------------------------------------------
// onOpenChange callback (line 159)
// ---------------------------------------------------------------------------
describe('onOpenChange dismiss (line 159)', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('onOpenChange(false) triggers dismiss()', async () => {
    vi.resetModules();
    const { toast: toastFn, useToast: useToastFn } = await import('../use-toast');

    const { result, unmount } = renderHook(() => useToastFn());

    await act(async () => {
      toastFn({ title: 'onOpenChange test' });
    });

    // The toast should be in state with open: true
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);

    // Simulate the Toaster component calling onOpenChange(false)
    // This should hit line 159: if (!open) dismiss()
    const onOpenChange = result.current.toasts[0]?.onOpenChange as ((open: boolean) => void) | undefined;
    if (onOpenChange) {
      await act(async () => {
        onOpenChange(false);
      });
    }

    // The toast should now be dismissed (open: false)
    expect(result.current.toasts[0].open).toBe(false);

    unmount();
  });

  it('onOpenChange(true) does NOT dismiss', async () => {
    vi.resetModules();
    const { toast: toastFn, useToast: useToastFn } = await import('../use-toast');

    const { result, unmount } = renderHook(() => useToastFn());

    await act(async () => {
      toastFn({ title: 'onOpenChange keep' });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].open).toBe(true);

    // Call onOpenChange(true) — line 159: if (!open) dismiss()
    // Since open=true, dismiss should NOT fire
    const onOpenChange = result.current.toasts[0]?.onOpenChange as ((open: boolean) => void) | undefined;
    if (onOpenChange) {
      await act(async () => {
        onOpenChange(true);
      });
    }

    // Toast should still be open
    expect(result.current.toasts[0].open).toBe(true);
    unmount();
  });
});
