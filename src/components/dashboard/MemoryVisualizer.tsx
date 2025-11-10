import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw, Clock, Tag, FileText, FolderOpen, BookOpen, Briefcase, StickyNote, FileCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

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
  const [memories, setMemories] = useState<RecentMemory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMemories: 0,
    uniqueTags: 0
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
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Get the access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/memories/recent?limit=20', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setMemories(data);
      
      // Calculate stats
      const uniqueTags = new Set(data.flatMap((m: RecentMemory) => m.tags || []));
      setStats({
        totalMemories: data.length,
        uniqueTags: uniqueTags.size
      });
    } catch (error: any) {
      console.error('Error fetching memories:', error);
      toast({
        title: 'Failed to load memories',
        description: error.message || 'Could not fetch memories from the server',
        variant: 'destructive'
      });
      setMemories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchMemories();
    }
  }, [user]);

  return (
    <div className="space-y-6">
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
              <span className="text-2xl font-bold">{stats.uniqueTags}</span>
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
                            {formatDistanceToNow(new Date(memory.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>

                      {/* Content Snippet */}
                      <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                        {memory.contentSnippet}
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
