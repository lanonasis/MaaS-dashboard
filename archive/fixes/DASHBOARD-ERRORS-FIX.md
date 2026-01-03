# 🐛 Dashboard Errors - Quick Fixes

## Issue 1: Profile Not Found (406 Error)

**Error:** `PGRST116: Cannot coerce the result to a single JSON object`

**Cause:** User `estherogechi279@gmail.com` doesn't have a profile in the `profiles` table

**Fix:** Create the profile in Supabase

### SQL Fix (Run in Supabase SQL Editor):

```sql
-- Insert profile for the user
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  '7ee0acfc-4afe-41d7-88b2-4bdf0cef1961',
  'estherogechi279@gmail.com',
  'Esther Ogechi',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();
```

### Or Create Profile Trigger (Automatic):

```sql
-- Create function to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Issue 2: React Initialization Error

**Error:** `ReferenceError: Cannot access 'I' before initialization`

**Cause:** Circular dependency or hoisting issue in the build

### Quick Fix Options:

#### Option A: Clear Build Cache and Rebuild

```bash
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard

# Clear cache
rm -rf node_modules/.vite
rm -rf dist

# Rebuild
npm run build

# Or for development
npm run dev
```

#### Option B: Check for Circular Dependencies

The error suggests a module is trying to access a variable before it's initialized. Common causes:

1. **Circular imports** - Two files importing each other
2. **Hoisting issues** - Using a const/let before declaration
3. **React component reference** - Component using itself

Look for patterns like:

```typescript
// File A imports File B
import { ComponentB } from "./ComponentB";

// File B imports File A
import { ComponentA } from "./ComponentA"; // ❌ Circular!
```

---

## Issue 3: Font CSP Error

**Error:** `Refused to load font from r2cdn.perplexity.ai`

This is **not critical** - just a warning. The dashboard works without this external font.

### Fix (if needed):

Add this to `apps/dashboard/index.html` in the `<head>`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="
  default-src 'self';
  font-src 'self' data: https://r2cdn.perplexity.ai;
  style-src 'self' 'unsafe-inline';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  img-src 'self' data: https:;
  connect-src 'self' https://mxtsdgkwzjzlttpotole.supabase.co https://auth.lanonasis.com https://api.lanonasis.com;
"
/>
```

But honestly, **remove the Perplexity font** instead:

```bash
# Find where it's referenced
grep -r "perplexity.ai" apps/dashboard/src/
grep -r "FKGroteskNeue" apps/dashboard/src/

# Remove the font-face declaration
```

---

## Priority Order:

1. ✅ **Fix Profile Issue** (Run SQL above) - This blocks authentication
2. ⚠️ **Fix React Error** (Clear cache & rebuild) - This breaks the app
3. ℹ️ **Font CSP** (Ignore or remove font) - Just a warning

---

## Test After Fixes:

```bash
# In dashboard directory
npm run build
npm run preview  # or deploy

# Test in browser
# Open: https://dashboard.lanonasis.com
# Login with: estherogechi279@gmail.com
# Should work without errors
```

---

## Quick Command Sequence:

```bash
# 1. Fix profile in Supabase (via SQL editor - see above)

# 2. Clear cache and rebuild dashboard
cd /Users/onasis/dev-hub/lan-onasis-monorepo/apps/dashboard
rm -rf node_modules/.vite dist
npm run build

# 3. Deploy
# (If on Netlify, it will auto-deploy on git push)
# Or run: npm run preview

# 4. Test
open https://dashboard.lanonasis.com
```
