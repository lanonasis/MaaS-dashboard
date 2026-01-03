# Memory Relationship Graph & Linking

**Priority:** High  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `ux`

## Problem
Currently, memories exist in isolation with no way to link related memories together. Users cannot visualize connections between different pieces of knowledge or context.

## Current State
- Memories are standalone entities
- No relationship tracking between memories
- No way to link related context
- Cannot visualize memory networks

## Proposed Solution
Implement a memory relationship system:

### Database Schema
```sql
CREATE TABLE memory_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  target_memory_id UUID NOT NULL REFERENCES memory_entries(id) ON DELETE CASCADE,
  relationship_type VARCHAR(50) NOT NULL, -- 'related', 'derived-from', 'references', 'depends-on'
  strength DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0
  created_by_user BOOLEAN DEFAULT true, -- false if AI-generated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_memory_id, target_memory_id, relationship_type)
);

CREATE INDEX idx_memory_rel_source ON memory_relationships(source_memory_id);
CREATE INDEX idx_memory_rel_target ON memory_relationships(target_memory_id);
```

### Features
1. **Manual Linking** - Users can link related memories
2. **AI-Suggested Links** - Automatically suggest related memories based on semantic similarity
3. **Graph Visualization** - Interactive graph showing memory connections
4. **Relationship Types**:
   - `related` - General relationship
   - `derived-from` - Memory created based on another
   - `references` - Explicitly references another memory
   - `depends-on` - Requires another memory for context
   - `contradicts` - Conflicts with another memory
   - `supersedes` - Replaces outdated memory

### UI Components
- Memory graph visualization (using D3.js or React Flow)
- "Related Memories" sidebar in memory detail view
- Quick-link action in memory cards
- Relationship strength indicator
- Bidirectional navigation

### API Endpoints
```
POST /api/v1/memory/:id/relationships
GET /api/v1/memory/:id/relationships
DELETE /api/v1/memory/relationships/:relationshipId
GET /api/v1/memory/:id/graph?depth=2
```

## Success Criteria
- [ ] Users can link memories together
- [ ] Graph visualization renders correctly
- [ ] AI suggests relevant memory links
- [ ] Performance: Graph queries < 200ms for 1000+ memories

## Business Value
- Improved context retrieval
- Better knowledge organization
- Enhanced memory discovery
- Foundation for knowledge graphs

