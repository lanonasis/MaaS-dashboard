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
import { isMissingRelationError } from '@/lib/supabase-errors';

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
    handler: async (action: string, params: any) => {
      if (action === 'list') {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('id, name, key_prefix, is_active, created_at, last_used_at, rate_limit_per_minute, rate_limit_per_day')
          .eq('user_id', params.user_id);

        if (error) throw error;
        return data || [];
      }

      if (action === 'create') {
        const { data, error } = await supabase
          .from('user_api_keys')
          .insert({
            user_id: params.user_id,
            name: params.name,
            scope_type: params.scope_type || 'all_services',
            allowed_services: params.scope || [],
            rate_limit_per_minute: params.rate_limit_per_minute || 60,
            rate_limit_per_day: params.rate_limit_per_day || 10000
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'revoke') {
        const { data, error } = await supabase
          .from('user_api_keys')
          .update({ is_active: false })
          .eq('id', params.key_id)
          .eq('user_id', params.user_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      throw new Error(`Unknown API keys action: ${action}`);
    },
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
          { name: 'scope_type', type: 'string', description: 'Scope type (all_services or specific_services)', required: false },
          { name: 'scope', type: 'array', description: 'Service keys if scope is specific', required: false }
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
    handler: async (action: string, params: any) => {
      if (action === 'create') {
        // TODO: Replace with LLM-powered workflow generation
        // Current implementation creates basic templates but should be enhanced with:
        // 1. AI analysis of user context and available tools
        // 2. Dynamic step generation based on goal complexity
        // 3. Risk assessment and dependency analysis
        // 4. Integration with user's existing workflows and preferences
        //
        // Future implementation should call:
        // const aiService = new AIService(authToken);
        // return await aiService.generateWorkflow({
        //   goal: params.goal,
        //   userContext: { userId: params.user_id, ... },
        //   memories: await getRelevantMemories(params.goal)
        // });
        const workflow = {
          id: `wf_${Date.now()}`,
          goal: params.goal,
          summary: `Workflow to ${params.goal}`,
          priority: 'medium',
          suggestedTimeframe: '2-4 hours',
          steps: [
            {
              id: 'step_1',
              label: 'Analyze requirements',
              detail: 'Review the goal and break down into actionable tasks',
              dependsOnStepIds: [],
              suggestedTool: 'dashboard.memory',
              expectedOutcome: 'Clear understanding of what needs to be done'
            },
            {
              id: 'step_2',
              label: 'Execute tasks',
              detail: 'Perform the necessary actions step by step',
              dependsOnStepIds: ['step_1'],
              suggestedTool: 'dashboard.analytics',
              expectedOutcome: 'Goal accomplished'
            }
          ],
          risks: ['Scope creep', 'Technical blockers'],
          missingInfo: [],
          usedMemories: [],
          context: { goal: params.goal },
          createdAt: new Date().toISOString()
        };

        // Store in database
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            user_id: params.user_id,
            workflow_id: workflow.id,
            goal: workflow.goal,
            summary: workflow.summary,
            priority: workflow.priority,
            steps: workflow.steps,
            context: workflow.context
          })
          .select()
          .single();

        if (error) throw error;
        return workflow;
      }

      if (action === 'list') {
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('user_id', params.user_id)
          .order('created_at', { ascending: false })
          .limit(params.limit || 10);

        if (error) throw error;
        return data || [];
      }

      throw new Error(`Unknown workflow action: ${action}`);
    },
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
    handler: async (action: string, params: any) => {
      if (action === 'get_usage') {
        const timeframe = params.timeframe || '7d';
        const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get memory usage stats
        const { data: memoryStats, error: memoryError } = await supabase
          .from('memories')
          .select('created_at, type')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString());

        if (memoryError) throw memoryError;

        // Get API usage stats
        const { data: apiStats, error: apiError } = await supabase
          .from('api_requests')
          .select('created_at, status, service')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString());

        if (apiError) throw apiError;

        // Calculate metrics
        const totalMemories = memoryStats?.length || 0;
        const totalRequests = apiStats?.length || 0;
        const successfulRequests = apiStats?.filter(r => r.status === 'success').length || 0;
        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

        // Memory type distribution
        const memoryTypeDistribution = (memoryStats || []).reduce((acc, memory) => {
          acc[memory.type] = (acc[memory.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Service usage distribution
        const serviceDistribution = (apiStats || []).reduce((acc, request) => {
          acc[request.service] = (acc[request.service] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          timeframe,
          totalMemories,
          totalRequests,
          successRate: Math.round(successRate * 100) / 100,
          memoryTypeDistribution,
          serviceDistribution,
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString()
          }
        };
      }

      throw new Error(`Unknown analytics action: ${action}`);
    },
    actions: [
      {
        id: 'get_usage',
        name: 'Get Usage Stats',
        description: 'Fetch API usage statistics',
        parameters: [
          { name: 'timeframe', type: 'string', description: 'Time range (7d, 30d, 90d)', required: false, default: '7d' }
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
    handler: async (action: string, params: any) => {
      if (action === 'list') {
        // Get available services from MCP catalog
        const { data: services, error } = await supabase
          .from('mcp_services')
          .select('*')
          .eq('is_active', true);

        if (error) throw error;

        let filteredServices = services || [];
        if (params.category) {
          filteredServices = filteredServices.filter(s => s.category === params.category);
        }

        return filteredServices.map(service => ({
          service_key: service.service_key,
          name: service.name,
          description: service.description,
          category: service.category,
          is_configurable: service.is_configurable,
          auth_type: service.auth_type,
          base_url: service.base_url
        }));
      }

      if (action === 'list_configured') {
        const { data: configs, error } = await supabase
          .from('user_service_configs')
          .select(`
            id,
            service_key,
            is_enabled,
            created_at,
            updated_at,
            mcp_services (
              name,
              description,
              category,
              auth_type
            )
          `)
          .eq('user_id', params.user_id);

        if (error) throw error;

        return (configs || []).map(config => ({
          id: config.id,
          service_key: config.service_key,
          name: config.mcp_services?.name,
          description: config.mcp_services?.description,
          category: config.mcp_services?.category,
          auth_type: config.mcp_services?.auth_type,
          is_enabled: config.is_enabled,
          created_at: config.created_at,
          updated_at: config.updated_at
        }));
      }

      if (action === 'configure') {
        // Check if service exists and is configurable
        const { data: service, error: serviceError } = await supabase
          .from('mcp_services')
          .select('*')
          .eq('service_key', params.service_key)
          .eq('is_configurable', true)
          .single();

        if (serviceError || !service) {
          throw new Error(`Service ${params.service_key} not found or not configurable`);
        }

        // Create user configuration
        const { data, error } = await supabase
          .from('user_service_configs')
          .insert({
            user_id: params.user_id,
            service_key: params.service_key,
            config: params.config || {},
            is_enabled: false // Start disabled, user can enable after testing
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'enable') {
        const { data, error } = await supabase
          .from('user_service_configs')
          .update({ is_enabled: true, updated_at: new Date().toISOString() })
          .eq('user_id', params.user_id)
          .eq('service_key', params.service_key)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'disable') {
        const { data, error } = await supabase
          .from('user_service_configs')
          .update({ is_enabled: false, updated_at: new Date().toISOString() })
          .eq('user_id', params.user_id)
          .eq('service_key', params.service_key)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'test') {
        // Get service config
        const { data: config, error: configError } = await supabase
          .from('user_service_configs')
          .select(`
            *,
            mcp_services (
              base_url,
              auth_type
            )
          `)
          .eq('user_id', params.user_id)
          .eq('service_key', params.service_key)
          .single();

        if (configError || !config) {
          throw new Error(`Service ${params.service_key} not configured`);
        }

        try {
          // Test connection by making a simple API call
          const response = await fetch(`${config.mcp_services.base_url}/health`, {
            headers: {
              'Authorization': `Bearer ${config.api_key || 'test'}`,
              'Content-Type': 'application/json'
            }
          });

          return {
            service_key: params.service_key,
            status: response.ok ? 'success' : 'failed',
            status_code: response.status,
            message: response.ok ? 'Connection successful' : 'Connection failed'
          };
        } catch (error) {
          return {
            service_key: params.service_key,
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      throw new Error(`Unknown MCP services action: ${action}`);
    },
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
          { name: 'service_key', type: 'string', description: 'Service identifier', required: true },
          { name: 'config', type: 'object', description: 'Service configuration', required: false }
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
    handler: async (action: string, params: any) => {
      const timeframe = params.timeframe || '30d';
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      if (action === 'get_stats') {
        const { data: stats, error } = await supabase
          .from('mcp_request_logs')
          .select('created_at, status, response_time, service_key')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const totalRequests = stats?.length || 0;
        const successfulRequests = stats?.filter(r => r.status === 'success').length || 0;
        const failedRequests = stats?.filter(r => r.status === 'error').length || 0;
        const rateLimitedRequests = stats?.filter(r => r.status === 'rate_limited').length || 0;

        const avgResponseTime = stats && stats.length > 0
          ? stats.reduce((sum, r) => sum + (r.response_time || 0), 0) / stats.length
          : 0;

        const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;

        return {
          timeframe,
          totalRequests,
          successfulRequests,
          failedRequests,
          rateLimitedRequests,
          successRate: Math.round(successRate * 100) / 100,
          avgResponseTime: Math.round(avgResponseTime * 100) / 100,
          period: {
            start: startDate.toISOString(),
            end: new Date().toISOString()
          }
        };
      }

      if (action === 'get_logs') {
        let query = supabase
          .from('mcp_request_logs')
          .select('*')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(params.limit || 50);

        if (params.service) {
          query = query.eq('service_key', params.service);
        }

        if (params.status) {
          query = query.eq('status', params.status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return data || [];
      }

      if (action === 'get_service_breakdown') {
        const { data: stats, error } = await supabase
          .from('mcp_request_logs')
          .select('service_key, status, response_time')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const serviceStats = (stats || []).reduce((acc, stat) => {
          const service = stat.service_key;
          if (!acc[service]) {
            acc[service] = {
              service_key: service,
              total_requests: 0,
              successful_requests: 0,
              failed_requests: 0,
              avg_response_time: 0,
              total_response_time: 0
            };
          }

          acc[service].total_requests++;
          if (stat.status === 'success') {
            acc[service].successful_requests++;
          } else if (stat.status === 'error') {
            acc[service].failed_requests++;
          }

          acc[service].total_response_time += stat.response_time || 0;
          acc[service].avg_response_time = acc[service].total_response_time / acc[service].total_requests;

          return acc;
        }, {} as Record<string, any>);

        return Object.values(serviceStats).map(stat => ({
          ...stat,
          avg_response_time: Math.round(stat.avg_response_time * 100) / 100,
          success_rate: stat.total_requests > 0 ? Math.round((stat.successful_requests / stat.total_requests) * 10000) / 100 : 0
        }));
      }

      if (action === 'get_top_actions') {
        const { data: actions, error } = await supabase
          .from('mcp_request_logs')
          .select('service_key, action')
          .eq('user_id', params.user_id)
          .gte('created_at', startDate.toISOString());

        if (error) throw error;

        const actionCounts = (actions || []).reduce((acc, log) => {
          const key = `${log.service_key}.${log.action}`;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return Object.entries(actionCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, params.limit || 10)
          .map(([action, count]) => ({
            action,
            count,
            service: action.split('.')[0],
            action_name: action.split('.')[1]
          }));
      }

      throw new Error(`Unknown MCP usage action: ${action}`);
    },
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
    handler: async (action: string, params: any) => {
      if (action === 'list') {
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .select(`
            id,
            user_id,
            key_prefix,
            name,
            scope_type,
            allowed_services,
            rate_limit_per_minute,
            rate_limit_per_day,
            is_active,
            created_at,
            last_used_at,
            expires_at
          `)
          .eq('user_id', params.user_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      }

      if (action === 'create') {
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .insert({
            user_id: params.user_id,
            name: params.name,
            scope_type: params.scope_type || 'all_services',
            allowed_services: params.services || [],
            rate_limit_per_minute: params.rate_limit_per_minute || 60,
            rate_limit_per_day: params.rate_limit_per_day || 10000,
            expires_at: params.expires_at // Optional expiration
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'revoke') {
        const { data, error } = await supabase
          .from('mcp_api_keys')
          .update({
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', params.key_id)
          .eq('user_id', params.user_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      if (action === 'rotate') {
        // Generate new key secret while keeping same configuration
        const { data: existingKey, error: fetchError } = await supabase
          .from('mcp_api_keys')
          .select('*')
          .eq('id', params.key_id)
          .eq('user_id', params.user_id)
          .single();

        if (fetchError || !existingKey) {
          throw new Error(`API key not found: ${params.key_id}`);
        }

        // Update with new key hash (in real implementation, generate new secret)
        const newKeyHash = `hash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const { data, error } = await supabase
          .from('mcp_api_keys')
          .update({
            key_hash: newKeyHash,
            updated_at: new Date().toISOString(),
            last_rotated_at: new Date().toISOString()
          })
          .eq('id', params.key_id)
          .eq('user_id', params.user_id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      throw new Error(`Unknown MCP API keys action: ${action}`);
    },
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
          { name: 'rate_limit_per_day', type: 'number', description: 'Rate limit per day', required: false },
          { name: 'expires_at', type: 'string', description: 'Expiration date (ISO string)', required: false }
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
    const { data, error } = await supabase
      .from('user_tool_configs')
      .select('*')
      .eq('user_id', this.userId);

    if (error) {
      if (isMissingRelationError(error, 'user_tool_configs')) {
        console.warn('[ToolRegistry] user_tool_configs table not available');
        return;
      }
      throw error;
    }

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

    if (error) {
      if (isMissingRelationError(error, 'user_tool_configs')) {
        throw new Error('Tool configuration storage is not available yet.');
      }
      throw error;
    }

    if (data) {
      this.userTools.set(toolId, data);
    }
  }

  /**
   * Disable a tool
   */
  async disableTool(toolId: string) {
    const { error } = await supabase
      .from('user_tool_configs')
      .update({ enabled: false })
      .eq('user_id', this.userId)
      .eq('tool_id', toolId);

    if (error) {
      if (isMissingRelationError(error, 'user_tool_configs')) {
        throw new Error('Tool configuration storage is not available yet.');
      }
      throw error;
    }

    const config = this.userTools.get(toolId);
    if (config) {
      config.enabled = false;
      this.userTools.set(toolId, config);
    }
  }

  /**
   * Execute a tool action
   */
  async executeAction(toolId: string, actionId: string, params: any = {}): Promise<any> {
    // Check permission
    if (!this.canUseAction(toolId, actionId)) {
      throw new Error(`Permission denied for ${toolId}.${actionId}`);
    }

    const tool = this.getAllTools().find(t => t.id === toolId);
    if (!tool) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    // Add user_id to params for dashboard tools
    const enhancedParams = {
      ...params,
      user_id: this.userId
    };

    // Execute based on tool type
    if (tool.type === 'dashboard' && tool.handler) {
      return tool.handler(actionId, enhancedParams);
    }

    if (tool.type === 'mcp') {
      return this.executeMCPAction(tool, actionId, enhancedParams);
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
