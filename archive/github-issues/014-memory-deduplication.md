# Intelligent Memory Deduplication

**Priority:** Low  
**Category:** Feature - Memory System  
**Labels:** `enhancement`, `memory`, `optimization`

## Problem
Users can create duplicate or near-duplicate memories. Wastes storage and reduces search quality.

## Current State
- No duplicate detection
- Same memory can be stored multiple times
- No similarity checking
- Database bloat from duplicates

## Proposed Solution

### Detection Methods

**1. Exact Duplicates**
```sql
-- Find exact content duplicates
SELECT content, COUNT(*) as count
FROM memory_entries
WHERE user_id = 'xxx'
GROUP BY content
HAVING COUNT(*) > 1;
```

**2. Near Duplicates (Semantic Similarity)**
```typescript
async function findSimilarMemories(
  content: string,
  userId: string,
  threshold = 0.95
): Promise<Memory[]> {
  
  // Get embedding for new content
  const embedding = await getEmbedding(content);
  
  // Search for similar memories
  const similar = await vectorDB.search({
    user_id: userId,
    embedding,
    similarity_threshold: threshold,
    limit: 10
  });
  
  return similar;
}
```

**3. Content Fingerprinting**
```typescript
function generateFingerprint(content: string): string {
  // Normalize content
  const normalized = content
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  
  // SimHash or MinHash for near-duplicate detection
  return simhash(normalized);
}
```

### Features
1. **Pre-Save Detection** - Warn before creating duplicate
2. **Merge Suggestions** - Suggest merging similar memories
3. **Automatic Deduplication** - Background job to find duplicates
4. **Duplicate Dashboard** - UI to review and merge duplicates
5. **Smart Merge** - Combine tags, metadata from duplicates

### UI Flow

**Creating New Memory:**
```
User: Creates memory "Project setup notes"
System: Searches for similar memories
System: "⚠️ Similar memory found: 'Project setup guide' (95% match)"
Options:
  - "View Similar Memory"
  - "Create Anyway"
  - "Merge into Existing"
```

**Duplicate Review:**
```
Dashboard shows:
┌─────────────────────────────────────┐
│ Potential Duplicates Detected       │
├─────────────────────────────────────┤
│ "API Documentation" (3 copies)      │
│ Created: Nov 1, Nov 5, Nov 15       │
│ Similarity: 98%                     │
│ [Review] [Auto-Merge] [Dismiss]     │
└─────────────────────────────────────┘
```

### Merge Strategy
```typescript
async function mergeMemories(memoryIds: string[]): Promise<Memory> {
  const memories = await getMemories(memoryIds);
  
  // Keep most recent content
  const content = memories[0].content;
  
  // Combine all unique tags
  const allTags = new Set();
  memories.forEach(m => m.tags.forEach(t => allTags.add(t)));
  
  // Merge metadata
  const metadata = Object.assign({}, ...memories.map(m => m.metadata));
  
  // Create merged memory
  const merged = await createMemory({
    content,
    tags: Array.from(allTags),
    metadata,
    type: memories[0].type
  });
  
  // Delete old memories
  await deleteMemories(memoryIds);
  
  // Log merge for audit
  await logMerge(memoryIds, merged.id);
  
  return merged;
}
```

### Database Schema
```sql
CREATE TABLE memory_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id_1 UUID NOT NULL REFERENCES memory_entries(id),
  memory_id_2 UUID NOT NULL REFERENCES memory_entries(id),
  similarity_score DECIMAL(3,2) NOT NULL, -- 0.0 to 1.0
  duplicate_type VARCHAR(50) DEFAULT 'semantic', -- exact, semantic, fingerprint
  status VARCHAR(50) DEFAULT 'pending', -- pending, merged, dismissed
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(memory_id_1, memory_id_2)
);

CREATE INDEX idx_duplicates_status ON memory_duplicates(status);
```

### Background Job
```typescript
// Daily cron job
async function detectDuplicates() {
  const users = await getAllUsers();
  
  for (const user of users) {
    const memories = await getUserMemories(user.id);
    
    // Find duplicates using fingerprinting
    const fingerprints = new Map();
    for (const memory of memories) {
      const fingerprint = generateFingerprint(memory.content);
      
      if (fingerprints.has(fingerprint)) {
        // Potential duplicate found
        await createDuplicateRecord(
          fingerprints.get(fingerprint),
          memory.id,
          'fingerprint'
        );
      } else {
        fingerprints.set(fingerprint, memory.id);
      }
    }
    
    // Find semantic duplicates (more expensive, limit to recent)
    const recentMemories = memories.slice(0, 100);
    for (let i = 0; i < recentMemories.length; i++) {
      const similar = await findSimilarMemories(
        recentMemories[i].content,
        user.id,
        0.95
      );
      
      for (const match of similar) {
        if (match.id !== recentMemories[i].id) {
          await createDuplicateRecord(
            recentMemories[i].id,
            match.id,
            'semantic',
            match.similarity
          );
        }
      }
    }
  }
}
```

## Success Criteria
- [ ] Exact duplicates detected before creation
- [ ] Near-duplicates flagged (>95% similarity)
- [ ] Users can review and merge duplicates
- [ ] Background job finds duplicates daily
- [ ] Auto-merge option for exact duplicates

## Benefits
- Reduced storage costs
- Better search quality
- Improved user experience
- Database optimization

