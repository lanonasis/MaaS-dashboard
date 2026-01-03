# API Key Migration Timeline & Consistency Plan

**Goal**: Migrate from `vx_` prefix and plain-text storage to `lano_` prefix with SHA-256 hashing across all platforms

---

## Phase 1: Immediate (Today - Day 0)

### ✅ Dashboard Changes
- [x] Update prefix from `vx_` to `lano_` in generator
- [x] Add `key_hash` column to insert (alongside `key` temporarily)
- [x] Include `service` column in insert
- [x] Regenerate Supabase TypeScript types

### ✅ Supabase Schema Migration
**Execute Now** (via Supabase SQL Editor):
1. Add `key_hash VARCHAR(64)` column
2. Backfill hashes from existing `key` column
3. Create index: `idx_api_keys_key_hash`
4. Create partial unique index: `uniq_api_keys_key_hash_not_null`
5. Create index: `idx_api_keys_user_id`
6. Add `hash_api_key()` helper function
7. Verify results

### ⏸️ Hold for Later
- DO NOT drop `key` column yet
- DO NOT make `key_hash` NOT NULL yet
- DO NOT add full unique constraint yet

### 🧪 Testing
- [ ] Generate new API key with `lano_` prefix
- [ ] Verify both `key` and `key_hash` are stored
- [ ] Verify `service` column is populated
- [ ] Test API key in oauth-client package
- [ ] Test API key in auth-gateway

---

## Phase 2: Validation Layer (Days 1-7)

### Update All Validation to Accept Both Formats

#### oauth-client (v1.1.0 → v1.2.0)
**File**: `oauth-client/src/flows/apikey-flow.ts`

```typescript
async authenticate(): Promise<TokenResponse> {
  // Accept both formats during migration
  if (!this.apiKey.startsWith('lano_') && !this.apiKey.startsWith('vx_')) {
    throw new Error('Invalid API key format. Must start with "lano_" or "vx_"');
  }

  // Warn about deprecated format
  if (this.apiKey.startsWith('vx_')) {
    console.warn(
      '⚠️  API keys with "vx_" prefix are deprecated and will stop working on [DATE]. ' +
      'Please regenerate your API key from the dashboard to get a "lano_" prefixed key.'
    );
  }

  return {
    access_token: this.apiKey,
    token_type: 'api-key',
    expires_in: 0,
    issued_at: Date.now()
  };
}
```

#### auth-gateway
**File**: `auth-gateway/src/middleware/auth.ts`

```typescript
async function validateAPIKey(apiKey: string) {
  // Accept both formats during migration period
  if (!apiKey.startsWith('lano_') && !apiKey.startsWith('vx_')) {
    return null;
  }

  // Log usage of deprecated format
  if (apiKey.startsWith('vx_')) {
    console.warn(`Deprecated API key format used: ${apiKey.substring(0, 8)}...`);
  }

  // Hash the key for lookup
  const keyHash = hashAPIKey(apiKey);

  // Try Neon DB first (new storage)
  const { data: neonKey } = await db.query(`
    SELECT * FROM stored_api_keys
    WHERE key_hash = $1 AND is_active = true
  `, [keyHash]);

  if (neonKey.rows.length > 0) {
    return {
      userId: neonKey.rows[0].user_id,
      authMethod: 'api-key'
    };
  }

  // Fallback to Supabase (old storage)
  const { data: supabaseKey } = await supabase
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .eq('is_active', true)
    .single();

  if (supabaseKey) {
    return {
      userId: supabaseKey.user_id,
      authMethod: 'api-key-legacy'
    };
  }

  return null;
}
```

### 📢 User Communication
- [ ] Add banner to dashboard: "API keys now use 'lano_' prefix. Old 'vx_' keys still work but are deprecated."
- [ ] Email users with existing `vx_` keys
- [ ] Update documentation

---

## Phase 3: Migration Period (Days 8-60)

### Dashboard Warning Messages

Add warning for users with old keys:

```typescript
// In ApiKeyManager.tsx fetchApiKeys()
const keys = Array.isArray(data) ? data : [];

// Check for deprecated keys
const deprecatedKeys = keys.filter(k =>
  k.key?.startsWith('vx_') ||
  (!k.key_hash && k.key)  // Keys without hash
);

if (deprecatedKeys.length > 0) {
  toast({
    title: "Action Required",
    description: `You have ${deprecatedKeys.length} API key(s) using the old format. Please regenerate them with the new lano_ prefix.`,
    variant: "warning",
    duration: 10000
  });
}
```

### Metrics to Track
- [ ] Count of `vx_` prefixed keys still in use
- [ ] Count of `lano_` prefixed keys
- [ ] API calls using deprecated keys
- [ ] Users who haven't migrated

