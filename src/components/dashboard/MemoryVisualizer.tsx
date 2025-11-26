import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Database, Search, Tag, FileText, Activity, RefreshCw, Key, Settings, Clock, FolderOpen, BookOpen, Briefcase, StickyNote, FileCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { apiClient, type Memory, type ApiKey } from '@/lib/api-client';

interface RecentMemory {
  id: string;
  contentSnippet: string;
  type: string;
  tags: string[];
  createdAt: string;
}

const getTypeIcon = (type: string) => {
  const iconMap: Record<string, any> = {
    context: FileText,
    project: Briefcase,
    knowledge: BookOpen,
    reference: FolderOpen,
    personal: StickyNote,
    workflow: FileCode,
    note: StickyNote,
    document: FileText
  };
  
  const Icon = iconMap[type.toLowerCase()] || Database;
  return <Icon className="h-4 w-4" />;
};

const getTypeBadgeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    context: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    project: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    knowledge: 'bg-green-500/10 text-green-500 border-green-500/20',
    reference: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    personal: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    workflow: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
    note: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    document: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  };
  
  return colorMap[type.toLowerCase()] || 'bg-gray-500/10 text-gray-500 border-gray-500/20';
};

export function MemoryVisualizer() {
  const [user, setUser] = useState<any>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [customApiKey, setCustomApiKey] = useState('');
  const [useCustomApiKey, setUseCustomApiKey] = useState(false);
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalTags: 0,
    totalAccess: 0,
    activeKeys: 0
  });
  const { toast } = useToast();

  // Get authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // Fetch memories from the new API endpoint
  const fetchMemories = async () => {
    setIsLoading(true);
    
    // #region agent log
    const logEndpoint = 'http://127.0.0.1:7242/ingest/fdfcd7f5-6d46-477f-9c3e-7404e46b48cd';
    const logError = (location: string, message: string, data: any) => {
      try {
        fetch(logEndpoint, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            location,
            message,
            data,
            timestamp: Date.now(),
            sessionId: 'debug-session',
            runId: 'memory-fetch',
            hypothesisId: 'D'
          })
        }).catch(() => {
          try {
            const logs = JSON.parse(localStorage.getItem('debug_logs') || '[]');
            logs.push({location, message, data, timestamp: Date.now()});
            if (logs.length > 100) logs.shift();
            localStorage.setItem('debug_logs', JSON.stringify(logs));
          } catch(e) {}
        });
      } catch(e) {}
    };
    // #endregion
    
    try {
      const params: any = {
        limit: 20,
        page: 1
      };

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      // Use custom API key if enabled
      if (useCustomApiKey && customApiKey) {
        params.apiKey = customApiKey;
        console.log('Using API key:', customApiKey.substring(0, 8) + '...');
        logError('MemoryVisualizer:fetchMemories', 'Using custom API key', {
          hasApiKey: true,
          apiKeyPrefix: customApiKey.substring(0, 8)
        });
      }

      console.log('Fetching memories with params:', params);
      logError('MemoryVisualizer:fetchMemories:start', 'Starting memory fetch', {
        params,
        hasUser: !!user,
        userId: user?.id,
        useApiKey: useCustomApiKey && !!customApiKey
      });
      
      let response;
      
      // If API key is provided, use API client for scoped access (org/project/individual)
      if (useCustomApiKey && customApiKey) {
        try {
          logError('MemoryVisualizer:fetchMemories:apiClient', 'Using API client with API key', {
            hasApiKey: true
          });
          response = await apiClient.getMemories(params);
          logError('MemoryVisualizer:fetchMemories:apiSuccess', 'API client success', {
            hasData: !!response.data,
            dataLength: response.data?.length || 0
          });
        } catch (apiError: any) {
          logError('MemoryVisualizer:fetchMemories:apiError', 'API client failed', {
            error: apiError?.message,
            willFallback: true
          });
          // Fall through to Supabase fallback
          throw apiError;
        }
      } else {
        // Use Supabase directly when no API key (user's own memories)
        if (!user?.id) {
          throw new Error('User not authenticated');
        }
        
        logError('MemoryVisualizer:fetchMemories:supabase', 'Using Supabase directly', {
          userId: user.id
        });
        
        let query = supabase
          .from('memory_entries')
          .select('*', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .range(
            ((params.page || 1) - 1) * (params.limit || 20),
            (params.page || 1) * (params.limit || 20) - 1
          );
        
        if (params.type && selectedType !== 'all') {
          query = query.eq('memory_type', params.type);
        }
        
        if (params.tags?.length) {
          query = query.contains('tags', params.tags);
        }
        
        if (params.search) {
          query = query.ilike('content', `%${params.search}%`);
        }
        
        const { data: supabaseData, error: supabaseError, count } = await query;
        
        logError('MemoryVisualizer:fetchMemories:supabaseQuery', 'Supabase query result', {
          hasData: !!supabaseData,
          dataLength: supabaseData?.length || 0,
          totalCount: count || 0,
          hasError: !!supabaseError,
          errorMessage: supabaseError?.message
        });
        
        if (supabaseError) {
          throw supabaseError;
        }
        
        // Transform Supabase data to match API response format
        response = {
          data: (supabaseData || []).map((m: any) => ({
            id: m.id,
            title: m.title || m.content?.substring(0, 50) || 'Untitled',
            content: m.content,
            type: m.memory_type || m.type || 'context',
            tags: m.tags || [],
            metadata: m.metadata || {},
            is_private: false,
            is_archived: false,
            access_count: m.access_count || 0,
            last_accessed_at: m.last_accessed || null,
            created_at: m.created_at,
            updated_at: m.updated_at || m.created_at
          })) as Memory[],
          pagination: {
            page: params.page || 1,
            limit: params.limit || 20,
            total: count || 0,
            total_pages: Math.ceil((count || 0) / (params.limit || 20))
          }
        };
        
        logError('MemoryVisualizer:fetchMemories:supabaseSuccess', 'Supabase fetch successful', {
          hasData: !!response.data,
          dataLength: response.data?.length || 0,
          total: response.pagination.total
        });
      }
      
      if (response.data) {
        setMemories(response.data);
        
        // Calculate stats
        const uniqueTags = new Set(response.data.flatMap(m => m.tags || []));
        const totalAccess = response.data.reduce((sum, m) => sum + (m.access_count || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalMemories: response.data.length,
          totalTags: uniqueTags.size,
          totalAccess
        }));
        
        toast({
          title: 'Memories loaded successfully',
          description: `Found ${response.data.length} memory entries`,
        });
      } else if (response.error) {
        toast({
          title: 'API Error',
          description: `${response.error} (${response.code || 'Unknown'})`,
          variant: 'destructive'
        });
        setMemories([]);
      } else {
        setMemories([]);
      }
    } catch (error: any) {
      console.error('Error fetching memories:', error);
      
      // #region agent log
      const errorMessage = error?.message || String(error);
      logError('MemoryVisualizer:fetchMemories:error', 'Memory fetch failed', {
        errorMessage,
        errorName: error?.name,
        errorStack: error?.stack?.substring(0, 200),
        isNetworkError: errorMessage.includes('fetch') || errorMessage.includes('Network'),
        isCorsError: errorMessage.includes('CORS'),
        isAuthError: errorMessage.includes('401') || errorMessage.includes('Authentication'),
        isNotFound: errorMessage.includes('404')
      });
      // #endregion
      
      let userFacingMessage = 'Could not fetch memory data';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('Network')) {
        userFacingMessage = 'Network error - check API connectivity';
      } else if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
        userFacingMessage = 'Authentication failed - check API key';
      } else if (errorMessage.includes('404')) {
        userFacingMessage = 'API endpoint not found';
      } else if (errorMessage.includes('CORS')) {
        userFacingMessage = 'CORS error - API may not allow this origin';
      }
      
      toast({
        title: 'Failed to load memories',
        description: `${userFacingMessage}: ${errorMessage}`,
        variant: 'destructive'
      });
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch API keys from Supabase
  const fetchApiKeys = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        setApiKeys(data);
        setStats(prev => ({
          ...prev,
          activeKeys: data.filter(k => k.is_active).length
        }));
      }
    } catch (error: any) {
      console.error('Error fetching API keys:', error);
    }
  };

  // Semantic search
  const handleSemanticSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const searchParams: any = {
        query: searchQuery,
        limit: 50,
        similarity_threshold: 0.7
      };
      
      // Use custom API key if enabled
      if (useCustomApiKey && customApiKey) {
        searchParams.apiKey = customApiKey;
      }
      
      const response = await apiClient.searchMemories(searchParams);
      
      if (response.data) {
        setMemories(response.data);
        toast({
          title: 'Search completed',
          description: `Found ${response.data.length} matching memories`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Search failed',
        description: error.message || 'Could not perform semantic search',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
    if (user) {
      fetchApiKeys();
    }
  }, [user, selectedType, useCustomApiKey, customApiKey]);

  const memoryTypes = ['all', 'context', 'project', 'knowledge', 'reference', 'personal', 'workflow', 'note', 'document'];

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
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Test & Load
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Using API key: {customApiKey ? `${customApiKey.substring(0, 8)}...` : 'None'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Memories</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique Tags</CardTitle>
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
            <Button onClick={fetchMemories} variant="outline" size="sm" disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">Loading memories...</p>
              </div>
            </div>
          ) : memories.length === 0 ? (
            <div className="text-center space-y-4 py-12">
              <Database className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No memories yet</h3>
                <p className="text-sm text-muted-foreground">
                  Once data is stored, they'll appear here
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.map((memory) => (
                <Card key={memory.id} className="hover:shadow-md transition-shadow border-l-4 border-l-transparent hover:border-l-primary">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header: Icon, Type, and Timestamp */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-md bg-muted">
                            {getTypeIcon(memory.type)}
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`${getTypeBadgeColor(memory.type)} text-xs`}
                          >
                            {memory.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {formatDistanceToNow(new Date(memory.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Content Snippet */}
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {memory.content || memory.title}
                      </p>

                      {/* Tags */}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
