/**
 * Tests for ApiKeyManager component
 * Tests API key creation, management, and revocation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeyManager } from '../ApiKeyManager';

// Mock useSupabaseAuth
const mockUser = { id: 'user-123', email: 'test@example.com' };
vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: mockUser,
    session: { access_token: 'test-token' },
    isLoading: false,
  }),
}));

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Supabase
const mockSupabaseSelect = vi.fn();
const mockSupabaseInsert = vi.fn();
const mockSupabaseDelete = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockImplementation(() => mockSupabaseSelect()),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => mockSupabaseInsert()),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation(() => mockSupabaseDelete()),
        }),
      }),
    }),
  },
}));

// Mock Web Crypto API
const mockCryptoSubtle = {
  digest: vi.fn().mockResolvedValue(new ArrayBuffer(32)),
};

Object.defineProperty(global, 'crypto', {
  value: {
    subtle: mockCryptoSubtle,
  },
});

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

describe('ApiKeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabaseSelect.mockResolvedValue({ data: [], error: null });
    mockSupabaseInsert.mockResolvedValue({
      data: { id: 'key-1', name: 'Test Key', key: 'lano_testkey123' },
      error: null,
    });
    mockSupabaseDelete.mockResolvedValue({ error: null });
  });

  describe('Dialog Trigger', () => {
    it('renders the trigger button', () => {
      render(<ApiKeyManager />);

      expect(screen.getByRole('button', { name: /memory api keys/i })).toBeInTheDocument();
    });

    it('opens dialog when trigger button is clicked', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Memory Service API Keys')).toBeInTheDocument();
      });
    });
  });

  describe('Create Key Tab', () => {
    it('shows create key form by default', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Key Name')).toBeInTheDocument();
        expect(screen.getByLabelText('Service Access')).toBeInTheDocument();
        expect(screen.getByLabelText('Expiration')).toBeInTheDocument();
      });
    });

    it('shows error when name is empty', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate api key/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Please enter a name for your API key',
        variant: 'destructive',
      });
    });

    it('generates key with correct name', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Key Name')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Key Name'), 'My Test Key');
      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'API Key Generated',
          description: 'Your API key has been generated successfully. Make sure to copy it now.',
        });
      });
    });

    it('shows generated key with copy functionality', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Key Name')).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText('Key Name'), 'Test Key');
      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Your API Key')).toBeInTheDocument();
      });

      // Key should be masked by default
      expect(screen.getByLabelText('Your API Key')).toHaveAttribute('type', 'password');

      // Toggle visibility
      await user.click(screen.getByLabelText('Show API key'));

      expect(screen.getByLabelText('Your API Key')).toHaveAttribute('type', 'text');
    });

    it('copies key to clipboard', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await user.type(screen.getByLabelText('Key Name'), 'Test Key');
      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Copy API key')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Copy API key'));

      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });

    it('allows creating another key after generation', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await user.type(screen.getByLabelText('Key Name'), 'First Key');
      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create another/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /create another/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Key Name')).toHaveValue('');
      });
    });
  });

  describe('Manage Keys Tab', () => {
    it('switches to manage tab', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /your keys/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      expect(screen.getByRole('tab', { name: /your keys/i })).toHaveAttribute(
        'data-state',
        'active'
      );
    });

    it('shows empty state when no keys exist', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText("You don't have any API keys yet")).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /create your first api key/i })).toBeInTheDocument();
      });
    });

    it('displays existing API keys', async () => {
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Production Key',
          service: 'all',
          created_at: '2024-01-01T00:00:00Z',
          expires_at: null,
          is_active: true,
        },
        {
          id: 'key-2',
          name: 'Development Key',
          service: 'payment',
          created_at: '2024-01-02T00:00:00Z',
          expires_at: '2025-01-01T00:00:00Z',
          is_active: true,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText('Production Key')).toBeInTheDocument();
        expect(screen.getByText('Development Key')).toBeInTheDocument();
      });
    });

    it('shows key count', async () => {
      const mockKeys = [
        { id: 'key-1', name: 'Key 1', service: 'all', created_at: '2024-01-01', expires_at: null },
        { id: 'key-2', name: 'Key 2', service: 'all', created_at: '2024-01-02', expires_at: null },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText('You have 2 API keys')).toBeInTheDocument();
      });
    });

    it('shows expired badge for expired keys', async () => {
      const expiredDate = new Date(Date.now() - 86400000).toISOString(); // Yesterday
      const mockKeys = [
        {
          id: 'key-1',
          name: 'Expired Key',
          service: 'all',
          created_at: '2024-01-01T00:00:00Z',
          expires_at: expiredDate,
          is_active: true,
        },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument();
      });
    });

    it('revokes key when X button clicked', async () => {
      const mockKeys = [
        { id: 'key-1', name: 'Test Key', service: 'all', created_at: '2024-01-01', expires_at: null },
      ];

      mockSupabaseSelect.mockResolvedValue({ data: mockKeys, error: null });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(screen.getByText('Test Key')).toBeInTheDocument();
      });

      // Find and click the X button (revoke)
      const revokeButtons = screen.getAllByRole('button');
      const revokeButton = revokeButtons.find((btn) => btn.querySelector('svg.h-4.w-4'));

      if (revokeButton) {
        await user.click(revokeButton);

        await waitFor(() => {
          expect(mockToast).toHaveBeenCalledWith({
            title: 'API Key Revoked',
            description: 'The API key has been successfully revoked',
          });
        });
      }
    });
  });

  describe('Service Selection', () => {
    it('allows selecting different services', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Service Access')).toBeInTheDocument();
      });

      await user.click(screen.getByRole('combobox', { name: /service access/i }));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /all services/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /payment gateways/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /wallet service/i })).toBeInTheDocument();
      });
    });
  });

  describe('Expiration Options', () => {
    it('shows expiration options', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await user.click(screen.getByRole('combobox', { name: /expiration/i }));

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /never/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /30 days/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /90 days/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /1 year/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /custom date/i })).toBeInTheDocument();
      });
    });

    it('shows custom date picker when custom selected', async () => {
      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));

      await user.click(screen.getByRole('combobox', { name: /expiration/i }));
      await user.click(screen.getByRole('option', { name: /custom date/i }));

      await waitFor(() => {
        expect(screen.getByLabelText('Custom Expiration Date')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error toast on API key generation failure', async () => {
      mockSupabaseInsert.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' },
      });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.type(screen.getByLabelText('Key Name'), 'Test Key');
      await user.click(screen.getByRole('button', { name: /generate api key/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error Generating API Key',
            variant: 'destructive',
          })
        );
      });
    });

    it('shows error on key fetch failure', async () => {
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { message: 'Failed to fetch' },
      });

      const user = userEvent.setup();

      render(<ApiKeyManager />);

      await user.click(screen.getByRole('button', { name: /memory api keys/i }));
      await user.click(screen.getByRole('tab', { name: /your keys/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to fetch',
          variant: 'destructive',
        });
      });
    });
  });
});
