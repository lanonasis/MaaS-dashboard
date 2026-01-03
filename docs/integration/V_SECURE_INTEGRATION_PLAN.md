# V-Secure Module Integration Plan

## Overview

This document details the holistic integration of the **v-secure/vortex-secure** module into the MaaS-dashboard. The v-secure module is tightly coupled with interdependent components that cannot be ported piecemeal.

**Key Insight**: The module must be integrated as a complete unit - database schema, backend libraries, types, and frontend components all depend on each other.

---

## Module Dependency Tree

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER (Supabase)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ mcp-router-schema.sql (972 lines)                                   ││
│  │ ├── mcp_service_catalog (15+ pre-seeded services)                   ││
│  │ ├── user_mcp_services (encrypted credentials)                       ││
│  │ ├── api_keys (LanOnasis API keys)                                   ││
│  │ ├── api_key_scopes (granular permissions)                           ││
│  │ ├── mcp_usage_logs (analytics/billing)                              ││
│  │ ├── mcp_rate_limits (rate limiting)                                 ││
│  │ └── mcp_process_pool (process management)                           ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        BACKEND LIBRARIES                                 │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ src/lib/mcp-router/                                                 ││
│  │ ├── index.ts (exports)                                              ││
│  │ ├── service-catalog.ts (ServiceCatalogManager)                      ││
│  │ ├── user-services.ts (UserServicesManager + encryption)             ││
│  │ ├── api-keys.ts (APIKeyManager + scoping + rate limiting)           ││
│  │ ├── router.ts (MCPRouter - core routing engine)                     ││
│  │ └── process-pool.ts (MCPProcessPool - process management)           ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Supporting Libraries                                                ││
│  │ ├── src/lib/encryption.ts (AES-256-GCM)                             ││
│  │ ├── src/lib/rotation.ts (key rotation)                              ││
│  │ └── src/lib/mcp-proxy.ts (MCP proxy)                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        TYPES LAYER                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ src/types/mcp-router.ts (497 lines)                                 ││
│  │ ├── MCPServiceCatalog, CredentialField, ServiceCategory             ││
│  │ ├── UserMCPService, ServiceCredentials, HealthStatus                ││
│  │ ├── APIKey, APIKeyScope, ScopeType, CreateAPIKeyRequest             ││
│  │ ├── MCPUsageLog, UsageLogStatus, UsageAnalytics                     ││
│  │ ├── MCPProcess, ProcessStatus                                       ││
│  │ ├── MCPRouterRequest, MCPRouterResponse                             ││
│  │ └── MCPRouterErrors (error codes)                                   ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND PAGES                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ src/pages/                                                          ││
│  │ ├── MCPServicesPage.tsx (630 lines) - Service catalog               ││
│  │ ├── APIKeysPage.tsx (882 lines) - Enhanced API key management       ││
│  │ ├── MCPUsagePage.tsx (664 lines) - Analytics dashboard              ││
│  │ ├── MCPMonitoringPage.tsx - MCP monitoring wrapper                  ││
│  │ └── MemoriesPage.tsx (636 lines) - Enhanced memory management       ││
│  └─────────────────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ src/components/                                                     ││
│  │ ├── dashboard/MCPAccessMonitor.tsx (542 lines) - Real-time monitor  ││
│  │ └── mcp-router/ServiceConfigureModal.tsx - Service config modal     ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Integration Strategy

### Option A: Full Module Copy (Recommended)

Copy the entire v-secure module structure into MaaS-dashboard, adapting paths and imports.

**Pros:**
- Complete functionality immediately
- Minimal adaptation required
- All dependencies preserved

**Cons:**
- Larger codebase
- Some duplicate utilities may exist

### Option B: Selective Integration

Cherry-pick components and adapt to existing patterns.

**Pros:**
- Smaller footprint
- More consistent with existing code

**Cons:**
- Higher risk of missing dependencies
- More manual work
- Potential for subtle bugs

**Recommendation**: Option A - Full Module Copy with adaptation

---

## Implementation Phases

### Phase 0: Prerequisites

1. **Run database schema** (mcp-router-schema.sql) on Supabase
2. **Install dependencies**: `bun add recharts @types/recharts`
3. **Create directories**:
   ```
   src/lib/mcp-router/
   src/types/
   src/components/mcp-router/
   ```

---

