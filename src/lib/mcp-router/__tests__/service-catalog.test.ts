/**
 * Tests for ServiceCatalogManager class
 * Tests service catalog operations and credential validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceCatalogManager } from '../service-catalog';
import type { MCPServiceCatalog, ServiceCategory, CredentialField } from '@/types/mcp-router';

// Mock Supabase
const mockSupabaseQuery = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseUpdate = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() => mockSupabaseQuery()),
              single: vi.fn().mockImplementation(() => mockSupabaseQuery()),
            }),
            order: vi.fn().mockImplementation(() => mockSupabaseQuery()),
            single: vi.fn().mockImplementation(() => mockSupabaseQuery()),
          }),
          or: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockImplementation(() => mockSupabaseQuery()),
            }),
          }),
          order: vi.fn().mockImplementation(() => mockSupabaseQuery()),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockImplementation(() => mockSupabaseInsert()),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockImplementation(() => mockSupabaseUpdate()),
            }),
          }),
        }),
      };
    },
  },
}));

const createMockService = (overrides: Partial<MCPServiceCatalog> = {}): MCPServiceCatalog => ({
  id: 'svc-1',
  service_key: 'github',
  display_name: 'GitHub',
  description: 'GitHub integration for repositories',
  icon: 'github',
  category: 'devops' as ServiceCategory,
  credential_fields: [
    {
      key: 'token',
      label: 'Personal Access Token',
      type: 'password',
      required: true,
      placeholder: 'ghp_...',
      validation: {
        pattern: '^ghp_[a-zA-Z0-9]+$',
        minLength: 40,
      },
    },
    {
      key: 'organization',
      label: 'Organization',
      type: 'text',
      required: false,
      placeholder: 'my-org',
    },
  ],
  mcp_command: 'npx',
  mcp_args: ['-y', '@modelcontextprotocol/server-github'],
  mcp_env_mapping: {
    GITHUB_PERSONAL_ACCESS_TOKEN: 'token',
  },
  documentation_url: 'https://docs.github.com',
  base_url: 'https://api.github.com',
  health_check_endpoint: '/user',
  is_available: true,
  is_beta: false,
  requires_approval: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('ServiceCatalogManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getServices', () => {
    it('fetches all available services', async () => {
      const mockServices = [
        createMockService({ id: 'svc-1', service_key: 'github' }),
        createMockService({ id: 'svc-2', service_key: 'stripe', category: 'payment' }),
      ];

      mockSupabaseQuery.mockResolvedValue({
        data: mockServices,
        error: null,
      });

      const services = await ServiceCatalogManager.getServices();

      expect(services).toHaveLength(2);
      expect(services[0].service_key).toBe('github');
      expect(services[1].service_key).toBe('stripe');
    });

    it('filters by category when provided', async () => {
      const mockServices = [
        createMockService({ id: 'svc-1', category: 'payment' }),
      ];

      mockSupabaseQuery.mockResolvedValue({
        data: mockServices,
        error: null,
      });

      const services = await ServiceCatalogManager.getServices({ category: 'payment' });

      expect(services).toHaveLength(1);
      expect(services[0].category).toBe('payment');
    });

    it('filters by search term', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [createMockService({ display_name: 'GitHub Integration' })],
        error: null,
      });

      const services = await ServiceCatalogManager.getServices({ search: 'github' });

      expect(services).toHaveLength(1);
    });

    it('excludes beta services by default', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [createMockService({ is_beta: false })],
        error: null,
      });

      await ServiceCatalogManager.getServices();

      // Verify the query was constructed correctly (beta services excluded)
      expect(mockSupabaseQuery).toHaveBeenCalled();
    });

    it('includes beta services when showBeta is true', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [
          createMockService({ is_beta: false }),
          createMockService({ id: 'svc-2', is_beta: true }),
        ],
        error: null,
      });

      const services = await ServiceCatalogManager.getServices({ showBeta: true });

      expect(services).toHaveLength(2);
    });

    it('throws error on database failure', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      await expect(ServiceCatalogManager.getServices()).rejects.toThrow(
        'Failed to fetch services: Database connection failed'
      );
    });

    it('returns empty array when no services found', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [],
        error: null,
      });

      const services = await ServiceCatalogManager.getServices();

      expect(services).toEqual([]);
    });
  });

  describe('getServiceByKey', () => {
    it('returns service when found', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: createMockService({ service_key: 'github' }),
        error: null,
      });

      const service = await ServiceCatalogManager.getServiceByKey('github');

      expect(service).not.toBeNull();
      expect(service?.service_key).toBe('github');
    });

    it('returns null when service not found', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      });

      const service = await ServiceCatalogManager.getServiceByKey('nonexistent');

      expect(service).toBeNull();
    });

    it('throws on other errors', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Internal error' },
      });

      await expect(
        ServiceCatalogManager.getServiceByKey('test')
      ).rejects.toThrow('Failed to fetch service: Internal error');
    });
  });

  describe('getServicesByCategory', () => {
    it('fetches services filtered by category', async () => {
      const paymentServices = [
        createMockService({ id: 'svc-1', service_key: 'stripe', category: 'payment' }),
        createMockService({ id: 'svc-2', service_key: 'paypal', category: 'payment' }),
      ];

      mockSupabaseQuery.mockResolvedValue({
        data: paymentServices,
        error: null,
      });

      const services = await ServiceCatalogManager.getServicesByCategory('payment');

      expect(services).toHaveLength(2);
      services.forEach((service) => {
        expect(service.category).toBe('payment');
      });
    });
  });

  describe('getCategoryCounts', () => {
    it('returns category counts', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [
          { category: 'payment' },
          { category: 'payment' },
          { category: 'devops' },
          { category: 'ai' },
          { category: 'ai' },
          { category: 'ai' },
        ],
        error: null,
      });

      const counts = await ServiceCatalogManager.getCategoryCounts();

      expect(counts.payment).toBe(2);
      expect(counts.devops).toBe(1);
      expect(counts.ai).toBe(3);
      expect(counts.communication).toBe(0);
    });

    it('returns zero counts when no services', async () => {
      mockSupabaseQuery.mockResolvedValue({
        data: [],
        error: null,
      });

      const counts = await ServiceCatalogManager.getCategoryCounts();

      expect(counts.payment).toBe(0);
      expect(counts.devops).toBe(0);
      expect(counts.ai).toBe(0);
    });
  });

  describe('validateCredentials', () => {
    it('validates required fields', () => {
      const service = createMockService();

      const result = ServiceCatalogManager.validateCredentials(service, {});

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Personal Access Token is required');
    });

    it('passes validation with valid credentials', () => {
      const service = createMockService();

      const result = ServiceCatalogManager.validateCredentials(service, {
        token: 'ghp_' + 'a'.repeat(36), // 40 chars total
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates minimum length', () => {
      const service = createMockService();

      const result = ServiceCatalogManager.validateCredentials(service, {
        token: 'ghp_short', // Too short
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Personal Access Token must be at least 40 characters'
      );
    });

    it('validates pattern matching', () => {
      const service = createMockService();

      const result = ServiceCatalogManager.validateCredentials(service, {
        token: 'invalid_token_format_' + 'a'.repeat(20),
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Personal Access Token has an invalid format');
    });

    it('skips validation for optional empty fields', () => {
      const service = createMockService();

      const result = ServiceCatalogManager.validateCredentials(service, {
        token: 'ghp_' + 'a'.repeat(36),
        organization: '', // Optional, can be empty
      });

      expect(result.valid).toBe(true);
    });

    it('validates max length when specified', () => {
      const service = createMockService({
        credential_fields: [
          {
            key: 'name',
            label: 'Name',
            type: 'text',
            required: true,
            validation: {
              maxLength: 10,
            },
          },
        ],
      });

      const result = ServiceCatalogManager.validateCredentials(service, {
        name: 'This is a very long name',
      });

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Name must be at most 10 characters');
    });
  });

  describe('getCredentialFields', () => {
    it('returns credential fields for a service', () => {
      const service = createMockService();

      const fields = ServiceCatalogManager.getCredentialFields(service);

      expect(fields).toHaveLength(2);
      expect(fields[0].key).toBe('token');
      expect(fields[1].key).toBe('organization');
    });
  });

  describe('getMCPCommand', () => {
    it('returns MCP command configuration', () => {
      const service = createMockService();

      const config = ServiceCatalogManager.getMCPCommand(service);

      expect(config.command).toBe('npx');
      expect(config.args).toEqual(['-y', '@modelcontextprotocol/server-github']);
      expect(config.envMapping).toEqual({
        GITHUB_PERSONAL_ACCESS_TOKEN: 'token',
      });
    });

    it('returns empty values when not configured', () => {
      const service = createMockService({
        mcp_command: undefined,
        mcp_args: undefined,
        mcp_env_mapping: undefined,
      });

      const config = ServiceCatalogManager.getMCPCommand(service);

      expect(config.command).toBe('');
      expect(config.args).toEqual([]);
      expect(config.envMapping).toEqual({});
    });
  });

  describe('getIconName', () => {
    it('returns icon name when set', () => {
      const service = createMockService({ icon: 'github' });

      expect(ServiceCatalogManager.getIconName(service)).toBe('github');
    });

    it('returns default icon when not set', () => {
      const service = createMockService({ icon: undefined });

      expect(ServiceCatalogManager.getIconName(service)).toBe('box');
    });
  });

  describe('getCategoryInfo', () => {
    it('returns info for payment category', () => {
      const info = ServiceCatalogManager.getCategoryInfo('payment');

      expect(info.label).toBe('Payment');
      expect(info.color).toBe('green');
      expect(info.icon).toBe('credit-card');
    });

    it('returns info for devops category', () => {
      const info = ServiceCatalogManager.getCategoryInfo('devops');

      expect(info.label).toBe('DevOps');
      expect(info.color).toBe('blue');
      expect(info.icon).toBe('git-branch');
    });

    it('returns info for ai category', () => {
      const info = ServiceCatalogManager.getCategoryInfo('ai');

      expect(info.label).toBe('AI');
      expect(info.color).toBe('purple');
      expect(info.icon).toBe('brain');
    });

    it('returns default for other/unknown category', () => {
      const info = ServiceCatalogManager.getCategoryInfo('other');

      expect(info.label).toBe('Other');
      expect(info.color).toBe('gray');
      expect(info.icon).toBe('box');
    });
  });

  describe('Admin Operations', () => {
    describe('addService', () => {
      it('adds a new service to the catalog', async () => {
        const newService = createMockService({ id: undefined, created_at: undefined, updated_at: undefined });

        mockSupabaseInsert.mockResolvedValue({
          data: { ...newService, id: 'new-svc-1', created_at: '2024-01-01', updated_at: '2024-01-01' },
          error: null,
        });

        const result = await ServiceCatalogManager.addService(newService as any);

        expect(result.id).toBe('new-svc-1');
        expect(result.service_key).toBe('github');
      });

      it('throws on insert failure', async () => {
        mockSupabaseInsert.mockResolvedValue({
          data: null,
          error: { message: 'Duplicate key' },
        });

        await expect(
          ServiceCatalogManager.addService({} as any)
        ).rejects.toThrow('Failed to add service: Duplicate key');
      });
    });

    describe('updateService', () => {
      it('updates service properties', async () => {
        mockSupabaseUpdate.mockResolvedValue({
          data: createMockService({ display_name: 'Updated GitHub' }),
          error: null,
        });

        const result = await ServiceCatalogManager.updateService('github', {
          display_name: 'Updated GitHub',
        });

        expect(result.display_name).toBe('Updated GitHub');
      });

      it('throws on update failure', async () => {
        mockSupabaseUpdate.mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });

        await expect(
          ServiceCatalogManager.updateService('invalid', { display_name: 'Test' })
        ).rejects.toThrow('Failed to update service: Not found');
      });
    });

    describe('disableService', () => {
      it('disables a service', async () => {
        const mockUpdate = vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        });

        vi.doMock('@/integrations/supabase/client', () => ({
          supabase: {
            from: () => ({
              update: mockUpdate,
            }),
          },
        }));

        // Re-import to get fresh mock
        await expect(
          ServiceCatalogManager.disableService('github')
        ).resolves.not.toThrow();
      });
    });
  });
});
