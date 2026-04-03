// MCP Router - Service Catalog Page
// Zapier-like interface for managing external API integrations

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Settings,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  GitBranch,
  Brain,
  MessageSquare,
  Database,
  BarChart,
  Box,
  RefreshCw,
  Power,
  Trash2,
  Loader2,
} from 'lucide-react';
import type {
  MCPServiceCatalog,
  UserMCPService,
  ServiceCategory,
  TestConnectionResult,
} from '@/types/mcp-router';
import { ServiceCatalogManager, UserServicesManager } from '@/lib/mcp-router';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';
import { ServiceConfigureModal } from '@/components/mcp-router/ServiceConfigureModal';

// Icon mapping for categories
const categoryIcons: Record<ServiceCategory, React.ReactNode> = {
  payment: <CreditCard className="h-5 w-5" />,
  devops: <GitBranch className="h-5 w-5" />,
  ai: <Brain className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
  storage: <Database className="h-5 w-5" />,
  analytics: <BarChart className="h-5 w-5" />,
  other: <Box className="h-5 w-5" />,
};

const categoryColors: Record<ServiceCategory, string> = {
  payment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  devops: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  communication: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  storage: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  analytics: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  other: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

const categoryLabels: Record<ServiceCategory, string> = {
  payment: 'Payment',
  devops: 'DevOps',
  ai: 'AI',
  communication: 'Communication',
  storage: 'Storage',
  analytics: 'Analytics',
  other: 'Other',
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
};

export function MCPServicesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [showBeta, setShowBeta] = useState(true);
  const [configureService, setConfigureService] = useState<MCPServiceCatalog | null>(null);
  const [catalogServices, setCatalogServices] = useState<MCPServiceCatalog[]>([]);
  const [userServices, setUserServices] = useState<UserMCPService[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeServiceKey, setActiveServiceKey] = useState<string | null>(null);
  const { user, isLoading: isAuthLoading } = useSupabaseAuth();
  const { toast } = useToast();

  const masterPassword = useMemo(
    () => (user ? `mcp-router:${user.id}` : 'mcp-router:anonymous'),
    [user]
  );
  const userServicesManager = useMemo(
    () => new UserServicesManager(masterPassword),
    [masterPassword]
  );

  const loadServices = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false;
      if (isAuthLoading) return;

      if (!user) {
        setCatalogServices([]);
        setUserServices([]);
        setLoadError('You must be signed in to manage MCP services.');
        setIsLoadingData(false);
        setIsRefreshing(false);
        return;
      }

      if (!silent) {
        setIsLoadingData(true);
      }
      setLoadError(null);

      try {
        const [catalog, configured] = await Promise.all([
          ServiceCatalogManager.getServices({ showBeta: true }),
          userServicesManager.getUserServices(),
        ]);
        setCatalogServices(catalog);
        setUserServices(configured);
      } catch (error: unknown) {
        const message = getErrorMessage(error, 'Failed to load MCP services.');
        setLoadError(message);
      } finally {
        setIsLoadingData(false);
        setIsRefreshing(false);
      }
    },
    [isAuthLoading, user, userServicesManager]
  );

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  const userServiceByKey = useMemo(() => {
    const byKey = new Map<string, UserMCPService>();
    for (const service of userServices) {
      const existing = byKey.get(service.service_key);
      if (!existing || service.environment === 'production') {
        byKey.set(service.service_key, service);
      }
    }
    return byKey;
  }, [userServices]);

  // Get configured service keys
  const configuredServiceKeys = useMemo(
    () => new Set(Array.from(userServiceByKey.keys())),
    [userServiceByKey]
  );

  // Filter services
  const filteredServices = catalogServices.filter(service => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      if (
        !service.display_name.toLowerCase().includes(search) &&
        !service.description?.toLowerCase().includes(search) &&
        !service.service_key.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    if (selectedCategory !== 'all' && service.category !== selectedCategory) {
      return false;
    }

    if (!showBeta && service.is_beta) {
      return false;
    }

    return true;
  });

  const configuredServices = useMemo(
    () => Array.from(userServiceByKey.values()),
    [userServiceByKey]
  );

  // Get stats
  const stats = {
    total: catalogServices.length,
    configured: configuredServices.length,
    enabled: configuredServices.filter(s => s.is_enabled).length,
    healthy: configuredServices.filter(s => s.health_status === 'healthy').length,
  };

  const getUserService = (serviceKey: string) => userServiceByKey.get(serviceKey);

  const formatLastUsed = (date?: string) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadServices({ silent: true });
  };

  const handleToggle = async (serviceKey: string, enabled: boolean) => {
    setActiveServiceKey(serviceKey);
    try {
      const updated = await userServicesManager.toggleService(serviceKey, enabled);
      setUserServices(prev =>
        prev.map(service => (service.id === updated.id ? updated : service))
      );
    } catch (error: unknown) {
      toast({
        title: 'Update failed',
        description: getErrorMessage(error, 'Failed to update service state.'),
        variant: 'destructive',
      });
    } finally {
      setActiveServiceKey(null);
    }
  };

  const handleDelete = async (serviceKey: string) => {
    if (!window.confirm('Are you sure you want to remove this service configuration?')) {
      return;
    }

    setActiveServiceKey(serviceKey);
    try {
      await userServicesManager.deleteService(serviceKey);
      setUserServices(prev =>
        prev.filter(
          service =>
            !(service.service_key === serviceKey && service.environment === 'production')
        )
      );
      toast({
        title: 'Configuration removed',
        description: `${serviceKey} has been removed from your configured services.`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Delete failed',
        description: getErrorMessage(error, 'Failed to delete service configuration.'),
        variant: 'destructive',
      });
    } finally {
      setActiveServiceKey(null);
    }
  };

  const handleTestConnection = async (
    serviceKey: string,
    credentials?: Record<string, string>
  ): Promise<TestConnectionResult> => {
    setActiveServiceKey(serviceKey);
    try {
      const result = await userServicesManager.testConnection(serviceKey, credentials);
      if (!credentials) {
        await loadServices({ silent: true });
      }
      return result;
    } catch (error: unknown) {
      return {
        success: false,
        message: getErrorMessage(error, 'Connection test failed.'),
      };
    } finally {
      setActiveServiceKey(null);
    }
  };

  const handleSaveConfiguration = async (
    serviceKey: string,
    credentials: Record<string, string>
  ) => {
    setActiveServiceKey(serviceKey);
    try {
      await userServicesManager.configureService({
        service_key: serviceKey,
        credentials,
        environment: 'production',
        is_enabled: true,
      });
      await loadServices({ silent: true });
      setConfigureService(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to save service configuration.');
      toast({
        title: 'Save failed',
        description: message,
        variant: 'destructive',
      });
      throw new Error(message);
    } finally {
      setActiveServiceKey(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MCP Services</h1>
          <p className="text-muted-foreground mt-1">
            Configure external API services for your LanOnasis integration
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.open('/docs/mcp-router', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoadingData || isRefreshing}>
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Services</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Box className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Configured</p>
                <p className="text-3xl font-bold text-purple-600">{stats.configured}</p>
              </div>
              <Settings className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Enabled</p>
                <p className="text-3xl font-bold text-green-600">{stats.enabled}</p>
              </div>
              <Power className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Healthy</p>
                <p className="text-3xl font-bold text-emerald-600">{stats.healthy}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ServiceCategory | 'all')}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="payment">Payment</option>
                <option value="devops">DevOps</option>
                <option value="ai">AI</option>
                <option value="communication">Communication</option>
                <option value="storage">Storage</option>
                <option value="analytics">Analytics</option>
                <option value="other">Other</option>
              </select>

              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showBeta}
                  onChange={(e) => setShowBeta(e.target.checked)}
                  className="rounded border-input"
                />
                <span className="text-foreground">Show Beta</span>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoadingData && (
        <Card>
          <CardContent className="p-12 text-center">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-medium text-foreground mb-1">Loading services</h3>
            <p className="text-muted-foreground">
              Fetching your MCP service catalog and configured integrations.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && loadError && (
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">Unable to load services</h3>
            <p className="text-muted-foreground mb-6">{loadError}</p>
            <Button onClick={() => void loadServices()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && catalogServices.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No services available</h3>
            <p className="text-muted-foreground">
              The service catalog is currently empty. Check back later or contact support.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoadingData && !loadError && catalogServices.length > 0 && (
        <>
          {/* Service Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredServices.map((service) => {
              const userService = getUserService(service.service_key);
              const isConfigured = configuredServiceKeys.has(service.service_key);
              const isEnabled = userService?.is_enabled ?? false;
              const isBusy = activeServiceKey === service.service_key;

              return (
                <Card key={service.id} className={`relative overflow-hidden ${isConfigured ? 'ring-2 ring-blue-500' : ''}`}>
                  {service.is_beta && (
                    <div className="absolute top-3 right-3">
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                        Beta
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="pb-3">
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-lg ${categoryColors[service.category].split(' ')[0]}`}>
                        {categoryIcons[service.category]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg">{service.display_name}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {categoryLabels[service.category]}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {service.description}
                    </p>

                    {isConfigured && (
                      <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Status</span>
                          <div className="flex items-center space-x-1">
                            {userService?.health_status === 'healthy' && (
                              <>
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-green-600">Healthy</span>
                              </>
                            )}
                            {userService?.health_status === 'degraded' && (
                              <>
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                                <span className="text-amber-600">Degraded</span>
                              </>
                            )}
                            {userService?.health_status === 'unhealthy' && (
                              <>
                                <XCircle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600">Unhealthy</span>
                              </>
                            )}
                            {userService?.health_status === 'unknown' && (
                              <>
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                                <span className="text-yellow-600">Unknown</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Total Calls</span>
                          <span className="font-medium text-foreground">
                            {userService?.total_calls.toLocaleString() || '0'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Used</span>
                          <span className="font-medium text-foreground">{formatLastUsed(userService?.last_used_at)}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      {isConfigured ? (
                        <>
                          <Button
                            variant={isEnabled ? "default" : "outline"}
                            size="sm"
                            className="flex-1"
                            disabled={isBusy}
                            onClick={() => void handleToggle(service.service_key, !isEnabled)}
                          >
                            {isBusy ? (
                              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            ) : (
                              <Power className="h-4 w-4 mr-1" />
                            )}
                            {isEnabled ? 'Enabled' : 'Disabled'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => setConfigureService(service)}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isBusy}
                            onClick={() => {
                              void (async () => {
                                const result = await handleTestConnection(service.service_key);
                                if (result.success) {
                                  toast({
                                    title: 'Connection successful',
                                    description: result.message,
                                  });
                                  return;
                                }
                                toast({
                                  title: 'Connection failed',
                                  description: result.message,
                                  variant: 'destructive',
                                });
                              })();
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            disabled={isBusy}
                            onClick={() => void handleDelete(service.service_key)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => setConfigureService(service)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Configure
                        </Button>
                      )}
                    </div>

                    {service.documentation_url && (
                      <a
                        href={service.documentation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 flex items-center justify-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Documentation
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredServices.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Box className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">No services found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Configure Modal */}
      {configureService && (
        <ServiceConfigureModal
          service={configureService}
          existingConfig={getUserService(configureService.service_key)}
          onClose={() => setConfigureService(null)}
          onSave={handleSaveConfiguration}
          onTest={handleTestConnection}
        />
      )}
    </div>
  );
}

export default MCPServicesPage;
