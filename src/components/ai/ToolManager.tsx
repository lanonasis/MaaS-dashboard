/**
 * Tool Manager Component
 *
 * A comprehensive interface for managing AI tools and their configurations.
 * Provides users with the ability to enable/disable tools, configure API keys,
 * set permissions, and manage tool-specific settings.
 *
 * Tool Categories:
 * - **Dashboard Tools**: Always available (API Keys, Memory Manager, Workflow Manager, Analytics)
 * - **MCP Tools**: External integrations requiring API keys (GitHub, ClickUp, Supabase, Stripe, etc.)
 *
 * Features:
 * - Tool discovery and catalog browsing
 * - Secure API key management with encryption
 * - Granular permission controls
 * - Tool status monitoring and health checks
 * - Configuration persistence and validation
 * - Real-time tool availability updates
 *
 * Security Considerations:
 * - API keys are encrypted before storage
 * - Row-level security ensures user isolation
 * - Permission checks prevent unauthorized tool access
 * - Audit logging for all configuration changes
 *
 * @component
 * @example
 * ```tsx
 * import { ToolManager } from '@/components/ai/ToolManager';
 *
 * function AIToolsPage() {
 *   return (
 *     <div className="container mx-auto p-6">
 *       <h1 className="text-2xl font-bold mb-6">AI Tools Configuration</h1>
 *       <ToolManager />
 *     </div>
 *   );
 * }
 * ```
 *
 * @requires Supabase authentication context
 * @requires Tool registry to be properly configured
 * @requires Database tables: user_tool_configs, mcp_services
 */