### Phase 1: Foundation (Types + Backend Libraries)

#### 1.1 Copy Types

```bash
# From v-secure
cp /tmp/v-secure/vortex-secure/src/types/mcp-router.ts \
   src/types/mcp-router.ts
```

**Adaptation needed**: Update import paths

#### 1.2 Copy Backend Libraries

```bash
# Copy entire mcp-router library
cp -r /tmp/v-secure/vortex-secure/src/lib/mcp-router/ \
      src/lib/mcp-router/

# Copy supporting libraries
cp /tmp/v-secure/vortex-secure/src/lib/encryption.ts \
   src/lib/encryption.ts

cp /tmp/v-secure/vortex-secure/src/lib/rotation.ts \
   src/lib/rotation.ts
```

**Adaptation needed**:
- Update supabase import: `from './supabase'` → `from '@/integrations/supabase/client'`
- Verify encryption key source (environment variable)

#### 1.3 Verify Imports

Each file in `src/lib/mcp-router/` needs import path updates:
```typescript
// BEFORE (v-secure)
import { supabase } from '../supabase';
import type { ... } from '../../types/mcp-router';

// AFTER (MaaS-dashboard)
import { supabase } from '@/integrations/supabase/client';
import type { ... } from '@/types/mcp-router';
```

---

### Phase 2: Components

#### 2.1 Copy MCPAccessMonitor

```bash
cp /tmp/v-secure/vortex-secure/src/components/dashboard/MCPAccessMonitor.tsx \
   src/components/dashboard/MCPAccessMonitor.tsx
```

**Adaptation needed**:
- Update supabase import
- Verify UI component imports match MaaS-dashboard structure

#### 2.2 Copy ServiceConfigureModal

```bash
mkdir -p src/components/mcp-router
cp /tmp/v-secure/vortex-secure/src/components/mcp-router/ServiceConfigureModal.tsx \
   src/components/mcp-router/ServiceConfigureModal.tsx
```

---

### Phase 3: Pages

#### 3.1 Copy Enhanced Pages

```bash
# MCP Services Page
cp /tmp/v-secure/vortex-secure/src/pages/MCPServicesPage.tsx \
   src/pages/MCPServicesPage.tsx

# API Keys Page (Enhanced)
cp /tmp/v-secure/vortex-secure/src/pages/APIKeysPage.tsx \
   src/pages/APIKeysPage.tsx

# MCP Usage Analytics
cp /tmp/v-secure/vortex-secure/src/pages/MCPUsagePage.tsx \
   src/pages/MCPUsagePage.tsx

# MCP Monitoring
cp /tmp/v-secure/vortex-secure/src/pages/MCPMonitoringPage.tsx \
   src/pages/MCPMonitoringPage.tsx

# Enhanced Memories
cp /tmp/v-secure/vortex-secure/src/pages/MemoriesPage.tsx \
   src/pages/MemoriesPage.tsx
```

**Adaptation needed for each**:
- Update imports to match MaaS-dashboard structure
- Update UI component paths
- Ensure auth hook compatibility (`useSupabaseAuth` vs `useAuth`)

---

### Phase 4: Dashboard Integration

#### 4.1 Update Dashboard.tsx Routes

```typescript
// Add new tab mappings
const getActiveTab = () => {
  const path = location.pathname;
  if (path.includes('/api-keys')) return 'api-keys';
  if (path.includes('/mcp-services')) return 'mcp-services';     // NEW
  if (path.includes('/mcp-usage')) return 'mcp-usage';           // NEW
  if (path.includes('/mcp-monitoring')) return 'mcp-monitoring'; // NEW
  if (path.includes('/memory-visualizer')) return 'memory-visualizer';
  if (path.includes('/memory-analytics')) return 'memory-analytics';
  if (path.includes('/mcp-tracking')) return 'mcp-tracking';
  if (path.includes('/ai-tools')) return 'ai-tools';
  if (path.includes('/extensions')) return 'extensions';
  if (path.includes('/memories')) return 'memories';             // NEW
  return 'overview';
};
```

#### 4.2 Update App.tsx Routes

```typescript
// Add new routes
<Route path="/dashboard/mcp-services" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/dashboard/mcp-usage" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/dashboard/mcp-monitoring" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/dashboard/memories" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

#### 4.3 Add Tab Content

```typescript
// In Dashboard.tsx TabsContent
<TabsContent value="mcp-services">
  <MCPServicesPage />
