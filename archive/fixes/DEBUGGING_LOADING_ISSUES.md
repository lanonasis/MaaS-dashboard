# Debugging Dashboard Loading Issues

## Quick Diagnosis Checklist

If the dashboard gets stuck on a loading spinner, check these items:

### 1. Browser Console Logs

Open browser DevTools (F12) and check the Console tab for:

```
CentralAuthProvider: Initializing auth
CentralAuthProvider: initializeAuth called
```

Look for any errors or warnings that might indicate what's stuck.

### 2. Check Auth Provider State

Add this to your browser console to check the current state:

```javascript
// Check if React DevTools is available
// Look for CentralAuthProvider and SupabaseAuthProvider components
// Check their isLoading state
```

### 3. Environment Variables

Verify these are set in `.env`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
REDACTED_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
VITE_USE_CENTRAL_AUTH=true
VITE_USE_FALLBACK_AUTH=true
```

### 4. Network Tab

Check the Network tab in DevTools for:

- Failed API requests to Supabase
- CORS errors
- Timeout issues

## Common Issues and Solutions

### Issue 1: isLoading Never Becomes False

**Symptoms:** Loading spinner shows indefinitely

**Cause:** Auth provider's `initializeAuth()` function doesn't set `isLoading(false)` in all code paths

**Solution:** Ensure every code path in `initializeAuth()` eventually calls `setIsLoading(false)`

### Issue 2: Supabase Client Not Initialized

**Symptoms:** Console error: "Supabase client not initialized"

**Cause:** Missing or invalid `VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY

**Solution:**

1. Check `.env` file has the correct key
2. Restart dev server after changing `.env`
3. Clear browser cache

### Issue 3: Auth State Change Listener Not Firing

**Symptoms:** User logs in but dashboard doesn't update

**Cause:** Subscription not properly set up or cleanup function not returned

**Solution:** Ensure `onAuthStateChange` subscription is created and cleanup function is returned

### Issue 4: Multiple Auth Providers Conflict

**Symptoms:** Inconsistent auth state, multiple loading spinners

**Cause:** Both `CentralAuthProvider` and `SupabaseAuthProvider` trying to manage state

**Solution:** Use only one auth provider or ensure they don't conflict

## Debugging Commands

### Check if fix is applied:

```bash
cd apps/dashboard
bash test-loading-fix.sh
```

### View auth provider code:

```bash
cat src/hooks/useCentralAuth.tsx | grep -A 5 "setIsLoading"
```

### Check for TypeScript errors:

```bash
npm run build
```

### Start dev server with verbose logging:

```bash
npm run dev
```

## Testing the Fix

1. **Start fresh:**

```bash
# Clear browser cache and local storage
# Restart dev server
npm run dev
```

2. **Test unauthenticated state:**

- Navigate to `/dashboard`
- Should redirect to login page
- Loading spinner should complete quickly

3. **Test authenticated state:**

- Log in with valid credentials
- Should redirect to dashboard
- Loading spinner should complete within 1-2 seconds
- Dashboard content should display

4. **Test auth state changes:**

- Log out
- Log back in
- Switch between pages
- All transitions should be smooth without stuck spinners

## Code Locations

### Auth Providers:

- `src/hooks/useCentralAuth.tsx` - Central auth with Supabase fallback
- `src/hooks/useSupabaseAuth.tsx` - Direct Supabase auth

### Protected Routes:

- `src/components/auth/ProtectedRoute.tsx` - Route protection logic

### App Structure:

- `src/App.tsx` - Auth provider wrappers
- `src/pages/Dashboard.tsx` - Dashboard page

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [React Context API](https://react.dev/reference/react/useContext)
- [React Router Protected Routes](https://reactrouter.com/en/main/start/tutorial)
