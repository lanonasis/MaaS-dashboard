import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { usePatternAnalysis, useHealthCheck, useInsightExtraction, useDuplicateDetection } from '@/hooks/useMemoryIntelligence';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Database,
  Tag as TagIcon,
  Calendar,
  RefreshCw,
  FileText,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Lightbulb,
  Clock,
  Shield
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const MemoryAnalytics = () => {
  const {
    data: patternData,
    isLoading: patternLoading,
    refetch: refetchPatterns,
    isReady: patternReady,
    isKeyLoading
  } = usePatternAnalysis(30);
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useInsightExtraction();
  const { data: duplicates, refetch: refetchDuplicates } = useDuplicateDetection();

  const handleRefresh = () => {
    refetchPatterns();
    refetchHealth();
    refetchInsights();
    refetchDuplicates();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'needs_attention':
        return 'text-yellow-500';
      case 'critical':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const isLoading = patternLoading || healthLoading || isKeyLoading;

  if (!patternReady && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Memory Intelligence
          </CardTitle>
          <CardDescription>Analytics load once your session is ready</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">Session not ready</h3>
              <p className="text-sm text-muted-foreground">
                If this persists, refresh your session or sign in again to load analytics.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-12 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!patternData || patternData.total_memories === 0) {
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

  const typeData = Object.entries(patternData.memories_by_type).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const dayData = Object.entries(patternData.memories_by_day_of_week).map(([day, count]) => ({
    day: day.slice(0, 3),
    count
  }));

  const radarData = healthData
    ? [
        { metric: 'Embeddings', value: healthData.metrics.embedding_coverage },
        { metric: 'Tagging', value: healthData.metrics.tagging_consistency },
        { metric: 'Type Balance', value: healthData.metrics.type_balance },
        { metric: 'Freshness', value: healthData.metrics.freshness }
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Memory Analytics
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered insights into your memory bank usage and patterns
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" data-testid="button-refresh-analytics">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-memories">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Memories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{patternData.total_memories}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              {getTrendIcon(patternData.creation_velocity.trend)}
              <span>{patternData.creation_velocity.daily_average.toFixed(1)}/day</span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-memory-types">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Memory Types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{Object.keys(patternData.memories_by_type).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Unique categories</p>
          </CardContent>
        </Card>

        <Card data-testid="card-unique-tags">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              Unique Tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{patternData.most_common_tags.length}</div>
            <p className="text-sm text-muted-foreground mt-1">
              Top: {patternData.most_common_tags[0]?.tag || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-health-score">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Health Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getStatusColor(healthData?.status || 'needs_attention')}`}>
              {healthData?.overall_score || 0}/100
            </div>
            <Badge variant="outline" className="mt-1">
              {healthData?.status === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {healthData?.status === 'needs_attention' && <AlertTriangle className="h-3 w-3 mr-1" />}
              {healthData?.status?.replace('_', ' ') || 'Unknown'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Memory Distribution
            </CardTitle>
            <CardDescription>Breakdown by type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  dataKey="value"
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Memory creation by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={dayData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-health-radar">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Health Breakdown
            </CardTitle>
            <CardDescription>Quality metrics overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar name="Score" dataKey="value" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.4} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card data-testid="card-top-tags">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TagIcon className="h-5 w-5" />
              Top Tags
            </CardTitle>
            <CardDescription>Most used memory tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patternData.most_common_tags.length > 0 ? (
                patternData.most_common_tags.map(({ tag, count }) => {
                  const percentage = (count / patternData.total_memories) * 100;
                  return (
                    <div key={tag} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{tag}</span>
                        <span className="text-muted-foreground">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <Progress value={percentage} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No tags available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {duplicates && duplicates.length > 0 && (
        <Card data-testid="card-duplicates">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Potential Duplicates
            </CardTitle>
            <CardDescription>Memories that may be duplicates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {duplicates.map((dup, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="font-medium">{dup.memory_1.title}</p>
                      <p className="text-sm text-muted-foreground">{dup.memory_2.title}</p>
                    </div>
                    <Badge variant="outline">{Math.round(dup.similarity_score * 100)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-insights">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            AI Insights
          </CardTitle>
          <CardDescription>Generated insights from your memory data</CardDescription>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {patternData.insights.length > 0 ? (
                patternData.insights.map((insight, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">{insight}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-6">
                  Keep adding memories to unlock AI insights
                </div>
              )}
              {insights && insights.length > 0 && insights.map((insight, index) => (
                <div key={`ai-${index}`} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">{insight.title}</p>
                    <Badge variant="secondary">{Math.round(insight.confidence * 100)}%</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {healthData?.recommendations && healthData.recommendations.length > 0 && (
        <Card data-testid="card-recommendations">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Recommendations
            </CardTitle>
            <CardDescription>Ways to improve your memory system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData.recommendations.map((rec, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm text-muted-foreground">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-activity-peaks">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Peak Activity Hours
          </CardTitle>
          <CardDescription>When you create memories most often</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {patternData.peak_creation_hours.length > 0 ? (
              patternData.peak_creation_hours.map((hour, index) => (
                <Badge key={index} variant="outline">
                  {hour}:00
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">No data available</span>
            )}
          </div>
        </CardContent>
      </Card>

      {patternData.peak_creation_hours.length > 0 && (
        <Card data-testid="card-activity-summary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Activity Summary
            </CardTitle>
            <CardDescription>Highlights of your memory activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Most active</Badge>
                <span className="text-sm text-muted-foreground">
                  Around {patternData.peak_creation_hours[0]}:00
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
