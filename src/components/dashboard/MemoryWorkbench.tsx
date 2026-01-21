import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { apiClient, type Memory } from '@/lib/api-client';
import { isMissingColumnError } from '@/lib/supabase-errors';
import {
  Brain,
  Save,
  Search,
  ChevronDown,
  Tag,
  Download,
  CheckSquare,
  Square,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Valid Supabase memory_type enum values
const VALID_MEMORY_TYPES = new Set([
  'context',
  'project',
  'knowledge',
  'reference',
  'personal',
  'workflow',
]);

// Map display types to valid enum types (for types not in enum)
const typeToEnumMap: Record<string, string> = {
  'note': 'context',
  'document': 'reference',
};

const normalizeTags = (tags: unknown) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((tag) => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
};

const normalizeMemory = (memory: Partial<Memory> & { type?: string }) => {
  const content = (memory.content ?? '').toString();
  const title = memory.title || content.slice(0, 80) || 'Untitled';
  const createdAt = memory.created_at || new Date().toISOString();
  const updatedAt = memory.updated_at || createdAt;
  return {
    id: memory.id || 'unknown',
    title,
    content,
    type: (memory.type || 'context') as Memory['type'],
    tags: normalizeTags(memory.tags),
    metadata: memory.metadata || {},
    is_private: memory.is_private ?? false,
    is_archived: memory.is_archived ?? false,
    access_count: memory.access_count ?? 0,
    last_accessed_at: memory.last_accessed_at ?? null,
    created_at: createdAt,
    updated_at: updatedAt,
  } as Memory;
};

const buildSupabaseMemory = (entry: any): Memory => {
  const content = (entry?.content ?? '').toString();
  const title = entry?.title || content.slice(0, 80) || 'Untitled';
  const type = entry?.memory_type || entry?.type || 'context';
  return normalizeMemory({
    id: entry?.id,
    title,
    content,
    type,
    tags: entry?.tags || [],
    metadata: entry?.metadata || {},
    access_count: entry?.access_count || 0,
    last_accessed_at: entry?.last_accessed || null,
    created_at: entry?.created_at,
    updated_at: entry?.updated_at || entry?.created_at,
  });
};

const sanitizeSearchTerm = (value: string) =>
  value.replace(/[%_]/g, '').replace(/,/g, ' ').trim();

export const MemoryWorkbench: React.FC = () => {
  const { user, isLoading: authLoading } = useSupabaseAuth();
  const { toast } = useToast();

  // Memory management states
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showMemoryPanel, setShowMemoryPanel] = useState(false);

  // Quick memory creation states
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState('context');
  const [newMemoryTags, setNewMemoryTags] = useState('');
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [showQuickMemory, setShowQuickMemory] = useState(false);

  // Bulk operations states
  const [selectedMemoryIds, setSelectedMemoryIds] = useState<Set<string>>(new Set());
  const [bulkTagInput, setBulkTagInput] = useState('');
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  const handleMemorySearch = async () => {
    if (!memorySearchQuery.trim()) return;
    if (authLoading) return;
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to search your memories.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);

    const normalizedQuery = memorySearchQuery.trim();
    const safeQuery = sanitizeSearchTerm(normalizedQuery);

    const fallbackToSupabase = async () => {
      const baseQuery = () =>
        supabase
          .from('memory_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

      let response = await baseQuery().or(
        `content.ilike.%${safeQuery}%,title.ilike.%${safeQuery}%`,
      );

      if (response.error && isMissingColumnError(response.error, 'title')) {
        response = await baseQuery().ilike('content', `%${safeQuery}%`);
      }

      const { data, error } = response;
      if (error) throw error;
      return (data || []).map(buildSupabaseMemory);
    };

    try {
      let results: Memory[] = [];
      let fallbackError: any = null;

      try {
        const response = await apiClient.searchMemories({
          query: normalizedQuery,
          limit: 10,
          similarity_threshold: 0.6,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        results = (response.data || []).map((memory) =>
          normalizeMemory({
            ...memory,
            type: memory.type || 'context',
          })
        );
      } catch (error: any) {
        fallbackError = error;
      }

      if (results.length === 0) {
        try {
          results = await fallbackToSupabase();
          fallbackError = null;
        } catch (error: any) {
          fallbackError = error;
        }
      }

      if (fallbackError) {
        throw fallbackError;
      }

      setSearchResults(results);
      setSelectedMemoryIds(new Set());
      setShowBulkActions(false);

      toast({
        title: 'Search completed',
        description: `Found ${results.length} relevant ${results.length === 1 ? 'memory' : 'memories'}.`,
      });
    } catch (error: any) {
      setSearchResults([]);
      setSelectedMemoryIds(new Set());
      setShowBulkActions(false);
      toast({
        title: 'Search failed',
        description: error?.message || 'Could not search memories.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickMemorySave = async () => {
    if (!newMemoryContent.trim()) return;
    if (authLoading) return;
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to save memories.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingMemory(true);
    try {
      const tags = newMemoryTags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const title = newMemoryContent.split('\n')[0]?.slice(0, 80) || 'Untitled';

      // Map display type to valid enum type
      const enumType = VALID_MEMORY_TYPES.has(newMemoryType)
        ? newMemoryType
        : (typeToEnumMap[newMemoryType] || 'context');

      const insertPayload = {
        user_id: user.id,
        title,
        content: newMemoryContent.trim(),
        type: newMemoryType, // Keep original type for display
        memory_type: enumType as any, // Use valid enum type for DB
        tags,
        metadata: {
          source: 'dashboard_quick_add',
          display_type: newMemoryType, // Store original type selection
          created_via: 'memory_workbench'
        },
      };

      const insertEntry = async (payload: Record<string, unknown>) =>
        supabase.from('memory_entries').insert(payload);

      let { error } = await insertEntry(insertPayload);
      if (error && isMissingColumnError(error, 'memory_type')) {
        const { memory_type: _memoryType, ...payload } = insertPayload;
        ({ error } = await insertEntry(payload));
      }
      if (error && isMissingColumnError(error, 'type')) {
        const { type: _type, ...payload } = insertPayload;
        ({ error } = await insertEntry(payload));
      }

      if (error) throw error;

      toast({
        title: 'Memory saved',
        description: 'Your memory has been stored successfully.',
      });

      setNewMemoryContent('');
      setNewMemoryTags('');
      setShowQuickMemory(false);
    } catch (error: any) {
      console.error('[MemoryWorkbench] Save error:', error);
      toast({
        title: 'Save failed',
        description: error.message || 'Could not save memory. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingMemory(false);
    }
  };

  const toggleMemorySelection = (memoryId: string) => {
    setSelectedMemoryIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId);
      } else {
        newSet.add(memoryId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedMemoryIds.size === searchResults.length) {
      setSelectedMemoryIds(new Set());
    } else {
      setSelectedMemoryIds(new Set(searchResults.map((memory) => memory.id)));
    }
  };

  const handleBulkTag = async () => {
    if (selectedMemoryIds.size === 0 || !bulkTagInput.trim()) return;
    if (authLoading) return;
    if (!user) return;

    setIsBulkTagging(true);
    try {
      const newTags = bulkTagInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      const updates = Array.from(selectedMemoryIds).map(async (memoryId) => {
        const memory = searchResults.find((item) => item.id === memoryId);
        if (!memory) return null;

        const updatedTags = [...new Set([...(memory.tags || []), ...newTags])];

        return supabase
          .from('memory_entries')
          .update({ tags: updatedTags })
          .eq('id', memoryId)
          .eq('user_id', user.id);
      });

      await Promise.all(updates);
      await handleMemorySearch();

      toast({
        title: 'Tags added',
        description: `Added tags to ${selectedMemoryIds.size} ${selectedMemoryIds.size === 1 ? 'memory' : 'memories'}.`,
      });

      setSelectedMemoryIds(new Set());
      setBulkTagInput('');
      setShowBulkActions(false);
    } catch (error: any) {
      toast({
        title: 'Bulk tag failed',
        description: error.message || 'Could not add tags.',
        variant: 'destructive',
      });
    } finally {
      setIsBulkTagging(false);
    }
  };

  const handleExportMemories = () => {
    if (selectedMemoryIds.size === 0) return;

    const selectedMemories = searchResults.filter((memory) =>
      selectedMemoryIds.has(memory.id)
    );

    const exportData = {
      exported_at: new Date().toISOString(),
      count: selectedMemories.length,
      memories: selectedMemories.map((memory) => ({
        id: memory.id,
        content: memory.content,
        type: memory.type,
        tags: memory.tags,
        created_at: memory.created_at,
        metadata: memory.metadata,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `memories-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);

    toast({
      title: 'Export successful',
      description: `Exported ${selectedMemoryIds.size} ${selectedMemoryIds.size === 1 ? 'memory' : 'memories'}.`,
    });

    setSelectedMemoryIds(new Set());
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Collapsible open={showQuickMemory} onOpenChange={setShowQuickMemory}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Save className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">Quick Memory Store</CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showQuickMemory ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                <CardDescription>
                  Save context, notes, or insights to your memory bank
                </CardDescription>
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
                      <SelectItem value="context">📄 Context (Default)</SelectItem>
                      <SelectItem value="knowledge">📚 Knowledge</SelectItem>
                      <SelectItem value="project">💼 Project</SelectItem>
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
                    onChange={(event) => setNewMemoryContent(event.target.value)}
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
                    onChange={(event) => setNewMemoryTags(event.target.value)}
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

        <Collapsible open={showMemoryPanel} onOpenChange={setShowMemoryPanel}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">Memory Search</CardTitle>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      showMemoryPanel ? 'rotate-180' : ''
                    }`}
                  />
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
                    onChange={(event) => setMemorySearchQuery(event.target.value)}
                    onKeyDown={(event) =>
                      event.key === 'Enter' && handleMemorySearch()
                    }
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
                        Found {searchResults.length} relevant{' '}
                        {searchResults.length === 1 ? 'memory' : 'memories'}
                        {selectedMemoryIds.size > 0 &&
                          ` (${selectedMemoryIds.size} selected)`}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAll}
                          className="text-xs"
                        >
                          {selectedMemoryIds.size === searchResults.length
                            ? 'Deselect All'
                            : 'Select All'}
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
                        <Label htmlFor="bulk-tags" className="text-xs">
                          Add tags to {selectedMemoryIds.size} selected{' '}
                          {selectedMemoryIds.size === 1 ? 'memory' : 'memories'}
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="bulk-tags"
                            placeholder="e.g., important, reviewed"
                            value={bulkTagInput}
                            onChange={(event) => setBulkTagInput(event.target.value)}
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
                                  const date = new Date(memory.created_at);
                                  if (Number.isNaN(date.getTime())) return 'Just now';
                                  return formatDistanceToNow(date, { addSuffix: true });
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
      </div>
    </div>
  );
};
