# 🔐 Supabase Configuration for Direct Auth Fix

**CRITICAL**: These exact settings must be configured in Supabase for the authentication fix to work.

---

## 📍 Current Architecture Understanding

### Your Setup
- **Supabase Project**: `mxtsdgkwzjzlttpotole`
- **Vanity Domain**: `lanonasis.supabase.co`
- **Site URL (OLD)**: `api.lanonasis.com`
- **Dashboard URL**: `dashboard.lanonasis.com`

### How Direct Auth Works
```
User → dashboard.lanonasis.com → Direct Supabase Client → Supabase Auth
                                ↓
                    OAuth Callback: /auth/callback
                                ↓
                    Returns to: dashboard.lanonasis.com
```

**Key Point**: Dashboard now talks **directly** to Supabase, **NOT** through api.lanonasis.com

---

## ⚙️ Required Supabase Configuration

### Step 1: Keep Site URL (Multi-Service Support)

**Go to**: Supabase Dashboard → Project Settings → Authentication → URL Configuration

**KEEP "Site URL" as**:
```
https://api.lanonasis.com
```

**Why**:
- Other services (CLI, SDK, Extensions, REST API, MCP servers) depend on this URL
- OAuth providers (Google, Apple, GitHub, Azure, Twitter/X) are configured with this URL
- Changing it would break all other authentication touchpoints
- Dashboard will use explicit redirectTo parameter instead

---

### Step 2: Add Dashboard Redirect URLs (Keep Existing)

**Go to**: Supabase Dashboard → Project Settings → Authentication → URL Configuration

