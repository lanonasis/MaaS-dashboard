# AI Tools System - Complete Guide

## Overview

The AI Tools System provides a flexible, user-configurable framework for extending the AI assistant's capabilities with both built-in dashboard tools and external MCP integrations.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AI Orchestrator                       │
│   (Intent Detection, Memory, Workflow Planning)         │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ Uses
                   ▼
┌─────────────────────────────────────────────────────────┐
│                   Tool Registry                          │
│  • Permission Management                                 │
│  • Tool Discovery                                        │
│  • Action Execution                                      │
└──────┬──────────────────────────┬──────────────────────┘
       │                          │
       │                          │
       ▼                          ▼
┌──────────────────┐    ┌──────────────────────┐
│ Dashboard Tools  │    │   MCP Tools          │
│ (Always Available)│    │ (User-Configured)    │
├──────────────────┤    ├──────────────────────┤
│ • API Keys       │    │ • GitHub             │
│ • Memory         │    │ • ClickUp            │
│ • Workflow       │    │ • Supabase           │
│ • Analytics      │    │ • Stripe             │
│                  │    │ • Brave Search       │
│                  │    │ • Browserbase        │
└──────────────────┘    └──────────────────────┘
```

## Components

### 1. Tool Registry (`tool-registry.ts`)

**Purpose**: Central system for managing and executing tools

**Key Features**:
- Tool discovery and listing
- Permission verification
- Action execution
- User configuration management

**Example Usage**:
```typescript
const registry = await createToolRegistry(userId);

// Get all available tools
const allTools = registry.getAllTools();

// Get only enabled tools
const enabledTools = registry.getEnabledTools();

// Check permission
const canUse = registry.canUseAction('dashboard.api_keys', 'list');

// Execute action
const result = await registry.executeAction('dashboard.memory', 'search', {
  query: 'project requirements'
});
```

### 2. Tool Manager UI (`ToolManager.tsx`)

**Purpose**: User interface for configuring AI tools

**Features**:
- Visual tool browsing (Dashboard vs External tabs)
- API key configuration
- Permission selection
- Enable/disable tools
- Real-time status updates

**User Flow**:
1. Navigate to `/dashboard/ai-tools`
2. Browse available tools in two categories
3. For MCP tools: Enter API key
4. Select which actions AI can perform
5. Toggle tool on/off

### 3. AI Orchestrator Integration

**Purpose**: Seamless tool execution from natural language

**How it works**:
1. User sends message to AI assistant
2. Orchestrator detects intent (including tool actions)
3. If tool action detected, checks permissions
4. Executes action via Tool Registry
5. Returns formatted result

**Example Interaction**:
```
User: "List my API keys"
AI: Detecting intent... → dashboard.api_keys.list
    Checking permissions... → ✓ Allowed
    Executing... → Returns API keys

User: "Search my memories for project requirements"
AI: Detecting intent... → dashboard.memory.search
    Parameters: { query: "project requirements" }
    Executing... → Returns relevant memories
