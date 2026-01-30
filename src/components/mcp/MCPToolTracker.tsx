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
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Activity,
  Database,
  TrendingUp,
  Clock,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ToolExecution {
  id: string;
  tool_name: string;
  workflow_id: string;
  workflow_goal: string;
  step_label: string;
  executed_at: string;
  status: "referenced" | "executed" | "failed";
  metadata?: any;
}

interface ToolStats {
  toolName: string;
  usageCount: number;
  lastUsed: string;
  successRate: number;
}

export const MCPToolTracker: React.FC = () => {
  const [executions, setExecutions] = useState<ToolExecution[]>([]);
  const [stats, setStats] = useState<ToolStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  const fetchToolExecutions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Fetch workflow runs and extract MCP tool usage
      const { data: runs, error } = await supabase
        .from("workflow_runs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      const toolExecutions: ToolExecution[] = [];
      const toolUsage: Record<
        string,
        { count: number; lastUsed: string; successes: number; total: number }
      > = {};

      runs?.forEach((run) => {
        const steps = Array.isArray(run.steps) ? run.steps : [];
        steps.forEach((step: any, index: number) => {
          const tool = step.suggestedTool || step.tool;
          if (
            tool &&
            (tool.toLowerCase().includes("mcp") || tool.startsWith("mcp."))
          ) {
            const execution: ToolExecution = {
              id: `${run.id}-${index}`,
              tool_name: tool,
              workflow_id: run.id,
              workflow_goal: run.goal,
              step_label: step.label || step.action || "Unknown step",
              executed_at: run.created_at,
              status: "referenced",
              metadata: step,
            };

            toolExecutions.push(execution);

            // Update stats
            if (!toolUsage[tool]) {
              toolUsage[tool] = {
                count: 0,
                lastUsed: run.created_at,
                successes: 0,
                total: 0,
              };
            }
            toolUsage[tool].count++;
            toolUsage[tool].total++;
            if (new Date(run.created_at) > new Date(toolUsage[tool].lastUsed)) {
              toolUsage[tool].lastUsed = run.created_at;
            }
            // Assume success for now (can be enhanced with actual execution tracking)
            if (run.status === "completed") {
              toolUsage[tool].successes++;
            }
          }
        });
      });

      setExecutions(toolExecutions);

      // Convert to stats array
      const statsArray = Object.entries(toolUsage)
        .map(([toolName, data]) => ({
          toolName,
          usageCount: data.count,
          lastUsed: data.lastUsed,
          successRate: data.total > 0 ? (data.successes / data.total) * 100 : 0,
        }))
        .sort((a, b) => b.usageCount - a.usageCount);

      setStats(statsArray);
    } catch (error: any) {
      console.error("Error fetching tool executions:", error);
      toast({
        title: "Tracking error",
        description: error.message || "Could not load MCP tool tracking",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchToolExecutions();
    }
  }, [user, fetchToolExecutions]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Activity className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            MCP Tool Execution Tracking
          </CardTitle>
          <CardDescription>
            Monitor MCP tool usage in your workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Database className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold">No MCP tools used yet</h3>
              <p className="text-sm text-muted-foreground">
                MCP tools referenced in workflows will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            MCP Tool Execution Tracking
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor which MCP tools are used in your workflows
          </p>
        </div>
        <Button onClick={fetchToolExecutions} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Total Tool References
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{executions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Unique Tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Most Used Tool
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {stats[0]?.toolName || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats[0]?.usageCount || 0} uses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tool Usage Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Tool Usage Statistics
          </CardTitle>
          <CardDescription>MCP tools referenced in workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.map((stat) => (
              <div
                key={stat.toolName}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">
                        {stat.toolName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {stat.usageCount}{" "}
                        {stat.usageCount === 1 ? "use" : "uses"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(stat.lastUsed), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={stat.successRate >= 80 ? "default" : "secondary"}
                  >
                    {stat.successRate.toFixed(0)}% success
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Tool References */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-500" />
            Recent Tool References
          </CardTitle>
          <CardDescription>Latest MCP tool uses in workflows</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {executions.slice(0, 20).map((execution) => (
              <div
                key={execution.id}
                className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {execution.tool_name}
                      </Badge>
                      {execution.status === "executed" && (
                        <CheckCircle className="h-3 w-3 text-green-500" />
                      )}
                      {execution.status === "failed" && (
                        <AlertCircle className="h-3 w-3 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm font-medium">
                      {execution.step_label}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      Workflow: {execution.workflow_goal}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(execution.executed_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-yellow-500" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.length > 5 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Activity className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Active MCP integration</p>
                  <p className="text-xs text-muted-foreground">
                    You're using {stats.length} different MCP tools - great
                    workflow diversity!
                  </p>
                </div>
              </div>
            )}

            {stats[0] && stats[0].usageCount > 10 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Database className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Power user detected</p>
                  <p className="text-xs text-muted-foreground">
                    {stats[0].toolName} is your most-used tool with{" "}
                    {stats[0].usageCount} references
                  </p>
                </div>
              </div>
            )}

            {stats.some((s) => s.successRate < 50) && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    Some tools need attention
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Check workflows using tools with low success rates
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

// Missing import
const BarChart3 = Activity;
