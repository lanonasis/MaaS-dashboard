# Dashboard Refinement - Master Integration Document

## Overview

This document consolidates all refinement plans for the MaaS Dashboard, including:
1. **Quick UI Fixes** - Transparency issues, loading states
2. **IntelligencePanel Integration** - Already exists, needs to be wired up
3. **React Query Caching** - Performance improvements
4. **v-secure Module Porting** - Complete MCP Router platform

---

## Source Repositories

### MaaS Dashboard (Current)
```
/Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard
Branch: claude/refine-ai-dashboard-S3fMK
```

### v-secure Reference (Source for MCP Router)
```
/Users/seyederick/DevOps/_project_folders/v-secure
Branch: claude/mcp-router-platform-UbyGf  <-- IMPORTANT: Must checkout this branch
Subfolder: vortex-secure/
```

---

## Phase 1: Quick UI Fixes (Foundation)

### 1.1 AI Assistant Transparency

**File:** `src/components/ai/AIAssistant.tsx`

**Problem:** Input area and scroll region are semi-transparent, making text hard to read.

**Fix locations:**
- Line ~85: Card component - add `bg-card/95 backdrop-blur-sm`
- Line ~130: ScrollArea - add `bg-card`
- Line ~206: Input container - change `bg-muted/20` to `bg-card`

```tsx
// Card (Line 85)
// BEFORE:
<Card className={cn("fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300", ...)}>

// AFTER:
<Card className={cn("fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300 bg-card/95 backdrop-blur-sm border-border", ...)}>

// ScrollArea (Line 130)
// BEFORE:
<ScrollArea className="flex-1 p-4" ref={scrollRef}>

// AFTER:
<ScrollArea className="flex-1 p-4 bg-card" ref={scrollRef}>

// Input container (Line 206)
// BEFORE:
<div className="p-4 border-t bg-muted/20">

// AFTER:
<div className="p-4 border-t bg-card">
```

### 1.2 Dialog Transparency

**File:** `src/components/ui/dialog.tsx`

**Fix:**
```tsx
// Line 21-23 - Overlay
// BEFORE:
"fixed inset-0 z-50 bg-black/80 ..."

// AFTER:
"fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ..."
```

**File:** `src/components/dashboard/ApiKeyManager.tsx`

**Fix:**
```tsx
// Line 400 - DialogContent
// BEFORE:
<DialogContent className="sm:max-w-[600px] text-foreground">

// AFTER:
<DialogContent className="sm:max-w-[600px] text-foreground bg-card border-border shadow-xl">
```

### 1.3 Loading Timeout

**File:** `src/components/dashboard/MemoryVisualizer.tsx`

Add 15-second timeout to prevent infinite spinners:

```tsx
const fetchMemories = useCallback(async () => {
  const timeoutId = setTimeout(() => {
    if (isLoading) {
      setIsLoading(false);
      toast({
        title: "Request Timeout",
        description: "Memory loading took too long. Please try again.",
        variant: "destructive",
      });
    }
  }, 15000);

  try {
    // existing fetch logic
  } finally {
    clearTimeout(timeoutId);
    setIsLoading(false);
  }
}, [/* deps */]);
```

---

## Phase 2: IntelligencePanel Integration

### Current State
- Component exists: `src/components/dashboard/IntelligencePanel.tsx`
- NOT imported in Dashboard.tsx
- Connects to REST API endpoints (`/intelligence/health-check`, etc.)

### Integration

**File:** `src/pages/Dashboard.tsx`

```tsx
// Add import
import { IntelligencePanel } from "@/components/dashboard/IntelligencePanel";

// Add to Overview tab (around line 177)
<TabsContent value="overview" className="space-y-8">
  <UserProfile />
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <ApiDashboard />
    </div>
    <div className="lg:col-span-1">
      <IntelligencePanel compact />
    </div>
  </div>
</TabsContent>

// Add to Memory Analytics tab (around line 219)
<TabsContent value="memory-analytics" className="space-y-8">
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div className="lg:col-span-2">
      <DashboardOverview />
      <MemoryAnalytics />
    </div>
    <div className="lg:col-span-1">
      <IntelligencePanel />
    </div>
  </div>
</TabsContent>
```

---

## Phase 3: Memory Explorer Enhancements

### 3.1 Pagination

**File:** `src/components/dashboard/MemoryVisualizer.tsx`

Add state and UI:
```tsx
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);

// After fetch:
if (response.pagination) {
  setTotalCount(response.pagination.total);
  setHasMore(page < response.pagination.total_pages);
}

// Pagination UI at bottom of list:
{memories.length > 0 && (
  <div className="flex items-center justify-between pt-4 border-t">
    <span className="text-sm text-muted-foreground">
      Showing {memories.length} of {totalCount} memories
    </span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
        Previous
      </Button>
      <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage(p => p + 1)}>
        Next
      </Button>
    </div>
  </div>
)}
```