import React, { useState, useEffect } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { createToolRegistry, ToolDefinition, ToolRegistry } from '@/lib/ai-orchestrator/tool-registry';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Key,
  Brain,
  Zap,
  Database,
  MessageSquare,
  BarChart3,
  Lock,
  Unlock,
  Check,
  X,
  Info,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export function ToolManager() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [registry, setRegistry] = useState<ToolRegistry | null>(null);
  const [allTools, setAllTools] = useState<ToolDefinition[]>([]);
  const [enabledTools, setEnabledTools] = useState<Set<string>>(new Set());
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [selectedPermissions, setSelectedPermissions] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingToolId, setSavingToolId] = useState<string | null>(null);

  // Initialize registry
  useEffect(() => {
    const init = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        const toolRegistry = await createToolRegistry(user.id);
        setRegistry(toolRegistry);

        const tools = toolRegistry.getAllTools();
        setAllTools(tools);

        const enabled = toolRegistry.getEnabledTools();
        setEnabledTools(new Set(enabled.map(t => t.id)));
      } catch (error) {
        console.error('Failed to initialize tool registry:', error);
        toast({
          title: 'Error',
          description: 'Failed to load tools',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user, toast]);

  const handleToggleTool = async (tool: ToolDefinition, enabled: boolean) => {
    if (!registry) return;

    setSavingToolId(tool.id);

    try {
      if (enabled) {
        // Require API key for MCP tools
        if (tool.requiresApiKey && !apiKeys[tool.id]) {
          toast({
            title: 'API Key Required',
            description: `Please enter an API key for ${tool.name}`,
            variant: 'destructive'
          });
          setSavingToolId(null);
          return;
        }

        // Default to all permissions
        const permissions = selectedPermissions[tool.id] || tool.actions.map(a => a.id);

        await registry.enableTool(tool.id, {
          apiKey: apiKeys[tool.id],
          permissions
        });

        setEnabledTools(new Set([...enabledTools, tool.id]));

        toast({
          title: 'Tool Enabled',
          description: `${tool.name} is now available to your AI assistant`
        });
      } else {
        await registry.disableTool(tool.id);
        const newEnabled = new Set(enabledTools);
        newEnabled.delete(tool.id);
        setEnabledTools(newEnabled);

        toast({
          title: 'Tool Disabled',
          description: `${tool.name} has been disabled`
        });
      }
    } catch (error: any) {
      console.error('Failed to toggle tool:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update tool',
        variant: 'destructive'
      });
    } finally {
      setSavingToolId(null);
    }
  };

  const handlePermissionToggle = (toolId: string, actionId: string, checked: boolean) => {
    const current = selectedPermissions[toolId] || [];
    const updated = checked
      ? [...current, actionId]
      : current.filter(id => id !== actionId);

    setSelectedPermissions({
      ...selectedPermissions,
      [toolId]: updated
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'productivity': return <Zap className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'communication': return <MessageSquare className="h-4 w-4" />;
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'automation': return <Brain className="h-4 w-4" />;
      case 'finance': return <Key className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const renderToolCard = (tool: ToolDefinition) => {
    const isEnabled = enabledTools.has(tool.id);
    const isSaving = savingToolId === tool.id;
    const isDashboard = tool.type === 'dashboard';

    return (
      <Card key={tool.id} className={cn(
        "transition-all duration-200",
        isEnabled && "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
      )}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                {getCategoryIcon(tool.category)}
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {tool.icon} {tool.name}
                  {isDashboard && (
                    <Badge variant="secondary" className="text-xs">
                      Built-in
                    </Badge>
                  )}
                  {isEnabled && (
                    <Badge className="text-xs bg-green-500">
                      <Check className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  {tool.description}
                </CardDescription>
              </div>
            </div>
            {!isDashboard && (
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggleTool(tool, checked)}
                disabled={isSaving}
              />
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* API Key Input for MCP tools */}
          {tool.requiresApiKey && !isDashboard && (
            <div className="space-y-2">
              <Label htmlFor={`apikey-${tool.id}`} className="text-sm flex items-center gap-2">
                <Key className="h-3 w-3" />
                API Key
                {isEnabled ? (
                  <Badge variant="outline" className="text-xs">
                    <Lock className="h-3 w-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-orange-600">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Required
                  </Badge>
                )}
              </Label>
              <Input
                id={`apikey-${tool.id}`}
                type="password"
                placeholder={`Enter your ${tool.name} API key`}
                value={apiKeys[tool.id] || ''}
                onChange={(e) => setApiKeys({ ...apiKeys, [tool.id]: e.target.value })}
                className="font-mono text-sm"
              />
            </div>
          )}

          {/* Available Actions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Available Actions</Label>
            <div className="space-y-2">
              {tool.actions.map((action) => {
                const permissions = selectedPermissions[tool.id] || tool.actions.map(a => a.id);
                const isChecked = permissions.includes(action.id);

                return (
                  <div key={action.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                    {!isDashboard && (
                      <Checkbox
                        id={`permission-${tool.id}-${action.id}`}
                        checked={isChecked}
                        onCheckedChange={(checked) =>
                          handlePermissionToggle(tool.id, action.id, checked as boolean)
                        }
                        disabled={!isEnabled && isDashboard}
                      />
                    )}
                    <div className="flex-1">
                      <label
                        htmlFor={`permission-${tool.id}-${action.id}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {action.name}
                      </label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {action.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dashboard tools info */}
          {isDashboard && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                This is a built-in dashboard tool. It's always available to your AI assistant.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-sm text-muted-foreground">Loading tools...</p>
        </div>
      </div>
    );
  }

  const dashboardTools = allTools.filter(t => t.type === 'dashboard');
  const mcpTools = allTools.filter(t => t.type === 'mcp');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">AI Tools Configuration</h2>
        <p className="text-muted-foreground mt-1">
          Configure which tools your AI assistant can access and what actions it can perform
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">
            Dashboard Tools ({dashboardTools.length})
          </TabsTrigger>
          <TabsTrigger value="mcp">
            External Tools ({mcpTools.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <Alert>
            <Brain className="h-4 w-4" />
            <AlertDescription>
              These are built-in platform tools that are always available to your AI assistant.
              They don't require any API keys or additional configuration.
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {dashboardTools.map(renderToolCard)}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-4 mt-6">
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              Connect your personal productivity tools to give your AI assistant more context and capabilities.
              You'll need to provide API keys for each tool you want to enable.
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {mcpTools.map(renderToolCard)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <Separator />

      <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
        <div className="space-y-2 text-sm">
          <p className="font-semibold">How Tool Permissions Work</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Dashboard Tools</strong>: Always enabled and available to the AI</li>
            <li>• <strong>External Tools</strong>: Require your API keys and explicit permission</li>
            <li>• <strong>Action Permissions</strong>: Choose which specific actions the AI can perform</li>
            <li>• <strong>Security</strong>: Your API keys are encrypted and never shared</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
