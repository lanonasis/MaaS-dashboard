import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes

export type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

/* ------------------------------------------------------------------ */
/* Pure reducer (exported for direct unit-testing)                    */
/* ------------------------------------------------------------------ */

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

/* ------------------------------------------------------------------ */
/* Injectable factory — each instance owns its own state, counter,    */
/* timeout map, and listeners.                                        */
/* ------------------------------------------------------------------ */

export interface ToastState {
  state: State
  dispatch: (action: Action) => void
  subscribe: (listener: (state: State) => void) => () => void
  toast: (props: Omit<ToasterToast, "id">) => {
    id: string
    dismiss: () => void
    update: (props: ToasterToast) => void
  }
  useToast: () => {
    toasts: ToasterToast[]
    toast: (props: Omit<ToasterToast, "id">) => {
      id: string
      dismiss: () => void
      update: (props: ToasterToast) => void
    }
    dismiss: (toastId?: string) => void
  }
  clearAllTimeouts: () => void
}

/**
 * Creates an isolated toast state instance.
 *
 * Each instance owns its own state, id counter, timeout map, and
 * listeners.  Use this in tests to get a fresh state without
 * `vi.resetModules()`.
 *
 * In production, the default singleton (exported as `toast` and
 * `useToast`) is used.  Components import `{ toast, useToast }`
 * from this module.
 */
export function createToastState(): ToastState {
  let count = 0

  const timeouts = new Map<string, ReturnType<typeof setTimeout>>()
  let state: State = { toasts: [] }
  const listeners = new Set<(state: State) => void>()

  function genId(): string {
    count = (count + 1) % Number.MAX_SAFE_INTEGER
    return count.toString()
  }

  function addToRemoveQueue(toastId: string) {
    if (timeouts.has(toastId)) {
      return
    }

    const timeout = setTimeout(() => {
      timeouts.delete(toastId)
      dispatch({
        type: "REMOVE_TOAST",
        toastId: toastId,
      })
    }, TOAST_REMOVE_DELAY)

    timeouts.set(toastId, timeout)
  }

  function dispatch(action: Action) {
    // Side-effect: schedule auto-removal for dismiss actions
    if (action.type === "DISMISS_TOAST") {
      const { toastId } = action
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }
    }

    state = reducer(state, action)
    listeners.forEach((listener) => {
      listener(state)
    })
  }

  function subscribe(listener: (state: State) => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  type Toast = Omit<ToasterToast, "id">

  function toast({ ...props }: Toast) {
    const id = genId()

    const update = (props: ToasterToast) =>
      dispatch({
        type: "UPDATE_TOAST",
        toast: { ...props, id },
      })
    const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

    dispatch({
      type: "ADD_TOAST",
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dismiss()
        },
      },
    })

    return {
      id: id,
      dismiss,
      update,
    }
  }

  function useToast() {
    const [hookState, setHookState] = React.useState<State>(state)

    React.useEffect(() => {
      const unsub = subscribe(setHookState)
      return unsub
    }, [])

    return {
      ...hookState,
      toast,
      dismiss: (toastId?: string) =>
        dispatch({ type: "DISMISS_TOAST", toastId }),
    }
  }

  function clearAllTimeouts() {
    timeouts.forEach((timeout) => clearTimeout(timeout))
    timeouts.clear()
  }

  return {
    state,
    dispatch,
    subscribe,
    toast,
    useToast,
    clearAllTimeouts,
  }
}

// ─── Default singleton for production ───────────────────────────────
const defaultInstance = createToastState()

export const toast = defaultInstance.toast
export const useToast = defaultInstance.useToast
