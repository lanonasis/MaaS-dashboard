// MCP Router - Usage Analytics Dashboard
// View usage statistics and logs for MCP Router calls

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Activity,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import type { MCPUsageLog, UsageLogStatus } from '@/types/mcp-router';

type DateRange = '7d' | '30d' | '90d';

type DailyUsagePoint = {
  date: string;
  fullDate: string;
  total: number;
  success: number;
  failed: number;
  avgResponseTime: number;
};

type ServiceBreakdownItem = {
  name: string;
  serviceKey: string;
  calls: number;
  color: string;
};

type TopAction = {
  service: string;
  action: string;
  count: number;
};

const RANGE_TO_DAYS: Record<DateRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const PIE_COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6B7280'];

const asNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const normalizeStatus = (row: Record<string, any>): UsageLogStatus => {
  const rawStatus = typeof row.status === 'string' ? row.status : undefined;
  if (
    rawStatus === 'pending' ||
    rawStatus === 'success' ||
    rawStatus === 'error' ||
    rawStatus === 'rate_limited' ||
    rawStatus === 'unauthorized'
  ) {
    return rawStatus;
  }

  const statusCode = asNumber(row.response_status ?? row.status_code);

  if (row.success === true) return 'success';
  if (row.success === false) return 'error';
  if (statusCode === 401 || statusCode === 403) return 'unauthorized';
  if (statusCode === 429) return 'rate_limited';
  if (typeof statusCode === 'number' && statusCode >= 400) return 'error';

  return 'success';
};

const mapRowToUsageLog = (row: Record<string, any>): MCPUsageLog => {
  const status = normalizeStatus(row);
  const estimatedCost = asNumber(row.estimated_cost) ?? 0;

  return {
    id: String(row.id ?? `${row.request_id ?? 'req'}_${row.timestamp ?? row.created_at ?? Date.now()}`),
    request_id: String(row.request_id ?? row.id ?? `req_${Date.now()}`),
    user_id: String(row.user_id ?? ''),
    api_key_id: row.api_key_id ? String(row.api_key_id) : undefined,
    service_key: String(row.service_key ?? row.service ?? 'unknown'),
    action: String(row.action ?? row.operation ?? 'unknown'),
    method: String(row.method ?? row.http_method ?? 'POST'),
    response_status: asNumber(row.response_status ?? row.status_code),
    response_time_ms: asNumber(row.response_time_ms ?? row.response_time),
    mcp_spawn_time_ms: asNumber(row.mcp_spawn_time_ms),
    external_api_time_ms: asNumber(row.external_api_time_ms),
    client_ip: row.client_ip ? String(row.client_ip) : row.ip_address ? String(row.ip_address) : undefined,
    error_message: row.error_message ? String(row.error_message) : undefined,
    error_code: row.error_code ? String(row.error_code) : undefined,
    status,
    billable: typeof row.billable === 'boolean' ? row.billable : estimatedCost > 0,
    billing_amount_cents: asNumber(row.billing_amount_cents) ?? Math.round(estimatedCost * 100),
    timestamp: String(row.timestamp ?? row.created_at ?? new Date().toISOString()),
  };
};

const calculatePercentChange = (current: number, previous: number): number | null => {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
};

const formatChange = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;

