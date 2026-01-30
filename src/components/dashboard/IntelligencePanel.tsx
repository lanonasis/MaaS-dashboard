/**
 * IntelligencePanel - AI-powered memory insights panel
 * Displays health score, duplicate detection, and tag suggestions
 * Uses the Memory Intelligence SDK with local fallback processing
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  useMemoryIntelligence,
  type HealthCheckResult,
  type DuplicatePair,
} from "@/hooks/useMemoryIntelligence";
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
  Shield,
} from "lucide-react";

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
  onMergeMemories,
}) => {
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(
    null,
  );
  const [duplicates, setDuplicates] = useState<DuplicatePair[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("health");
  const { user } = useSupabaseAuth();
  const { getHealthCheck, detectDuplicates, isReady, isKeyLoading } =
    useMemoryIntelligence();

  const fetchData = useCallback(async () => {
    if (!user || !isReady) return;

    setIsLoading(true);
    try {
      const [healthResult, duplicateResult] = await Promise.allSettled([
        showHealthScore ? getHealthCheck() : Promise.resolve(null),
        showDuplicates ? detectDuplicates(0.8) : Promise.resolve([]),
      ]);

      if (healthResult.status === "fulfilled") {
        setHealthCheck(healthResult.value);
      } else {
        console.warn("Health check request failed:", healthResult.reason);
        setHealthCheck(null);
      }

      if (duplicateResult.status === "fulfilled") {
        setDuplicates(duplicateResult.value);
      } else {
        console.warn("Duplicate detection request failed:", duplicateResult.reason);
        setDuplicates([]);
      }
    } catch (error) {
      console.error("Error fetching intelligence data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    user,
    isReady,
    showHealthScore,
    showDuplicates,
    getHealthCheck,
    detectDuplicates,
  ]);

  useEffect(() => {
    if (user && isReady && !isKeyLoading) {
      fetchData();
    }
  }, [user, isReady, isKeyLoading, fetchData]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getHealthGradient = (score: number) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-red-500 to-rose-500";
  };

  // SDK uses overall_score instead of health_score.overall
  const healthScore = healthCheck?.overall_score || 0;

  if (compact) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg bg-gradient-to-br ${getHealthGradient(healthScore)} text-white`}
              >
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <div className="font-medium">Memory Health</div>
                <div
                  className={`text-2xl font-bold ${getHealthColor(healthScore)}`}
                >
                  {healthScore}/100
                </div>
              </div>
            </div>
            {duplicates.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {duplicates.length} duplicates
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
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
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
        <CardDescription>
          AI-powered insights and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="health" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Health
              {healthScore > 0 && (
                <Badge
                  variant="secondary"
                  className={getHealthColor(healthScore)}
                >
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
                  <div
                    className={`text-5xl font-bold ${getHealthColor(healthScore)}`}
                  >
                    {healthScore}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Health Score
                  </div>
                  <Progress value={healthScore} className="h-2 mt-3" />
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {healthCheck.metrics &&
                    Object.entries(healthCheck.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="text-center p-2 rounded-lg bg-muted/50"
                      >
                        <div
                          className={`text-sm font-bold ${getHealthColor(value)}`}
                        >
                          {value}%
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {key.replace(/_/g, " ")}
                        </div>
                      </div>
                    ))}
                </div>

                {/* Status Badge */}
                <div className="flex justify-center mt-4">
                  <Badge
                    variant={
                      healthCheck.status === "healthy"
                        ? "default"
                        : healthCheck.status === "needs_attention"
                          ? "secondary"
                          : "destructive"
                    }
                    className="px-3 py-1"
                  >
                    {healthCheck.status === "healthy" && (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    )}
                    {healthCheck.status === "needs_attention" && (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {healthCheck.status?.replace(/_/g, " ").toUpperCase() ||
                      "UNKNOWN"}
                  </Badge>
                </div>

                {/* Recommendations */}
                {healthCheck.recommendations &&
                  healthCheck.recommendations.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Recommendations
                      </h4>
                      <div className="space-y-2">
                        {healthCheck.recommendations.map(
                          (recommendation, idx) => (
                            <div
                              key={idx}
                              className="p-2 rounded-lg text-sm bg-primary/5 border border-primary/10"
                            >
                              <div className="text-muted-foreground">
                                {recommendation}
                              </div>
                            </div>
                          ),
                        )}
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
                    Found {duplicates.length} potential duplicate pairs
                  </span>
                </div>

                <div className="space-y-3">
                  {duplicates.map((pair, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border bg-muted/30"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline">
                          {(pair.similarity_score * 100).toFixed(0)}% match
                        </Badge>
                        <Badge
                          variant={
                            pair.recommendation === "merge"
                              ? "default"
                              : "secondary"
                          }
                          className="capitalize"
                        >
                          {pair.recommendation?.replace(/_/g, " ") || "review"}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        {/* Memory 1 */}
                        <div className="flex items-center justify-between p-2 rounded bg-background">
                          <div>
                            <div className="text-sm font-medium">
                              {pair.memory_1.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created:{" "}
                              {new Date(
                                pair.memory_1.created_at,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          {onMergeMemories &&
                            pair.recommendation === "keep_newer" && (
                              <Badge
                                variant="outline"
                                className="text-green-500"
                              >
                                Keep
                              </Badge>
                            )}
                        </div>

                        {/* Memory 2 */}
                        <div className="flex items-center justify-between p-2 rounded bg-background">
                          <div>
                            <div className="text-sm font-medium">
                              {pair.memory_2.title}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Created:{" "}
                              {new Date(
                                pair.memory_2.created_at,
                              ).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {onMergeMemories &&
                              pair.recommendation === "keep_older" && (
                                <Badge
                                  variant="outline"
                                  className="text-green-500"
                                >
                                  Keep
                                </Badge>
                              )}
                            {onMergeMemories && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  onMergeMemories(pair.memory_1.id, [
                                    pair.memory_2.id,
                                  ])
                                }
                                title="Merge memories"
                              >
                                <Merge className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
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