</TabsContent>

<TabsContent value="api-keys">
  <APIKeysPage />
</TabsContent>

<TabsContent value="mcp-usage">
  <MCPUsagePage />
</TabsContent>

<TabsContent value="mcp-monitoring">
  <MCPMonitoringPage />
</TabsContent>

<TabsContent value="memories">
  <MemoriesPage />
</TabsContent>
```

---

### Phase 5: Supabase Integration

#### 5.1 Run Schema

Execute `mcp-router-schema.sql` in Supabase SQL editor to create:
- 7 new tables
- 15+ pre-seeded MCP services
- RLS policies
- Indexes
- Triggers
- RPC functions

#### 5.2 Update Supabase Types

After schema is deployed, regenerate types:
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/integrations/supabase/types.ts
```

---

## File Mapping Summary

| Source (v-secure) | Target (MaaS-dashboard) | Adaptation Required |
|-------------------|-------------------------|---------------------|
| `types/mcp-router.ts` | `src/types/mcp-router.ts` | Import paths |
| `lib/mcp-router/*` | `src/lib/mcp-router/*` | Supabase import |
| `lib/encryption.ts` | `src/lib/encryption.ts` | Env variable |
| `lib/rotation.ts` | `src/lib/rotation.ts` | Minor |
| `components/dashboard/MCPAccessMonitor.tsx` | `src/components/dashboard/MCPAccessMonitor.tsx` | Imports |
| `components/mcp-router/ServiceConfigureModal.tsx` | `src/components/mcp-router/ServiceConfigureModal.tsx` | Imports |
| `pages/MCPServicesPage.tsx` | `src/pages/MCPServicesPage.tsx` | Imports, auth |
| `pages/APIKeysPage.tsx` | `src/pages/APIKeysPage.tsx` | Imports, auth |
| `pages/MCPUsagePage.tsx` | `src/pages/MCPUsagePage.tsx` | Imports |
| `pages/MCPMonitoringPage.tsx` | `src/pages/MCPMonitoringPage.tsx` | Imports |
| `pages/MemoriesPage.tsx` | `src/pages/MemoriesPage.tsx` | Imports, auth |
| `mcp-router-schema.sql` | Run on Supabase | None |

---

## Estimated Effort

| Phase | Description | Estimated Time |
|-------|-------------|----------------|
| **0** | Prerequisites (schema, deps) | 30 min |
| **1** | Foundation (types, backend) | 1 hour |
| **2** | Components | 30 min |
| **3** | Pages | 1.5 hours |
| **4** | Dashboard integration | 1 hour |
| **5** | Supabase integration | 30 min |
| **Testing** | End-to-end testing | 1 hour |
| **Total** | | **~6 hours** |

---

## Post-Integration Tasks

1. **Fix transparency issues** (from original plan)
2. **Update existing components** to use new types
3. **Remove deprecated components**:
   - `MCPServerManager.tsx` → replaced by `MCPServicesPage.tsx`
   - `ApiKeyManager.tsx` → replaced by `APIKeysPage.tsx`
   - `MemoryVisualizer.tsx` → replaced by `MemoriesPage.tsx`
4. **Update navigation/sidebar** if needed

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Database schema conflicts | Backup before running schema |
| Import path issues | Systematic search/replace |
| Auth hook incompatibility | Create adapter if needed |
| Missing dependencies | Check package.json diff |
| UI component style differences | Use existing shadcn/ui components |

---

## Testing Checklist

- [ ] Database schema deployed successfully
- [ ] MCP Services page loads and shows catalog
- [ ] Service configuration modal works
- [ ] API Keys page creates keys correctly
- [ ] Key scoping works (all vs specific)
- [ ] MCP Usage page shows charts
- [ ] MCP Monitoring shows real-time updates
- [ ] Memories page loads with grid view
- [ ] Memory detail modal works
- [ ] Rate limiting works
- [ ] Credential encryption/decryption works

---

## Decision Required

**Should we proceed with this integration plan?**

Options:
1. **Full Integration** - Implement all phases (~6 hours)
2. **Partial Integration** - Start with Phases 0-2, add pages incrementally
3. **Defer** - Focus on original UI fixes first, integrate v-secure later

Please confirm your preference.