```

## Tool Types

### Dashboard Tools (Always Available)

#### 1. API Keys Manager
- **ID**: `dashboard.api_keys`
- **Actions**:
  - `list` - Get all API keys
  - `create` - Generate new API key
  - `revoke` - Disable an API key

#### 2. Memory Manager
- **ID**: `dashboard.memory`
- **Actions**:
  - `search` - Semantic search through memories
  - `create` - Store new memory

#### 3. Workflow Manager
- **ID**: `dashboard.workflow`
- **Actions**:
  - `create` - Generate new workflow plan
  - `list` - Get workflow history

#### 4. Analytics
- **ID**: `dashboard.analytics`
- **Actions**:
  - `get_usage` - Fetch API usage statistics

### MCP Tools (User-Configured)

#### 1. GitHub (`mcp.github`)
- Create issues
- List repositories
- **Requires**: GitHub Personal Access Token

#### 2. ClickUp (`mcp.clickup`)
- Create tasks
- Search tasks
- **Requires**: ClickUp API Key

#### 3. Supabase (`mcp.supabase`)
- Search documentation
- List projects
- **Requires**: Supabase API Key

#### 4. Stripe (`mcp.stripe`)
- List customers
- Create payment links
- **Requires**: Stripe API Key

#### 5. Brave Search (`mcp.brave_search`)
- Web search
- **Requires**: Brave Search API Key

#### 6. Browserbase (`mcp.browserbase`)
- Web automation
- Extract data
- **Requires**: Browserbase API Key

## Permission System

### How Permissions Work

1. **Dashboard Tools**: Always permitted (user already authenticated)
2. **MCP Tools**: Require explicit permission grants

### Permission Levels

For each tool, users can grant permissions for specific actions:

```typescript
{
  tool_id: 'mcp.github',
  permissions: ['create_issue', 'list_repos'] // AI can only do these
}
```

### Security Guarantees

- AI cannot perform actions without explicit permission
- API keys are encrypted in database
- User can revoke permissions anytime
- All actions are auditable

## Database Schema

```sql
CREATE TABLE user_tool_configs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  tool_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  api_key TEXT, -- Encrypted
  config JSONB,
  permissions TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  UNIQUE(user_id, tool_id)
);
```

## Adding New Tools

### Adding a Dashboard Tool

1. Define tool in `DASHBOARD_TOOLS`:
```typescript
{
  id: 'dashboard.new_tool',
  name: 'New Tool',
  type: 'dashboard',
  category: 'productivity',
  description: 'What this tool does',
  actions: [
    {
      id: 'action_name',
      name: 'Action Label',
      description: 'What this action does',
      parameters: [
        { name: 'param1', type: 'string', required: true }
      ]
    }
  ],
  handler: async (action, params) => {
    // Implementation
  },
  isPreConfigured: true,
  requiresApiKey: false
}
```

2. Implement handler function

3. Update AI Orchestrator intent detection (if needed)

### Adding an MCP Tool

1. Define tool in `PRECONFIGURED_MCP_TOOLS`:
```typescript
{
  id: 'mcp.new_service',
  name: 'New Service',
  type: 'mcp',
  category: 'productivity',
  description: 'Service description',
  mcpConfig: {
    command: 'npx',
    args: ['-y', 'mcp-package-name']
  },
  actions: [...],
  isPreConfigured: true,
  requiresApiKey: true
}
```

2. Create backend MCP execution endpoint handler

3. Test with user API key

## Backend Integration

### MCP Execution Endpoint

Location: `/api/mcp/execute` (To be implemented)

```typescript
// POST /api/mcp/execute
{
  tool_id: 'mcp.github',
  action_id: 'create_issue',
  params: {
    repo: 'owner/repo',
    title: 'Issue title',
    body: 'Issue body'
  },
  api_key: 'encrypted_key_from_db'
}
```

**Flow**:
1. Verify user authentication
2. Decrypt API key
3. Execute MCP tool via subprocess
4. Return result

## Security Best Practices

1. **API Key Storage**:
   - Never log API keys
   - Encrypt in database
   - Use environment variables for service keys

2. **Permission Checks**:
   - Always verify before execution
   - Log all tool executions
   - Rate limit sensitive actions

3. **User Data Protection**:
   - RLS policies on user_tool_configs
   - User can only access own configurations
   - Audit trail for security events

## Testing

### Unit Tests
```typescript
describe('ToolRegistry', () => {
  it('should check permissions correctly', () => {
    const registry = createToolRegistry(userId);
    expect(registry.canUseAction('dashboard.api_keys', 'list')).toBe(true);
  });

  it('should deny unauthorized actions', () => {
    const registry = createToolRegistry(userId);
    expect(registry.canUseAction('mcp.github', 'create_issue')).toBe(false);
  });
});
```

### Integration Tests
- Test tool execution end-to-end
- Verify permission enforcement
- Test API key encryption/decryption
- Validate MCP tool communication

## Troubleshooting

### Tool Not Appearing
- Check if tool is enabled in `user_tool_configs`
- Verify API key is configured (for MCP tools)
- Check browser console for errors

### Permission Denied
- Navigate to `/dashboard/ai-tools`
- Find the tool
- Grant necessary permissions

### MCP Tool Failing
- Verify API key is correct
- Check MCP server is running
- Review backend logs
- Test MCP tool manually via CLI

## Future Enhancements

1. **Tool Marketplace**: Browse and install community tools
2. **Tool Sharing**: Share tool configs with team
3. **Workflow Templates**: Pre-configured tool chains
4. **Usage Analytics**: Track which tools AI uses most
5. **Batch Operations**: Execute multiple tools in sequence
6. **Tool Versioning**: Support different tool versions
7. **Custom Tools**: User-created tool definitions

## Related Documentation

- [AI Orchestrator Setup](./AI_ORCHESTRATOR_SETUP.md)
- [Memory SDK Documentation](./src/lib/memory-sdk/README.md)
- [MCP Integration Guide](./MCP_INTEGRATION.md)
