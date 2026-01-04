# Memory Visualizer & AI Workflow Orchestrator Implementation

## Overview

This implementation adds two major features to the LanOnasis Dashboard:

1. **Memory Visualizer** - Displays recent memories from the `memory_entries` vector table
2. **AI Workflow Orchestrator** - Plans and tracks multi-step workflows using LLM and user memories

## Architecture

### Database Schema

#### `memory_entries` Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- content: TEXT (memory content)
- type: TEXT (context|project|knowledge|reference|personal|workflow|note|document)
- tags: JSONB (array of tags)
- metadata: JSONB (additional metadata)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `workflow_runs` Table
```sql
- id: UUID (primary key)
- user_id: UUID (references auth.users)
- goal: TEXT (user's workflow goal)
- status: TEXT (analyzing|planning|executing|completed|failed)
- steps: JSONB (array of step objects)
- results: JSONB (workflow results and notes)
- error_message: TEXT
- used_memories: JSONB (array of memory IDs used as context)
- created_at: TIMESTAMPTZ
- completed_at: TIMESTAMPTZ
```

### Backend API Endpoints

#### GET `/api/memories/recent`
**Query Parameters:**
- `limit` (optional, default: 20) - Number of memories to fetch

**Response:**
```json
[
  {
    "id": "uuid",
    "contentSnippet": "First 200 characters...",
    "type": "project",
    "tags": ["tag1", "tag2"],
    "createdAt": "2025-11-09T13:04:12.123Z"
  }
]
```

**Authentication:** Requires valid JWT token in Authorization header

---

#### POST `/api/orchestrator/execute`
**Request Body:**
```json
{
  "goal": "Your workflow goal description"
}
```

**Response:**
```json
{
  "id": "workflow-run-uuid",
  "steps": [
    {
      "action": "Description of what to do",
      "tool": "tool_name",
      "reasoning": "Why this step is important"
    }
  ],
  "notes": "Overall strategy and notes",
  "usedMemories": ["memory-id-1", "memory-id-2"],
  "createdAt": "2025-11-09T13:04:12.123Z"
}
```

**Authentication:** Requires valid JWT token in Authorization header

**Dependencies:** Requires `OPENAI_API_KEY` environment variable

---

#### GET `/api/orchestrator/runs`
**Query Parameters:**
- `limit` (optional, default: 20) - Number of workflow runs to fetch

**Response:**
```json
[
  {
    "id": "uuid",
    "user_id": "uuid",
    "goal": "Workflow goal",
    "status": "completed",
    "steps": [...],
    "results": {...},
    "used_memories": [...],
    "created_at": "2025-11-09T13:04:12.123Z",
    "completed_at": "2025-11-09T13:05:30.456Z"
  }
]
```

**Authentication:** Requires valid JWT token in Authorization header

---

### Frontend Components

#### `MemoryVisualizer.tsx`
Located at: `src/components/dashboard/MemoryVisualizer.tsx`

**Features:**
- Displays last 20 memories with snippets
- Shows memory type with color-coded badges
- Displays tags as chips
- Shows relative timestamps (e.g., "5 mins ago")
- Auto-refresh on mount
- Empty state handling
- Loading state with spinner

**Props:** None (uses Supabase auth context)

---

#### `WorkflowOrchestrator.tsx`
Located at: `src/components/orchestrator/WorkflowOrchestrator.tsx`

**Features:**
- Text area for workflow goal input
- Execute button with loading state
- Workflow history list
- Displays planned steps with numbering
- Shows strategy notes
- Lists used memories as context
- Relative timestamps
- Auto-fetches history on mount

**Props:** None (uses Supabase auth context)

---

### Storage Layer

Added methods to `server/storage.ts`:

```typescript
// Memory methods
getRecentMemories(userId: string, limit?: number): Promise<MemoryEntry[]>
createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry>

// Workflow methods
getWorkflowRuns(userId: string, limit?: number): Promise<WorkflowRun[]>
createWorkflowRun(run: InsertWorkflowRun): Promise<WorkflowRun>
updateWorkflowRun(id: string, updates: Partial<InsertWorkflowRun>): Promise<WorkflowRun>
```

---

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
OPENAI_API_KEY=sk-proj-...your-key-here
```

### 2. Database Migration

Run the migration to create the new tables:

```bash
# If using Supabase CLI
supabase db push

