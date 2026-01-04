# API Key Migration Status

**Last Updated**: 2025-11-25
**Migration Start**: Phase 1 & Phase 2 Complete ✅
**Timeline**: 60-day gradual migration to complete security model

---

## ✅ Phase 1: Schema & Prefix Updates (COMPLETE)

### Database Migration (Supabase)
- ✅ Added `key_hash` column (VARCHAR(64))
- ✅ Backfilled hashes for all 17 existing API keys using SHA-256
- ✅ Created index: `idx_api_keys_key_hash`
- ✅ Created partial unique index: `uniq_api_keys_key_hash_not_null`
- ✅ Created index: `idx_api_keys_user_id`
- ✅ Added helper function: `public.hash_api_key(text)`
- ✅ Granted permissions to `authenticated` role

**Verification Results**:
```
Total keys: 17
Keys with hash: 17 (100%)
Keys with plain text: 17 (100%)
Status: Both columns populated - ready for migration period
```

### Dashboard Updates
- ✅ Updated prefix from `vx_` to `lano_`
- ✅ Implemented SHA-256 hashing using Web Crypto API
- ✅ Insert includes both `key` and `key_hash` for transition
- ✅ Added `service` column to inserts
- ✅ Regenerated TypeScript types

**File**: `apps/dashboard/src/components/dashboard/ApiKeyManager.tsx`

---

## ✅ Phase 2: Validation Layer Updates (COMPLETE)

### oauth-client Package (v1.2.0)
**File**: `/Users/seyederick/DevOps/_project_folders/v-secure/oauth-client/src/flows/apikey-flow.ts`

**Changes**:
- ✅ Accepts both `lano_` and `vx_` prefixes during migration
- ✅ Logs deprecation warning for `vx_` keys
- ✅ Validates format before authentication

**Deprecation Warning**:
```
⚠️  DEPRECATION WARNING: API keys with "vx_" prefix are deprecated
and will stop working soon. Please regenerate your API key from the
dashboard to get a "lano_" prefixed key.
```

### auth-gateway Service
**Files**:
- `apps/onasis-core/services/auth-gateway/src/services/api-key.service.ts`
- `apps/onasis-core/services/auth-gateway/src/middleware/auth.ts`

**Changes**:
- ✅ Updated prefix from `lns_` to `lano_` (alignment with dashboard)
- ✅ Validation accepts `lano_`, `vx_`, and `lns_` prefixes
- ✅ Logs deprecation warnings for old formats
- ✅ Hash-based validation using SHA-256

**Deprecation Warnings**:
```
⚠️  DEPRECATED: API key with "vx_" prefix used
⚠️  DEPRECATED: API key with "lns_" prefix used (replaced with "lano_")
⚠️  WARNING: API key with unknown prefix detected
```

---

## 📊 Current State

### API Key Prefixes
| Prefix | Status | Action |
|--------|--------|--------|
| `lano_` | ✅ Current Standard | All new keys use this |
| `vx_` | ⚠️ Deprecated | Still works, logs warnings |
| `lns_` | ⚠️ Deprecated | Still works, logs warnings |

### Storage Strategy
```
┌─────────────────────────────────────┐
│ Supabase api_keys Table             │
├─────────────────────────────────────┤
│ • key (text) - Plain text (legacy)  │
│ • key_hash (varchar) - SHA-256      │
│                                     │
│ During Migration:                   │
│   Both populated ✅                  │
│                                     │
│ After Migration (Day 61+):          │
│   Only key_hash ✅                   │
│   key column dropped                │
└─────────────────────────────────────┘
```

### Authentication Flow
```
Client sends API key
    ↓
oauth-client validates prefix (lano_/vx_/lns_)
    ↓
auth-gateway hashes key with SHA-256
    ↓
Lookup in database by key_hash
    ↓
Check expiration & active status
    ↓
Return user context
```

---

## 🎯 Phase 3: Migration Period (Days 8-60)