### 3.2 Memory Detail Dialog

Add expand/read functionality:
```tsx
const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);

// Make cards clickable:
<Card
  key={memory.id}
  className="hover:shadow-md transition-shadow cursor-pointer"
  onClick={() => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
  }}
>

// Add dialog:
<Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>{selectedMemory?.title || 'Memory Details'}</DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <p className="whitespace-pre-wrap">{selectedMemory?.content}</p>
      {selectedMemory?.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMemory.tags.map((tag, idx) => (
            <Badge key={idx} variant="secondary">{tag}</Badge>
          ))}
        </div>
      )}
    </div>
  </DialogContent>
</Dialog>
```

---

## Phase 4: React Query Caching

### Create Cached Hooks

**New file:** `src/hooks/useCachedMemories.ts`

```tsx
import { useQuery } from '@tanstack/react-query';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export function useCachedMemories(params: MemoryParams = {}) {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['memories', user?.id, params],
    queryFn: () => fetchMemoriesFromSupabase(user?.id, params),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}
```

**New file:** `src/hooks/useCachedProfile.ts`

```tsx
export function useCachedProfile() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user?.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });
}
```

**New file:** `src/hooks/useCachedApiKeys.ts`

```tsx
export function useCachedApiKeys() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['api-keys', user?.id],
    queryFn: () => fetchApiKeys(user?.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}
```

---

## Phase 5: v-secure Module Integration (Major)

### Prerequisites

1. **Checkout correct branch in v-secure:**
   ```bash
   cd /Users/seyederick/DevOps/_project_folders/v-secure
   git checkout claude/mcp-router-platform-UbyGf
   ```

2. **Install dependencies:**
   ```bash
   cd /Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard
   bun add recharts @types/recharts
   ```

3. **Create directories:**
   ```bash
   mkdir -p src/lib/mcp-router
   mkdir -p src/components/mcp-router
   ```

### File Mapping

| Source (v-secure/vortex-secure/) | Target (dashboard/src/) | Lines |
|----------------------------------|-------------------------|-------|
| **Database** | | |
| `mcp-router-schema.sql` | Run on Supabase | 32KB |
| **Types** | | |
| `src/types/mcp-router.ts` | `types/mcp-router.ts` | 11KB |
| **Backend Libraries** | | |
| `src/lib/mcp-router/index.ts` | `lib/mcp-router/index.ts` | 1KB |
| `src/lib/mcp-router/api-keys.ts` | `lib/mcp-router/api-keys.ts` | 21KB |
| `src/lib/mcp-router/router.ts` | `lib/mcp-router/router.ts` | 20KB |
| `src/lib/mcp-router/service-catalog.ts` | `lib/mcp-router/service-catalog.ts` | 9KB |
| `src/lib/mcp-router/user-services.ts` | `lib/mcp-router/user-services.ts` | 17KB |
| `src/lib/mcp-router/process-pool.ts` | `lib/mcp-router/process-pool.ts` | 16KB |
| `src/lib/encryption.ts` | `lib/encryption.ts` | 7KB |
| `src/lib/rotation.ts` | `lib/rotation.ts` | 11KB |
| **Components** | | |
| `src/components/mcp-router/ServiceConfigureModal.tsx` | `components/mcp-router/ServiceConfigureModal.tsx` | 12KB |
| `src/components/dashboard/MCPAccessMonitor.tsx` | `components/dashboard/MCPAccessMonitor.tsx` | 18KB |
| **Pages** | | |
| `src/pages/MCPServicesPage.tsx` | `pages/MCPServicesPage.tsx` | 22KB |
| `src/pages/APIKeysPage.tsx` | `pages/APIKeysPage.tsx` | 31KB |
| `src/pages/MCPUsagePage.tsx` | `pages/MCPUsagePage.tsx` | 23KB |

### Import Path Updates Required

All copied files need these import updates:

```typescript
// BEFORE (v-secure pattern)
import { supabase } from '../supabase';
import type { ... } from '../../types/mcp-router';

// AFTER (dashboard pattern)
import { supabase } from '@/integrations/supabase/client';
import type { ... } from '@/types/mcp-router';
```

### Copy Commands

