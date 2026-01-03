# API Key Validation Fix

**Date**: 2025-11-26  
**Issue**: Dashboard-created API keys (`lano_*` format) were failing validation on `api.lanonasis.com`

## Problem

1. **Dashboard creates keys directly in Supabase** (`ApiKeyManager.tsx`):
   - Keys are stored in `api_keys` table with SHA-256 hash in `key_hash` column
   - Format: `lano_[32 random chars]`
   - Keys are NOT registered with Neon auth gateway

2. **API Gateway validation was incomplete** (`maas-api.js`):
   - Only handled vendor keys (`pk_*`, `sk_*` formats)
   - Tried JWT validation for other tokens
   - Fell back to OAuth2 token introspection via Neon auth gateway
   - **Missing**: Direct validation of `lano_*` user API keys from Supabase

3. **Result**: All `lano_*` keys returned `"Token introspection failed"` because:
   - Keys don't match vendor key formats
   - Keys aren't JWT tokens
   - Keys aren't registered in Neon OAuth tokens table
   - Neon introspection endpoint returns failure

## Solution

Added `lano_*` API key validation in `apps/onasis-core/netlify/functions/maas-api.js`:

```javascript
// Check if this is a user API key (lano_* format)
if (token.startsWith('lano_')) {
  // Hash the key and look it up in api_keys table
  const keyHash = hashSecret(token);
  
  const { data: apiKeyRecord, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, name, service, expires_at, is_active, created_at')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  // Validate key exists, is active, and not expired
  // Set req.user with user_id and API key metadata
}
```

## Architecture Confirmation

✅ **Your presumption is correct**:

- **Neon (auth.lanonasis.com)**: Auth manager, rate limiting, user management, OAuth tokens
- **Supabase (api.lanonasis.com)**: Business data, API keys storage (`api_keys` table)
- **Dashboard**: Creates keys directly in Supabase (bypasses Neon for key storage)
- **API Gateway**: Now validates `lano_*` keys directly from Supabase

## Testing

Test your API key:
```bash
curl -X GET "https://api.lanonasis.com/api/v1/memory" \
  -H "Authorization: Bearer lano_9utj6qtt5uikuf53pz7k1nm0ls0xlreh"
```

Expected: Should return memory data instead of "Token introspection failed"

## Next Steps

1. ✅ Fixed API gateway to validate `lano_*` keys from Supabase
2. ⚠️ Consider: Should dashboard also register keys with Neon for rate limiting?
3. ⚠️ Consider: Should we add rate limiting per API key in Supabase?

