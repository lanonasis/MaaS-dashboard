import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useHealthCheck, usePatternAnalysis, useInsightExtraction } from '@/hooks/useMemoryIntelligence';
import {
  Brain,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Tag,
  Calendar,
  ArrowRight,
  Target,
  BarChart3,
  Shield
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const DashboardOverview = () => {
  const { profile, user } = useSupabaseAuth();
  const navigate = useNavigate();
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useHealthCheck();
  const { data: patternData, isLoading: patternLoading, refetch: refetchPatterns } = usePatternAnalysis(30);
  const { data: insights, isLoading: insightsLoading, refetch: refetchInsights } = useInsightExtraction();

  const handleRefresh = () => {
    refetchHealth();
    refetchPatterns();
    refetchInsights();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-500';
      case 'needs_attention': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500/10 border-green-500/20';
      case 'needs_attention': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'critical': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const pieData = patternData?.memories_by_type
    ? Object.entries(patternData.memories_by_type).map(([name, value]) => ({ name, value }))
    : [];

  const activityData = patternData?.memories_by_day_of_week
    ? Object.entries(patternData.memories_by_day_of_week).map(([day, count]) => ({
        day: day.slice(0, 3),
        count
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" data-testid="text-dashboard-title">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0] || 'User'}
          </h2>
          <p className="text-muted-foreground">
            Here's an overview of your context intelligence metrics
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm" data-testid="button-refresh-dashboard">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-health-score">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Context Health Score
            </CardDescription>
          </CardHeader>
          <CardContent>
            {healthLoading ? (
              <Skeleton className="h-12 w-24" />
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className={`text-4xl font-bold ${getStatusColor(healthData?.status || 'needs_attention')}`}>
                    {healthData?.overall_score || 0}
                  </span>
                  <span className="text-muted-foreground">/100</span>
                </div>
                <Badge
                  variant="outline"
                  className={`mt-2 ${getStatusBgColor(healthData?.status || 'needs_attention')}`}
                >
                  {healthData?.status === 'healthy' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {healthData?.status === 'needs_attention' && <AlertTriangle className="h-3 w-3 mr-1" />}
                  {healthData?.status?.replace('_', ' ') || 'Loading...'}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-context">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Context Entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <Skeleton className="h-12 w-20" />
            ) : (
              <>
                <div className="text-4xl font-bold">{patternData?.total_memories || 0}</div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  {getTrendIcon(patternData?.creation_velocity?.trend || 'stable')}
                  <span>
                    {patternData?.creation_velocity?.daily_average?.toFixed(1) || 0}/day avg
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-unique-tags">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Unique Tags
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <Skeleton className="h-12 w-16" />
            ) : (
              <>
                <div className="text-4xl font-bold">{patternData?.most_common_tags?.length || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {patternData?.most_common_tags?.[0]?.tag && `Top: "${patternData.most_common_tags[0].tag}"`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-insights-count">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <Skeleton className="h-12 w-12" />
            ) : (
              <>
                <div className="text-4xl font-bold">{insights?.length || 0}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  Actionable recommendations
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {healthData && (
        <Card data-testid="card-health-metrics">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Context Health Metrics
            </CardTitle>
            <CardDescription>Detailed breakdown of context quality indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    Embedding Coverage
                  </span>
                  <span className="font-medium">{healthData.metrics.embedding_coverage}%</span>
                </div>
                <Progress value={healthData.metrics.embedding_coverage} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-green-500" />
                    Tagging Consistency
                  </span>
                  <span className="font-medium">{healthData.metrics.tagging_consistency}%</span>
                </div>
                <Progress value={healthData.metrics.tagging_consistency} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-purple-500" />
                    Type Balance
                  </span>
                  <span className="font-medium">{healthData.metrics.type_balance}%</span>
                </div>
                <Progress value={healthData.metrics.type_balance} />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    Freshness
                  </span>
                  <span className="font-medium">{healthData.metrics.freshness}%</span>
                </div>
                <Progress value={healthData.metrics.freshness} />
              </div>
            </div>

            {healthData.recommendations && healthData.recommendations.length > 0 && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Recommendations
                </h4>
                <ul className="space-y-2">
                  {healthData.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-context-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Context Type Distribution
            </CardTitle>
            <CardDescription>How your context entries are categorized</CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No memory data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-activity-patterns">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Activity Pattern
            </CardTitle>
            <CardDescription>Memory creation by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : activityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                No activity data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-quick-actions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Jump to key sections of your dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate('/dashboard/memory-analytics')}
            >
              <span className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                View Analytics
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate('/dashboard/memory-visualizer')}
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Browse Memories
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigate('/dashboard/ai-tools')}
            >
              <span className="flex items-center gap-2">
                <Brain className="h-4 w-4" />
                AI Tools
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
