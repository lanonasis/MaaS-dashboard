# Setup Dashboard for Testing

## Quick Start

### 1. Add Supabase Credentials

Add these to `apps/dashboard/.env.local`:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
REDACTED_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
```

### 2. Start Development Server

```bash
cd apps/dashboard
npm run dev
```

### 3. Run Automated Tests

```bash
node test-auth-automated.mjs
```

Expected output: All tests should pass (100%)

### 4. Run Manual Tests

Open `TEST_AUTH_FEATURES.md` and follow the 40-test checklist.

## Test URLs

- **Login:** http://localhost:5173/auth/login
- **Register:** http://localhost:5173/auth/register
- **Dashboard:** http://localhost:5173/dashboard

## What to Test

### Priority 1: OAuth Providers

1. Click each social login button
2. Verify redirect to provider
3. Complete authentication
4. Verify redirect back to dashboard
5. Verify user is logged in

### Priority 2: Email/Password

1. Test valid login
2. Test invalid credentials
3. Test validation errors
4. Test registration flow
5. Test forgot password

### Priority 3: UX Features

1. Password visibility toggle
2. Error highlighting
3. Real-time error clearing
4. Loading states
5. Toast notifications

## Expected Results

All features should work correctly:

- ✅ 5 OAuth providers functional
- ✅ Email/password authentication working
- ✅ Validation catching errors
- ✅ Redirects going to correct paths
- ✅ UI responsive and accessible

## Troubleshooting

### Issue: "Missing Supabase anon key"

**Fix:** Add `VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY

### Issue: OAuth redirect fails

**Fix:** Check Supabase Dashboard → Authentication → Providers → Redirect URLs

### Issue: "Invalid redirect_uri"

**Fix:** Ensure redirect URL matches exactly in provider settings

### Issue: Session not persisting

**Fix:** Check browser cookies are enabled

## Production Testing

For production testing, use:

- **URL:** https://dashboard.lanonasis.com
- **Environment:** Production Supabase instance
- **OAuth:** All providers should be configured

## Support

If tests fail, check:

1. `TEST_RESULTS.md` - Automated test results
2. `TEST_AUTH_FEATURES.md` - Manual test checklist
3. Browser console for errors
4. Network tab for failed requests
