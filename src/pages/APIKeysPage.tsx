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
  Eye,
  EyeOff,
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
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

// The auth-gateway's GET /api-keys list route returns the record verbatim via
// mapApiKeyRecord(), which does NOT synthesise key_prefix or the rate-limit
// columns (they don't exist on the live api_keys table). The APIKey type
// declares them as required and APIKeyManager casts with `as APIKey[]`, so
// TypeScript can't catch the mismatch. Read every one of these defensively —
// an unguarded `.toLocaleString()` on an absent number threw a TypeError
// during render, which the ErrorBoundary surfaced as "Something went wrong"
// on the whole MCP Router Keys page.
const formatRateLimit = (value?: number | null): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : 'unlimited';

const formatKeyPrefix = (value?: string | null): string =>
  value && value.length > 0 ? value : 'prefix unavailable';

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
  const { toast } = useToast();
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
  const [visibleKeyIds, setVisibleKeyIds] = useState<Set<string>>(new Set());

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

  const stats = useMemo(() => {
    try {
      return {
        total: apiKeys.length,
        active: apiKeys.filter(k => k.is_active).length,
        revoked: apiKeys.filter(k => !k.is_active).length,
        expiringSoon: apiKeys.filter(k => {
          if (!k.expires_at) return false;
          const d = new Date(k.expires_at);
          if (isNaN(d.getTime())) return false;
          const expiresIn = d.getTime() - Date.now();
          return expiresIn > 0 && expiresIn < 7 * 24 * 60 * 60 * 1000;
        }).length,
      };
    } catch {
      return { total: 0, active: 0, revoked: 0, expiringSoon: 0 };
    }
  }, [apiKeys]);

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
    } catch {
      toast({ title: 'Could not revoke key', description: 'Please try again or contact support.', variant: 'destructive' });
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to permanently delete this API key?')) {
      return;
    }

    try {
      await apiKeyManager.deleteAPIKey(keyId);
      setAPIKeys(prev => prev.filter(k => k.id !== keyId));
    } catch {
      toast({ title: 'Could not delete key', description: 'Please try again or contact support.', variant: 'destructive' });
    }
  };

  const handleReactivateKey = async (keyId: string) => {
    try {
      const reactivated = await apiKeyManager.reactivateAPIKey(keyId);
      setAPIKeys(prev => prev.map(k => (k.id === reactivated.id ? reactivated : k)));
    } catch {
      toast({ title: 'Could not reactivate key', description: 'Please try again or contact support.', variant: 'destructive' });
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
          <Button variant="outline" onClick={() => window.open(import.meta.env.VITE_DOCS_URL || 'https://docs.lanonasis.com', '_blank')} data-testid="mcp-router-docs-button">
            <ExternalLink className="h-4 w-4 mr-2" />
            Documentation
          </Button>
          <Button variant="outline" onClick={() => void refreshPageData()} data-testid="mcp-router-refresh-button">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateModal(true)} disabled={keysUnavailable} data-testid="mcp-router-create-key-button">
            <Plus className="h-4 w-4 mr-2" />
            Create API Key
          </Button>
        </div>
      </div>

      {keysUnavailable && (
        <Alert data-testid="mcp-router-keys-unavailable-alert">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Can't load your keys right now</AlertTitle>
          <AlertDescription>
            We're having trouble connecting. Please refresh the page or try again in a moment.
            If this keeps happening, contact support.
          </AlertDescription>
        </Alert>
      )}

      {servicesUnavailable && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Can't load your services right now</AlertTitle>
          <AlertDescription>
            We couldn't fetch your connected services. You can still use 'All Services' access for now.
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
        <Card className="border-green-500 bg-green-50 dark:bg-green-950" data-testid="new-api-key-created-card">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 dark:text-green-100" data-testid="api-key-success-title">API Key Created Successfully</h3>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Make sure to copy your API key now. You will not be able to see it again.
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <code className="px-3 py-2 bg-white dark:bg-green-900 rounded border text-sm font-mono" data-testid="new-api-key-display">
                      {visibleKeyIds.has('new') ? newlyCreatedKey.fullKey : 'sk_live_' + '•'.repeat(32)}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        const newSet = new Set(visibleKeyIds);
                        if (newSet.has('new')) {
                          newSet.delete('new');
                        } else {
                          newSet.add('new');
                        }
                        setVisibleKeyIds(newSet);
                      }}
                      data-testid="toggle-key-visibility-new"
                      aria-label={visibleKeyIds.has('new') ? "Hide API key" : "Show API key"}
                    >
                      {visibleKeyIds.has('new') ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => copyToClipboard(newlyCreatedKey.fullKey, 'new')}
                      data-testid="copy-api-key-button"
                      aria-label="Copy API key"
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
          <CardTitle>Your MCP Router Keys</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingKeys ? (
            <div className="py-10 text-center text-muted-foreground" data-testid="mcp-router-loading-state">Loading API keys...</div>
          ) : keysUnavailable ? (
            <div className="py-10 text-center text-muted-foreground" data-testid="mcp-router-unavailable-state">
              API key management is not available yet for this environment.
            </div>
          ) : (
            <div className="space-y-4" data-testid="mcp-router-keys-list">
              {apiKeys.map((key) => (
                <div
                  key={key.id || `key-${Math.random()}`}
                  className={`p-4 border rounded-lg ${
                    key.is_active ? 'bg-card' : 'bg-muted/50 opacity-75'
                  }`}
                  data-testid="mcp-router-key-item"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold text-foreground">{key.name || 'Unnamed Key'}</h3>
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
                          {formatKeyPrefix(key.key_prefix)}...
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void copyToClipboard(key.key_prefix || key.name || '', key.id || '')}
                          data-testid="mcp-router-copy-key-button"
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
                            <Badge key={scope.id || scope.service_key} variant="secondary" className="text-xs">
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
                            {formatRateLimit(key.rate_limit_per_minute)}/min, {formatRateLimit(key.rate_limit_per_day)}/day
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
                      <Button size="sm" variant="outline" onClick={() => setSelectedKey(key)} data-testid="mcp-router-edit-key-button">
                        <Settings className="h-4 w-4" />
                      </Button>
                      {key.is_active ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                          onClick={() => void handleRevokeKey(key.id)}
                          data-testid="mcp-router-revoke-key-button"
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
                            data-testid="mcp-router-reactivate-key-button"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                            onClick={() => void handleDeleteKey(key.id)}
                            data-testid="mcp-router-delete-key-button"
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
                <div className="text-center py-12" data-testid="mcp-router-no-keys-state">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">No API keys</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first API key to start using the MCP Router
                  </p>
                  <Button onClick={() => setShowCreateModal(true)} data-testid="mcp-router-create-key-cta">
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

export default APIKeysPage;
