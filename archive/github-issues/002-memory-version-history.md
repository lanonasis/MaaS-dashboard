# Memory Version History & Change Tracking

**Priority:** High  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `compliance`

## Problem
No tracking of memory changes over time. Cannot see who modified a memory, what changed, or revert to previous versions.

## Current State
- Only `created_at` and `updated_at` timestamps
- No change history
- Cannot revert changes
- No audit trail for compliance

## Proposed Solution

### Database Schema
```sql
CREATE TABLE memory_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  type TEXT,
  tags JSONB,
  metadata JSONB,
  changed_by UUID REFERENCES auth.users(id),
  change_summary TEXT, -- Optional user description
  changes_diff JSONB, -- Structured diff
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id, version_number)
);

CREATE INDEX idx_memory_versions_memory ON memory_versions(memory_id, version_number DESC);
CREATE INDEX idx_memory_versions_user ON memory_versions(changed_by);
```

### Features
1. **Automatic Versioning** - Every update creates a new version
2. **Version Comparison** - Diff view between versions
3. **Version Restore** - Revert to any previous version
4. **Change Attribution** - Track who made each change
5. **Version Timeline** - Visual timeline of all changes
6. **Change Summaries** - Optional user-provided change notes

### UI Components
- "History" button in memory detail view
- Version timeline with diff preview
- Side-by-side version comparison
- Restore version confirmation dialog
- Change attribution badges

### API Endpoints
```
GET /api/v1/memory/:id/versions
GET /api/v1/memory/:id/versions/:versionNumber
POST /api/v1/memory/:id/revert/:versionNumber
GET /api/v1/memory/:id/diff?from=v1&to=v2
```

### Implementation Notes
- Use `jsondiffpatch` for structured diffs
- Store only diffs (not full content) for space efficiency
- Configurable retention (e.g., keep versions for 90 days)
- Option to "squash" old versions to save space

## Success Criteria
- [ ] Every memory update creates a version
- [ ] Users can view version history
- [ ] Users can compare any two versions
- [ ] Users can restore previous versions
- [ ] Version storage optimized (< 10% storage overhead)

## Compliance Benefits
- SOC 2 audit trails
- GDPR data lineage
- Regulatory compliance for sensitive data

