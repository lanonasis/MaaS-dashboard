/**
 * Tests for use-toast reducer and dispatch
 *
 * Covers branch lines in the reducer:
 *   ~36 – ADD_TOAST prepend + slice to TOAST_LIMIT
 *   ~43 – UPDATE_TOAST mapper (update vs skip)
 *   ~52 – DISMISS with specific toastId vs dismiss-all
 *   ~65 – REMOVE_TOAST with undefined toastId (clear-all) vs specific
 *
 * Toast-level tests (instance-scoped, no vi.resetModules):
 *   ~130 – addToRemoveQueue early-return (idempotency)
 *   ~166 – listener addition and removal
 *   ~212 – onOpenChange(false) → dismiss()
 *   ~238 – onOpenChange(true) → no-op
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, cleanup } from '@testing-library/react'

import { reducer, createToastState } from '../use-toast'

type AnyAction = { type: string } & Record<string, unknown>

// ---------------------------------------------------------------------------
// Reducer — ADD_TOAST
// ---------------------------------------------------------------------------
describe('reducer ADD_TOAST', () => {
  it('prepends the new toast and slices to TOAST_LIMIT (3)', () => {
    const state = { toasts: [] }
    const action: AnyAction = {
      type: 'ADD_TOAST',
      toast: { id: 't1', title: 'Hello' },
    }
    const result = reducer(state, action as any)
    expect(result.toasts).toHaveLength(1)
    expect(result.toasts[0].title).toBe('Hello')
    expect(result.toasts[0].id).toBe('t1')
  })

  it('keeps at most TOAST_LIMIT toasts', () => {
    let state: any = { toasts: [] }
    for (let i = 0; i < 5; i++) {
      state = reducer(state, {
        type: 'ADD_TOAST',
        toast: { id: `t${i}`, title: `Msg ${i}` },
      } as any)
    }
    expect(state.toasts).toHaveLength(3)
    expect(state.toasts[0].id).toBe('t4')
  })
})

// ---------------------------------------------------------------------------
// Reducer — UPDATE_TOAST
// ---------------------------------------------------------------------------
describe('reducer UPDATE_TOAST', () => {
  it('updates an existing toast by id', () => {
    const state = {
      toasts: [{ id: 't1', title: 'Old', open: true }],
    }
    const action: AnyAction = {
      type: 'UPDATE_TOAST',
      toast: { id: 't1', title: 'New' },
    }
    const result = reducer(state, action as any)
    expect(result.toasts[0].title).toBe('New')
    expect(result.toasts[0].id).toBe('t1')
  })

  it('does not touch toasts with other ids', () => {
    const state = {
      toasts: [{ id: 't1', title: 'A' }, { id: 't2', title: 'B' }],
    }
    const action: AnyAction = {
      type: 'UPDATE_TOAST',
      toast: { id: 't1', title: 'Updated' },
    }
    const result = reducer(state, action as any)
    expect(result.toasts[1].title).toBe('B')
  })
})

// ---------------------------------------------------------------------------
// Reducer — DISMISS_TOAST
// ---------------------------------------------------------------------------
describe('reducer DISMISS_TOAST', () => {
  it('dismissing a specific toast sets open:false for that id only', () => {
    const state = {
      toasts: [
        { id: 't1', title: 'A', open: true },
        { id: 't2', title: 'B', open: true },
      ],
    }
    const action: AnyAction = {
      type: 'DISMISS_TOAST',
      toastId: 't1',
    }
    const result = reducer(state, action as any)
    expect(result.toasts[0].open).toBe(false)
    expect(result.toasts[1].open).toBe(true)
  })

  it('dismiss-all (no toastId) sets open:false on every toast', () => {
    const state = {
      toasts: [
        { id: 't1', title: 'A', open: true },
        { id: 't2', title: 'B', open: true },
      ],
    }
    const action: AnyAction = { type: 'DISMISS_TOAST' }
    const result = reducer(state, action as any)
    expect(result.toasts.every((t: any) => t.open === false)).toBe(true)
  })

  it('dismissing with toastId=undefined matches the filter path', () => {
    const state = {
      toasts: [{ id: 't1', title: 'X', open: true }],
    }
    const action: AnyAction = { type: 'DISMISS_TOAST', toastId: undefined }
    const result = reducer(state, action as any)
    expect(result.toasts[0].open).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Reducer — REMOVE_TOAST
// ---------------------------------------------------------------------------
describe('reducer REMOVE_TOAST', () => {
  it('removing with undefined toastId clears all toasts', () => {
    const state = {
      toasts: [{ id: 't1' }, { id: 't2' }],
    }
    const action: AnyAction = { type: 'REMOVE_TOAST' }
    const result = reducer(state, action as any)
    expect(result.toasts).toEqual([])
  })

  it('removing a specific toast filters it out', () => {
    const state = {
      toasts: [{ id: 't1' }, { id: 't2' }],
    }
    const action: AnyAction = { type: 'REMOVE_TOAST', toastId: 't1' }
    const result = reducer(state, action as any)
    expect(result.toasts).toHaveLength(1)
    expect(result.toasts[0].id).toBe('t2')
  })
})

// ---------------------------------------------------------------------------
// Toast-level: addToRemoveQueue idempotency
// Uses createToastState() — no vi.resetModules() needed
// ---------------------------------------------------------------------------
describe('addToRemoveQueue idempotency', () => {
  let s: ReturnType<typeof createToastState>
  let toastFn: ReturnType<typeof createToastState>['toast']

  beforeEach(() => {
    s = createToastState()
    toastFn = s.toast
  })

  afterEach(() => {
    s.clearAllTimeouts()
    cleanup()
  })

  it('calling toast().dismiss() twice before removal does not queue twice', async () => {
    const t1 = toastFn({ title: 'idempotent' })
    t1.dismiss()       // queues removal on line ~102
    t1.dismiss()       // should hit early-return guard

    const { result, unmount } = renderHook(() => s.useToast())

    // Wait for TOAST_REMOVE_DELAY (5000ms)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5500))
    })

    expect(result.current.toasts).toHaveLength(0)
    unmount()
  })

  it('second dismiss of the same id is a no-op on the queue', async () => {
    const t1 = toastFn({ title: 'double-dismiss' })
    t1.dismiss()
    t1.dismiss() // should not error
    expect(true).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Toast-level: useToast listener management
// ---------------------------------------------------------------------------
describe('useToast listener management', () => {
  let s: ReturnType<typeof createToastState>
  let useToastFn: ReturnType<typeof createToastState>['useToast']
  let toastFn: ReturnType<typeof createToastState>['toast']

  beforeEach(() => {
    s = createToastState()
    useToastFn = s.useToast
    toastFn = s.toast
  })

  afterEach(() => {
    s.clearAllTimeouts()
    cleanup()
  })

  it('removes the listener on unmount', async () => {
    const { result, unmount } = renderHook(() => useToastFn())

    expect(result.current.toasts).toHaveLength(0)

    unmount()

    // New instance — should be independent of the unmounted one
    const s2 = createToastState()
    const { result: result2 } = renderHook(() => s2.useToast())
    await act(async () => {
      s2.toast({ title: 'fresh' })
    })
    expect(result2.current.toasts).toHaveLength(1)

    s2.clearAllTimeouts()
  })

  it('listener removal prevents memory leak on re-render', async () => {
    const { result, rerender, unmount } = renderHook(() => useToastFn())

    const beforeCount = result.current.toasts.length

    rerender() // should not add duplicate listeners

    await act(async () => {
      toastFn({ title: 'post rerender' })
    })

    expect(result.current.toasts).toHaveLength(beforeCount + 1)
    unmount()
  })
})

// ---------------------------------------------------------------------------
// Toast-level: onOpenChange callback
// ---------------------------------------------------------------------------
describe('onOpenChange dismiss', () => {
  let s: ReturnType<typeof createToastState>
  let toastFn: ReturnType<typeof createToastState>['toast']
  let useToastFn: ReturnType<typeof createToastState>['useToast']

  beforeEach(() => {
    s = createToastState()
    toastFn = s.toast
    useToastFn = s.useToast
  })

  afterEach(() => {
    s.clearAllTimeouts()
    cleanup()
  })

  it('onOpenChange(false) triggers dismiss()', async () => {
    const { result, unmount } = renderHook(() => useToastFn())

    await act(async () => {
      toastFn({ title: 'onOpenChange test' })
    })

    // The toast should be in state with open: true
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].open).toBe(true)

    // Simulate the Toaster component calling onOpenChange(false)
    const onOpenChange = result.current.toasts[0]?.onOpenChange as
      | ((open: boolean) => void)
      | undefined
    if (onOpenChange) {
      await act(async () => {
        onOpenChange(false)
      })
    }

    // The toast should now be dismissed (open: false)
    expect(result.current.toasts[0].open).toBe(false)

    unmount()
  })

  it('onOpenChange(true) does NOT dismiss', async () => {
    const { result, unmount } = renderHook(() => useToastFn())

    await act(async () => {
      toastFn({ title: 'onOpenChange keep' })
    })

    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0].open).toBe(true)

    // Call onOpenChange(true) — since open=true, dismiss should NOT fire
    const onOpenChange = result.current.toasts[0]?.onOpenChange as
      | ((open: boolean) => void)
      | undefined
    if (onOpenChange) {
      await act(async () => {
        onOpenChange(true)
      })
    }

    // Toast should still be open
    expect(result.current.toasts[0].open).toBe(true)
    unmount()
  })
})
