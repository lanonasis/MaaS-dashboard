import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart3,
  TrendingUp,
  Database,
  Tag as TagIcon,
  Calendar,
  RefreshCw,
  Brain,
  FileText,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface MemoryStats {
  totalMemories: number;
  memoryByType: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
  recentActivity: Array<{ date: string; count: number }>;
  totalTags: number;
  averageTagsPerMemory: number;
}

export const MemoryAnalytics: React.FC = () => {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch all user memories
      const { data: memories, error } = await supabase
        .from('memory_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!memories || memories.length === 0) {
        setStats({
          totalMemories: 0,
          memoryByType: {},
          topTags: [],
          recentActivity: [],
          totalTags: 0,
          averageTagsPerMemory: 0
        });
        setIsLoading(false);
        return;
      }

      // Calculate memory by type
      const memoryByType: Record<string, number> = {};
      memories.forEach(m => {
        const type = m.type || 'unknown';
        memoryByType[type] = (memoryByType[type] || 0) + 1;
      });

      // Calculate top tags
      const tagCounts: Record<string, number> = {};
      let totalTagCount = 0;
      memories.forEach(m => {
        if (m.tags && Array.isArray(m.tags)) {
          m.tags.forEach((tag: string) => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            totalTagCount++;
          });
        }
      });

      const topTags = Object.entries(tagCounts)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Calculate recent activity (last 7 days)
      const recentActivity: Array<{ date: string; count: number }> = [];
      const today = new Date();
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const count = memories.filter(m => {
          const memDate = new Date(m.created_at).toISOString().split('T')[0];
          return memDate === dateStr;
        }).length;

        recentActivity.push({ date: dateStr, count });
      }

      setStats({
        totalMemories: memories.length,
        memoryByType,
        topTags,
        recentActivity,
        totalTags: Object.keys(tagCounts).length,
        averageTagsPerMemory: memories.length > 0 ? totalTagCount / memories.length : 0
      });
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Analytics error',
        description: error.message || 'Could not load analytics',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Brain className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalMemories === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Memory Analytics
          </CardTitle>
          <CardDescription>Insights into your memory bank usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Database className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No memories yet</h3>
              <p className="text-sm text-muted-foreground">
                Start storing memories to see analytics here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxActivityCount = Math.max(...stats.recentActivity.map(a => a.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Memory Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Insights into your memory bank usage and patterns
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Memories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalMemories}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Memory Types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(stats.memoryByType).length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Unique Tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalTags}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Avg Tags/Memory
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageTagsPerMemory.toFixed(1)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Memories by Type
            </CardTitle>
            <CardDescription>Distribution of your memory types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.memoryByType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const percentage = (count / stats.totalMemories) * 100;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{type}</span>
                        <span className="text-muted-foreground">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>

        {/* Top Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-purple-500" />
              Top Tags
            </CardTitle>
            <CardDescription>Most frequently used tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.topTags.length > 0 ? (
                stats.topTags.map(({ tag, count }) => (
                  <div
                    key={tag}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                  >
                    <Badge variant="secondary" className="font-normal">
                      {tag}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {count} {count === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No tags found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-500" />
            Recent Activity (Last 7 Days)
          </CardTitle>
          <CardDescription>Memory creation over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.recentActivity.map(({ date, count }) => {
              const percentage = maxActivityCount > 0 ? (count / maxActivityCount) * 100 : 0;
              const dateObj = new Date(date);
              const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

              return (
                <div key={date} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {dayName}, {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-muted-foreground">
                      {count} {count === 1 ? 'memory' : 'memories'}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.totalMemories > 10 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Strong memory bank</p>
                  <p className="text-xs text-muted-foreground">
                    You have {stats.totalMemories} memories - great for context-rich workflows!
                  </p>
                </div>
              </div>
            )}

            {stats.averageTagsPerMemory < 1 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <TagIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Consider adding more tags</p>
                  <p className="text-xs text-muted-foreground">
                    Tags help organize and find memories faster. Aim for 2-3 tags per memory.
                  </p>
                </div>
              </div>
            )}

            {Object.keys(stats.memoryByType).length === 1 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <FileText className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Diversify memory types</p>
                  <p className="text-xs text-muted-foreground">
                    Try using different memory types (note, context, project, etc.) for better organization.
                  </p>
                </div>
              </div>
            )}

            {stats.recentActivity.slice(-3).every(a => a.count === 0) && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <Calendar className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Low recent activity</p>
                  <p className="text-xs text-muted-foreground">
                    No memories created in the last 3 days. Keep your memory bank fresh!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
