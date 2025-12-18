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
  Brain,
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const MemoryAnalytics = () => {
  const { data: patternData, isLoading: patternLoading, refetch: refetchPatterns } = usePatternAnalysis(30);
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useInsightExtraction();
  const { data: duplicates, isLoading: duplicatesLoading, refetch: refetchDuplicates } = useDuplicateDetection();

  const handleRefresh = () => {
    refetchPatterns();
    refetchHealth();
    refetchInsights();
    refetchDuplicates();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'needs_attention': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const isLoading = patternLoading || healthLoading;

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

  const radarData = healthData ? [
    { metric: 'Embeddings', value: healthData.metrics.embedding_coverage },
    { metric: 'Tagging', value: healthData.metrics.tagging_consistency },
    { metric: 'Type Balance', value: healthData.metrics.type_balance },
    { metric: 'Freshness', value: healthData.metrics.freshness }
  ] : [];

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
        <Card data-testid="card-type-distribution">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              Memories by Type
            </CardTitle>
            <CardDescription>Distribution of your memory types</CardDescription>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <div className="h-64" style={{ minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={typeData} layout="vertical" margin={{ left: 60, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={60} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0088FE" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No type data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-top-tags">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TagIcon className="h-5 w-5 text-purple-500" />
              Top Tags
            </CardTitle>
            <CardDescription>Most frequently used tags</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {patternData.most_common_tags.length > 0 ? (
                patternData.most_common_tags.map(({ tag, count }) => {
                  const percentage = (count / patternData.total_memories) * 100;
                  return (
                    <div key={tag} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="secondary" className="font-normal">
                          {tag}
                        </Badge>
                        <span className="text-muted-foreground">
                          {count} ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  No tags found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-weekly-activity">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-500" />
              Weekly Activity Pattern
            </CardTitle>
            <CardDescription>Memory creation by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {dayData.length > 0 ? (
              <div className="h-64" style={{ minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWeekly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} />
                    <YAxis axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#00C49F"
                      fillOpacity={1}
                      fill="url(#colorWeekly)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No activity data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-health-radar">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-500" />
              Health Metrics Radar
            </CardTitle>
            <CardDescription>Visual breakdown of memory organization</CardDescription>
          </CardHeader>
          <CardContent>
            {radarData.length > 0 ? (
              <div className="h-64" style={{ minHeight: '256px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name="Health"
                      dataKey="value"
                      stroke="#FF8042"
                      fill="#FF8042"
                      fillOpacity={0.5}
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                No health data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {duplicates && duplicates.length > 0 && (
        <Card data-testid="card-duplicates">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Copy className="h-5 w-5 text-red-500" />
              Potential Duplicates
            </CardTitle>
            <CardDescription>Memories that may be duplicates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {duplicates.map((dup, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">"{dup.memory_1.title}"</p>
                    <p className="text-xs text-muted-foreground">
                      Similarity: {(dup.similarity_score * 100).toFixed(0)}% | Recommendation: {dup.recommendation.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-red-500 border-red-500/50">
                    Duplicate
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-insights">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              AI Insights
            </CardTitle>
            <CardDescription>Patterns detected in your memories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {patternData.insights.length > 0 ? (
                patternData.insights.map((insight, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20"
                  >
                    <Brain className="h-5 w-5 text-blue-500 mt-0.5" />
                    <p className="text-sm">{insight}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Keep adding memories to unlock AI insights
                </p>
              )}
              
              {insights && insights.length > 0 && insights.map((insight, index) => (
                <div
                  key={`extracted-${index}`}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    insight.category === 'pattern' ? 'bg-purple-500/10 border-purple-500/20' :
                    insight.category === 'learning' ? 'bg-green-500/10 border-green-500/20' :
                    'bg-yellow-500/10 border-yellow-500/20'
                  }`}
                >
                  <Zap className={`h-5 w-5 mt-0.5 ${
                    insight.category === 'pattern' ? 'text-purple-500' :
                    insight.category === 'learning' ? 'text-green-500' :
                    'text-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-recommendations">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Recommendations
            </CardTitle>
            <CardDescription>Actions to improve your memory bank</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {healthData?.recommendations && healthData.recommendations.length > 0 ? (
                healthData.recommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                  >
                    <CheckCircle2 className="h-5 w-5 text-orange-500 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                  <p className="text-sm">Your memory bank is well organized! Keep it up.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-peak-hours">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-indigo-500" />
            Peak Creation Hours
          </CardTitle>
          <CardDescription>When you're most productive</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {patternData.peak_creation_hours.length > 0 ? (
              patternData.peak_creation_hours.map((hour, index) => (
                <Badge key={hour} variant={index === 0 ? 'default' : 'secondary'} className="text-sm">
                  {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Not enough data to determine peak hours</p>
            )}
          </div>
          {patternData.peak_creation_hours.length > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              You tend to create most memories around these times
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
