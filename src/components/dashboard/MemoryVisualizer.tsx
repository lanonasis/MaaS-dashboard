import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Database,
  Tag,
  RefreshCw,
  Settings,
  Clock,
  FolderOpen,
  BookOpen,
  Briefcase,
  StickyNote,
  FileCode,
  FileText,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Save,
  X,
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, type Memory } from "@/lib/api-client";

const getTypeIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    context: FileText,
    project: Briefcase,
    knowledge: BookOpen,
    reference: FolderOpen,
    personal: StickyNote,
    workflow: FileCode,
    note: StickyNote,
    document: FileText,
  };

  const Icon = iconMap[type.toLowerCase()] || Database;
  return <Icon className="h-4 w-4" />;
};

const getTypeBadgeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    context: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    project: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    knowledge: "bg-green-500/10 text-green-500 border-green-500/20",
    reference: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    personal: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    workflow: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    note: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    document: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  };

  return (
    colorMap[type.toLowerCase()] ||
    "bg-gray-500/10 text-gray-500 border-gray-500/20"
  );
};

const safeFormatDistanceToNow = (value: string | Date | null | undefined) => {
  try {
    if (!value) return 'Just now';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime())) return 'Just now';
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return 'Just now';
  }
};

// Content formatter - clean up raw content for display
const formatContent = (content: string): string => {
  if (!content) return '';

  // Try to detect and format JSON
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(content);
      // If it's valid JSON, return a cleaner representation
      if (typeof parsed === 'object') {
        // Check for common memory structures
        if (parsed.trigger || parsed.actions) {
          return `Workflow: ${parsed.trigger || 'Automated task'}\n${parsed.actions?.length || 0} action(s) defined`;
        }
        if (parsed.content) {
          return parsed.content;
        }
        // Return pretty printed JSON with truncation
        const formatted = JSON.stringify(parsed, null, 2);
        return formatted.length > 500 ? formatted.slice(0, 500) + '...' : formatted;
      }
    } catch {
      // Not valid JSON, continue with normal processing
    }
  }

  // Clean up common formatting issues
  const cleaned = content
    .replace(/\\n/g, '\n')  // Fix escaped newlines
    .replace(/\\t/g, '  ')  // Fix escaped tabs
    .replace(/\r\n/g, '\n') // Normalize line endings
    .trim();

  return cleaned;
};

// Valid memory types for editing
const MEMORY_TYPES = ['context', 'project', 'knowledge', 'reference', 'personal', 'workflow'];

// Query keys
const memoryKeys = {
  all: ['memories'] as const,
  list: (params: { page: number; type: string; userId: string }) =>
    [...memoryKeys.all, 'list', params] as const,
};