### Migration Tools

**Script to identify users with old keys:**
```sql
-- Supabase query
SELECT
  u.email,
  COUNT(*) as old_key_count
FROM api_keys k
JOIN auth.users u ON u.id = k.user_id
WHERE k.key LIKE 'vx_%'
  AND k.is_active = true
GROUP BY u.email
ORDER BY old_key_count DESC;
```

---

## Phase 4: Deprecation Warning (Days 45-60)

### Stricter Warnings

Update validation to log and warn more aggressively:

```typescript
if (apiKey.startsWith('vx_')) {
  // Log for monitoring
  console.error(`DEPRECATED: vx_ key used by user ${userId}. Support ends in ${daysRemaining} days.`);

  // Still allow, but warn
  // Consider rate limiting deprecated keys
}
```

### Final Communication
- [ ] Email: "Last chance to migrate - vx_ keys stop working in 15 days"
- [ ] Dashboard: Red banner for users with old keys
- [ ] API response headers: `X-API-Key-Deprecated: true`

---

## Phase 5: Strict Enforcement (Day 61+)

### Remove `vx_` Support

#### oauth-client (v2.0.0 - BREAKING)
```typescript
async authenticate(): Promise<TokenResponse> {
  // Only accept lano_ prefix
  if (!this.apiKey.startsWith('lano_')) {
    throw new Error(
      'Invalid API key format. Must start with "lano_". ' +
      'Support for "vx_" prefixed keys ended on [DATE]. ' +
      'Please regenerate your API key from the dashboard.'
    );
  }
  // ...
}
```

#### auth-gateway
```typescript
async function validateAPIKey(apiKey: string) {
  // Reject old format
  if (apiKey.startsWith('vx_')) {
    console.warn(`Rejected deprecated vx_ key: ${apiKey.substring(0, 8)}...`);
    return null;
  }

  // Only accept lano_ format
  if (!apiKey.startsWith('lano_')) {
    return null;
  }
  // ...
}
```

### Cleanup Supabase Schema

**Execute Now** (via Supabase SQL Editor):

```sql
-- 1. Make key_hash NOT NULL
ALTER TABLE public.api_keys
ALTER COLUMN key_hash SET NOT NULL;

-- 2. Add full unique constraint
CREATE UNIQUE INDEX uniq_api_keys_key_hash
ON public.api_keys(key_hash);

-- Drop partial index (no longer needed)
DROP INDEX IF EXISTS uniq_api_keys_key_hash_not_null;

-- 3. Revoke access to plain key column
REVOKE SELECT(key) ON public.api_keys FROM authenticated, anon;

-- 4. Optional: Drop key column (DESTRUCTIVE!)
-- Only do this after 100% confirmation all users migrated
-- ALTER TABLE public.api_keys DROP COLUMN key;

-- 5. Deactivate all vx_ prefixed keys
UPDATE public.api_keys
SET is_active = false
WHERE key LIKE 'vx_%';
```

---

## Rollback Plan (Emergency)

If issues arise during migration:

### Revert Dashboard to Accept vx_
```typescript
const formattedKey = `vx_${randomKey}`;  // Revert to old prefix
```

### Revert Validation
```typescript
// Accept any prefix temporarily
if (!apiKey.match(/^(lano_|vx_)/)) {
  throw new Error('Invalid API key format');
}
```

### Keep Both Columns
- DO NOT drop `key` column
- Keep both `key` and `key_hash` populated
- Use feature flag to toggle validation mode

---

## Success Metrics

### Week 1
- [ ] 0% error rate on new key generation
- [ ] 100% of new keys use `lano_` prefix
- [ ] Both `key` and `key_hash` populated

### Week 4
- [ ] 50%+ of users migrated to `lano_` keys
- [ ] < 5% API calls using `vx_` keys

### Week 8 (Before Deprecation)
- [ ] 90%+ of users migrated
- [ ] < 1% API calls using `vx_` keys
- [ ] Email sent to remaining users

### Week 9 (After Deprecation)
- [ ] 0 `vx_` keys active
- [ ] 100% keys use `key_hash` column
- [ ] `key` column ready for deprecation

---

## Current Status: Phase 1 ✅

**Completed**:
- ✅ Dashboard generates `lano_` prefix
- ✅ Dashboard inserts both `key` and `key_hash`
- ✅ TypeScript types regenerated
- ⏳ Waiting for Supabase migration execution

**Next Steps**:
1. Execute Supabase migration (respond to assistant with plan above)
2. Test API key generation end-to-end
3. Deploy updated dashboard
4. Begin Phase 2: Update validation layers

**Timeline**: ~60 days total migration period
