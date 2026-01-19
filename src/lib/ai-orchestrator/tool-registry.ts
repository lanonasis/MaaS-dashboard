/**
 * Tool Registry - Manages both Dashboard-native and MCP tools
 *
 * Users can:
 * - Configure their own MCP tools
 * - Enable/disable pre-configured tools
 * - Grant permissions to the AI
 */

import { supabase } from '@/integrations/supabase/client';
import { getDashboardMemoryClient } from '@/lib/memory-sdk/dashboard-adapter';
import type { Json } from '@/integrations/supabase/types';

export type ToolType = 'dashboard' | 'mcp' | 'api';

export interface ToolDefinition {
  id: string;
  name: string;
  type: ToolType;
  category: 'productivity' | 'database' | 'communication' | 'analytics' | 'automation' | 'finance';
  description: string;
  icon?: string;

  // For dashboard tools
  handler?: (action: string, params: any) => Promise<any>;

  // For MCP tools
  mcpConfig?: {
    command: string;
    args: string[];
    env?: Record<string, string>;
  };

  // For API tools
  apiConfig?: {
    baseUrl: string;
    authType: 'bearer' | 'apikey' | 'oauth';
    headers?: Record<string, string>;
  };

  // Available actions
  actions: ToolAction[];

  // Pre-configured or user-added
  isPreConfigured: boolean;
  requiresApiKey: boolean;
}

export interface ToolAction {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  default?: any;
}

export interface UserToolConfig {
  id: string;
  user_id: string;
  tool_id: string;
  enabled: boolean;
  api_key?: string;
  config?: Json;
  permissions: string[] | null; // Which actions AI can perform
  created_at: string;
  updated_at: string;
}

/**
 * Dashboard-Native Tools
 * These are built into the platform and always available
 */
