import { useState, useEffect, useCallback, useRef } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { apiClient, type Memory } from "@/lib/api-client";
import type { Database as SupabaseDatabase } from "@/integrations/supabase/types";

type SupabaseApiKey = SupabaseDatabase["public"]["Tables"]["api_keys"]["Row"];

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

export function MemoryVisualizer() {
  // Use the auth hook for consistent auth state - this prevents race conditions
  const { user: authUser, isLoading: authLoading } = useSupabaseAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [apiKeys, setApiKeys] = useState<SupabaseApiKey[]>([]);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [customApiKey, setCustomApiKey] = useState("");
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalTags: 0,
    totalAccess: 0,
    activeKeys: 0,
  });
  const { toast } = useToast();

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Detail dialog state
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Ref to track if fetch has completed (prevents timeout toast after success)
  const fetchCompletedRef = useRef(false);

  // Fetch memories from the API or Supabase directly
  const fetchMemories = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log("[MemoryVisualizer] Auth still loading, skipping fetch");
      return;
    }

    // Don't fetch if no user (unless using custom API key)
    if (!authUser && !useCustomApiKey) {
      console.log(
        "[MemoryVisualizer] No user and no custom API key, skipping fetch"
      );
      return;
    }

    setIsLoading(true);
    fetchCompletedRef.current = false;

    // Set up timeout to prevent infinite loading states
    // Only show timeout toast if the fetch hasn't completed yet
    const timeoutId = setTimeout(() => {
      if (!fetchCompletedRef.current) {
        setIsLoading(false);
        toast({
          title: "Request Timeout",
          description: "Memory loading took too long. Please try again.",
          variant: "destructive",
        });
      }
    }, 15000); // 15 second timeout

    try {
      const params: any = {
        limit: ITEMS_PER_PAGE,
        page: page,
      };

      if (selectedType !== "all") {
        params.type = selectedType;
      }

      // Use custom API key if enabled
      if (useCustomApiKey && customApiKey) {
        params.apiKey = customApiKey;
        console.log(
          "[MemoryVisualizer] Using custom API key:",
          customApiKey.substring(0, 8) + "..."
        );
      }

      console.log("[MemoryVisualizer] Fetching memories with params:", params);

      let response;

      // If API key is provided, use API client for scoped access
      if (useCustomApiKey && customApiKey) {
        try {
          response = await apiClient.getMemories(params);
          console.log("[MemoryVisualizer] API client success:", {
            hasData: !!response.data,
            count: response.data?.length,
          });
        } catch (apiError: any) {
          console.error(
            "[MemoryVisualizer] API client failed:",
            apiError?.message
          );
          throw apiError;
        }
      } else {
        // Use Supabase directly when no API key (user's own memories)
        if (!authUser?.id) {
          throw new Error("User not authenticated");
        }

        console.log(
          "[MemoryVisualizer] Using Supabase directly for user:",
          authUser.id
        );

        let query = supabase
          .from("memory_entries")
          .select("*", { count: "exact" })
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .range(
            ((params.page || 1) - 1) * (params.limit || 20),
            (params.page || 1) * (params.limit || 20) - 1
          );

        if (params.type && selectedType !== "all") {
          query = query.eq("memory_type", params.type);
        }

        const { data: supabaseData, error: supabaseError, count } = await query;

        if (supabaseError) {
          throw supabaseError;
        }

        // Transform Supabase data to match API response format
        response = {
          data: (supabaseData || []).map((m: any) => ({
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
          })) as Memory[],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 20,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / (params.limit || 20)),
          },
        };
      }

      if (response.data) {
        setMemories(response.data);

        // Update pagination info
        if (response.pagination) {
          setTotalCount(response.pagination.total || response.data.length);
          setTotalPages(response.pagination.total_pages || 1);
        }

        // Calculate stats
        const uniqueTags = new Set(response.data.flatMap((m) => m.tags || []));
        const totalAccess = response.data.reduce(
          (sum, m) => sum + (m.access_count || 0),
          0
        );

        setStats((prev) => ({
          ...prev,
          totalMemories: response.pagination?.total || response.data.length,
          totalTags: uniqueTags.size,
          totalAccess,
        }));

        toast({
          title: "Memories loaded successfully",
          description: `Showing ${response.data.length} of ${response.pagination?.total || response.data.length} memories`,
        });
      } else if (response.error) {
        toast({
          title: "API Error",
          description:
            response.error + " (" + (response.code || "Unknown") + ")",
          variant: "destructive",
        });
        setMemories([]);
      } else {
        setMemories([]);
      }
    } catch (error: any) {
      console.error("[MemoryVisualizer] Error fetching memories:", error);

      const errorMessage = error?.message || String(error);
      let userFacingMessage = "Could not fetch memory data";

      if (errorMessage.includes("fetch") || errorMessage.includes("Network")) {
        userFacingMessage = "Network error - check API connectivity";
      } else if (
        errorMessage.includes("401") ||
        errorMessage.includes("Authentication")
      ) {
        userFacingMessage = "Authentication failed - check API key";
      } else if (errorMessage.includes("404")) {
        userFacingMessage = "API endpoint not found";
      } else if (errorMessage.includes("CORS")) {
        userFacingMessage = "CORS error - API may not allow this origin";
      }

      toast({
        title: "Failed to load memories",
        description: userFacingMessage + ": " + errorMessage,
        variant: "destructive",
      });
      setMemories([]);
    } finally {
      fetchCompletedRef.current = true;
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [
    authUser,
    authLoading,
    selectedType,
    useCustomApiKey,
    customApiKey,
    page,
    toast,
  ]);

  // Fetch API keys from Supabase
  const fetchApiKeys = useCallback(async () => {
    if (!authUser?.id) return;

    try {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        setApiKeys(data);
        setStats((prev) => ({
          ...prev,
          activeKeys: data.filter((k) => k.is_active).length,
        }));
      }
    } catch (error: any) {
      console.error("[MemoryVisualizer] Error fetching API keys:", error);
    }
  }, [authUser]);

  // Reset page when type filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedType]);

  // Effect to fetch data when auth state changes
  useEffect(() => {
    if (!authLoading && (authUser || useCustomApiKey)) {
      fetchMemories();
      if (authUser) {
        fetchApiKeys();
      }
    }
  }, [
    authUser,
    authLoading,
    selectedType,
    useCustomApiKey,
    customApiKey,
    page,
    fetchMemories,
    fetchApiKeys,
  ]);

  // Pagination handlers
  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(p => p - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(p => p + 1);
    }
  };

  // Open memory detail dialog
  const handleOpenDetail = (memory: Memory) => {
    setSelectedMemory(memory);
    setIsDetailOpen(true);
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
                <Button onClick={fetchMemories} disabled={isLoading}>
                  <RefreshCw
                    className={
                      "h-4 w-4 mr-2 " + (isLoading ? "animate-spin" : "")
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
            <Button
              onClick={fetchMemories}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw
                className={"h-4 w-4 " + (isLoading ? "animate-spin" : "")}
              />
            </Button>
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
          ) : memories.length === 0 ? (
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
                {memories.map((memory) => (
                <Card
                  key={memory.id}
                  className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-primary group"
                  onClick={() => handleOpenDetail(memory)}
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
                            className={
                              getTypeBadgeColor(memory.type) + " text-xs"
                            }
                          >
                            {memory.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {safeFormatDistanceToNow(memory.created_at)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {memory.content || memory.title}
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
            {memories.length > 0 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <span className="text-sm text-muted-foreground">
                  Showing {((page - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(page * ITEMS_PER_PAGE, totalCount)} of {totalCount} memories
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
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || isLoading}
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
              <div>
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
                <p className="text-sm whitespace-pre-wrap leading-relaxed bg-muted/50 p-4 rounded-lg">
                  {selectedMemory?.content}
                </p>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
