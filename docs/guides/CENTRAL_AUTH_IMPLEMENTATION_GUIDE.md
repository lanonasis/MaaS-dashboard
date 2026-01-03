# Central Auth Implementation Guide for Dashboard

**Issue**: Dashboard uses direct Supabase access for API keys despite `.env` setting `VITE_USE_CENTRAL_AUTH=true`

**Goal**: Route API key operations through auth-gateway to centralize authentication and use Neon DB

---

## Current Architecture (BROKEN)

```
Dashboard → Supabase DB (mxtsdgkwzjzlttpotole)
          ↓
          ❌ Schema mismatch (key vs key_hash)
          ❌ No centralized validation
          ❌ Separate from Neon DB
```

## Target Architecture (CORRECT)

```
Dashboard → auth-gateway API → Neon DB (stored_api_keys)
                     ↓
                     ✅ SHA-256 hashing
                     ✅ Master key validation
                     ✅ Centralized auth
                     ✅ Consistent schema
```

---

## Implementation Options

### Option 1: Quick Fix - Update Supabase Schema (CURRENT APPROACH)

**Pros**: Minimal code changes, works immediately
**Cons**: Still uses Supabase directly, not truly "central auth"

**Steps**:
1. ✅ Run `SUPABASE_SCHEMA_FIX.sql` in Supabase SQL Editor
2. ✅ Update API key prefix from `vx_` to `lano_` (DONE)
3. Update Supabase types.ts to include `key_hash` column

### Option 2: Full Central Auth - Use Auth-Gateway API (RECOMMENDED)

**Pros**: True centralized auth, unified Neon DB, better security
**Cons**: Requires backend API implementation and more code changes

**Steps**:

#### 1. Create API Key Management Endpoints in auth-gateway

**Location**: `auth-gateway/src/routes/api-keys.ts`

```typescript
import { Router } from 'express';
import { authenticateFlexible } from '../middleware/auth';
import { createApiKey, listApiKeys, revokeApiKey } from '../controllers/api-keys';

const router = Router();

// All routes require authentication
router.use(authenticateFlexible);

// POST /api/v1/api-keys - Generate new API key
router.post('/', createApiKey);

// GET /api/v1/api-keys - List user's API keys
router.get('/', listApiKeys);

// DELETE /api/v1/api-keys/:id - Revoke API key
router.delete('/:id', revokeApiKey);

export default router;
```

#### 2. Implement API Key Controller

**Location**: `auth-gateway/src/controllers/api-keys.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '../lib/neon';
import crypto from 'crypto';

export async function createApiKey(req: Request, res: Response) {
  const { name, service, expires_at } = req.body;
  const userId = req.user.userId;  // From auth middleware

  try {
    // Generate API key
    const randomKey = crypto.randomBytes(32).toString('base64url');
    const apiKey = `lano_${randomKey}`;

    // Hash for storage
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Store in Neon DB
    const result = await db.query(`
      INSERT INTO stored_api_keys (user_id, key_hash, name, service, expires_at, is_active)
      VALUES ($1, $2, $3, $4, $5, true)
      RETURNING id, name, service, expires_at, created_at, is_active
    `, [userId, keyHash, name, service || 'all', expires_at]);

    // Return API key (only shown once) + metadata
    res.json({
      api_key: apiKey,  // Plain text, only shown once
      metadata: result.rows[0]
    });
  } catch (error) {
    console.error('API key creation error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
}

export async function listApiKeys(req: Request, res: Response) {
  const userId = req.user.userId;

  try {
    const result = await db.query(`
      SELECT id, name, service, expires_at, created_at, last_used, is_active
      FROM stored_api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    res.json({ api_keys: result.rows });
  } catch (error) {
    console.error('API key list error:', error);
    res.status(500).json({ error: 'Failed to list API keys' });
  }
}