# Or manually run the SQL migration file:
# supabase/migrations/20251109_create_memory_and_workflow_tables.sql
```

### 3. Install Dependencies

All dependencies are already in `package.json`. No additional packages needed.

### 4. Start the Development Server

```bash
bun run dev
```

---

## Security Features

### Row-Level Security (RLS)

Both tables have comprehensive RLS policies:

**memory_entries:**
- Users can only read their own memories
- Users can only insert memories with their own user_id
- Users can only update/delete their own memories

**workflow_runs:**
- Users can only read their own workflow runs
- Users can only create workflow runs with their own user_id
- Users can only update/delete their own workflow runs

### Authentication

All API endpoints:
- Verify JWT token from Supabase Auth
- Extract user_id from authenticated request
- Only return data for the authenticated user
- Return 401 for unauthenticated requests

---

## LLM Integration

The orchestrator uses OpenAI's GPT-4o-mini model with:

**System Prompt:**
- Acts as a personal AI orchestrator
- Plans 3-7 step workflows
- Uses user's recent memories as context
- Returns structured JSON with steps, notes, and used memories

**Context:**
- Includes up to 10 recent memory entries
- Each memory truncated to 500 characters
- Includes memory type and tags

**Response Format:**
- JSON mode enabled for structured output
- Temperature: 0.7 for balanced creativity

---

## UI/UX Features

### Memory Visualizer
- **Stats Cards:** Shows total memories and unique tags
- **Memory Cards:** 
  - Color-coded type badges
  - Icon per memory type
  - Content snippet (max 200 chars)
  - Tag chips
  - Relative timestamp
- **Empty State:** Friendly message when no memories exist
- **Loading State:** Spinner with loading message

### Workflow Orchestrator
- **Input Area:** 
  - Multi-line text area
  - Example placeholder
  - Execute button with loading state
- **Workflow Cards:**
  - Status badge
  - Numbered step list
  - Tool badges
  - Strategy notes in colored box
  - Memory context indicators
  - Relative timestamp
- **Empty State:** Encouragement to try the orchestrator

---

## Data Flow

### Memory Visualization Flow
1. User navigates to Memory tab
2. Component fetches user from Supabase Auth
3. Component calls `GET /api/memories/recent`
4. Backend queries `memory_entries` filtered by user_id
5. Backend transforms data (creates snippets)
6. Frontend renders memory cards

### Workflow Orchestration Flow
1. User enters workflow goal
2. User clicks "Execute Workflow"
3. Frontend calls `POST /api/orchestrator/execute`
4. Backend fetches user's recent memories
5. Backend calls OpenAI API with memories + goal
6. LLM returns structured workflow plan
7. Backend saves to `workflow_runs` table
8. Frontend displays workflow steps and notes
9. Workflow appears in history

---

## Testing

### Test Memory Visualizer
1. Insert test data into `memory_entries`:
```sql
INSERT INTO public.memory_entries (user_id, content, type, tags)
VALUES 
  (auth.uid(), 'Test memory content about project setup', 'project', '["onboarding", "setup"]'),
  (auth.uid(), 'Knowledge about API integration', 'knowledge', '["api", "integration"]');
```

2. Navigate to Memory tab
3. Verify cards display correctly

### Test Workflow Orchestrator
1. Ensure `OPENAI_API_KEY` is set
2. Navigate to Orchestrator tab
3. Enter goal: "Create a project onboarding checklist"
4. Click "Execute Workflow"
5. Verify steps are generated
6. Check workflow appears in history

---

## Troubleshooting

### "No memories found"
- Check if `memory_entries` table exists
- Verify user is authenticated
- Check browser console for errors
- Verify API endpoint is accessible

### "LLM service not configured"
- Ensure `OPENAI_API_KEY` environment variable is set
- Restart the development server after adding env var
- Verify API key is valid

### Authentication errors
- Check Supabase configuration
- Verify JWT token is being sent
- Check RLS policies are enabled
- Verify user has valid session

### Database errors
- Run migrations: `supabase db push`
- Check table exists: `SELECT * FROM public.memory_entries LIMIT 1;`
- Verify RLS policies: Check Supabase dashboard

---

## Future Enhancements

### Memory Visualizer
- [ ] Semantic search integration
- [ ] Memory type filtering
- [ ] Tag-based filtering
- [ ] Memory editing/deletion
- [ ] Bulk operations
- [ ] Export memories

### Workflow Orchestrator
- [ ] Real-time execution (SSE)
- [ ] Step-by-step progress tracking
- [ ] Workflow templates
- [ ] Scheduled workflows
- [ ] Workflow sharing
- [ ] Integration with external tools

---

## File Changes Summary

### New Files
- `supabase/migrations/20251109_create_memory_and_workflow_tables.sql`
- `MEMORY_VISUALIZER_README.md` (this file)

### Modified Files
- `shared/schema.ts` - Added `memoryEntries` and `workflowRuns` schemas
- `server/storage.ts` - Added memory and workflow methods
- `server/routes.ts` - Added API endpoints
- `src/components/dashboard/MemoryVisualizer.tsx` - Completely rewritten
- `src/components/orchestrator/WorkflowOrchestrator.tsx` - Completely rewritten

### Database Tables
- Created: `public.memory_entries`
- Created: `public.workflow_runs`

---

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs for backend errors
3. Verify database migrations ran successfully
4. Check Supabase dashboard for RLS policy issues

---

## License

Part of LanOnasis Memory Service Dashboard
© 2025 LanOnasis