export function MemoryVisualizer() {
  const { user: authUser, isLoading: authLoading } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // State
  const [selectedType, setSelectedType] = useState<string>("all");
  const [customApiKey, setCustomApiKey] = useState("");
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Dialog states
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    type: 'context',
    tags: '',
  });

  // React Query - fetch memories with caching
  const {
    data: memoriesData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: memoryKeys.list({ page, type: selectedType, userId: authUser?.id || '' }),
    queryFn: async () => {
      if (!authUser?.id && !useCustomApiKey) {
        return { memories: [], total: 0, totalPages: 1 };
      }

      // Use Supabase directly for authenticated users without custom API key
      if (!useCustomApiKey) {
        let query = supabase
          .from("memory_entries")
          .select("*", { count: "exact" })
          .eq("user_id", authUser!.id)
          .order("created_at", { ascending: false })
          .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

        if (selectedType !== "all") {
          query = query.or(`memory_type.eq.${selectedType},type.eq.${selectedType}`);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const memories = (data || []).map((m: any) => ({
          id: m.id,
          title: m.title || m.content?.substring(0, 50) || "Untitled",
          content: m.content,
          type: m.memory_type || m.type || "context",
          tags: m.tags || [],
          metadata: m.metadata || {},
          is_private: false,
          is_archived: false,
          access_count: m.access_count || 0,
          last_accessed_at: m.last_accessed || null,
          created_at: m.created_at,
          updated_at: m.updated_at || m.created_at,
        })) as Memory[];

        return {
          memories,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
        };
      }

      // Use API client for custom API key
      const params: any = {
        limit: ITEMS_PER_PAGE,
        page,
        apiKey: customApiKey,
      };
      if (selectedType !== "all") {
        params.type = selectedType;
      }

      const response = await apiClient.getMemories(params);

      if (response.error) throw new Error(response.error);

      return {
        memories: response.data || [],
        total: response.pagination?.total || response.data?.length || 0,
        totalPages: response.pagination?.total_pages || 1,
      };
    },
    enabled: !authLoading && (!!authUser?.id || (useCustomApiKey && !!customApiKey)),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false, // Prevent refetch on focus
    refetchOnReconnect: false, // Prevent refetch on reconnect
  });

  // Update memory mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Memory> }) => {
      // Use API client for custom API key users
      if (useCustomApiKey && customApiKey) {
        const response = await apiClient.updateMemory(id, {
          title: updates.title,
          content: updates.content,
          type: updates.type,
          tags: updates.tags,
        }, customApiKey);

        if (response.error) throw new Error(response.error);
        return { id, updates };
      }

      // Use Supabase directly for authenticated users
      const { error } = await supabase
        .from("memory_entries")
        .update({
          title: updates.title,
          content: updates.content,
          type: updates.type,
          memory_type: updates.type,
          tags: updates.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("user_id", authUser!.id);

      if (error) throw error;
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
      setIsEditOpen(false);
      setSelectedMemory(null);
      toast({
        title: "Memory updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update memory.",
        variant: "destructive",
      });
    },
  });

  // Delete memory mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Use API client for custom API key users
      if (useCustomApiKey && customApiKey) {
        const response = await apiClient.deleteMemory(id, customApiKey);
        if (response.error) throw new Error(response.error);
        return id;
      }

      // Use Supabase directly for authenticated users
      const { error } = await supabase
        .from("memory_entries")
        .delete()
        .eq("id", id)
        .eq("user_id", authUser!.id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memoryKeys.all });
      setIsDeleteOpen(false);
      setIsDetailOpen(false);
      setSelectedMemory(null);
      toast({
        title: "Memory deleted",
        description: "The memory has been permanently removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Could not delete memory.",
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleOpenDetail = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
  };

  const handleOpenEdit = (memory: Memory) => {
    setSelectedMemory(memory);
    setEditForm({
      title: memory.title || '',
      content: memory.content || '',
      type: memory.type || 'context',
      tags: (memory.tags || []).join(', '),
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedMemory) return;

    const tags = editForm.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateMutation.mutate({
      id: selectedMemory.id,
      updates: {
        title: editForm.title,
        content: editForm.content,
        type: editForm.type as Memory['type'],
        tags,
      },
    });
  };

  const handleConfirmDelete = () => {
    if (!selectedMemory) return;
    deleteMutation.mutate(selectedMemory.id);
  };

  const handlePreviousPage = () => {
    if (page > 1) setPage(p => p - 1);
  };

  const handleNextPage = () => {
    if (memoriesData && page < memoriesData.totalPages) {
      setPage(p => p + 1);
    }
  };

  // Stats calculation
  const stats = {
    totalMemories: memoriesData?.total || 0,
    totalTags: new Set((memoriesData?.memories || []).flatMap(m => m.tags || [])).size,
  };

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            Initializing authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Memory API Configuration
          </CardTitle>
          <CardDescription>
            Configure how to fetch memory data from the LanOnasis API
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="use-custom-api-key"
              checked={useCustomApiKey}
              onCheckedChange={setUseCustomApiKey}
            />
            <Label htmlFor="use-custom-api-key">Use Custom API Key</Label>
          </div>

          {useCustomApiKey && (
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your LanOnasis API key"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => refetch()} disabled={isLoading || isRefetching}>
                  <RefreshCw
                    className={
                      "h-4 w-4 mr-2 " + (isLoading || isRefetching ? "animate-spin" : "")
                    }
                  />
                  Test & Load
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Using API key:{" "}
                {customApiKey ? customApiKey.substring(0, 8) + "..." : "None"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Memories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.totalMemories}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unique Tags
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.totalTags}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Explorer */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Memory Explorer</CardTitle>
              <CardDescription>
                Recent memories from your vector knowledge base
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedType} onValueChange={(v) => { setSelectedType(v); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {MEMORY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => refetch()}
                variant="outline"
                size="sm"
                disabled={isLoading || isRefetching}
              >
                <RefreshCw
                  className={"h-4 w-4 " + (isLoading || isRefetching ? "animate-spin" : "")}
                />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading memories...
                </p>
              </div>
            </div>
          ) : !memoriesData?.memories?.length ? (
            <div className="text-center space-y-4 py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No memories yet</h3>
                <p className="text-sm text-muted-foreground">
                  Once data is stored, they will appear here
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {memoriesData.memories.map((memory) => (
                  <Card
                    key={memory.id}
                    className="hover:shadow-md transition-all border-l-4 border-l-transparent hover:border-l-primary group"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="p-2 rounded-md bg-muted">
                              {getTypeIcon(memory.type)}
                            </div>
                            <Badge
                              variant="outline"
                              className={getTypeBadgeColor(memory.type) + " text-xs"}
                            >
                              {memory.type}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(memory); }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMemory(memory);
                                setIsDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleOpenDetail(memory)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              <span>
                                {safeFormatDistanceToNow(memory.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed whitespace-pre-wrap">
                          {formatContent(memory.content || memory.title)}
                        </p>

                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {memory.tags.map((tag, idx) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs font-normal"
                              >
                                <Tag className="h-3 w-3 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {memoriesData.memories.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <span className="text-sm text-muted-foreground">
                    Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-
                    {Math.min(page * ITEMS_PER_PAGE, memoriesData.total)} of {memoriesData.total} memories
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1 || isLoading}
                      onClick={handlePreviousPage}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground px-2">
                      Page {page} of {memoriesData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= memoriesData.totalPages || isLoading}
                      onClick={handleNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Memory Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-card border-border">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-muted">
                {selectedMemory && getTypeIcon(selectedMemory.type)}
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg">
                  {selectedMemory?.title || 'Memory Details'}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Badge
                    variant="outline"
                    className={selectedMemory ? getTypeBadgeColor(selectedMemory.type) + " text-xs" : ""}
                  >
                    {selectedMemory?.type}
                  </Badge>
                  <span className="text-xs">
                    Created {selectedMemory && safeFormatDistanceToNow(selectedMemory.created_at)}
                  </span>
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[50vh] pr-4">
            <div className="space-y-4">
              {/* Content */}
              <div>
                <h4 className="text-sm font-medium mb-2 text-muted-foreground">Content</h4>
                <pre className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                  {formatContent(selectedMemory?.content || '')}
                </pre>
              </div>

              {/* Tags */}
              {selectedMemory?.tags && selectedMemory.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMemory.tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-sm">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedMemory?.metadata && Object.keys(selectedMemory.metadata).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2 text-muted-foreground">Metadata</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(selectedMemory.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <span className="text-xs text-muted-foreground">Access Count</span>
                  <p className="text-sm font-medium">{selectedMemory?.access_count || 0}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Last Accessed</span>
                  <p className="text-sm font-medium">
                    {selectedMemory?.last_accessed_at
                      ? safeFormatDistanceToNow(selectedMemory.last_accessed_at)
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => selectedMemory && handleOpenEdit(selectedMemory)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDetailOpen(false);
                setIsDeleteOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Memory Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Memory</DialogTitle>
            <DialogDescription>
              Make changes to your memory entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editForm.title}
                onChange={(e) => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Memory title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <Select
                value={editForm.type}
                onValueChange={(v) => setEditForm(f => ({ ...f, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEMORY_TYPES.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={editForm.content}
                onChange={(e) => setEditForm(f => ({ ...f, content: e.target.value }))}
                rows={6}
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={editForm.tags}
                onChange={(e) => setEditForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Memory</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this memory? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