```bash
# Set paths
VSECURE="/Users/seyederick/DevOps/_project_folders/v-secure/vortex-secure"
DASHBOARD="/Users/seyederick/DevOps/_project_folders/lan-onasis-monorepo/apps/dashboard"

# Types
cp "$VSECURE/src/types/mcp-router.ts" "$DASHBOARD/src/types/"

# Backend libraries
cp -r "$VSECURE/src/lib/mcp-router/" "$DASHBOARD/src/lib/mcp-router/"
cp "$VSECURE/src/lib/encryption.ts" "$DASHBOARD/src/lib/"
cp "$VSECURE/src/lib/rotation.ts" "$DASHBOARD/src/lib/"

# Components
mkdir -p "$DASHBOARD/src/components/mcp-router"
cp "$VSECURE/src/components/mcp-router/ServiceConfigureModal.tsx" "$DASHBOARD/src/components/mcp-router/"
cp "$VSECURE/src/components/dashboard/MCPAccessMonitor.tsx" "$DASHBOARD/src/components/dashboard/"

# Pages
cp "$VSECURE/src/pages/MCPServicesPage.tsx" "$DASHBOARD/src/pages/"
cp "$VSECURE/src/pages/APIKeysPage.tsx" "$DASHBOARD/src/pages/"
cp "$VSECURE/src/pages/MCPUsagePage.tsx" "$DASHBOARD/src/pages/"
```

### Dashboard.tsx Route Updates

```tsx
// Add tab mappings to getActiveTab()
if (path.includes('/mcp-services')) return 'mcp-services';
if (path.includes('/mcp-usage')) return 'mcp-usage';

// Add TabsList items
<TabsTrigger value="mcp-services">MCP Services</TabsTrigger>
<TabsTrigger value="mcp-usage">MCP Analytics</TabsTrigger>

// Add TabsContent
<TabsContent value="mcp-services">
  <MCPServicesPage />
</TabsContent>
<TabsContent value="mcp-usage">
  <MCPUsagePage />
</TabsContent>

// Replace existing API Keys with enhanced version
<TabsContent value="api-keys">
  <APIKeysPage />  {/* From v-secure */}
</TabsContent>
```

### App.tsx Route Updates

```tsx
<Route path="/dashboard/mcp-services" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
<Route path="/dashboard/mcp-usage" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
```

---

## Database Schema

**File:** `vortex-secure/mcp-router-schema.sql` (32KB)

### Tables Created:

1. `mcp_service_catalog` - Platform-level service definitions (15+ pre-seeded)
2. `user_mcp_services` - User's configured services with AES-256-GCM encrypted credentials
3. `api_keys` - LanOnasis API keys for external applications
4. `api_key_scopes` - Junction table for granular service access per API key
5. `mcp_usage_logs` - Analytics and billing tracking
6. `mcp_rate_limits` - Rate limiting counters
7. `mcp_process_pool` - MCP server process management

### Pre-seeded Services:
- **Payment**: Stripe
- **DevOps**: GitHub, GitLab
- **AI**: OpenAI, Anthropic, Perplexity
- **Communication**: Slack, Discord, Twilio
- **Storage**: AWS S3, Google Drive
- **Analytics**: PostHog, Sentry
- **Productivity**: Supabase, Notion, Linear, Jira

---

## Testing Checklist

### Phase 1
- [ ] AI Assistant panel is fully opaque (dark mode)
- [ ] AI Assistant panel is fully opaque (light mode)
- [ ] API Key dialog is fully opaque
- [ ] Input fields clearly visible
- [ ] Loading spinner has timeout fallback

### Phase 2
- [ ] IntelligencePanel renders on Overview tab
- [ ] IntelligencePanel shows health score

### Phase 3
- [ ] Memory pagination works (next/previous)
- [ ] Memory detail dialog opens on click
- [ ] Total count displays correctly

### Phase 4
- [ ] Data persists across tab switches
- [ ] Cache invalidation works on mutations

### Phase 5
- [ ] Database schema deployed successfully
- [ ] MCP Services page loads and shows catalog
- [ ] Service configuration modal works
- [ ] API Keys page creates keys correctly
- [ ] Key scoping works (all vs specific)
- [ ] MCP Usage page shows charts
- [ ] Rate limiting works
- [ ] Credential encryption/decryption works

---

## Recommended Implementation Order

1. **Phase 1** (30 min) - Quick UI fixes
2. **Phase 2** (15 min) - IntelligencePanel integration
3. **Phase 3** (45 min) - Memory Explorer enhancements
4. **Phase 4** (1 hr) - React Query caching
5. **Phase 5** (4-6 hrs) - v-secure module porting

**Total Estimated Effort:** ~8 hours

---

## Notes

- v-secure repo must be on `claude/mcp-router-platform-UbyGf` branch to access MCP router files
- The MCP router schema should be run on Supabase BEFORE porting frontend components
- All v-secure components need import path updates after copying
- Consider creating adapter functions if auth hook patterns differ
