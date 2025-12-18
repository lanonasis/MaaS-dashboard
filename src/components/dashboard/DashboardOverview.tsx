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
            Here's an overview of your memory intelligence metrics
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
              Memory Health Score
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

        <Card data-testid="card-total-memories">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Memories
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Health Breakdown
            </CardTitle>
            <CardDescription>Detailed metrics about your memory organization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Embedding Coverage</span>
                  <span className="font-medium">{healthData.metrics.embedding_coverage}%</span>
                </div>
                <Progress value={healthData.metrics.embedding_coverage} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Tagging Consistency</span>
                  <span className="font-medium">{healthData.metrics.tagging_consistency}%</span>
                </div>
                <Progress value={healthData.metrics.tagging_consistency} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Type Balance</span>
                  <span className="font-medium">{healthData.metrics.type_balance}%</span>
                </div>
                <Progress value={healthData.metrics.type_balance} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Freshness</span>
                  <span className="font-medium">{healthData.metrics.freshness}%</span>
                </div>
                <Progress value={healthData.metrics.freshness} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-activity-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Weekly Activity
            </CardTitle>
            <CardDescription>Memory creation by day of week</CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <div className="h-60 flex items-center justify-center">
                <Brain className="h-8 w-8 animate-pulse text-muted-foreground" />
              </div>
            ) : activityData.length > 0 ? (
              <div className="h-60" style={{ minHeight: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} fontSize={12} />
                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#0088FE"
                      fillOpacity={1}
                      fill="url(#colorActivity)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                <BarChart3 className="h-12 w-12 mb-2" />
                <p>No activity data yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-type-distribution">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Memory Types
            </CardTitle>
            <CardDescription>Distribution by memory type</CardDescription>
          </CardHeader>
          <CardContent>
            {patternLoading ? (
              <div className="h-60 flex items-center justify-center">
                <Brain className="h-8 w-8 animate-pulse text-muted-foreground" />
              </div>
            ) : pieData.length > 0 ? (
              <div className="h-60 flex items-center" style={{ minHeight: '240px' }}>
                <ResponsiveContainer width="50%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {pieData.slice(0, 5).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="capitalize">{entry.name}</span>
                      </div>
                      <span className="font-medium">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-60 flex flex-col items-center justify-center text-muted-foreground">
                <Database className="h-12 w-12 mb-2" />
                <p>No memories yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(insights && insights.length > 0) || (healthData?.recommendations && healthData.recommendations.length > 0) ? (
        <Card data-testid="card-insights">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Insights & Recommendations
            </CardTitle>
            <CardDescription>AI-powered suggestions to improve your knowledge base</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights?.map((insight, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    insight.category === 'pattern' ? 'bg-blue-500/10 border-blue-500/20' :
                    insight.category === 'learning' ? 'bg-green-500/10 border-green-500/20' :
                    insight.category === 'opportunity' ? 'bg-purple-500/10 border-purple-500/20' :
                    'bg-yellow-500/10 border-yellow-500/20'
                  }`}
                >
                  <Brain className={`h-5 w-5 mt-0.5 ${
                    insight.category === 'pattern' ? 'text-blue-500' :
                    insight.category === 'learning' ? 'text-green-500' :
                    insight.category === 'opportunity' ? 'text-purple-500' :
                    'text-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
              
              {healthData?.recommendations?.map((rec, index) => (
                <div
                  key={`rec-${index}`}
                  className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                >
                  <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Health Recommendation</p>
                    <p className="text-xs text-muted-foreground">{rec}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card data-testid="card-quick-actions">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Quick Actions</h3>
            </div>
            <p className="text-muted-foreground">
              Manage your API keys, explore memories, or start intelligent workflows
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button 
                onClick={() => navigate('/dashboard/orchestrator')} 
                className="gap-2"
                data-testid="button-try-orchestrator"
              >
                <Zap className="h-4 w-4" />
                AI Orchestrator
              </Button>
              <Button 
                onClick={() => navigate('/dashboard/memory-visualizer')} 
                variant="outline" 
                className="gap-2"
                data-testid="button-view-memories"
              >
                <Brain className="h-4 w-4" />
                View Memories
              </Button>
              <Button 
                onClick={() => navigate('/dashboard/memory-analytics')} 
                variant="outline" 
                className="gap-2"
                data-testid="button-view-analytics"
              >
                <BarChart3 className="h-4 w-4" />
                Full Analytics
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
