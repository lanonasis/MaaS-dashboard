import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Plus,
  Repeat,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SCHEDULE_TYPES = ['once', 'daily', 'weekly', 'monthly'] as const;
type ScheduleType = typeof SCHEDULE_TYPES[number];

const isScheduleType = (value: string): value is ScheduleType =>
  SCHEDULE_TYPES.includes(value as ScheduleType);

interface ScheduledWorkflow {
  id: string;
  user_id: string;
  goal: string;
  schedule_type: ScheduleType;
  scheduled_time: string;
  next_run_at: string;
  last_run_at?: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  created_at: string;
  metadata?: any;
}

export const WorkflowScheduler: React.FC = () => {
  const [scheduledWorkflows, setScheduledWorkflows] = useState<ScheduledWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [featureAvailable, setFeatureAvailable] = useState(true);
  const { user } = useSupabaseAuth();
  const { toast } = useToast();

  // Form state
  const [newGoal, setNewGoal] = useState('');
  const [scheduleType, setScheduleType] = useState<ScheduleType>('once');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchScheduledWorkflows();
    }
  }, [user]);

  const fetchScheduledWorkflows = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scheduled_workflows')
        .select('*')
        .eq('user_id', user.id)
        .order('next_run_at', { ascending: true });

      if (error) {
        // If table doesn't exist or schema cache issue, show "Coming Soon"
        if (error.code === '42P01' || error.message?.includes('schema cache')) {
          setFeatureAvailable(false);
          setScheduledWorkflows([]);
          setIsLoading(false);
          return;
        }
        throw error;
      }

      setFeatureAvailable(true);
      const normalized = (data || []).map((workflow) => ({
        ...workflow,
        schedule_type: isScheduleType(workflow.schedule_type) ? workflow.schedule_type : 'once'
      })) as ScheduledWorkflow[];

      setScheduledWorkflows(normalized);
    } catch (error: any) {
      console.error('Error fetching scheduled workflows:', error);
      // Check for table not found errors
      if (error.message?.includes('scheduled_workflow') || error.code === 'PGRST116') {
        setFeatureAvailable(false);
        setScheduledWorkflows([]);
      } else {
        toast({
          title: 'Load error',
          description: error.message || 'Could not load scheduled workflows',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!newGoal.trim() || !scheduledTime || !user) return;

    setIsSaving(true);
    try {
      const scheduledDateTime = new Date(scheduledTime);

      // Calculate next run time based on schedule type
      const nextRunAt = scheduledDateTime.toISOString();

      const { data, error } = await supabase
        .from('scheduled_workflows')
        .insert({
          user_id: user.id,
          goal: newGoal.trim(),
          schedule_type: scheduleType,
          scheduled_time: scheduledTime,
          next_run_at: nextRunAt,
          status: 'active',
          metadata: {
            created_via: 'workflow_scheduler_ui'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Workflow scheduled',
        description: `Scheduled for ${scheduledDateTime.toLocaleString()}`,
      });

      // Reset form
      setNewGoal('');
      setScheduledTime('');
      setScheduleType('once');
      setIsDialogOpen(false);

      // Refresh list
      await fetchScheduledWorkflows();
    } catch (error: any) {
      console.error('Error scheduling workflow:', error);
      toast({
        title: 'Schedule failed',
        description: error.message || 'Could not schedule workflow',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (scheduleId: string, currentStatus: string) => {
    if (!user) return;

    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';

      const { error } = await supabase
        .from('scheduled_workflows')
        .update({ status: newStatus })
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: newStatus === 'active' ? 'Schedule resumed' : 'Schedule paused',
        description: newStatus === 'active' ? 'Workflow will run as scheduled' : 'Workflow execution paused',
      });

      await fetchScheduledWorkflows();
    } catch (error: any) {
      toast({
        title: 'Status update failed',
        description: error.message || 'Could not update schedule status',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scheduled_workflows')
        .delete()
        .eq('id', scheduleId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Schedule deleted',
        description: 'Workflow schedule has been removed',
      });

      await fetchScheduledWorkflows();
    } catch (error: any) {
      toast({
        title: 'Delete failed',
        description: error.message || 'Could not delete schedule',
        variant: 'destructive'
      });
    }
  };

  const getScheduleTypeLabel = (type: string) => {
    const labels = {
      once: '⏱️ One-time',
      daily: '📅 Daily',
      weekly: '📆 Weekly',
      monthly: '🗓️ Monthly'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      active: { variant: 'default' as const, label: 'Active', icon: <Play className="h-3 w-3" /> },
      paused: { variant: 'secondary' as const, label: 'Paused', icon: <Pause className="h-3 w-3" /> },
      completed: { variant: 'outline' as const, label: 'Completed', icon: <CheckCircle className="h-3 w-3" /> },
      cancelled: { variant: 'destructive' as const, label: 'Cancelled', icon: <AlertCircle className="h-3 w-3" /> }
    };
    const config = configs[status as keyof typeof configs] || configs.active;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Clock className="h-8 w-8 animate-pulse text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Feature not yet available - show Coming Soon state
  if (!featureAvailable) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Calendar className="h-6 w-6" />
              Workflow Scheduler
              <Badge variant="secondary" className="ml-2 text-xs">Coming Soon</Badge>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Schedule workflows to run automatically at specific times
            </p>
          </div>
        </div>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center py-12 space-y-4">
              <div className="relative inline-block">
                <Calendar className="h-16 w-16 mx-auto text-muted-foreground/50" />
                <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                  <Clock className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">Workflow Scheduling Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're building automated workflow scheduling to help you run AI workflows
                  on a schedule. This feature will allow you to:
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-6">
                <div className="p-4 rounded-lg bg-muted/50 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">One-time Schedules</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Run workflows at a specific date and time
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Repeat className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Recurring Tasks</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Daily, weekly, or monthly automation
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Auto Execution</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Hands-free workflow automation
                  </p>
                </div>
              </div>
              <div className="pt-4">
                <Badge variant="outline" className="text-xs">
                  🚀 In Development
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview of what's coming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              What to Expect
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                  1
                </div>
                <p>Define your workflow goal and select a schedule type</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                  2
                </div>
                <p>Set the date and time for execution</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                  3
                </div>
                <p>The system will automatically run your workflow and notify you of results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Workflow Scheduler
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule workflows to run automatically at specific times
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchScheduledWorkflows} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule a Workflow</DialogTitle>
                <DialogDescription>
                  Set up a workflow to run automatically at a specific time
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="goal">Workflow Goal</Label>
                  <Textarea
                    id="goal"
                    placeholder="Describe what you want to accomplish..."
                    value={newGoal}
                    onChange={(e) => setNewGoal(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule-type">Schedule Type</Label>
                  <Select value={scheduleType} onValueChange={(value: any) => setScheduleType(value)}>
                    <SelectTrigger id="schedule-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">⏱️ One-time</SelectItem>
                      <SelectItem value="daily">📅 Daily</SelectItem>
                      <SelectItem value="weekly">📆 Weekly</SelectItem>
                      <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">
                    {scheduleType === 'once' ? 'Scheduled Date & Time' : 'First Run Date & Time'}
                  </Label>
                  <Input
                    id="scheduled-time"
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                {scheduleType !== 'once' && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Repeat className="h-4 w-4 text-blue-500 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        This workflow will run {scheduleType} starting from the specified time
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateSchedule} disabled={!newGoal.trim() || !scheduledTime || isSaving}>
                  {isSaving ? 'Scheduling...' : 'Schedule Workflow'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scheduled Workflows List */}
      {scheduledWorkflows.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 space-y-3">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No scheduled workflows</h3>
                <p className="text-sm text-muted-foreground">
                  Create a schedule to run workflows automatically
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {scheduledWorkflows.map((schedule) => {
            const nextRun = new Date(schedule.next_run_at);
            const isPast = nextRun < new Date();

            return (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(schedule.status)}
                        <Badge variant="outline">
                          {getScheduleTypeLabel(schedule.schedule_type)}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{schedule.goal}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(schedule.id, schedule.status)}
                        disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                      >
                        {schedule.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div className={`flex items-center gap-2 ${isPast && schedule.status === 'active' ? 'text-orange-500' : ''}`}>
                      <Clock className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Next run</p>
                        <p className="text-xs text-muted-foreground">
                          {nextRun.toLocaleString()}
                          {!isPast && ` (${formatDistanceToNow(nextRun, { addSuffix: true })})`}
                          {isPast && ' (overdue)'}
                        </p>
                      </div>
                    </div>

                    {schedule.last_run_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <div>
                          <p className="font-medium">Last run</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(schedule.last_run_at), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <div>
                        <p className="font-medium">Created</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(schedule.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isPast && schedule.status === 'active' && (
                    <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                      <p className="text-sm text-orange-600 dark:text-orange-400">
                        ⚠️ This workflow is scheduled to run in the past. Update the schedule or pause it.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How Scheduling Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                1
              </div>
              <p>Create a schedule with your workflow goal and desired timing</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                2
              </div>
              <p>The system will automatically execute your workflow at the scheduled time</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex-shrink-0">
                3
              </div>
              <p>For recurring schedules, the workflow repeats based on your selected frequency</p>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs">
                <strong>Note:</strong> Scheduled workflows require a backend scheduler service to be running.
                Currently, schedules are stored but execution requires additional setup.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
