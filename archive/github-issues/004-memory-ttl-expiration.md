# Memory TTL, Expiration & Auto-Archive

**Priority:** Low  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `cleanup`

## Problem
Old memories accumulate indefinitely. No way to auto-archive or delete stale context. No temporary memory support.

## Current State
- Memories never expire
- No archiving mechanism
- No automatic cleanup
- Database bloat over time

## Proposed Solution

### Database Schema Updates
```sql
ALTER TABLE memory_entries 
  ADD COLUMN expires_at TIMESTAMPTZ,
  ADD COLUMN importance_score DECIMAL(3,2) DEFAULT 0.5, -- 0.0 to 1.0
  ADD COLUMN auto_archive_after_days INTEGER,
  ADD COLUMN archived_at TIMESTAMPTZ,
  ADD COLUMN archive_reason TEXT;

CREATE INDEX idx_memory_expires ON memory_entries(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_memory_archived ON memory_entries(archived_at) WHERE archived_at IS NOT NULL;
```

### Features
1. **TTL Support** - Set expiration time for temporary memories
2. **Importance Scoring** - AI-based importance calculation
3. **Auto-Archive Rules**:
   - Archive memories not accessed in 90 days
   - Archive low-importance memories after 180 days
   - User-defined archive policies
4. **Manual Archive** - Archive memories manually
5. **Archive Search** - Search through archived memories
6. **Restore from Archive** - Unarchive when needed

### Background Jobs
```typescript
// Scheduled job (runs daily)
async function expireOldMemories() {
  // Delete expired memories
  await db.deleteFrom('memory_entries')
    .where('expires_at', '<', new Date())
    .execute();
    
  // Archive inactive memories
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await db.update('memory_entries')
    .set({ 
      archived_at: new Date(),
      archive_reason: 'Auto-archived due to inactivity'
    })
    .where('last_accessed_at', '<', ninetyDaysAgo)
    .where('importance_score', '<', 0.3)
    .whereNull('archived_at')
    .execute();
}
```

### UI Components
- "Set Expiration" option in memory creation/edit
- "Archive" action in memory menu
- Archived memories section
- Archive search with filters
- Bulk archive/restore actions

### API Endpoints
```
POST /api/v1/memory/:id/archive
POST /api/v1/memory/:id/restore
GET /api/v1/memory/archived
POST /api/v1/memory/bulk-archive
```

## Success Criteria
- [ ] Memories can have TTL set
- [ ] Expired memories auto-deleted daily
- [ ] Inactive memories auto-archived
- [ ] Archive search functional
- [ ] Restore from archive works

## Storage Benefits
- Reduce active database size
- Improve query performance
- Cost savings on storage
- Better UX (less clutter)