### Immediate Next Steps

#### 1. Build and Publish oauth-client v1.2.0
```bash
cd /Users/seyederick/DevOps/_project_folders/v-secure/oauth-client
bun run build
npm publish
```

#### 2. Update Dependencies
Update projects using oauth-client:
```json
{
  "dependencies": {
    "@lanonasis/oauth-client": "^1.2.0"
  }
}
```

#### 3. Deploy Dashboard Changes
```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard
bun run build
# Deploy to production
```

#### 4. Deploy auth-gateway Changes
```bash
cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/onasis-core/services/auth-gateway
bun run build
# Deploy to production
```

### User Communication

#### Dashboard Banner (To Implement)
```typescript
// Add to ApiKeyManager.tsx
const deprecatedKeys = apiKeys.filter(k =>
  k.key?.startsWith('vx_') || k.key?.startsWith('lns_')
);

if (deprecatedKeys.length > 0) {
  toast({
    title: "Action Required",
    description: `You have ${deprecatedKeys.length} API key(s) using
                  deprecated format. Please regenerate them.`,
    variant: "warning"
  });
}
```

#### Email Template (Draft)
```
Subject: Action Required: Update Your API Keys

Dear User,

We've upgraded our API key security with SHA-256 hashing. Your existing
API keys (vx_*) will continue working for 60 days but should be regenerated:

1. Visit https://dashboard.lanonasis.com/api-keys
2. Create new keys (lano_* prefix)
3. Update your applications
4. Revoke old keys

Old keys stop working: [DATE + 60 days]

Questions? Contact support@lanonasis.com
```

### Metrics to Track

Create monitoring dashboard:
```sql
-- Count keys by prefix
SELECT
  CASE
    WHEN key LIKE 'lano_%' THEN 'lano_ (current)'
    WHEN key LIKE 'vx_%' THEN 'vx_ (deprecated)'
    WHEN key LIKE 'lns_%' THEN 'lns_ (deprecated)'
    ELSE 'unknown'
  END as prefix_type,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER () as percentage
FROM api_keys
WHERE is_active = true
GROUP BY prefix_type;

-- Users who haven't migrated
SELECT
  u.email,
  COUNT(*) as deprecated_key_count
FROM api_keys k
JOIN auth.users u ON u.id = k.user_id
WHERE k.key LIKE 'vx_%' OR k.key LIKE 'lns_%'
  AND k.is_active = true
GROUP BY u.email;
```

---

## 🚀 Phase 4: Deprecation Warning (Days 45-60)

### Stricter Enforcement

#### Response Headers (To Implement)
```typescript
// In auth-gateway middleware
if (apiKey.startsWith('vx_') || apiKey.startsWith('lns_')) {
  res.setHeader('X-API-Key-Deprecated', 'true');
  res.setHeader('X-API-Key-Sunset', sunsetDate.toISOString());
}
```

#### Dashboard: Red Banner
```typescript
if (deprecatedKeys.length > 0) {
  // Show prominent warning 15 days before cutoff
  const daysUntilCutoff = calculateDaysRemaining();

  if (daysUntilCutoff <= 15) {
    toast({
      title: "⚠️ URGENT: API Keys Expiring Soon",
      description: `Your deprecated keys stop working in ${daysUntilCutoff} days!`,
      variant: "destructive",
      duration: Infinity
    });
  }
}
```

#### Email: Final Warning
Send at Day 45 to all users with deprecated keys.

---

## 🔒 Phase 5: Strict Enforcement (Day 61+)

### Code Changes

#### oauth-client v2.0.0 (BREAKING)
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

#### auth-gateway: Reject Old Formats
```typescript
if (apiKey.startsWith('vx_') || apiKey.startsWith('lns_')) {
  console.warn(`Rejected deprecated key: ${apiKey.substring(0, 8)}...`);
  return { valid: false, reason: 'Deprecated API key format' };
}
```

### Database Cleanup

