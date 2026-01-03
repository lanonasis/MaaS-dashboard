# Dashboard Refinement Plan

## Executive Summary

This plan addresses UI/UX issues in the MaaS dashboard, focusing on:
1. Transparency/visibility issues in floating components
2. Integration of the IntelligencePanel
3. Memory loading performance and UX
4. Data caching for better user experience
5. **NEW: Integration of enhanced components from v-secure reference repo**

---

## Reference Repository: v-secure/vortex-secure

The `v-secure` repository contains production-ready components that complete the MaaS dashboard:

| Source File | Target Integration | Key Features |
|-------------|-------------------|--------------|
| `APIKeysPage.tsx` | Enhance ApiKeyManager | Service scoping, rate limits, stats cards, better UX |
| `MCPServicesPage.tsx` | Replace MCPServerManager | Service catalog, health status, config modals |
| `MCPUsagePage.tsx` | New Analytics tab | Charts (recharts), usage trends, request logs |
| `MCPAccessMonitor.tsx` | MCP Tracking tab | Real-time sessions, activity logs, risk distribution |
| `MemoriesPage.tsx` | Enhance MemoryVisualizer | Grid view, detail modal, filtering, pin/archive |
| `mcp-router.ts` | Add to types | Complete TypeScript types for MCP router |

---

## Issue 1: AI Assistant Transparency Problem

### Current State
- **File**: `src/components/ai/AIAssistant.tsx`
- **Problem**: The chat panel content is transparent - text/input blends with dashboard behind it
- **Root Cause**:
  - Card uses `bg-card` which is properly defined
  - Input area uses `bg-muted/20` (20% opacity) - **this causes transparency**
  - ScrollArea background is transparent

### Evidence from Screenshots
- Input field "Ask me anything..." is barely visible
- Service tabs (Trade Finance, Bank Statements) show through the panel
- Text "Average Response Time" bleeds through

### Proposed Fix

```tsx
// AIAssistant.tsx - Line 85-89
// BEFORE:
<Card className={cn(
  "fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300",
  isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
)}>

// AFTER: Add explicit background
<Card className={cn(
  "fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300 bg-card/95 backdrop-blur-sm border-border",
  isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
)}>
```

```tsx
// Line 206 - Input area
// BEFORE:
<div className="p-4 border-t bg-muted/20">

// AFTER: Solid background
<div className="p-4 border-t bg-card">
```

```tsx
// Line 130 - ScrollArea
// BEFORE:
<ScrollArea className="flex-1 p-4" ref={scrollRef}>

// AFTER: Add background
<ScrollArea className="flex-1 p-4 bg-card" ref={scrollRef}>
```

---

## Issue 2: API Key Dialog Transparency

### Current State
- **File**: `src/components/dashboard/ApiKeyManager.tsx`
- **Problem**: Dialog content shows dashboard elements behind it
- **Root Cause**: DialogContent uses `bg-background` but there may be stacking context issues

### Evidence from Screenshots
- Dashboard text visible behind form fields
- "Dashboard" text, tabs visible through the dialog

### Proposed Fix

```tsx
// ApiKeyManager.tsx - Line 400
// BEFORE:
<DialogContent className="sm:max-w-[600px] text-foreground">

// AFTER: Ensure opaque background with higher z-index handling
<DialogContent className="sm:max-w-[600px] text-foreground bg-card border-border shadow-xl">
```

Also update Dialog component overlay:

```tsx
// src/components/ui/dialog.tsx - Line 21-23
// BEFORE:
"fixed inset-0 z-50 bg-black/80 ..."

// AFTER: Stronger overlay
"fixed inset-0 z-50 bg-black/90 backdrop-blur-sm ..."
```

---

## Issue 3: IntelligencePanel Not Integrated

### Current State
- **File**: `src/components/dashboard/IntelligencePanel.tsx` - Exists but unused
- **Dashboard**: Does not import or render IntelligencePanel
- **API Routes**: Backend has intelligence endpoints that the panel uses

### Proposed Integration

Add IntelligencePanel to the Dashboard Overview and Memory Analytics tabs:

```tsx
// Dashboard.tsx - Add import
import { IntelligencePanel } from "@/components/dashboard/IntelligencePanel";

// In TabsContent value="overview" (around line 177)
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
  {/* Welcome card remains */}
</TabsContent>

// In TabsContent value="memory-analytics" (around line 219)
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

## Issue 4: Memory Loading & Pagination

### Current State
- **File**: `src/components/dashboard/MemoryVisualizer.tsx`
- **Problem**:
  - Loads only 20 entries at a time (fixed limit)
  - No pagination UI to load more
  - No way to expand/read full content
  - Spinner shows indefinitely if API is slow
  - No timeout handling

### Proposed Fixes

#### A. Add Pagination Controls

```tsx
// Add state for pagination
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(true);
const [totalCount, setTotalCount] = useState(0);

// Update fetchMemories to track pagination
if (response.pagination) {
  setTotalCount(response.pagination.total);
  setHasMore(page < response.pagination.total_pages);
}

