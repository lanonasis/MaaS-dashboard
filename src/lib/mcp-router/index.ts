// MCP Router Platform - Main Module Export
// Zapier-like router for external API services

// Core managers
export { ServiceCatalogManager } from './service-catalog';
export { UserServicesManager } from './user-services';
export { APIKeyManager } from './api-keys';

// Re-export types
export type {
  // Service Catalog
  MCPServiceCatalog,
  ServiceCategory,
  CredentialField,
  ServiceCatalogFilters,

  // User Services
  UserMCPService,
  ServiceCredentials,
  ServiceEnvironment,
  HealthStatus,
  ConfigureServiceRequest,
  TestConnectionResult,

  // API Keys
  APIKey,
  APIKeyScope,
  ScopeType,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
  RateLimitInfo,

  // Usage & Analytics
  MCPUsageLog,
  UsageLogStatus,
  ServiceUsageStats,
  DailyUsageStats,
  UsageAnalytics,
  MCPDashboardStats,
} from '@/types/mcp-router';

export { MCPRouterErrors } from '@/types/mcp-router';