export async function revokeApiKey(req: Request, res: Response) {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const result = await db.query(`
      UPDATE stored_api_keys
      SET is_active = false, revoked_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [id, userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key revoked successfully' });
  } catch (error) {
    console.error('API key revoke error:', error);
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
}
```

#### 3. Update Dashboard to Use API Gateway

**Location**: `apps/dashboard/src/components/dashboard/ApiKeyManager.tsx`

Replace Supabase direct access with API calls:

```typescript
// At the top of ApiKeyManager.tsx
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.lanonasis.com/v1';

// Replace generateApiKey function
const generateApiKey = async () => {
  // ... validation code ...

  setIsLoading(true);

  try {
    // Call auth-gateway API instead of Supabase
    const response = await fetch(`${API_BASE_URL}/api-keys`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`  // Supabase session token
      },
      body: JSON.stringify({
        name: keyName.trim(),
        service: keyService,
        expires_at: expirationDate
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate API key');
    }

    const { api_key, metadata } = await response.json();

    setGeneratedKey(api_key);  // Returned from backend
    // ... rest of success handling ...
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsLoading(false);
  }
};

// Replace fetchApiKeys function
const fetchApiKeys = useCallback(async () => {
  if (!user?.id) return;

  setIsLoadingKeys(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api-keys`, {
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch API keys');
    }

    const { api_keys } = await response.json();
    setApiKeys(api_keys);
  } catch (error) {
    // ... error handling ...
  } finally {
    setIsLoadingKeys(false);
  }
}, [user, session]);

// Replace revokeApiKey function
const revokeApiKey = async (keyId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to revoke API key');
    }

    toast({
      title: "API Key Revoked",
      description: "The API key has been successfully revoked",
    });

    fetchApiKeys();
  } catch (error) {
    // ... error handling ...
  }
};
```

---

## Configuration Settings Explained

### `VITE_USE_CENTRAL_AUTH=true`
- **Purpose**: Flag to route requests through auth-gateway
- **Current Issue**: Code doesn't check this flag, still uses Supabase directly
- **Fix**: Implement conditional logic based on this flag

### `VITE_USE_FALLBACK_AUTH=true`
- **Purpose**: Falls back to Supabase if auth-gateway is unavailable
- **Use Case**: Development environment or when auth-gateway is down

---

## Migration Plan

### Phase 1: Immediate Fix (Current)
1. ✅ Update API key prefix to `lano_`
2. ✅ Run Supabase schema migration (SUPABASE_SCHEMA_FIX.sql)
3. Update types.ts to reflect new schema

### Phase 2: Central Auth Implementation
1. Implement auth-gateway API endpoints
2. Update dashboard to call API endpoints
3. Test with both Supabase and Neon DB
4. Enable `VITE_USE_CENTRAL_AUTH=true` fully

### Phase 3: Complete Migration
1. Migrate all API keys from Supabase to Neon DB
2. Deprecate Supabase api_keys table
3. Remove fallback auth code

---

## Testing Checklist

- [ ] Generate API key with `lano_` prefix
- [ ] Verify key_hash is stored in database
- [ ] List API keys shows correct data
- [ ] Revoke API key works
- [ ] API key works with oauth-client package
- [ ] API key works with auth-gateway validation
- [ ] Expired keys are rejected
- [ ] Inactive keys are rejected

---

## Next Steps

**Immediate (Today)**:
1. Run `SUPABASE_SCHEMA_FIX.sql` in Supabase SQL Editor
2. Regenerate Supabase types: `npx supabase gen types typescript --project-id mxtsdgkwzjzlttpotole > src/integrations/supabase/types.ts`
3. Test API key generation

**Short-term (This Week)**:
1. Implement auth-gateway API endpoints
2. Update dashboard to use API endpoints
3. Test end-to-end flow

**Long-term (This Month)**:
1. Migrate existing API keys to Neon DB
2. Fully deprecate Supabase direct access
3. Document central auth architecture
