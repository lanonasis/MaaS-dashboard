// MCP Router - API Keys Management Page
// Manage API keys with service scoping

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Plus,
  Key,
  Copy,
  Trash2,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { APIKeyManager } from '@/lib/mcp-router/api-keys';
import { UserServicesManager } from '@/lib/mcp-router/user-services';
import type { APIKey, ScopeType, CreateAPIKeyRequest, ServiceEnvironment } from '@/types/mcp-router';

type ConfiguredServiceOption = {
  service_key: string;
  display_name: string;
  is_enabled: boolean;
};

const MASTER_PASSWORD_STORAGE_KEY = 'dashboard.mcp_router.master_password';

const getMCPRouterMasterPassword = (): string => {
  const envPassword =
    import.meta.env.VITE_MCP_ROUTER_MASTER_PASSWORD ||
    import.meta.env.VITE_API_KEY_ENCRYPTION_KEY;

  if (typeof envPassword === 'string' && envPassword.trim().length > 0) {
    return envPassword;
  }

  if (typeof window === 'undefined') {
    return 'dashboard-local-master-password';
  }

  const existing = window.localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `dashboard-local-${crypto.randomUUID()}`
    : `dashboard-local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, generated);
  return generated;
};

const formatDate = (date?: string) => {
  if (!date) return 'Never';
  return new Date(date).toLocaleString();
};

const formatRelativeTime = (date?: string) => {
  if (!date) return 'Never';
  const now = Date.now();
  const d = new Date(date);
  const diff = now - d.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} mins ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
  return d.toLocaleDateString();
};

export function APIKeysPage() {
  const [apiKeys, setAPIKeys] = useState<APIKey[]>([]);
  const [configuredServices, setConfiguredServices] = useState<ConfiguredServiceOption[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingServices, setLoadingServices] = useState(true);
  const [keysUnavailable, setKeysUnavailable] = useState(false);
  const [servicesUnavailable, setServicesUnavailable] = useState(false);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<APIKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ key: APIKey; fullKey: string } | null>(null);

  const masterPassword = useMemo(() => getMCPRouterMasterPassword(), []);
  const apiKeyManager = useMemo(() => new APIKeyManager(masterPassword), [masterPassword]);
  const userServicesManager = useMemo(() => new UserServicesManager(masterPassword), [masterPassword]);

  const loadAPIKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const keys = await apiKeyManager.getAPIKeys();
      setAPIKeys(keys);
      setKeysUnavailable(false);
      setKeysError(null);
    } catch (error: any) {
      setAPIKeys([]);
      setKeysUnavailable(true);
      setKeysError(error?.message || 'API keys backend is not ready in this environment yet.');
    } finally {
      setLoadingKeys(false);
    }
  }, [apiKeyManager]);

  const loadConfiguredServices = useCallback(async () => {
    setLoadingServices(true);
    try {
      const services = await userServicesManager.getEnabledServices();
      setConfiguredServices(
        services.map(service => ({
          service_key: service.service_key,
          display_name: service.service?.display_name || service.service_key,
          is_enabled: service.is_enabled,
        }))
      );
      setServicesUnavailable(false);
      setServicesError(null);
    } catch (error: any) {
      setConfiguredServices([]);
      setServicesUnavailable(true);
      setServicesError(error?.message || 'Configured services backend is not ready in this environment yet.');
    } finally {
      setLoadingServices(false);
    }
  }, [userServicesManager]);

  const refreshPageData = useCallback(async () => {
    await Promise.all([loadAPIKeys(), loadConfiguredServices()]);
  }, [loadAPIKeys, loadConfiguredServices]);

  useEffect(() => {
    void refreshPageData();
  }, [refreshPageData]);

  const stats = useMemo(() => ({
    total: apiKeys.length,
    active: apiKeys.filter(k => k.is_active).length,
    revoked: apiKeys.filter(k => !k.is_active).length,
    expiringSoon: apiKeys.filter(k => {
      if (!k.expires_at) return false;
      const expiresIn = new Date(k.expires_at).getTime() - Date.now();
      return expiresIn > 0 && expiresIn < 7 * 24 * 60 * 60 * 1000;
    }).length,
  }), [apiKeys]);

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCreateKey = async (request: CreateAPIKeyRequest) => {
    const created = await apiKeyManager.createAPIKey(request);

    setAPIKeys(prev => [created.api_key, ...prev]);
    setNewlyCreatedKey({ key: created.api_key, fullKey: created.full_key });

    return {
      key: created.api_key,
      fullKey: created.full_key,
    };
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await apiKeyManager.revokeAPIKey(keyId, 'Manually revoked from dashboard');
      await loadAPIKeys();
    } catch (error: any) {
      alert(error?.message || 'Failed to revoke API key');
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to permanently delete this API key?')) {
      return;
    }

    try {
      await apiKeyManager.deleteAPIKey(keyId);
      setAPIKeys(prev => prev.filter(k => k.id !== keyId));
    } catch (error: any) {
      alert(error?.message || 'Failed to delete API key');
    }
  };

  const handleReactivateKey = async (keyId: string) => {
    try {
      const reactivated = await apiKeyManager.reactivateAPIKey(keyId);
      setAPIKeys(prev => prev.map(k => (k.id === reactivated.id ? reactivated : k)));
    } catch (error: any) {
      alert(error?.message || 'Failed to reactivate API key');
    }
  };

  const handleSaveKey = async (
    keyId: string,
    updates: {
      name?: string;
      description?: string;
      rate_limit_per_minute?: number;
      rate_limit_per_day?: number;
    }
  ) => {
    const updated = await apiKeyManager.updateAPIKey(keyId, updates);
    setAPIKeys(prev => prev.map(k => (k.id === updated.id ? updated : k)));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">MCP Router Keys</h1>
          <p className="text-muted-foreground mt-1">
            Scoped API keys for accessing MCP Router services and external integrations
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => window.open('/docs/api-keys', '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
          <Button variant="outline" onClick={() => void refreshPageData()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} disabled={keysUnavailable}>
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {keysUnavailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>API keys backend not available yet</AlertTitle>
          <AlertDescription>
            MCP Router API keys could not be loaded from `api_keys` / `api_key_scopes`.
            {keysError ? ` Error: ${keysError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      {servicesUnavailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configured services unavailable</AlertTitle>
          <AlertDescription>
            Service-specific scoping is temporarily unavailable because configured services could not be loaded.
            {servicesError ? ` Error: ${servicesError}` : ''}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Keys</p>
                <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Revoked</p>
                <p className="text-3xl font-bold text-red-600">{stats.revoked}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.expiringSoon}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {newlyCreatedKey && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100">API Key Created Successfully</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Make sure to copy your API key now. You will not be able to see it again.
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <code className="px-3 py-2 bg-white dark:bg-green-900 rounded border text-sm font-mono">
                      {newlyCreatedKey.fullKey}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(newlyCreatedKey.fullKey, 'new')}
                    >
                      {copiedKeyId === 'new' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setNewlyCreatedKey(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Router Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingKeys ? (
            <div className="py-10 text-center text-muted-foreground">Loading API keys...</div>
          ) : keysUnavailable ? (
            <div className="py-10 text-center text-muted-foreground">
              API key management is not available yet for this environment.
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 border rounded-lg ${
                    key.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-foreground">{key.name}</h3>
                        {key.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            Revoked
                          </Badge>
                        )}
                        {key.scope_type === 'all' ? (
                          <Badge variant="outline">All Services</Badge>
                        ) : (
                          <Badge variant="outline">
                            {key.scopes?.length || 0} Service{(key.scopes?.length || 0) !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>

                      {key.description && (
                        <p className="text-sm text-muted-foreground mt-1">{key.description}</p>
                      )}

                      <div className="mt-3 flex items-center space-x-2">
                        <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                          {key.key_prefix}...
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(key.key_prefix, key.id)}
                        >
                          {copiedKeyId === key.id ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {key.scope_type === 'specific' && key.scopes && key.scopes.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {key.scopes.map((scope) => (
                            <Badge key={scope.id} variant="secondary" className="text-xs">
                              {scope.service?.display_name || scope.service_key}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Environments:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(key.allowed_environments || []).map((env) => (
                              <Badge key={env} variant="outline" className="text-xs">
                                {env}
                              </Badge>
                            ))}
                            {(!key.allowed_environments || key.allowed_environments.length === 0) && (
                              <span className="text-muted-foreground">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Rate Limit:</span>
                          <p className="font-medium text-foreground">
                            {key.rate_limit_per_minute}/min, {key.rate_limit_per_day.toLocaleString()}/day
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Last Used:</span>
                          <p className="font-medium text-foreground">{formatRelativeTime(key.last_used_at)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <p className="font-medium text-foreground">{formatRelativeTime(key.created_at)}</p>
                        </div>
                      </div>

                      {!key.is_active && key.revoked_at && (
                        <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 rounded text-sm text-red-800 dark:text-red-200">
                          <strong>Revoked:</strong> {formatDate(key.revoked_at)}
                          {key.revoked_reason && <span> - {key.revoked_reason}</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => setSelectedKey(key)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                      {key.is_active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => void handleRevokeKey(key.id)}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                            onClick={() => void handleReactivateKey(key.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => void handleDeleteKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {apiKeys.length === 0 && (
                <div className="text-center py-12">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No API keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first API key to start using the MCP Router
                  </p>
                  <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateModal && (
        <CreateAPIKeyModal
          configuredServices={configuredServices}
          servicesUnavailable={servicesUnavailable || loadingServices}
          onClose={() => setShowCreateModal(false)}
          onCreate={async (request) => {
            const created = await handleCreateKey(request);
            setShowCreateModal(false);
            return created;
          }}
        />
      )}

      {selectedKey && (
        <EditAPIKeyModal
          apiKey={selectedKey}
          onClose={() => setSelectedKey(null)}
          onSave={async (updates) => {
            await handleSaveKey(selectedKey.id, updates);
            setSelectedKey(null);
          }}
        />
      )}
    </div>
  );
}

function CreateAPIKeyModal({
  configuredServices,
  servicesUnavailable,
  onClose,
  onCreate,
}: {
  configuredServices: ConfiguredServiceOption[];
  servicesUnavailable: boolean;
  onClose: () => void;
  onCreate: (request: CreateAPIKeyRequest) => Promise<{ key: APIKey; fullKey: string }>;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scopeType, setScopeType] = useState<ScopeType>('all');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [environments, setEnvironments] = useState<Set<ServiceEnvironment>>(new Set(['production']));
  const [rateLimitMinute, setRateLimitMinute] = useState(60);
  const [rateLimitDay, setRateLimitDay] = useState(10000);
  const [isCreating, setIsCreating] = useState(false);

  const enabledServices = configuredServices.filter(s => s.is_enabled);
  const canUseSpecificScope = !servicesUnavailable && enabledServices.length > 0;

  useEffect(() => {
    if (!canUseSpecificScope && scopeType === 'specific') {
      setScopeType('all');
      setSelectedServices(new Set());
    }
  }, [canUseSpecificScope, scopeType]);

  const toggleService = (serviceKey: string) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      if (next.has(serviceKey)) {
        next.delete(serviceKey);
      } else {
        next.add(serviceKey);
      }
      return next;
    });
  };

  const toggleEnvironment = (env: ServiceEnvironment) => {
    setEnvironments(prev => {
      const next = new Set(prev);
      if (next.has(env)) {
        next.delete(env);
      } else {
        next.add(env);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      alert('Please enter a name for the API key');
      return;
    }

    if (scopeType === 'specific' && selectedServices.size === 0) {
      alert('Please select at least one service');
      return;
    }

    if (environments.size === 0) {
      alert('Please select at least one environment');
      return;
    }

    setIsCreating(true);

    try {
      await onCreate({
        name: name.trim(),
        description: description.trim() || undefined,
        scope_type: scopeType,
        service_keys: scopeType === 'specific' ? Array.from(selectedServices) : undefined,
        allowed_environments: Array.from(environments),
        rate_limit_per_minute: rateLimitMinute,
        rate_limit_per_day: rateLimitDay,
      });
    } catch (error: any) {
      alert(error?.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Create API Key</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto max-h-[60vh] space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Production App Key" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Service Access</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  checked={scopeType === 'all'}
                  onChange={() => setScopeType('all')}
                  className="h-4 w-4"
                />
                <div>
                  <span className="font-medium text-foreground">All Enabled Services</span>
                  <p className="text-sm text-muted-foreground">Access all services you configured</p>
                </div>
              </label>
              <label className={`flex items-center space-x-3 p-3 border border-border rounded-lg ${canUseSpecificScope ? 'cursor-pointer hover:bg-muted/50' : 'opacity-60 cursor-not-allowed'}`}>
                <input
                  type="radio"
                  checked={scopeType === 'specific'}
                  onChange={() => canUseSpecificScope && setScopeType('specific')}
                  className="h-4 w-4"
                  disabled={!canUseSpecificScope}
                />
                <div>
                  <span className="font-medium text-foreground">Specific Services</span>
                  <p className="text-sm text-muted-foreground">Choose exactly which services this key can access</p>
                </div>
              </label>
            </div>
          </div>

          {scopeType === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Services</label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                {enabledServices.map((service) => (
                  <label key={service.service_key} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                    <input
                      type="checkbox"
                      checked={selectedServices.has(service.service_key)}
                      onChange={() => toggleService(service.service_key)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-foreground">{service.display_name}</span>
                  </label>
                ))}
                {servicesUnavailable && (
                  <p className="text-sm text-muted-foreground p-2">
                    Service scope data is not available yet. Use "All Enabled Services" for now.
                  </p>
                )}
                {!servicesUnavailable && enabledServices.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2">
                    No enabled services configured. Go to MCP Services to set them up.
                  </p>
                )}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Allowed Environments</label>
            <div className="flex flex-wrap gap-2">
              {(['production', 'staging', 'development'] as ServiceEnvironment[]).map((env) => (
                <label
                  key={env}
                  className={`flex items-center space-x-2 px-3 py-2 border rounded-lg cursor-pointer ${
                    environments.has(env)
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={environments.has(env)}
                    onChange={() => toggleEnvironment(env)}
                    className="h-4 w-4 rounded"
                  />
                  <span className="capitalize text-foreground">{env}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rate Limit (per minute)</label>
              <Input
                type="number"
                value={rateLimitMinute}
                onChange={(e) => setRateLimitMinute(Number(e.target.value))}
                min={1}
                max={1000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rate Limit (per day)</label>
              <Input
                type="number"
                value={rateLimitDay}
                onChange={(e) => setRateLimitDay(Number(e.target.value))}
                min={1}
                max={1000000}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-border bg-muted/50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleCreate()} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create API Key'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function EditAPIKeyModal({
  apiKey,
  onClose,
  onSave,
}: {
  apiKey: APIKey;
  onClose: () => void;
  onSave: (updates: {
    name?: string;
    description?: string;
    rate_limit_per_minute?: number;
    rate_limit_per_day?: number;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(apiKey.name);
  const [description, setDescription] = useState(apiKey.description || '');
  const [rateLimitMinute, setRateLimitMinute] = useState(apiKey.rate_limit_per_minute);
  const [rateLimitDay, setRateLimitDay] = useState(apiKey.rate_limit_per_day);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        rate_limit_per_minute: rateLimitMinute,
        rate_limit_per_day: rateLimitDay,
      });
    } catch (error: any) {
      alert(error?.message || 'Failed to update API key');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-xl font-bold text-foreground">Edit API Key</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rate Limit (per minute)</label>
              <Input
                type="number"
                value={rateLimitMinute}
                onChange={(e) => setRateLimitMinute(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Rate Limit (per day)</label>
              <Input
                type="number"
                value={rateLimitDay}
                onChange={(e) => setRateLimitDay(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-border bg-muted/50">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default APIKeysPage;