export const DASHBOARD_TOOLS: ToolDefinition[] = [
  {
    id: 'dashboard.api_keys',
    name: 'API Keys Manager',
    type: 'dashboard',
    category: 'productivity',
    description: 'Manage API keys and access tokens',
    icon: '🔑',
    actions: [
      {
        id: 'list',
        name: 'List API Keys',
        description: 'Get all API keys for the user',
        parameters: []
      },
      {
        id: 'create',
        name: 'Create API Key',
        description: 'Generate a new API key',
        parameters: [
          { name: 'name', type: 'string', description: 'Key name', required: true },
          { name: 'scope', type: 'array', description: 'Permissions', required: false }
        ]
      },
      {
        id: 'revoke',
        name: 'Revoke API Key',
        description: 'Disable an API key',
        parameters: [
          { name: 'key_id', type: 'string', description: 'Key ID', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.memory',
    name: 'Memory Manager',
    type: 'dashboard',
    category: 'productivity',
    description: 'Search and store memories',
    icon: '🧠',
    handler: async (action: string, params: any) => {
      const memoryClient = getDashboardMemoryClient();

      if (action === 'search') {
        const results = await memoryClient.search({
          query: params.query || '',
          limit: params.limit || 10,
          threshold: params.threshold || 0.7,
          types: params.types,
          tags: params.tags
        });
        return results;
      }

      if (action === 'create') {
        const memory = await memoryClient.create({
          title: params.title || '',
          content: params.content || '',
          type: params.type || 'context',
          tags: params.tags || [],
          metadata: params.metadata
        });
        return memory;
      }

      throw new Error(`Unknown memory action: ${action}`);
    },
    actions: [
      {
        id: 'search',
        name: 'Search Memories',
        description: 'Semantic search through stored context',
        parameters: [
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 }
        ]
      },
      {
        id: 'create',
        name: 'Store Memory',
        description: 'Save context for future use',
        parameters: [
          { name: 'title', type: 'string', description: 'Memory title', required: true },
          { name: 'content', type: 'string', description: 'Memory content', required: true },
          { name: 'tags', type: 'array', description: 'Tags', required: false }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.workflow',
    name: 'Workflow Manager',
    type: 'dashboard',
    category: 'productivity',
    description: 'Create and manage workflows',
    icon: '⚡',
    actions: [
      {
        id: 'create',
        name: 'Create Workflow',
        description: 'Generate a new workflow plan',
        parameters: [
          { name: 'goal', type: 'string', description: 'Workflow goal', required: true }
        ]
      },
      {
        id: 'list',
        name: 'List Workflows',
        description: 'Get workflow history',
        parameters: [
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.analytics',
    name: 'Analytics',
    type: 'dashboard',
    category: 'analytics',
    description: 'View usage analytics and metrics',
    icon: '📊',
    actions: [
      {
        id: 'get_usage',
        name: 'Get Usage Stats',
        description: 'Fetch API usage statistics',
        parameters: [
          { name: 'timeframe', type: 'string', description: 'Time range', required: false, default: '7d' }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.mcp_services',
    name: 'MCP Services Manager',
    type: 'dashboard',
    category: 'automation',
    description: 'Manage external API service integrations (Zapier-like)',
    icon: '🔌',
    actions: [
      {
        id: 'list',
        name: 'List Services',
        description: 'Get all available MCP services from the catalog',
        parameters: [
          { name: 'category', type: 'string', description: 'Filter by category (payment, devops, ai, communication, storage, analytics)', required: false }
        ]
      },
      {
        id: 'list_configured',
        name: 'List Configured Services',
        description: 'Get services that are already configured for the user',
        parameters: []
      },
      {
        id: 'configure',
        name: 'Configure Service',
        description: 'Set up a new service with credentials',
        parameters: [
          { name: 'service_key', type: 'string', description: 'Service identifier', required: true }
        ]
      },
      {
        id: 'enable',
        name: 'Enable Service',
        description: 'Enable a configured service',
        parameters: [
          { name: 'service_key', type: 'string', description: 'Service identifier', required: true }
        ]
      },
      {
        id: 'disable',
        name: 'Disable Service',
        description: 'Disable a service',
        parameters: [
          { name: 'service_key', type: 'string', description: 'Service identifier', required: true }
        ]
      },
      {
        id: 'test',
        name: 'Test Connection',
        description: 'Test service connection and credentials',
        parameters: [
          { name: 'service_key', type: 'string', description: 'Service identifier', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.mcp_usage',
    name: 'MCP Usage Analytics',
    type: 'dashboard',
    category: 'analytics',
    description: 'View MCP Router usage statistics, request logs, and performance metrics',
    icon: '📈',
    actions: [
      {
        id: 'get_stats',
        name: 'Get Usage Stats',
        description: 'Fetch MCP Router usage statistics',
        parameters: [
          { name: 'timeframe', type: 'string', description: 'Time range (7d, 30d, 90d)', required: false, default: '30d' }
        ]
      },
      {
        id: 'get_logs',
        name: 'Get Request Logs',
        description: 'Fetch recent request logs',
        parameters: [
          { name: 'service', type: 'string', description: 'Filter by service', required: false },
          { name: 'status', type: 'string', description: 'Filter by status (success, error, rate_limited)', required: false },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 50 }
        ]
      },
      {
        id: 'get_service_breakdown',
        name: 'Get Service Breakdown',
        description: 'Get usage breakdown by service',
        parameters: [
          { name: 'timeframe', type: 'string', description: 'Time range', required: false, default: '30d' }
        ]
      },
      {
        id: 'get_top_actions',
        name: 'Get Top Actions',
        description: 'Get most frequently used actions',
        parameters: [
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  },
  {
    id: 'dashboard.mcp_api_keys',
    name: 'MCP API Keys Manager',
    type: 'dashboard',
    category: 'productivity',
    description: 'Manage API keys for MCP Router with scoping and rate limits',
    icon: '🔐',
    actions: [
      {
        id: 'list',
        name: 'List API Keys',
        description: 'Get all MCP Router API keys',
        parameters: []
      },
      {
        id: 'create',
        name: 'Create API Key',
        description: 'Generate a new MCP Router API key with scoping',
        parameters: [
          { name: 'name', type: 'string', description: 'Key name', required: true },
          { name: 'scope_type', type: 'string', description: 'Scope type (all_services or specific_services)', required: true },
          { name: 'services', type: 'array', description: 'List of service keys if scope is specific', required: false },
          { name: 'rate_limit_per_minute', type: 'number', description: 'Rate limit per minute', required: false },
          { name: 'rate_limit_per_day', type: 'number', description: 'Rate limit per day', required: false }
        ]
      },
      {
        id: 'revoke',
        name: 'Revoke API Key',
        description: 'Revoke an MCP Router API key',
        parameters: [
          { name: 'key_id', type: 'string', description: 'Key ID', required: true }
        ]
      },
      {
        id: 'rotate',
        name: 'Rotate API Key',
        description: 'Generate new secret for an existing key',
        parameters: [
          { name: 'key_id', type: 'string', description: 'Key ID', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: false
  }
];

/**
 * Pre-configured MCP Tools
 * Users can enable these with their own API keys
 */
export const PRECONFIGURED_MCP_TOOLS: ToolDefinition[] = [
  {
    id: 'mcp.github',
    name: 'GitHub',
    type: 'mcp',
    category: 'productivity',
    description: 'Manage repositories, issues, and pull requests',
    icon: '🐙',
    mcpConfig: {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github']
    },
    actions: [
      {
        id: 'create_issue',
        name: 'Create Issue',
        description: 'Create a new GitHub issue',
        parameters: [
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'title', type: 'string', description: 'Issue title', required: true },
          { name: 'body', type: 'string', description: 'Issue description', required: false }
        ]
      },
      {
        id: 'list_repos',
        name: 'List Repositories',
        description: 'Get user repositories',
        parameters: []
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  },
  {
    id: 'mcp.clickup',
    name: 'ClickUp',
    type: 'mcp',
    category: 'productivity',
    description: 'Manage tasks and projects',
    icon: '📋',
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'clickup-mcp']
    },
    actions: [
      {
        id: 'create_task',
        name: 'Create Task',
        description: 'Create a new task',
        parameters: [
          { name: 'list_id', type: 'string', description: 'List ID', required: true },
          { name: 'name', type: 'string', description: 'Task name', required: true }
        ]
      },
      {
        id: 'search_tasks',
        name: 'Search Tasks',
        description: 'Find tasks',
        parameters: [
          { name: 'query', type: 'string', description: 'Search query', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  },
  {
    id: 'mcp.supabase',
    name: 'Supabase',
    type: 'mcp',
    category: 'database',
    description: 'Database and backend operations',
    icon: '🗄️',
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'supabase-mcp-server']
    },
    actions: [
      {
        id: 'search_docs',
        name: 'Search Documentation',
        description: 'Search Supabase docs',
        parameters: [
          { name: 'query', type: 'string', description: 'Search query', required: true }
        ]
      },
      {
        id: 'list_projects',
        name: 'List Projects',
        description: 'Get Supabase projects',
        parameters: []
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  },
  {
    id: 'mcp.stripe',
    name: 'Stripe',
    type: 'mcp',
    category: 'finance',
    description: 'Payment and subscription management',
    icon: '💳',
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'stripe-mcp']
    },
    actions: [
      {
        id: 'list_customers',
        name: 'List Customers',
        description: 'Get Stripe customers',
        parameters: [
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 10 }
        ]
      },
      {
        id: 'create_payment_link',
        name: 'Create Payment Link',
        description: 'Generate payment link',
        parameters: [
          { name: 'amount', type: 'number', description: 'Amount in cents', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  },
  {
    id: 'mcp.brave_search',
    name: 'Brave Search',
    type: 'mcp',
    category: 'analytics',
    description: 'Web search capabilities',
    icon: '🔍',
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'brave-search-mcp']
    },
    actions: [
      {
        id: 'web_search',
        name: 'Web Search',
        description: 'Search the web',
        parameters: [
          { name: 'query', type: 'string', description: 'Search query', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  },
  {
    id: 'mcp.browserbase',
    name: 'Browserbase',
    type: 'mcp',
    category: 'automation',
    description: 'Web automation and scraping',
    icon: '🌐',
    mcpConfig: {
      command: 'npx',
      args: ['-y', 'browserbase-mcp']
    },
    actions: [
      {
        id: 'navigate',
        name: 'Navigate',
        description: 'Navigate to URL',
        parameters: [
          { name: 'url', type: 'string', description: 'URL to visit', required: true }
        ]
      },
      {
        id: 'extract',
        name: 'Extract Data',
        description: 'Extract data from page',
        parameters: [
          { name: 'selector', type: 'string', description: 'CSS selector', required: true }
        ]
      }
    ],
    isPreConfigured: true,
    requiresApiKey: true
  }
];

/**
 * Tool Registry Class
 */
export class ToolRegistry {
  private userTools: Map<string, UserToolConfig> = new Map();

  constructor(private userId: string) { }

  /**
   * Initialize - Load user's configured tools
   */
  async initialize() {
    const { data } = await supabase
      .from('user_tool_configs')
      .select('*')
      .eq('user_id', this.userId);

    if (data) {
      data.forEach(config => {
        this.userTools.set(config.tool_id, config);
      });
    }
  }

  /**
   * Get all available tools (dashboard + pre-configured + user-added)
   */
  getAllTools(): ToolDefinition[] {
    return [
      ...DASHBOARD_TOOLS,
      ...PRECONFIGURED_MCP_TOOLS
    ];
  }

  /**
   * Get enabled tools for the user
   */
  getEnabledTools(): ToolDefinition[] {
    const allTools = this.getAllTools();
    return allTools.filter(tool => {
      const userConfig = this.userTools.get(tool.id);

      // Dashboard tools are always enabled
      if (tool.type === 'dashboard') return true;

      // MCP/API tools need to be explicitly enabled
      return userConfig?.enabled === true;
    });
  }

  /**
   * Check if AI has permission to use a tool action
   */
  canUseAction(toolId: string, actionId: string): boolean {
    const userConfig = this.userTools.get(toolId);

    // Dashboard tools are always allowed
    const tool = this.getAllTools().find(t => t.id === toolId);
    if (tool?.type === 'dashboard') return true;

    // Check if action is in permissions
    return userConfig?.permissions?.includes(actionId) || false;
  }

  /**
   * Enable a tool for the user
   */
  async enableTool(toolId: string, config: { apiKey?: string; permissions: string[] }) {
    const { data, error } = await supabase
      .from('user_tool_configs')
      .upsert({
        user_id: this.userId,
        tool_id: toolId,
        enabled: true,
        api_key: config.apiKey,
        permissions: config.permissions,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    if (data) {
      this.userTools.set(toolId, data);
    }
  }

  /**
   * Disable a tool
   */
  async disableTool(toolId: string) {
    await supabase
      .from('user_tool_configs')
      .update({ enabled: false })
      .eq('user_id', this.userId)
      .eq('tool_id', toolId);

    const config = this.userTools.get(toolId);
    if (config) {
      config.enabled = false;
      this.userTools.set(toolId, config);
    }
  }

  /**
   * Execute a tool action
   */
  async executeAction(toolId: string, actionId: string, params: any): Promise<any> {
    // Check permission
    if (!this.canUseAction(toolId, actionId)) {
      throw new Error(`Permission denied for ${toolId}.${actionId}`);
    }

    const tool = this.getAllTools().find(t => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Execute based on tool type
    if (tool.type === 'dashboard' && tool.handler) {
      return tool.handler(actionId, params);
    }

    if (tool.type === 'mcp') {
      return this.executeMCPAction(tool, actionId, params);
    }

    throw new Error(`Cannot execute ${toolId}.${actionId}`);
  }

  /**
   * Execute MCP tool action
   */
  private async executeMCPAction(tool: ToolDefinition, actionId: string, params: any): Promise<any> {
    const userConfig = this.userTools.get(tool.id);

    // Get API key from user config
    const apiKey = userConfig?.api_key;
    if (!apiKey && tool.requiresApiKey) {
      throw new Error(`API key required for ${tool.name}`);
    }

    // Call MCP server via backend
    const response = await fetch('/api/mcp/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_id: tool.id,
        action_id: actionId,
        params,
        api_key: apiKey
      })
    });

    if (!response.ok) {
      throw new Error(`MCP execution failed: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Create tool registry instance
 */
export async function createToolRegistry(userId: string): Promise<ToolRegistry> {
  const registry = new ToolRegistry(userId);
  await registry.initialize();
  return registry;
}
