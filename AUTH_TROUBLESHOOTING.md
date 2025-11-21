# Authentication & Redirect Troubleshooting Guide

## Issue: Login Form Not Redirecting to Dashboard

### Authentication Flow Overview

1. **User visits `/` (Index page)**
   - If `?showAuth=true` query param → Shows AuthForm
   - Otherwise → Shows landing page

2. **User submits login form (AuthForm.tsx)**
   - Calls `supabase.auth.signInWithPassword()`
   - On success → `navigate('/dashboard')`
   - Also triggers auth state change listener

3. **Auth State Listener (useSupabaseAuth.tsx)**
   - Listens for `SIGNED_IN` event
   - Shows welcome toast
   - Checks for `redirectAfterLogin` in localStorage
   - Redirects to dashboard or stored path

4. **Protected Route (ProtectedRoute.tsx)**
   - Checks if user is authenticated
   - If not → redirects to `/?showAuth=true`
   - If yes → renders children (Dashboard)

### Common Issues & Solutions

#### Issue 1: Stuck on Loading Spinner
**Symptoms**: Page shows loading spinner indefinitely

**Root Cause**: Session fetch hanging in `useSupabaseAuth.tsx`

**Solution**: Already implemented Promise.race timeout (5 seconds)
```typescript
// Lines 99-108 in useSupabaseAuth.tsx
const sessionPromise = supabase.auth.getSession();
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Session fetch timeout')), 5000);
});

const { data: { session }, error } = await Promise.race([
  sessionPromise,
  timeoutPromise
]);
```

#### Issue 2: Auth Form Doesn't Redirect After Login
**Symptoms**: Login succeeds but stays on auth form

**Possible Causes**:
1. Auth state listener not triggering
2. Navigation being blocked
3. Session not being set properly

**Debugging Steps**:

1. **Check Browser Console**
   ```javascript
   // Look for these logs:
   "SupabaseAuthProvider: Initializing auth"
   "SupabaseAuthProvider: Getting session..."
   "SupabaseAuthProvider: Session fetched"
   "Supabase auth state change: SIGNED_IN"
   "Index page: Authenticated user detected, redirecting to dashboard"
   ```

2. **Check Supabase Session**
   ```javascript
   // In browser console:
   const { data } = await window.supabase.auth.getSession()
   console.log('Session:', data.session)
   console.log('User:', data.session?.user)
   ```

3. **Check localStorage**
   ```javascript
   // In browser console:
   console.log('Redirect path:', localStorage.getItem('redirectAfterLogin'))
   ```

#### Issue 3: Redirect Loop
**Symptoms**: Page keeps redirecting between `/` and `/dashboard`

**Cause**: Conflict between Index.tsx and ProtectedRoute redirects

**Solution**: Already implemented - Index.tsx checks for authenticated user:
```typescript
// Lines 32-36 in Index.tsx
if (!isLoading && user) {
  console.log('Index page: Authenticated user detected, redirecting to dashboard');
  navigate('/dashboard', { replace: true });
}
```

#### Issue 4: OAuth Callback Not Working
**Symptoms**: After OAuth login, redirects to `/` instead of `/dashboard`

**Solution**: Already implemented in Index.tsx:
```typescript
// Lines 22-30
const hasOAuthCallback = searchParams.get('code') ||
                          searchParams.get('access_token') ||
                          searchParams.get('error');

if (hasOAuthCallback) {
  console.log('Index page: OAuth callback detected, redirecting to callback handler');
  navigate(`/auth/callback${window.location.search}`, { replace: true });
  return;
}
```

### Testing the Authentication Flow

1. **Clear Browser State**
   ```javascript
   // In browser console:
   localStorage.clear()
   sessionStorage.clear()
   // Then reload page
   ```

2. **Test Email/Password Login**
   - Go to `http://localhost:8080/?showAuth=true`
   - Enter credentials
   - Click "Sign in"
   - **Expected**: Redirect to `/dashboard` within 1-2 seconds

3. **Test Protected Route**
   - Sign out
   - Try to visit `http://localhost:8080/dashboard`
   - **Expected**: Redirect to `/?showAuth=true`

4. **Test OAuth Login**
   - Click Google/GitHub button
   - Complete OAuth flow
   - **Expected**: Redirect back to app → process callback → redirect to `/dashboard`

### Environment Variables Check

Ensure these are set in `.env.local`:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
```

### Supabase Dashboard Configuration

1. **Authentication Settings**
   - Go to Supabase Dashboard → Authentication → URL Configuration
   - Site URL: `http://localhost:8080` (development) or your production URL
   - Redirect URLs: Add `http://localhost:8080/auth/callback`

2. **OAuth Providers**
   - Each enabled provider should have redirect URL configured
   - Format: `https://<your-project>.supabase.co/auth/v1/callback`

### Recent Fixes Applied

1. ✅ Added Promise.race timeout to prevent session fetch hanging
2. ✅ Added TooltipProvider to AuthForm
3. ✅ Fixed Apple Sign-In button (disabled with tooltip)
4. ✅ Added comprehensive error handling
5. ✅ Implemented redirect path storage in localStorage

### If Still Having Issues

1. **Check Network Tab**
   - Look for failed Supabase API calls
   - Check response status codes
   - Verify CORS headers

2. **Check Supabase Logs**
   - Go to Supabase Dashboard → Logs
   - Look for authentication errors

3. **Test with Main Branch**
   ```bash
   git stash
   git checkout main
   bun install
   bun run dev
   ```

4. **Compare Behavior**
   - If main branch works → issue in development branch
   - If main branch fails → Supabase configuration issue

### Next Steps

If the issue persists:

1. Share browser console logs (all messages)
2. Share network tab screenshot (filter: "supabase")
3. Confirm Supabase project URL and environment variables
4. Test with a fresh incognito window

## Quick Fix Commands

```bash
# Reinstall dependencies
bun install

# Clear bun cache
rm -rf node_modules/.cache

# Restart dev server
bun run dev

# Check for TypeScript errors
bunx tsc --noEmit
```
