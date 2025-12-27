/**
 * IntelligencePanel - AI-powered memory insights panel
 * Displays health score, duplicate detection, and tag suggestions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import {
  useIntelligenceClient,
  type HealthCheckResult,
  type DuplicateGroup
} from '@/hooks/useIntelligenceClient';
import {
  Brain,
  Copy,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Merge,
  Sparkles,
  TrendingUp,
  Shield
} from 'lucide-react';

interface IntelligencePanelProps {
  compact?: boolean;
  showDuplicates?: boolean;
  showHealthScore?: boolean;
  onMergeMemories?: (primaryId: string, duplicateIds: string[]) => void;
}

export const IntelligencePanel: React.FC<IntelligencePanelProps> = ({
  compact = false,
  showDuplicates = true,
  showHealthScore = true,
  onMergeMemories
}) => {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(null);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('health');
  const { user } = useSupabaseAuth();
  const intelligence = useIntelligenceClient();

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const [healthData, duplicateData] = await Promise.all([
        showHealthScore ? intelligence.getHealthCheck() : Promise.resolve(null),
        showDuplicates ? intelligence.detectDuplicates(0.8) : Promise.resolve([])
      ]);

      setHealthCheck(healthData);
      setDuplicates(duplicateData);
    } catch (error) {
      console.error('Error fetching intelligence data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const healthScore = healthCheck?.health_score?.overall || 0;

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${getHealthGradient(healthScore)} text-white`}>
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Memory Health</div>
                <div className={`text-2xl font-bold ${getHealthColor(healthScore)}`}>
                  {healthScore}/100
                </div>
              </div>
            </div>
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {duplicates.length} duplicates
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Memory Intelligence
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        <CardDescription>AI-powered insights and recommendations</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Health
              {healthScore > 0 && (
                <Badge variant="secondary" className={getHealthColor(healthScore)}>
                  {healthScore}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="duplicates" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Duplicates
              {duplicates.length > 0 && (
                <Badge variant="destructive">{duplicates.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="health" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Brain className="h-8 w-8 animate-pulse text-primary" />
              </div>
            ) : healthCheck ? (
              <>
                {/* Health Score */}
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getHealthColor(healthScore)}`}>
                    {healthScore}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">Health Score</div>
                  <Progress value={healthScore} className="h-2 mt-3" />
                </div>

                {/* Breakdown */}
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {healthCheck.health_score?.breakdown && Object.entries(healthCheck.health_score.breakdown).map(([key, value]) => (
                    <div key={key} className="text-center p-2 rounded-lg bg-muted/50">
                      <div className={`text-sm font-bold ${getHealthColor(value)}`}>{value}%</div>
                      <div className="text-xs text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{healthCheck.statistics?.total_memories || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Memories</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{healthCheck.statistics?.memories_with_tags || 0}</div>
                    <div className="text-xs text-muted-foreground">With Tags</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{healthCheck.statistics?.unique_tags || 0}</div>
                    <div className="text-xs text-muted-foreground">Unique Tags</div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-lg font-bold">{healthCheck.statistics?.recent_memories_30d || 0}</div>
                    <div className="text-xs text-muted-foreground">Last 30 Days</div>
                  </div>
                </div>

                {/* Issues */}
                {healthCheck.issues && healthCheck.issues.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Issues to Address
                    </h4>
                    <div className="space-y-2">
                      {healthCheck.issues.map((issue, idx) => (
                        <div key={idx} className={`p-2 rounded-lg text-sm ${
                          issue.severity === 'high' ? 'bg-red-500/10 border border-red-500/20' :
                          issue.severity === 'medium' ? 'bg-yellow-500/10 border border-yellow-500/20' :
                          'bg-blue-500/10 border border-blue-500/20'
                        }`}>
                          <div className="font-medium">{issue.description}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {issue.recommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Unable to load health data
              </div>
            )}
          </TabsContent>

          <TabsContent value="duplicates" className="mt-4 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Copy className="h-8 w-8 animate-pulse text-primary" />
              </div>
            ) : duplicates.length > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Found {duplicates.reduce((acc, g) => acc + g.duplicates.length, 0)} potential duplicates in {duplicates.length} groups
                  </span>
                </div>

                <div className="space-y-3">
                  {duplicates.map((group, idx) => (
                    <div key={idx} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium">{group.primary_title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Primary memory
                          </div>
                        </div>
                        <Badge variant="outline">
                          {(group.similarity_score * 100).toFixed(0)}% match
                        </Badge>
                      </div>

                      <div className="mt-3 space-y-2">
                        {group.duplicates.map((dup) => (
                          <div key={dup.id} className="flex items-center justify-between p-2 rounded bg-background">
                            <div>
                              <div className="text-sm">{dup.title}</div>
                              <div className="text-xs text-muted-foreground">
                                Created: {new Date(dup.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">
                                {(dup.similarity * 100).toFixed(0)}%
                              </Badge>
                              {onMergeMemories && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onMergeMemories(group.primary_id, [dup.id])}
                                >
                                  <Merge className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <div className="font-medium">No duplicates found</div>
                <div className="text-sm text-muted-foreground">
                  Your memory bank is well organized
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default IntelligencePanel;