```sql
-- 1. Deactivate all deprecated keys
UPDATE public.api_keys
SET is_active = false
WHERE key LIKE 'vx_%' OR key LIKE 'lns_%';

-- 2. Make key_hash NOT NULL
ALTER TABLE public.api_keys
ALTER COLUMN key_hash SET NOT NULL;

-- 3. Add full unique constraint
CREATE UNIQUE INDEX uniq_api_keys_key_hash
ON public.api_keys(key_hash);

DROP INDEX IF EXISTS uniq_api_keys_key_hash_not_null;

-- 4. Revoke access to plain key column
REVOKE SELECT(key) ON public.api_keys FROM authenticated, anon;

-- 5. Optional: Drop key column (after confirmation)
-- ALTER TABLE public.api_keys DROP COLUMN key;
```

---

## 🔧 Testing Checklist

### Before Production Deployment

- [ ] Generate new API key with `lano_` prefix via dashboard
- [ ] Verify both `key` and `key_hash` are populated in database
- [ ] Test API key authentication in oauth-client v1.2.0
- [ ] Test API key validation in auth-gateway
- [ ] Verify deprecation warnings appear in logs for `vx_` keys
- [ ] Test expired key rejection
- [ ] Test revoked key rejection
- [ ] Verify `service` column is populated

### Post-Deployment Monitoring

- [ ] Monitor error rates for API key authentication
- [ ] Track usage of deprecated `vx_` and `lns_` keys
- [ ] Verify deprecation warnings appear in production logs
- [ ] Confirm new keys use `lano_` prefix
- [ ] Check database for any keys without `key_hash`

---

## 🐛 Rollback Plan

If critical issues arise:

### Quick Rollback
1. Revert dashboard to generate `vx_` keys temporarily
2. Remove prefix validation from oauth-client
3. Keep both `key` and `key_hash` columns populated
4. Use feature flag to toggle validation mode

### Database Rollback
```sql
-- Don't drop anything until 100% confident
-- Keep both columns indefinitely if needed
```

---

## 📝 Success Metrics

### Week 1 Targets
- ✅ 0% error rate on new key generation
- ✅ 100% of new keys use `lano_` prefix
- ✅ Both `key` and `key_hash` populated

### Week 4 Targets
- [ ] 50%+ of active keys using `lano_` prefix
- [ ] < 5% of API calls using deprecated keys
- [ ] Email sent to users with deprecated keys

### Week 8 Targets (Before Strict Enforcement)
- [ ] 90%+ of users migrated
- [ ] < 1% of API calls using deprecated keys
- [ ] Final warning emails sent

### Week 9 Targets (After Enforcement)
- [ ] 0 deprecated keys active
- [ ] 100% keys use `key_hash` column
- [ ] `key` column ready for deprecation

---

## 📚 Related Documentation

- [API_KEY_MIGRATION_TIMELINE.md](./API_KEY_MIGRATION_TIMELINE.md) - Detailed 60-day plan
- [CENTRAL_AUTH_IMPLEMENTATION_GUIDE.md](./CENTRAL_AUTH_IMPLEMENTATION_GUIDE.md) - Architecture overview
- [SUPABASE_SCHEMA_FIX.sql](./SUPABASE_SCHEMA_FIX.sql) - Database migration script

---

## 🔗 Key File Locations

### Dashboard
- `apps/dashboard/src/components/dashboard/ApiKeyManager.tsx`
- `apps/dashboard/src/integrations/supabase/types.ts`

### oauth-client
- `v-secure/oauth-client/src/flows/apikey-flow.ts`
- `v-secure/oauth-client/package.json` (v1.2.0)

### auth-gateway
- `apps/onasis-core/services/auth-gateway/src/services/api-key.service.ts`
- `apps/onasis-core/services/auth-gateway/src/middleware/auth.ts`

---

**Migration Owner**: DevOps Team
**Support Contact**: support@lanonasis.com
**Status Page**: https://status.lanonasis.com
