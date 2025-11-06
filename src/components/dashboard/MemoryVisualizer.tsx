import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Database, Search, Tag, FileText, Activity, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';

interface Memory {
  id: string;
  title: string;
  content: string;
  type: 'context' | 'project' | 'knowledge' | 'reference' | 'personal' | 'workflow' | 'note' | 'document';
  tags: string[];
  metadata: Record<string, any>;
  is_private: boolean;
  is_archived: boolean;
  access_count: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  service: string;
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
  user_id: string;
}

export function MemoryVisualizer() {
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  // Get authenticated user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);
  
  const [memories, setMemories] = useState<Memory[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalTags: 0,
    totalAccess: 0,
    activeKeys: 0
  });

  // Fetch memories from the API
  const fetchMemories = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedType !== 'all') {
        params.type = selectedType;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await apiClient.getMemories(params);
      
      if (response.data) {
        setMemories(response.data);
        
        // Calculate stats
        const uniqueTags = new Set(response.data.flatMap(m => m.tags));
        const totalAccess = response.data.reduce((sum, m) => sum + m.access_count, 0);
        
        setStats(prev => ({
          ...prev,
          totalMemories: response.data.length,
          totalTags: uniqueTags.size,
          totalAccess
        }));
      } else {
        // If API fails, show empty state but not an error
        setMemories([]);
      }
    } catch (error: any) {
      console.error('Error fetching memories:', error);
      // Don't show error toast, just set empty state
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
    if (!searchQuery.trim() || !user) return;
    
    setIsLoading(true);
    try {
      const response = await apiClient.searchMemories({
        query: searchQuery,
        limit: 50,
        similarity_threshold: 0.7
      });
      
      if (response.data) {
        setMemories(response.data);
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
    fetchApiKeys();
  }, [user, selectedType]);

  const memoryTypes = ['all', 'context', 'project', 'knowledge', 'reference', 'personal', 'workflow', 'note', 'document'];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">{stats.totalAccess}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active API Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              <span className="text-2xl font-bold">{stats.activeKeys}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Explorer</CardTitle>
          <CardDescription>
            Search and explore your memories, semantic patterns, and knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search memories semantically..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
              className="flex-1"
            />
            <Button onClick={handleSemanticSearch} variant="secondary">
              <Search className="h-4 w-4 mr-2" />
              Semantic Search
            </Button>
            <Button onClick={fetchMemories} variant="outline">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {memoryTypes.map(type => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Memory Data */}
      <Tabs defaultValue="memories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="memories">Memories ({memories.length})</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys ({apiKeys.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="memories" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : memories.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4 py-8">
                  <Database className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No memories found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? 'Try a different search query or filter'
                        : 'Start adding memories to your knowledge base'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {memories.map((memory) => (
                <Card key={memory.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-base">{memory.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {memory.content}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {memory.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {memory.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {memory.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              <Tag className="h-3 w-3 mr-1" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Accessed {memory.access_count} times</span>
                        {memory.last_accessed_at && (
                          <span>Last: {new Date(memory.last_accessed_at).toLocaleDateString()}</span>
                        )}
                        <span>Created: {new Date(memory.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          {apiKeys.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4 py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No API keys</h3>
                    <p className="text-sm text-muted-foreground">
                      Create API keys to access the LanOnasis platform
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-base">{key.name}</CardTitle>
                        <CardDescription>{key.service}</CardDescription>
                      </div>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Key: {key.key.substring(0, 20)}...</div>
                        <div>Created: {new Date(key.created_at).toLocaleDateString()}</div>
                        {key.expires_at && (
                          <div>Expires: {new Date(key.expires_at).toLocaleDateString()}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
