# Dashboard Loading Spinner Fix

## Problem

The dashboard page was stuck on a loading spinner after merging updates from a branch. The page content was not being displayed.

## Root Cause

The `CentralAuthProvider` in `src/hooks/useCentralAuth.tsx` had a bug where the `isLoading` state was not being set to `false` in all code paths:

1. **Missing `setIsLoading(false)` in Supabase fallback path**: When the Supabase auth initialization completed successfully, the loading state was never set to false.

2. **Missing `setIsLoading(false)` in error path**: When Supabase auth initialization failed, the loading state remained true.

3. **Missing `setIsLoading(false)` when no auth method available**: When neither central auth nor fallback auth was enabled, the loading state remained true.

4. **Incorrect return type**: The `initializeAuth` function was declared to return `Promise<(() => void) | undefined>` but was using `return;` instead of `return undefined;` in some paths.

## Solution

Fixed the `useCentralAuth.tsx` hook to properly manage the loading state:

### Changes Made

1. **Added `setIsLoading(false)` before returning cleanup function**:

```typescript
setIsLoading(false);

// Cleanup subscription on unmount
return () => subscription.unsubscribe();
```

2. **Added `setIsLoading(false)` in error handler**:

```typescript
} catch (error) {
  console.error("Error initializing Supabase auth:", error);
  setIsLoading(false);
}
```

3. **Added `setIsLoading(false)` when no auth method available**:

```typescript
} else {
  setIsLoading(false);
}
```

4. **Fixed return statement to return `undefined` explicitly**:

```typescript
return undefined;
```

5. **Fixed central auth success path to return `undefined`**:

```typescript
setIsLoading(false);
return undefined;
```

## Testing

To verify the fix:

1. Start the development server:

```bash
cd apps/dashboard
npm run dev
```

2. Navigate to the dashboard page (requires authentication)

3. The loading spinner should complete within 1-2 seconds and display the dashboard content

## Technical Details

### Auth Provider Flow

1. `CentralAuthProvider` wraps the entire app
2. On mount, it calls `initializeAuth()`
3. `initializeAuth()` tries central auth first (if enabled)
4. If central auth fails or is disabled, it falls back to Supabase
5. Once auth state is determined, `isLoading` must be set to `false`
6. The `ProtectedRoute` component checks `isLoading` and shows a spinner while true

### Why This Caused a Stuck Spinner

- The `ProtectedRoute` component uses `useSupabaseAuth()` which checks `isLoading`
- If `isLoading` never becomes `false`, the spinner shows indefinitely
- The bug prevented `isLoading` from being set to `false` in the Supabase fallback path
- This caused the dashboard to show a loading spinner forever

## Files Modified

- `apps/dashboard/src/hooks/useCentralAuth.tsx`

## Related Files

- `apps/dashboard/src/hooks/useSupabaseAuth.tsx` - Direct Supabase auth hook
- `apps/dashboard/src/components/auth/ProtectedRoute.tsx` - Route protection component
- `apps/dashboard/src/App.tsx` - App component with auth providers
- `apps/dashboard/src/pages/Dashboard.tsx` - Dashboard page component