// Add pagination UI at bottom of memory list
{memories.length > 0 && (
  <div className="flex items-center justify-between pt-4 border-t">
    <span className="text-sm text-muted-foreground">
      Showing {memories.length} of {totalCount} memories
    </span>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page === 1}
        onClick={() => setPage(p => p - 1)}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        disabled={!hasMore}
        onClick={() => setPage(p => p + 1)}
      >
        Next
      </Button>
    </div>
  </div>
)}
```

#### B. Add Memory Expand/Edit Dialog

```tsx
// Add new state
const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
const [isDetailOpen, setIsDetailOpen] = useState(false);

// Memory card becomes clickable
<Card
  key={memory.id}
  className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-primary cursor-pointer"
  onClick={() => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
  }}
>
  ...
</Card>

// Add detail dialog
<Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {selectedMemory && getTypeIcon(selectedMemory.type)}
        {selectedMemory?.title || 'Memory Details'}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-4">
      <div>
        <Label className="text-muted-foreground">Content</Label>
        <p className="mt-1 text-sm whitespace-pre-wrap">
          {selectedMemory?.content}
        </p>
      </div>
      {selectedMemory?.tags?.length > 0 && (
        <div>
          <Label className="text-muted-foreground">Tags</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {selectedMemory.tags.map((tag, idx) => (
              <Badge key={idx} variant="secondary">{tag}</Badge>
            ))}
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <Label className="text-muted-foreground">Created</Label>
          <p>{formatDate(selectedMemory?.created_at)}</p>
        </div>
        <div>
          <Label className="text-muted-foreground">Type</Label>
          <p className="capitalize">{selectedMemory?.type}</p>
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

#### C. Add Loading Timeout

```tsx
// Add timeout to fetch
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
  }, 15000); // 15 second timeout

  try {
    // ... existing fetch logic
  } finally {
    clearTimeout(timeoutId);
    setIsLoading(false);
  }
}, [...]);
```

---

## Issue 5: Data Caching

### Current State
- Every component re-fetches data on mount
- No shared state between components
- User profile, memories, API keys fetched multiple times

### Proposed Solution: React Query Caching

The project already has `@tanstack/react-query` installed. We should leverage it properly:

#### A. Create Cached Hooks

```tsx
// src/hooks/useCachedMemories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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

export function useCachedProfile() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user?.id),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCachedApiKeys() {
  const { user } = useSupabaseAuth();

  return useQuery({
    queryKey: ['api-keys', user?.id],
    queryFn: () => fetchApiKeys(user?.id),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
```

#### B. Update Components to Use Cached Hooks

```tsx
// MemoryVisualizer.tsx
// BEFORE:
const [memories, setMemories] = useState<Memory[]>([]);
useEffect(() => { fetchMemories(); }, [...]);

// AFTER:
const { data: memories = [], isLoading, refetch } = useCachedMemories({
  type: selectedType !== 'all' ? selectedType : undefined,
  page,
  limit: 20
});
```

---

## Implementation Priority

### Phase 1: Critical UI Fixes (Immediate)
1. Fix AI Assistant transparency
2. Fix Dialog transparency
3. Add loading timeout for Memory Explorer

### Phase 2: Feature Integration (Short-term)
1. Integrate IntelligencePanel into Dashboard
2. Add pagination to Memory Explorer
3. Add memory detail/expand view

### Phase 3: Performance (Medium-term)
1. Implement React Query caching hooks
2. Migrate components to use cached hooks
3. Add prefetching for common routes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/ai/AIAssistant.tsx` | Fix transparency, add solid backgrounds |
| `src/components/ui/dialog.tsx` | Enhance overlay opacity |
| `src/components/dashboard/ApiKeyManager.tsx` | Fix dialog background |
| `src/pages/Dashboard.tsx` | Import and render IntelligencePanel |
| `src/components/dashboard/MemoryVisualizer.tsx` | Add pagination, detail view, timeout |
| `src/hooks/useCachedMemories.ts` | New file - cached memory hook |
| `src/hooks/useCachedProfile.ts` | New file - cached profile hook |

---

## Testing Checklist

- [ ] AI Assistant panel is fully opaque in dark mode
- [ ] AI Assistant panel is fully opaque in light mode
- [ ] API Key dialog is fully opaque
- [ ] Input fields are clearly visible
- [ ] IntelligencePanel renders on Overview tab
- [ ] IntelligencePanel shows health score
- [ ] Memory pagination works (next/previous)
- [ ] Memory detail dialog opens on click
- [ ] Loading spinner has timeout fallback
- [ ] Data persists across tab switches (caching)

---

## Phase 4: v-secure Component Integration (Major Overhaul)

### 4.1 Enhanced API Keys Management

**Source:** `/tmp/v-secure/vortex-secure/src/pages/APIKeysPage.tsx`

**Key Features to Port:**
- Stats cards (Total, Active, Revoked, Expiring Soon)
- Service scoping (all services vs specific)
- Environment restrictions (production, staging, development)
- Rate limiting (per minute, per day)
- Create modal with full configuration
- Edit modal for updating keys
- Newly created key alert with copy functionality
- Better key list with metadata display

**Integration Steps:**
1. Copy types from `mcp-router.ts` to `src/types/mcp-router.ts`
2. Update `ApiKeyManager.tsx` to use new UI structure
3. Add stats calculation logic
4. Implement service scope selection
5. Add environment selector
6. Connect to existing API endpoints

### 4.2 MCP Services Catalog (Replace MCPServerManager)

**Source:** `/tmp/v-secure/vortex-secure/src/pages/MCPServicesPage.tsx`

**Key Features to Port:**
- Service catalog grid with categories
- Category icons and colors (payment, devops, AI, communication, storage, analytics)
- Health status indicators (healthy, degraded, unhealthy, unknown)
- Configure modal for credentials
- Enable/disable toggle per service
- Test connection functionality
- Search and category filtering

**Integration Steps:**
1. Create `src/pages/MCPServicesPage.tsx`
2. Port `ServiceConfigureModal.tsx` component
3. Update routing in Dashboard.tsx
4. Connect to user_tool_configs table
5. Implement credential encryption storage

### 4.3 MCP Usage Analytics

**Source:** `/tmp/v-secure/vortex-secure/src/pages/MCPUsagePage.tsx`

**Key Features to Port:**
- Stats cards with trend indicators (% change vs last period)
- Area chart for calls over time (using recharts)
- Pie chart for service breakdown
- Line chart for response time
- Top actions bar chart
- Recent requests table with status badges
- Full request logs with pagination
- Date range filter (7d, 30d, 90d)
- Export functionality

**Integration Steps:**
1. Install `recharts` if not present
2. Create `src/pages/MCPUsagePage.tsx`
3. Create mock data generators for development
4. Add to dashboard routing
5. Connect to usage logging API

### 4.4 MCP Access Monitoring

**Source:** `/tmp/v-secure/vortex-secure/src/components/dashboard/MCPAccessMonitor.tsx`

**Key Features to Port:**
- Real-time stats (active sessions, tools, secrets accessed, avg duration)
- Active MCP sessions list with risk badges
- Session detail expansion
- Revoke session functionality
- Recent activity feed with severity icons
- Risk level distribution chart
- Supabase real-time subscriptions

**Integration Steps:**
1. Create `src/components/dashboard/MCPAccessMonitor.tsx`
2. Set up Supabase tables (mcp_active_sessions, mcp_audit_log, mcp_tools)
3. Implement real-time subscriptions
4. Add to MCP Tracking tab
5. Create session revocation API

### 4.5 Enhanced Memories Page

**Source:** `/tmp/v-secure/vortex-secure/src/pages/MemoriesPage.tsx`

**Key Features to Port:**
- Stats cards (Total, Active, Pinned, Encrypted, Storage)
- Grid layout with category icons
- Category and status filtering
- Search by title, content, tags
- Memory detail modal with full content
- Pin/Archive/Delete actions
- Tag display and management
- Access count and last accessed tracking

**Integration Steps:**
1. Update `MemoryVisualizer.tsx` with new grid layout
2. Add filtering UI
3. Implement detail modal
4. Add pin/archive/delete functionality
5. Connect to memory API endpoints

---

## Revised Implementation Priority

### Phase 1: Critical UI Fixes (Immediate - 1 hour)
1. Fix AI Assistant transparency
2. Fix Dialog transparency
3. Add loading timeout for Memory Explorer

### Phase 2: Feature Integration (Short-term - 2 hours)
1. Integrate IntelligencePanel into Dashboard
2. Add pagination to Memory Explorer
3. Add memory detail/expand view

### Phase 3: Performance (Medium-term - 1 hour)
1. Implement React Query caching hooks
2. Migrate components to use cached hooks
3. Add prefetching for common routes

### Phase 4: v-secure Integration (Major - 4-6 hours)
1. Port types from mcp-router.ts
2. Enhance API Keys management
3. Create MCP Services page
4. Create MCP Usage Analytics page
5. Create MCP Access Monitoring component
6. Enhance Memories page

---

## Dependencies to Add

```bash
bun add recharts @types/recharts
```

---

## New Files to Create

```
src/types/mcp-router.ts              # Types from v-secure
src/pages/MCPServicesPage.tsx        # Service catalog
src/pages/MCPUsagePage.tsx           # Usage analytics
src/components/dashboard/MCPAccessMonitor.tsx  # Access monitoring
src/components/mcp-router/ServiceConfigureModal.tsx  # Config modal
src/hooks/useCachedMemories.ts       # Cached memory hook
src/hooks/useCachedProfile.ts        # Cached profile hook
src/hooks/useCachedApiKeys.ts        # Cached API keys hook
```

---

## Database Schema Additions (Supabase)

Refer to: `/tmp/v-secure/vortex-secure/mcp-router-schema.sql`

Key tables:
- `mcp_service_catalog` - Available services
- `user_mcp_services` - User's configured services
- `mcp_usage_logs` - Request logs
- `mcp_active_sessions` - Active MCP sessions
- `mcp_audit_log` - Audit trail
