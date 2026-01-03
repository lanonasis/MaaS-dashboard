# Workflow Orchestrator - Gap Analysis

## Overview
Comparing the current implementation against the LanOnasis Orchestrator specification.

---

## ✅ What's Currently Implemented

### Core Functionality
- **Workflow execution** - Users can submit goals and execute workflows
- **Workflow history** - Displays past workflow runs with timestamps
- **Authentication** - Integrated with Supabase auth (JWT tokens)
- **Status tracking** - Workflows have status (completed/failed)
- **API integration** - Calls `/api/orchestrator/execute` and `/api/orchestrator/runs`

### Data Model (Current)
```typescript
interface WorkflowStep {
  action: string;        // ✓ Step description
  tool: string;         // ✓ Tool identifier
  reasoning?: string;   // ✓ Why this step matters
}

interface WorkflowRun {
  id: string;
  goal: string;         // ✓ User's high-level goal
  steps: WorkflowStep[];
  notes: string;        // ✓ Strategy notes
  usedMemories: string[]; // ✓ Memory IDs used for context
  createdAt: string;
  status?: string;
}
```

### UI Components
- Input textarea for goal submission
- Workflow history cards with:
  - Status icons and badges
  - Goal display
  - Steps with numbering and tool badges
  - Strategy notes section
  - Used memories display (shows memory IDs)

---

## ❌ What's Missing (Per Specification)

### 1. **Priority & Timeframe**
**Missing:**
- `priority` field (high/medium/low)
- `suggestedTimeframe` field
- Visual priority indicators (🔴 High / 🟡 Medium / 🟢 Low)
- Timeframe display in UI

**Impact:** Users can't quickly identify urgent vs. routine workflows

---

### 2. **Summary Field**
**Missing:**
- `summary` field (distinct from goal)
- The specification shows goal as input, summary as AI-generated interpretation

**Current:** Only has `goal` field
**Expected:**
```typescript
{
  goal: "Clean up my API keys and rotate anything risky",
  summary: "Rotate sensitive API keys and bring your key management under a single, safer pattern."
}
```

---

### 3. **Step Dependencies**
**Missing:**
- `dependsOnStepIds` field
- Visual dependency indicators in UI
- Dependency graph/flow visualization

**Impact:** Can't show which steps must be completed before others

---

### 4. **Expected Outcomes**
**Missing:**
- `expectedOutcome` field for each step
- Display of what success looks like for each step

**Current:** Steps show `action` and `reasoning`
**Expected:** Also show `expectedOutcome`
```typescript
{
  label: "Inventory existing keys across projects",
  expectedOutcome: "Single up-to-date list of all active keys and where they are used."
}
```

---

### 5. **Risks Section** ⚠️
**Completely Missing:**
- `risks` array field
- UI component to display risks
- Visual warning indicators

**Specification shows:**
```typescript
"risks": [
  "If you rotate keys without updating all services, some APIs will fail.",
  "There is no centralized secrets manager yet, so this is still an interim fix."
]
```

**UI Should Include:**
- ⚠️ Risks box with warning styling
- List of potential issues/constraints
- Prominent placement (likely below steps)

---

### 6. **Missing Info Section** ℹ️
**Completely Missing:**
- `missingInfo` array field
- UI component to display missing information
- Interactive prompts for user to provide missing details

**Specification shows:**
```typescript
"missingInfo": [
  "List of all external providers currently in use (Stripe, Render, Railway, etc.).",
  "Whether a secrets manager (e.g. Doppler, 1Password, Vault) is already planned."
]
```

**UI Should Include:**
- ℹ️ Missing Info box
- Actionable items the user should clarify
- Possibly input fields or prompts to fill in gaps

---

### 7. **Enhanced Tool Routing**
**Partially Implemented:**
- Tool field exists but isn't visually differentiated
- No color coding or icons for tool types

**Missing:**
- Distinct tool categories:
  - `memory.search` - for semantic memory queries
  - `mcp.clickup` - for task management
  - `cli` - for terminal/shell operations
  - `dashboard` - for UI interactions
- Tool-specific icons and styling
- Tool badges with color coding

**Current:** `<Badge>{step.tool}</Badge>`
**Expected:** Color-coded badges with icons based on tool type

---

### 8. **Step ID System**
**Missing:**
- Steps don't have explicit IDs
- Currently indexed by array position
- Needed for dependency tracking