const displayServiceName = (serviceKey: string) =>
  serviceKey
    .split(/[-_]/g)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  return date.toLocaleDateString();
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'rate_limited':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'unauthorized':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    case 'rate_limited':
      return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const renderDelta = (
  value: number | null,
  options?: { lowerIsBetter?: boolean; unavailableLabel?: string }
) => {
  if (value === null) {
    return <span className="text-muted-foreground">{options?.unavailableLabel || 'Not available yet'}</span>;
  }

  const lowerIsBetter = options?.lowerIsBetter ?? false;
  const isPositive = value >= 0;
  const isGood = lowerIsBetter ? value <= 0 : isPositive;

  return (
    <>
      {isPositive ? (
        <ArrowUpRight className={`h-4 w-4 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
      ) : (
        <ArrowDownRight className={`h-4 w-4 ${isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} />
      )}
      <span className={isGood ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {formatChange(value)}
      </span>
      <span className="text-muted-foreground ml-1">vs previous period</span>
    </>
  );
};

export function MCPUsagePage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allLogs, setAllLogs] = useState<MCPUsageLog[]>([]);
  const [backendUnavailable, setBackendUnavailable] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);

  const fetchUsageData = useCallback(async () => {
    const days = RANGE_TO_DAYS[dateRange];
    const now = new Date();
    const startPreviousPeriod = new Date(now);
    startPreviousPeriod.setDate(startPreviousPeriod.getDate() - (days * 2));

    setLoading(true);

    try {
      const usageResult = await (supabase as any)
        .from('mcp_usage_logs')
        .select('*')
        .gte('timestamp', startPreviousPeriod.toISOString())
        .order('timestamp', { ascending: false })
        .limit(5000);

      let rawRows = usageResult.data;
      let fetchError = usageResult.error;

      if (fetchError) {
        const fallbackResult = await (supabase as any)
          .from('mcp_request_logs')
          .select('*')
          .gte('created_at', startPreviousPeriod.toISOString())
          .order('created_at', { ascending: false })
          .limit(5000);

        rawRows = fallbackResult.data;
        fetchError = fallbackResult.error;
      }

      if (fetchError) {
        throw fetchError;
      }

      const mappedLogs = (rawRows || []).map(row => mapRowToUsageLog(row as Record<string, any>));
      setAllLogs(mappedLogs);
      setBackendUnavailable(false);
      setBackendError(null);
    } catch (error: any) {
      setAllLogs([]);
      setBackendUnavailable(true);
      setBackendError(error?.message || 'MCP usage backend is not available for this environment yet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    void fetchUsageData();
  }, [fetchUsageData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchUsageData();
  };

  const {
    currentPeriodLogs,
    previousPeriodLogs,
    totalCalls,
    failedCalls,
    avgResponseTime,
    successRate,
    callsChange,
    successRateChange,
    responseTimeChange,
    dailyData,
    serviceBreakdown,
    topActions,
    availableServices,
  } = useMemo(() => {
    const days = RANGE_TO_DAYS[dateRange];
    const nowTs = Date.now();
    const currentStartTs = nowTs - (days * 24 * 60 * 60 * 1000);
    const previousStartTs = nowTs - (days * 2 * 24 * 60 * 60 * 1000);

    const current: MCPUsageLog[] = [];
    const previous: MCPUsageLog[] = [];

    for (const log of allLogs) {
      const ts = new Date(log.timestamp).getTime();
      if (Number.isNaN(ts)) continue;
      if (ts >= currentStartTs) {
        current.push(log);
      } else if (ts >= previousStartTs) {
        previous.push(log);
      }
    }

    const currentTotal = current.length;
    const currentSuccess = current.filter(log => log.status === 'success').length;
    const currentFailed = currentTotal - currentSuccess;

    const currentResponseTimes = current
      .map(log => log.response_time_ms)
      .filter((value): value is number => typeof value === 'number');

    const currentAvgResponse = currentResponseTimes.length > 0
      ? Math.round(currentResponseTimes.reduce((sum, value) => sum + value, 0) / currentResponseTimes.length)
      : 0;

    const previousTotal = previous.length;
    const previousSuccess = previous.filter(log => log.status === 'success').length;
    const previousResponseTimes = previous
      .map(log => log.response_time_ms)
      .filter((value): value is number => typeof value === 'number');

    const previousAvgResponse = previousResponseTimes.length > 0
      ? Math.round(previousResponseTimes.reduce((sum, value) => sum + value, 0) / previousResponseTimes.length)
      : 0;

    const currentSuccessRate = currentTotal > 0 ? (currentSuccess / currentTotal) * 100 : 0;
    const previousSuccessRate = previousTotal > 0 ? (previousSuccess / previousTotal) * 100 : 0;

    const dayMap = new Map<string, { total: number; success: number; failed: number; responseTimeSum: number; responseTimeCount: number }>();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, { total: 0, success: 0, failed: 0, responseTimeSum: 0, responseTimeCount: 0 });
    }

    for (const log of current) {
      const dayKey = new Date(log.timestamp).toISOString().slice(0, 10);
      const dayStats = dayMap.get(dayKey);
      if (!dayStats) continue;

      dayStats.total += 1;
      if (log.status === 'success') {
        dayStats.success += 1;
      } else {
        dayStats.failed += 1;
      }

      if (typeof log.response_time_ms === 'number') {
        dayStats.responseTimeSum += log.response_time_ms;
        dayStats.responseTimeCount += 1;
      }
    }

    const usageByDay: DailyUsagePoint[] = Array.from(dayMap.entries()).map(([isoDay, stats]) => ({
      date: new Date(`${isoDay}T00:00:00.000Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      fullDate: isoDay,
      total: stats.total,
      success: stats.success,
      failed: stats.failed,
      avgResponseTime: stats.responseTimeCount > 0
        ? Math.round(stats.responseTimeSum / stats.responseTimeCount)
        : 0,
    }));

    const serviceCounts = new Map<string, number>();
    for (const log of current) {
      serviceCounts.set(log.service_key, (serviceCounts.get(log.service_key) || 0) + 1);
    }

    const usageByService: ServiceBreakdownItem[] = Array.from(serviceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([serviceKey, calls], index) => ({
        name: displayServiceName(serviceKey),
        serviceKey,
        calls,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }));

    const actionCounts = new Map<string, TopAction>();
    for (const log of current) {
      const key = `${log.service_key}::${log.action}`;
      const existing = actionCounts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        actionCounts.set(key, { service: log.service_key, action: log.action, count: 1 });
      }
    }

    const topActionList = Array.from(actionCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const serviceOptions = Array.from(serviceCounts.keys()).sort();

    return {
      currentPeriodLogs: current,
      previousPeriodLogs: previous,
      totalCalls: currentTotal,
      failedCalls: currentFailed,
      avgResponseTime: currentAvgResponse,
      successRate: currentSuccessRate,
      callsChange: calculatePercentChange(currentTotal, previousTotal),
      successRateChange: previousTotal > 0 ? currentSuccessRate - previousSuccessRate : null,
      responseTimeChange: calculatePercentChange(currentAvgResponse, previousAvgResponse),
      dailyData: usageByDay,
      serviceBreakdown: usageByService,
      topActions: topActionList,
      availableServices: serviceOptions,
    };
  }, [allLogs, dateRange]);

  const filteredLogs = useMemo(() => {
    if (selectedService === 'all') return currentPeriodLogs;
    return currentPeriodLogs.filter(log => log.service_key === selectedService);
  }, [currentPeriodLogs, selectedService]);

  const recentLogs = filteredLogs.slice(0, 5);
  const tableLogs = filteredLogs.slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MCP Usage Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your API usage, performance metrics, and request logs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <Button variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export (Not Available Yet)
          </Button>
        </div>
      </div>

      {backendUnavailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Usage backend not available yet</AlertTitle>
          <AlertDescription>
            MCP usage analytics could not be loaded from `mcp_usage_logs` or fallback `mcp_request_logs`.
            {backendError ? ` Error: ${backendError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalCalls.toLocaleString()}</p>
                <div className="flex items-center mt-1 text-sm">
                  {renderDelta(callsChange)}
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {successRate.toFixed(1)}%
                </p>
                <div className="flex items-center mt-1 text-sm">
                  {renderDelta(successRateChange, { unavailableLabel: previousPeriodLogs.length === 0 ? 'Need previous period data' : 'Not available yet' })}
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{avgResponseTime}ms</p>
                <div className="flex items-center mt-1 text-sm">
                  {renderDelta(responseTimeChange, { lowerIsBetter: true, unavailableLabel: previousPeriodLogs.length === 0 ? 'Need previous period data' : 'Not available yet' })}
                </div>
              </div>
              <Clock className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed Calls</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">{failedCalls.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {totalCalls > 0 ? ((failedCalls / totalCalls) * 100).toFixed(1) : '0.0'}% error rate
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>API Calls Over Time</span>
              <div className="flex items-center space-x-4 text-sm font-normal">
                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />Total</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-green-500 mr-2" />Success</div>
                <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-red-500 mr-2" />Failed</div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading usage data...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} tick={{ fill: 'currentColor' }} />
                    <YAxis className="text-muted-foreground" fontSize={12} tick={{ fill: 'currentColor' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                    <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="#93C5FD" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="success" stroke="#10B981" fill="#6EE7B7" fillOpacity={0.4} />
                    <Area type="monotone" dataKey="failed" stroke="#EF4444" fill="#FCA5A5" fillOpacity={0.4} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calls by Service</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {loading ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading service breakdown...</div>
              ) : serviceBreakdown.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No service usage in this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie
                      data={serviceBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="calls"
                    >
                      {serviceBreakdown.map((entry) => (
                        <Cell key={entry.serviceKey} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {serviceBreakdown.map((service) => (
                <div key={service.serviceKey} className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: service.color }} />
                    <span className="text-foreground">{service.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{service.calls.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Average Response Time (ms)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            {loading ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading performance data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-muted-foreground" fontSize={12} tick={{ fill: 'currentColor' }} />
                  <YAxis className="text-muted-foreground" fontSize={12} tick={{ fill: 'currentColor' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Line type="monotone" dataKey="avgResponseTime" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              Top Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topActions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No action data in this period.</p>
            ) : (
              <div className="space-y-4">
                {topActions.map((item) => {
                  const maxCount = topActions[0].count || 1;
                  const width = (item.count / maxCount) * 100;

                  return (
                    <div key={`${item.service}-${item.action}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{item.service}</Badge>
                          <span className="text-sm font-medium text-foreground">{item.action}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{item.count.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent requests found for this period.</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(log.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{log.service_key}</Badge>
                          <span className="text-sm font-medium text-foreground">{log.action}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(log.timestamp)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(log.status)}>
                        {log.response_status || log.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.response_time_ms ?? 'n/a'}ms</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Request Logs</CardTitle>
            <div className="flex items-center space-x-3">
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="px-3 py-2 border border-input bg-background text-foreground rounded-md text-sm"
              >
                <option value="all">All Services</option>
                {availableServices.map((serviceKey) => (
                  <option key={serviceKey} value={serviceKey}>{displayServiceName(serviceKey)}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" disabled>
                <Filter className="h-4 w-4 mr-2" />
                Filters (Not Available Yet)
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Status</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Request ID</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Service</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Response</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Time</th>
                  <th className="text-left py-3 px-2 font-medium text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {tableLogs.map((log) => (
                  <tr key={log.id} className="border-b border-border hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                    </td>
                    <td className="py-3 px-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{log.request_id}</code>
                    </td>
                    <td className="py-3 px-2 capitalize text-foreground">{log.service_key}</td>
                    <td className="py-3 px-2 text-foreground">{log.action}</td>
                    <td className="py-3 px-2">
                      {log.response_status ? (
                        <span className={log.response_status >= 400 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                          {log.response_status}
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{log.error_code || 'error'}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-foreground">{log.response_time_ms ?? 'n/a'}ms</td>
                    <td className="py-3 px-2 text-muted-foreground">{formatTimestamp(log.timestamp)}</td>
                  </tr>
                ))}
                {!loading && tableLogs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No request logs found for this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing {tableLogs.length} of {filteredLogs.length} results
            </p>
            {filteredLogs.length > tableLogs.length && (
              <p className="text-sm text-muted-foreground">Pagination is not available yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MCPUsagePage;
