# API Key Validation Fix - Complete Summary

**Date**: 2025-11-26  
**Issue**: Dashboard-created `lano_*` API keys failing validation on `api.lanonasis.com`

## Architecture Confirmation

✅ **Your understanding is correct:**

1. **`api.lanonasis.com`** (Netlify):
   - Routes `/api/v1/memory` → `/.netlify/functions/maas-api` (Netlify function)
   - Uses Supabase database for business data
   - **This is where the fix was applied**

2. **`auth.lanonasis.com`** (VPS, PM2):
   - Auth gateway service on port 4000
   - Uses Neon database for OAuth tokens, sessions, user management
   - Handles `/oauth/introspect` for OAuth token validation
   - **Not involved in `lano_*` key validation**

3. **`mcp.lanonasis.com`** (VPS, PM2):
   - MCP server
   - **Not involved in API key validation**

## The Problem

1. **Dashboard creates keys** (`ApiKeyManager.tsx`):
   - Format: `lano_[32 random chars]`
   - Stored in **Supabase** `api_keys` table with SHA-256 hash
   - **NOT registered with Neon auth-gateway**

2. **API Gateway validation** (`maas-api.js` Netlify function):
   - Only handled vendor keys (`pk_*`, `sk_*`)
   - For other tokens, tried JWT → then OAuth introspection
   - OAuth introspection calls `auth.lanonasis.com/oauth/introspect` (VPS)
   - VPS looks up tokens in **Neon** `auth_gateway.oauth_tokens` table
   - **`lano_*` keys don't exist in Neon**, so introspection fails

3. **Result**: "Token introspection failed" error

## The Fix

Added `lano_*` API key validation in `apps/onasis-core/netlify/functions/maas-api.js`:

```javascript
// Check if this is a user API key (lano_* format) - FIRST CHECK
if (token.startsWith('lano_')) {
  // Hash and lookup in Supabase api_keys table
  const keyHash = hashSecret(token);
  const { data: apiKeyRecord, error } = await supabase
    .from('api_keys')
    .select('id, user_id, name, service, expires_at, is_active')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();
  
  // Validate and set req.user
}
```

**Key points:**
- ✅ Checks `lano_*` format **BEFORE** OAuth introspection
- ✅ Validates directly from **Supabase** (where keys are stored)
- ✅ Bypasses Neon auth-gateway for user API keys
- ✅ Includes expiration check and last_used update

## Deployment Required

The fix is in the code but needs to be deployed to Netlify:

1. **Commit the changes** to `apps/onasis-core/netlify/functions/maas-api.js`
2. **Push to trigger Netlify deployment** (or deploy manually)
3. **Test with your API key**:
   ```bash
   curl -X GET "https://api.lanonasis.com/api/v1/memory" \
     -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh"
   ```

## Why PM2 Logs Don't Show Calls

✅ **This is expected!** 

- `/api/v1/memory` requests go to **Netlify** (not VPS)
- Netlify function logs are in **Netlify dashboard**, not PM2
- PM2 logs only show VPS services (auth-gateway, mcp-core)
- OAuth introspection calls (`/oauth/introspect`) would show in PM2, but `lano_*` keys now bypass that

## Testing After Deployment

1. **Test API key validation**:
   ```bash
   curl -X GET "https://api.lanonasis.com/api/v1/memory?limit=5" \
     -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh"
   ```

2. **Expected response**: Memory data (not "Token introspection failed")

3. **Check Netlify function logs** (not PM2):
   - Netlify dashboard → Functions → `maas-api` → Logs
   - Should see: `[maas-api] Validating lano_* API key...`
   - Should see: `[maas-api] API key validated successfully for user: <user_id>`

## Architecture Flow (After Fix)

```
User Request
  ↓
api.lanonasis.com/api/v1/memory
  ↓
Netlify Function: maas-api.js
  ↓
Token: lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh
  ↓
✅ Check: token.startsWith('lano_') → YES
  ↓
Hash token → SHA-256
  ↓
Query Supabase api_keys table (key_hash match)
  ↓
✅ Key found → Set req.user
  ↓
Process request → Return memory data
```

**No longer calls:**
- ❌ JWT validation
- ❌ OAuth introspection (auth.lanonasis.com)
- ❌ Neon database lookup