**ADD these URLs to "Redirect URLs" list (DON'T remove existing ones)**:

```
https://dashboard.lanonasis.com/auth/callback
https://dashboard.lanonasis.com/auth/login
https://dashboard.lanonasis.com
http://localhost:5173/auth/callback
http://localhost:5173
```

**KEEP existing URLs** (for CLI, SDK, Extensions, etc.):
```
https://api.lanonasis.com/auth/callback
https://api.lanonasis.com
(any other URLs already configured)
```

**Why Each Dashboard URL**:
- `dashboard.lanonasis.com/auth/callback` - OAuth callback (PRIMARY)
- `dashboard.lanonasis.com/auth/login` - Login page
- `dashboard.lanonasis.com` - Homepage/fallback
- `localhost:5173/*` - Local development

**Why Keep api.lanonasis.com URLs**:
- Other services still authenticate through api.lanonasis.com
- CLI, SDK, Extensions, REST API, MCP servers need these URLs

---

### Step 3: OAuth Providers (if using)

**For Google OAuth**:
- Go to: Authentication → Providers → Google
- **Authorized JavaScript origins**:
  ```
  https://dashboard.lanonasis.com
  http://localhost:5173
  ```
- **Authorized redirect URIs**:
  ```
  https://lanonasis.supabase.co/auth/v1/callback
  ```

**For GitHub OAuth**:
- Go to: Authentication → Providers → GitHub
- **Homepage URL**: `https://dashboard.lanonasis.com`
- **Authorization callback URL**:
  ```
  https://lanonasis.supabase.co/auth/v1/callback
  ```

---

## 🔄 What About api.lanonasis.com?

### Current Setup (onasis-core)
- **Netlify Functions**: Still exist at api.lanonasis.com
- **Redirects**: Still configured in `_redirects`
- **Auth Functions**: `/v1/auth/*` routes still work

### Impact on Direct Auth
**Dashboard bypasses api.lanonasis.com, but other services still use it!**

**Why Keep It**:
1. **CLI** - Still authenticates through api.lanonasis.com
2. **SDK** - Still uses central auth gateway
3. **IDE Extensions** - Still route through api.lanonasis.com
4. **REST API** - Still needs auth functions
5. **MCP Servers** - Remote servers (mcp-core, mcp-unified-gateway) depend on it
6. **OAuth Providers** - Configured with api.lanonasis.com URLs

**Dashboard Only**:
1. Dashboard now talks **directly to Supabase**
2. Does NOT go through api.lanonasis.com
3. Uses explicit redirectTo parameter for callbacks
4. Other services continue using api.lanonasis.com normally

### Diagram
```
OLD (Broken):
dashboard.lanonasis.com → api.lanonasis.com/v1/auth/* → Netlify Functions → Supabase
                          ❌ This path is broken

NEW (Working):
dashboard.lanonasis.com → Direct to Supabase
                          ✅ Bypasses api.lanonasis.com completely
```

---

## 🔍 Dashboard SPA Configuration

### Current Netlify Config (dashboard.lanonasis.com)

**File**: `apps/dashboard/netlify.toml`

**OAuth Callback Rule** (Line 24-27):
```toml
[[redirects]]
  from = "/auth/callback"
  to = "/index.html"
  status = 200
```

**Status**: ✅ **CORRECT** - This allows React Router to handle the callback

**SPA Fallback** (Last rule):
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Status**: ✅ **CORRECT** - Single Page App routing works

### No Changes Needed!
The dashboard Netlify config is **already correct** for direct Supabase auth.

---

## 🌍 Environment Variables

### Netlify Dashboard Environment Variables

**Go to**: Netlify → Site Settings → Environment Variables

**Update/Add These**:

```bash
# Direct Supabase Auth (NEW - REQUIRED)
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
VITE_USE_DIRECT_AUTH=true

# Service URLs (Keep existing)
VITE_DASHBOARD_URL=https://dashboard.lanonasis.com
VITE_DOCS_URL=https://docs.lanonasis.com
VITE_MCP_URL=https://mcp.lanonasis.com

# Optional: Central Auth (Can set to false or remove)
VITE_USE_CENTRAL_AUTH=false
VITE_API_URL=https://api.lanonasis.com/v1
VITE_AUTH_GATEWAY_URL=https://api.lanonasis.com
```

**Critical Variables**:
1. `VITE_SUPABASE_URL=https://<project-ref>.supabase.co
2. `VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
3. `VITE_USE_DIRECT_AUTH=true` - Enables direct auth

---

## 🔑 Finding Your Supabase Keys

**Go to**: Supabase Dashboard → Project Settings → API

**You need**:
- **Project URL**: `https://mxtsdgkwzjzlttpotole.supabase.co`
- **anon/public key**: Starts with `eyJhbGci...` (long JWT token)

**Copy the "anon" key**, NOT the "service_role" key (service_role is secret, anon is public)

---

## ✅ Complete Configuration Checklist

### Supabase Configuration
- [ ] Site URL **kept** as `https://api.lanonasis.com` (for multi-service support)
- [ ] Dashboard redirect URLs **added** (without removing existing):
  - [ ] `https://dashboard.lanonasis.com/auth/callback`
  - [ ] `https://dashboard.lanonasis.com/auth/login`
  - [ ] `https://dashboard.lanonasis.com`
  - [ ] `http://localhost:5173/auth/callback`
- [ ] Existing redirect URLs **kept** (api.lanonasis.com, etc.)
- [ ] OAuth providers **unchanged** (already configured with api.lanonasis.com)

### Netlify Configuration (Dashboard)
- [ ] Environment variables added:
  - [ ] `VITE_SUPABASE_URL=https://<project-ref>.supabase.co
  - [ ] `VITE_SUPABASE_ANON_KEY=REDACTED_SUPABASE_ANON_KEY
  - [ ] `VITE_USE_DIRECT_AUTH=true`
- [ ] Existing `netlify.toml` verified (no changes needed)

### Deployment
- [ ] Dashboard submodule pushed to remote
- [ ] Netlify auto-deploys from main branch
- [ ] Build succeeds
- [ ] Site is live

### Testing
- [ ] Visit `https://dashboard.lanonasis.com`
- [ ] Click login
- [ ] Enter credentials
- [ ] **NO redirect loop** ✅
- [ ] Login succeeds
- [ ] Session persists after refresh
- [ ] Logout works
- [ ] OAuth providers work (if configured)

---

## 🚨 Common Issues

### Issue: "Invalid redirect URL" error
**Solution**: Check Supabase redirect URLs list includes exact match

### Issue: Redirect goes to api.lanonasis.com
**Solution**: Check `VITE_USE_DIRECT_AUTH=true` is set in Netlify

### Issue: OAuth doesn't work
**Solution**: Check OAuth provider redirect URI is set to Supabase callback URL

### Issue: "Supabase configuration required" error
**Solution**: Verify `VITE_SUPABASE_URL=https://<project-ref>.supabase.co

---

## 🎯 Summary

### What Changes
1. ✅ Add dashboard redirect URLs to Supabase (keep existing URLs)
2. ✅ Add environment variables to Netlify
3. ✅ Deploy dashboard

### What Stays the Same
1. ✅ Supabase Site URL (stays as `api.lanonasis.com` for multi-service support)
2. ✅ Existing redirect URLs (for CLI, SDK, Extensions, MCP servers)
3. ✅ OAuth provider configurations (Google, Apple, GitHub, Azure, Twitter/X)
4. ✅ Dashboard Netlify config (already correct)
5. ✅ api.lanonasis.com functions (other services still use them)
6. ✅ onasis-core redirects (other services need them)

### Result
- Dashboard authenticates **directly** with Supabase
- **NO** intermediary (api.lanonasis.com bypassed)
- OAuth works correctly
- Session management works
- **NO MORE REDIRECT LOOPS** 🎉

---

**File**: `/Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard/SUPABASE-CONFIGURATION.md`