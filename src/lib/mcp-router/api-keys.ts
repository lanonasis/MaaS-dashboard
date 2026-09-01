// MCP Router - API Key Management
// Tier 3: API key scoping and access control
//
// Rewritten 2026-08-23: this used to insert directly into Supabase from the
// browser (raw key generated + "encrypted" client-side with a master
// password that fell back to a hardcoded string or a localStorage-stored
// value when unconfigured — not real encryption), against a schema that
// didn't exist on the live database. It now calls the real server-side
// endpoint (auth-gateway's /api/v1/mcp/api-keys, matching the
// @vortex-secure/mcp-sdk contract) via apiClient. The key is generated and
// hashed server-side and returned once; nothing decryptable is ever stored.

import { apiClient } from '@/lib/api-client';
import type {
  APIKey,
  CreateAPIKeyRequest,
  CreateAPIKeyResponse,
} from '@/types/mcp-router';

export class APIKeyManager {
  // masterPassword is no longer used — encryption (such as it exists) now
  // happens server-side. Kept as an accepted constructor param so
  // APIKeysPage.tsx doesn't need to change its instantiation.
  constructor(_masterPassword?: string) {}

  async createAPIKey(request: CreateAPIKeyRequest): Promise<CreateAPIKeyResponse> {
    const response = await apiClient.createMcpRouterKey(request);
    return { api_key: response.api_key as APIKey, full_key: response.full_key };
  }

  async getAPIKeys(): Promise<APIKey[]> {
    const response = await apiClient.listMcpRouterKeys();
    return (response.api_keys || []) as APIKey[];
  }

  async getAPIKey(id: string): Promise<APIKey | null> {
    try {
      const response = await apiClient.getMcpRouterKey(id);
      return response.api_key as APIKey;
    } catch {
      return null;
    }
  }

  async revokeAPIKey(id: string, reason?: string): Promise<void> {
    await apiClient.revokeMcpRouterKey(id, reason);
  }

  async reactivateAPIKey(id: string): Promise<APIKey> {
    const response = await apiClient.reactivateMcpRouterKey(id);
    return response.api_key as APIKey;
  }

  async deleteAPIKey(id: string): Promise<void> {
    await apiClient.deleteMcpRouterKey(id);
  }

  async updateAPIKey(
    id: string,
    updates: {
      name?: string;
      description?: string;
      rate_limit_per_minute?: number;
      rate_limit_per_day?: number;
      allowed_ips?: string[];
    }
  ): Promise<APIKey> {
    const response = await apiClient.updateMcpRouterKey(id, updates);
    return response.api_key as APIKey;
  }
}

export default APIKeyManager;
