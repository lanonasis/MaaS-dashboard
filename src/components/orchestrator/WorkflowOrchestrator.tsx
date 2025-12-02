import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { apiClient } from '@/lib/api-client';
import mcpServers from '@/config/mcp-servers.json';
import {
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Zap,
  Brain,
  ListChecks,
  Lightbulb,
  Save,
  Search,
  Database,
  Tag,
  FileText,
  ChevronDown,
  Plus,
  BookOpen,
  Sparkles,
  Download,
  CheckSquare,
  Square
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowStep {
  id: string;
  label: string;
  detail: string;
  dependsOnStepIds: string[];
  suggestedTool: string;
  expectedOutcome: string;
  // Legacy support
  action?: string;
  tool?: string;
  reasoning?: string;
}

interface WorkflowRun {
  id: string;
  goal: string;
  summary?: string;
  priority?: 'high' | 'medium' | 'low';
  suggestedTimeframe?: string;
  steps: WorkflowStep[];
  risks?: string[];
  missingInfo?: string[];
  notes: string;
  usedMemories: string[];
  createdAt: string;
  status?: string;
}

interface Memory {
  id: string;
  content: string;
  type: string;
  tags?: string[];
  created_at?: string | null;
  metadata?: any;
}

export const WorkflowOrchestrator: React.FC = () => {
  const [request, setRequest] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Memory management states
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [relevantMemories, setRelevantMemories] = useState<Memory[]>([]);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  // Quick memory creation states
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState('note');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [showQuickMemory, setShowQuickMemory] = useState(false);

  // Bulk operations states
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Fetch workflow history on mount
  useEffect(() => {
    if (user) {
      fetchWorkflowHistory();
    }
  }, [user]);

  const fetchWorkflowHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/orchestrator/runs?limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.map((run: any) => ({
          id: run.id,
          goal: run.goal,
          steps: run.steps || [],
          notes: run.results?.notes || '',
          usedMemories: run.used_memories || [],
          createdAt: run.created_at,
          status: run.status
        })));
      }
    } catch (error) {
      console.error('Error fetching workflow history:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!request.trim()) {
      toast({
        title: "Request required",
        description: "Please enter a workflow request",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to execute workflows",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);

    try {
      // Get the access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          goal: request.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const workflowResult = await response.json();
      
      // Add the new workflow to the list
      const newWorkflow: WorkflowRun = {
        id: workflowResult.id,
        goal: request.trim(),
        steps: workflowResult.steps || [],
        notes: workflowResult.notes || '',
        usedMemories: workflowResult.usedMemories || [],
        createdAt: workflowResult.createdAt || new Date().toISOString(),
        status: 'completed'
      };

      setWorkflows(prev => [newWorkflow, ...prev]);

      toast({
        title: "Workflow completed",
        description: `Successfully planned ${workflowResult.steps?.length || 0} steps`
      });

      // Clear the request input
      setRequest('');
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (status === 'failed') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Brain className="h-4 w-4 text-blue-500" />;
  };

  const getPriorityConfig = (priority?: string) => {
    const configs = {
      high: { icon: '🔴', color: 'text-red-500', bgColor: 'bg-red-500/10 border-red-500/20' },
      medium: { icon: '🟡', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10 border-yellow-500/20' },
      low: { icon: '🟢', color: 'text-green-500', bgColor: 'bg-green-500/10 border-green-500/20' }
    };
    return configs[priority as keyof typeof configs] || configs.medium;
  };

  const getToolConfig = (tool: string) => {
    const toolLower = tool.toLowerCase();
    if (toolLower.includes('memory') || toolLower.includes('search')) {
      return { icon: '🧠', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' };
    }
    if (toolLower.includes('mcp') || toolLower.includes('clickup') || toolLower.includes('task')) {
      return { icon: '📋', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' };
    }
    if (toolLower.includes('cli') || toolLower.includes('terminal') || toolLower.includes('shell')) {
      return { icon: '⌨️', color: 'bg-green-500/10 text-green-500 border-green-500/20' };
    }
    if (toolLower.includes('dashboard') || toolLower.includes('ui')) {
      return { icon: '📊', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' };
    }
    return { icon: '🔧', color: 'bg-gray-500/10 text-gray-500 border-gray-500/20' };
  };

  // Memory search handler
  const handleMemorySearch = async () => {
    if (!memorySearchQuery.trim() || !user) return;

    setIsSearching(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await apiClient.searchMemories({
        query: memorySearchQuery,
        limit: 10,
        similarity_threshold: 0.6
      });

      if (response.data) {
        // Normalize results defensively so downstream UI never explodes on missing fields
        const normalized = response.data.map((m: Memory) => {
          const safeTags = Array.isArray(m.tags)
            ? m.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
            : [];

          return {
            ...m,
            content: (m.content ?? '').toString(),
            type: m.type || 'context',
            tags: safeTags,
            created_at: m.created_at || null,
          } as Memory;
        });

        setSearchResults(normalized);
        toast({
          title: 'Search completed',
          description: `Found ${normalized.length} relevant memories`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message || 'Could not search memories',
        variant: 'destructive'
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Quick memory creation handler
  const handleQuickMemorySave = async () => {
    if (!newMemoryContent.trim() || !user) return;

    setIsSavingMemory(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const tags = newMemoryTags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const { data, error } = await supabase
        .from('memory_entries')
        .insert({
          user_id: user.id,
          content: newMemoryContent.trim(),
          type: newMemoryType,
          tags: tags,
          metadata: { source: 'orchestrator_quick_add' }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Memory saved',
        description: 'Your memory has been stored successfully',
      });

      // Clear form
      setNewMemoryContent('');
      setNewMemoryTags('');
      setShowQuickMemory(false);
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save memory',
        variant: 'destructive'
      });
    } finally {
      setIsSavingMemory(false);
    }
  };

  // Save workflow as memory
  const handleSaveWorkflowAsMemory = async (workflow: WorkflowRun) => {
    if (!user) return;

    try {
      const content = `Workflow: ${workflow.goal}\n\nSummary: ${workflow.summary || 'N/A'}\n\nSteps:\n${workflow.steps.map((step, idx) => `${idx + 1}. ${step.label || step.action}`).join('\n')}\n\nNotes: ${workflow.notes}`;

      const { error } = await supabase
        .from('memory_entries')
        .insert({
          user_id: user.id,
          content,
          type: 'workflow',
          tags: ['orchestrator', 'workflow', workflow.priority || 'medium'],
          metadata: {
            source: 'orchestrator_workflow',
            workflow_id: workflow.id,
            goal: workflow.goal
          }
        });

      if (error) throw error;

      toast({
        title: 'Workflow saved to memory',
        description: 'This workflow is now stored in your memory bank',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save workflow',
        variant: 'destructive'
      });
    }
  };

  // Use workflow as template
  const handleUseAsTemplate = (workflow: WorkflowRun) => {
    // Create a templated version of the goal with placeholders
    const templateGoal = `[Based on previous workflow]\n\n${workflow.goal}\n\n---\nOriginal workflow had:\n- ${workflow.steps.length} steps\n- Priority: ${workflow.priority || 'medium'}\n- Timeframe: ${workflow.suggestedTimeframe || 'not specified'}\n\nModify the goal above to create a new workflow.`;

    setRequest(templateGoal);

    toast({
      title: 'Template loaded',
      description: 'Edit the request to create a new workflow based on this template',
    });

    // Scroll to the input area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle memory selection
  const toggleMemorySelection = (memoryId: string) => {
    setSelectedMemoryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
      }
      return newSet;
    });
  };

  // Select all memories
  const handleSelectAll = () => {
    if (selectedMemoryIds.size === searchResults.length) {
      setSelectedMemoryIds(new Set());
    } else {
      setSelectedMemoryIds(new Set(searchResults.map(m => m.id)));
    }
  };

  // Bulk tag memories
  const handleBulkTag = async () => {
    if (selectedMemoryIds.size === 0 || !bulkTagInput.trim() || !user) return;

    setIsBulkTagging(true);
    try {
      const newTags = bulkTagInput
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      // Update each selected memory
      const updates = Array.from(selectedMemoryIds).map(async (memoryId) => {
        const memory = searchResults.find(m => m.id === memoryId);
        if (!memory) return;

        const updatedTags = [...new Set([...(memory.tags || []), ...newTags])];

        return supabase
          .from('memory_entries')
          .update({ tags: updatedTags })
          .eq('id', memoryId)
          .eq('user_id', user.id);
      });

      await Promise.all(updates);

      // Refresh search results
      await handleMemorySearch();

      toast({
        title: 'Tags added',
        description: `Added tags to ${selectedMemoryIds.size} ${selectedMemoryIds.size === 1 ? 'memory' : 'memories'}`,
      });

      // Clear selection and input
      setSelectedMemoryIds(new Set());
      setBulkTagInput('');
      setShowBulkActions(false);
    } catch (error: any) {
      toast({
        title: 'Bulk tag failed',
        description: error.message || 'Could not add tags',
        variant: 'destructive'
      });
    } finally {
      setIsBulkTagging(false);
    }
  };

  // Export selected memories
  const handleExportMemories = () => {
    if (selectedMemoryIds.size === 0) return;

    const selectedMemories = searchResults.filter(m => selectedMemoryIds.has(m.id));

    const exportData = {
      exported_at: new Date().toISOString(),
      count: selectedMemories.length,
      memories: selectedMemories.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        tags: m.tags,
        created_at: m.created_at,
        metadata: m.metadata
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `memories-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${selectedMemoryIds.size} ${selectedMemoryIds.size === 1 ? 'memory' : 'memories'}`,
    });

    setSelectedMemoryIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Memory & Tools Management Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Quick Memory Store */}
        <Collapsible open={showQuickMemory} onOpenChange={setShowQuickMemory}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">Quick Memory Store</CardTitle>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showQuickMemory ? 'rotate-180' : ''}`} />
                </div>
                <CardDescription>Save context, notes, or insights to your memory bank</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="memory-type">Memory Type</Label>
                  <Select value={newMemoryType} onValueChange={setNewMemoryType}>
                    <SelectTrigger id="memory-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="note">📝 Note</SelectItem>
                      <SelectItem value="context">📄 Context</SelectItem>
                      <SelectItem value="project">💼 Project</SelectItem>
                      <SelectItem value="knowledge">📚 Knowledge</SelectItem>
                      <SelectItem value="reference">🔗 Reference</SelectItem>
                      <SelectItem value="personal">👤 Personal</SelectItem>
                      <SelectItem value="workflow">⚙️ Workflow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory-content">Content</Label>
                  <Textarea
                    id="memory-content"
                    placeholder="Paste or type the context you want to remember..."
                    value={newMemoryContent}
                    onChange={(e) => setNewMemoryContent(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memory-tags">Tags (comma-separated)</Label>
                  <Input
                    id="memory-tags"
                    placeholder="e.g., api, authentication, production"
                    value={newMemoryTags}
                    onChange={(e) => setNewMemoryTags(e.target.value)}
                  />
                </div>

                <Button
                  onClick={handleQuickMemorySave}
                  disabled={!newMemoryContent.trim() || isSavingMemory}
                  className="w-full"
                >
                  {isSavingMemory ? (
                    <>
                      <Brain className="h-4 w-4 mr-2 animate-pulse" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save to Memory
                    </>
                  )}
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Memory Search */}
        <Collapsible open={showMemoryPanel} onOpenChange={setShowMemoryPanel}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Memory Search</CardTitle>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showMemoryPanel ? 'rotate-180' : ''}`} />
                </div>
                <CardDescription>Find relevant context from your memories</CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by keywords or semantic meaning..."
                    value={memorySearchQuery}
                    onChange={(e) => setMemorySearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleMemorySearch()}
                  />
                  <Button
                    onClick={handleMemorySearch}
                    disabled={!memorySearchQuery.trim() || isSearching}
                    size="icon"
                  >
                    {isSearching ? (
                      <Brain className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Found {searchResults.length} relevant {searchResults.length === 1 ? 'memory' : 'memories'}
                        {selectedMemoryIds.size > 0 && ` (${selectedMemoryIds.size} selected)`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="text-xs"
                        >
                          {selectedMemoryIds.size === searchResults.length ? 'Deselect All' : 'Select All'}
                        </Button>
                        {selectedMemoryIds.size > 0 && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowBulkActions(!showBulkActions)}
                              className="text-xs"
                            >
                              <Tag className="h-3 w-3 mr-1" />
                              Bulk Tag
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleExportMemories}
                              className="text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Export
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    {showBulkActions && selectedMemoryIds.size > 0 && (
                      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                        <Label htmlFor="bulk-tags" className="text-xs">Add tags to {selectedMemoryIds.size} selected {selectedMemoryIds.size === 1 ? 'memory' : 'memories'}</Label>
                        <div className="flex gap-2">
                          <Input
                            id="bulk-tags"
                            placeholder="e.g., important, reviewed"
                            value={bulkTagInput}
                            onChange={(e) => setBulkTagInput(e.target.value)}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            onClick={handleBulkTag}
                            disabled={!bulkTagInput.trim() || isBulkTagging}
                          >
                            {isBulkTagging ? 'Adding...' : 'Add Tags'}
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((memory) => (
                        <div
                          key={memory.id}
                          className={`p-3 rounded-lg transition-colors space-y-2 cursor-pointer ${
                            selectedMemoryIds.has(memory.id)
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/50 hover:bg-muted'
                          }`}
                          onClick={() => toggleMemorySelection(memory.id)}
                        >
                          <div className="flex items-center gap-2">
                            {selectedMemoryIds.has(memory.id) ? (
                              <CheckSquare className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <Badge variant="outline" className="text-xs">
                              {memory.type}
                            </Badge>
                          <span className="text-xs text-muted-foreground">
                              {(() => {
                                try {
                                  if (!memory.created_at) return 'Just now';
                                  const d = new Date(memory.created_at);
                                  if (Number.isNaN(d.getTime())) return 'Just now';
                                  return formatDistanceToNow(d, { addSuffix: true });
                                } catch {
                                  return 'Just now';
                                }
                              })()}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-3 ml-6">{memory.content}</p>
                          {memory.tags && memory.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 ml-6">
                              {memory.tags.map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* MCP Tools Panel */}
        <Card className="lg:col-span-2 xl:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-500" />
              <CardTitle className="text-base">Available MCP Tools</CardTitle>
            </div>
            <CardDescription>Tools the AI can leverage in workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(mcpServers.mcpServers || {}).map(([serverName, config]: [string, any]) => (
                <div
                  key={serverName}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">{serverName}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    MCP
                  </Badge>
                </div>
              ))}
              {Object.keys(mcpServers.mcpServers || {}).length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No MCP tools configured</p>
                  <p className="text-xs mt-1">Configure MCP servers to enhance workflows</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                The AI orchestrator can reference these tools when planning workflows. Examples: "Use GitHub MCP to create an issue" or "Search with Perplexity"
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workflow Request Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            AI Workflow Orchestrator
          </CardTitle>
          <CardDescription>
            Describe what you want to accomplish, and AI will plan a multi-step workflow using your memories as context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Analyze our Q3 sales data, create an executive summary report, and email it to the leadership team"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            disabled={isExecuting}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !request.trim()}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <Brain className="h-4 w-4 animate-pulse" />
                  Planning Workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Workflow History
          </h3>
          <Button onClick={fetchWorkflowHistory} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
        
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3 py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No workflows executed yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Try the orchestrator above to plan your first workflow!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusIcon(workflow.status)}
                      <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                        {workflow.status || 'completed'}
                      </Badge>
                      {workflow.priority && (
                        <Badge variant="outline" className={getPriorityConfig(workflow.priority).bgColor}>
                          {getPriorityConfig(workflow.priority).icon} {workflow.priority.toUpperCase()}
                        </Badge>
                      )}
                      {workflow.suggestedTimeframe && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {workflow.suggestedTimeframe}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{workflow.goal}</p>
                    {workflow.summary && (
                      <p className="text-sm text-muted-foreground italic leading-relaxed">
                        {workflow.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Workflow Steps */}
                {workflow.steps && workflow.steps.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Execution Plan ({workflow.steps.length} steps):
                    </h4>
                    <div className="space-y-2">
                      {workflow.steps.map((step, index) => {
                        const tool = step.suggestedTool || step.tool || 'unknown';
                        const toolConfig = getToolConfig(tool);
                        const label = step.label || step.action || '';
                        const detail = step.detail || step.reasoning || '';

                        return (
                          <div
                            key={step.id || index}
                            className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{label}</span>
                                <Badge variant="outline" className={`text-xs ${toolConfig.color}`}>
                                  {toolConfig.icon} {tool}
                                </Badge>
                                {step.dependsOnStepIds && step.dependsOnStepIds.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    Depends on: {step.dependsOnStepIds.join(', ')}
                                  </Badge>
                                )}
                              </div>
                              {detail && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {detail}
                                </p>
                              )}
                              {step.expectedOutcome && (
                                <div className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-green-600 dark:text-green-400">
                                    <strong>Expected:</strong> {step.expectedOutcome}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Strategy Notes */}
                {workflow.notes && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Strategy Notes:
                    </h4>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {workflow.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Risks */}
                {workflow.risks && workflow.risks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-orange-600 dark:text-orange-400">
                      <AlertCircle className="h-4 w-4" />
                      ⚠️ Risks & Constraints:
                    </h4>
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <ul className="space-y-1.5 list-disc list-inside text-sm text-foreground/90">
                        {workflow.risks.map((risk, idx) => (
                          <li key={idx} className="leading-relaxed">{risk}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Missing Info */}
                {workflow.missingInfo && workflow.missingInfo.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <AlertCircle className="h-4 w-4" />
                      ℹ️ Missing Information:
                    </h4>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <ul className="space-y-1.5 list-disc list-inside text-sm text-foreground/90">
                        {workflow.missingInfo.map((info, idx) => (
                          <li key={idx} className="leading-relaxed">{info}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Used Memories */}
                {workflow.usedMemories && workflow.usedMemories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      Context from {workflow.usedMemories.length} {workflow.usedMemories.length === 1 ? 'memory' : 'memories'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.usedMemories.map((memId, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-mono">
                          {memId.substring(0, 8)}...
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workflow Actions */}
                <div className="pt-4 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveWorkflowAsMemory(workflow)}
                    className="flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Save to Memory
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUseAsTemplate(workflow)}
                    className="flex items-center gap-2 ml-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    Use as Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