**Current:** Steps are just array items
**Expected:** Each step has a unique ID for referencing

---

### 9. **"Opinionated" Feedback**
**Missing:**
- AI pushback on vague/unrealistic requests
- Downgraded priority for problematic goals
- Constraints listed in risks

**Current:** Accepts any goal without validation
**Expected:** LLM should provide gentle pushback:
```typescript
{
  priority: "low", // downgraded
  risks: ["Goal is too vague - needs specific KPIs defined"]
}
```

---

## 📊 Data Model - Should Be

```typescript
interface WorkflowStep {
  id: string;                    // ❌ Missing
  label: string;                 // ✓ (mapped to 'action')
  detail: string;                // ✓ (mapped to 'reasoning')
  dependsOnStepIds: string[];    // ❌ Missing
  suggestedTool: string;         // ✓ (exists as 'tool')
  expectedOutcome: string;       // ❌ Missing
}

interface WorkflowRun {
  id: string;                    // ✓
  goal: string;                  // ✓
  summary: string;               // ❌ Missing
  priority: 'high' | 'medium' | 'low'; // ❌ Missing
  suggestedTimeframe: string;    // ❌ Missing
  steps: WorkflowStep[];         // ✓
  risks: string[];               // ❌ Missing
  missingInfo: string[];         // ❌ Missing
  usedMemories: string[];        // ✓
  notes: string;                 // ✓
  createdAt: string;             // ✓
  status?: string;               // ✓
}
```

---

## 🎨 UI Components Needed

### New Sections to Build:
1. **Priority Header** - Visual indicator (🔴/🟡/🟢) + timeframe
2. **Summary Card** - Distinct from goal, shows AI interpretation
3. **Risks Box** - Warning-styled card with list of risks
4. **Missing Info Box** - Info-styled card with action items
5. **Enhanced Tool Badges** - Color-coded with icons
6. **Dependency Indicators** - Lines or arrows showing step dependencies
7. **Expected Outcome** - Added to each step card

---

## 🔧 Backend API Changes Needed

### Current API Response:
```json
{
  "id": "uuid",
  "goal": "...",
  "steps": [{ "action": "...", "tool": "...", "reasoning": "..." }],
  "notes": "...",
  "usedMemories": ["uuid1", "uuid2"]
}
```

### Expected API Response (Full Spec):
```json
{
  "id": "uuid",
  "goal": "...",
  "summary": "AI-generated interpretation",
  "priority": "high",
  "suggestedTimeframe": "Today (30-60 minutes)",
  "steps": [
    {
      "id": "1",
      "label": "Inventory existing keys",
      "detail": "Use dashboard's API Keys tab...",
      "dependsOnStepIds": [],
      "suggestedTool": "dashboard",
      "expectedOutcome": "Single up-to-date list..."
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "missingInfo": ["Need to know X", "Clarify Y"],
  "usedMemories": ["uuid1", "uuid2"],
  "notes": "Additional context",
  "createdAt": "2025-11-18T...",
  "status": "completed"
}
```

---

## 🚀 Implementation Priority

### Phase 1: Core Missing Features (High Priority)
1. ✅ Add `summary`, `priority`, `suggestedTimeframe` fields
2. ✅ Add `risks` and `missingInfo` arrays
3. ✅ Update `WorkflowStep` to include `id`, `dependsOnStepIds`, `expectedOutcome`
4. ✅ Build Risks UI component
5. ✅ Build Missing Info UI component
6. ✅ Add priority header with visual indicators

### Phase 2: Enhanced UX
7. Tool-specific styling and icons
8. Dependency visualization
9. Expected outcomes display
10. Summary vs. Goal differentiation

### Phase 3: Backend Integration
11. Update `/api/orchestrator/execute` to call LLM with proper prompt
12. Memory service integration (fetch recent memories as context)
13. Structured JSON validation
14. "Opinionated" feedback logic in LLM prompt

---

## 📝 Example of Complete Implementation

See the specification's example:
- Goal: "Clean up my API keys and rotate anything risky"
- Summary: AI interprets and adds context
- Priority: High (with visual indicator)
- Timeframe: "Today (30-60 minutes)"
- Steps: 3 concrete steps with dependencies and tools
- Risks: 2 identified constraints
- Missing Info: 2 clarifying questions

This is the target we're building toward.
