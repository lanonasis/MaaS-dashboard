import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Play, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Zap,
  Brain,
  ListChecks,
  Lightbulb
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowStep {
  action: string;
  tool: string;
  reasoning?: string;
}

interface WorkflowRun {
  id: string;
  goal: string;
  steps: WorkflowStep[];
  notes: string;
  usedMemories: string[];
  createdAt: string;
  status?: string;
}

export const WorkflowOrchestrator: React.FC = () => {
  const [request, setRequest] = useState('');
  const [workflows, setWorkflows] = useState<WorkflowRun[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Fetch workflow history on mount
  useEffect(() => {
    if (user) {
      fetchWorkflowHistory();
    }
  }, [user]);

  const fetchWorkflowHistory = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/orchestrator/runs?limit=10', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        }
      });

      if (response.ok) {
        const data = await response.json();
        setWorkflows(data.map((run: any) => ({
          id: run.id,
          goal: run.goal,
          steps: run.steps || [],
          notes: run.results?.notes || '',
          usedMemories: run.used_memories || [],
          createdAt: run.created_at,
          status: run.status
        })));
      }
    } catch (error) {
      console.error('Error fetching workflow history:', error);
    }
  };

  const handleExecuteWorkflow = async () => {
    if (!request.trim()) {
      toast({
        title: "Request required",
        description: "Please enter a workflow request",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to execute workflows",
        variant: "destructive"
      });
      return;
    }

    setIsExecuting(true);

    try {
      // Get the access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const response = await fetch('/api/orchestrator/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          goal: request.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const workflowResult = await response.json();
      
      // Add the new workflow to the list
      const newWorkflow: WorkflowRun = {
        id: workflowResult.id,
        goal: request.trim(),
        steps: workflowResult.steps || [],
        notes: workflowResult.notes || '',
        usedMemories: workflowResult.usedMemories || [],
        createdAt: workflowResult.createdAt || new Date().toISOString(),
        status: 'completed'
      };

      setWorkflows(prev => [newWorkflow, ...prev]);

      toast({
        title: "Workflow completed",
        description: `Successfully planned ${workflowResult.steps?.length || 0} steps`
      });

      // Clear the request input
      setRequest('');
    } catch (error) {
      console.error('Workflow execution error:', error);
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    if (status === 'completed') {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    if (status === 'failed') {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Brain className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Workflow Request Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-500" />
            AI Workflow Orchestrator
          </CardTitle>
          <CardDescription>
            Describe what you want to accomplish, and AI will plan a multi-step workflow using your memories as context
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Example: Analyze our Q3 sales data, create an executive summary report, and email it to the leadership team"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            disabled={isExecuting}
            className="resize-none"
          />
          <div className="flex gap-2">
            <Button 
              onClick={handleExecuteWorkflow}
              disabled={isExecuting || !request.trim()}
              className="flex items-center gap-2"
            >
              {isExecuting ? (
                <>
                  <Brain className="h-4 w-4 animate-pulse" />
                  Planning Workflow...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Workflow History */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5" />
            Workflow History
          </h3>
          <Button onClick={fetchWorkflowHistory} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
        
        {workflows.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center space-y-3 py-8">
                <Brain className="h-12 w-12 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">No workflows executed yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Try the orchestrator above to plan your first workflow!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          workflows.map((workflow) => (
            <Card key={workflow.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(workflow.status)}
                      <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                        {workflow.status || 'completed'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">{workflow.goal}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Workflow Steps */}
                {workflow.steps && workflow.steps.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <ListChecks className="h-4 w-4" />
                      Execution Plan ({workflow.steps.length} steps):
                    </h4>
                    <div className="space-y-2">
                      {workflow.steps.map((step, index) => (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{step.action}</span>
                              <Badge variant="outline" className="text-xs">
                                {step.tool}
                              </Badge>
                            </div>
                            {step.reasoning && (
                              <p className="text-xs text-muted-foreground">
                                {step.reasoning}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy Notes */}
                {workflow.notes && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Strategy Notes:
                    </h4>
                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {workflow.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Used Memories */}
                {workflow.usedMemories && workflow.usedMemories.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">
                      Context from {workflow.usedMemories.length} {workflow.usedMemories.length === 1 ? 'memory' : 'memories'}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {workflow.usedMemories.map((memId, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs font-mono">
                          {memId.substring(0, 8)}...
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
