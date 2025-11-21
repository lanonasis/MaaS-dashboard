# Memory Bulk Operations & Import/Export

**Priority:** Medium  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `import-export`

## Problem
No way to import/export memories in bulk. Cannot manage multiple memories at once. Migration from other systems difficult.

## Current State
- One memory at a time operations
- No import/export functionality
- Cannot bulk delete or update
- No migration tools

## Proposed Solution

### Features
1. **Bulk Selection** - Select multiple memories with checkboxes
2. **Bulk Actions**:
   - Delete selected memories
   - Tag selected memories
   - Archive/unarchive selected
   - Change type for selected
   - Export selected to JSON/CSV
3. **Import Formats**:
   - JSON (structured memories)
   - CSV (simple list with metadata)
   - Markdown (each file becomes a memory)
   - Plain text (auto-chunk into memories)
4. **Export Formats**:
   - JSON (full fidelity with metadata)
   - CSV (simple export for spreadsheets)
   - Markdown (one file per memory)
   - PDF (formatted report)

### Import Schema (JSON)
```json
{
  "memories": [
    {
      "content": "Memory content here",
      "type": "knowledge",
      "tags": ["tag1", "tag2"],
      "metadata": {...},
      "importance": 0.8
    }
  ]
}
```

### UI Components
- Checkbox selection in memory list
- "Bulk Actions" dropdown menu
- Import modal with file upload
- Export modal with format selection
- Progress indicator for bulk operations
- Validation feedback for imports

### API Endpoints
```
POST /api/v1/memory/bulk-delete
POST /api/v1/memory/bulk-update
POST /api/v1/memory/bulk-tag
POST /api/v1/memory/import
GET /api/v1/memory/export?format=json&ids=...
```

### Import Validation
- Validate JSON schema
- Check for duplicate memories (content similarity)
- Validate tags and types
- Size limits (max 1000 memories per import)
- Preview before import

## Success Criteria
- [ ] Users can select multiple memories
- [ ] Bulk delete works correctly
- [ ] Bulk tag addition works
- [ ] Import JSON/CSV functional
- [ ] Export to multiple formats works
- [ ] Import validation prevents bad data

## Use Cases
- Migrate from other knowledge bases
- Backup and restore memories
- Share memory collections
- Bulk management of old memories

