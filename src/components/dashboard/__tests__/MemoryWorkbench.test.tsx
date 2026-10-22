import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryWorkbench } from '../MemoryWorkbench';

const { mockAuth, mockToast, mockApi, mockSupabaseFrom } = vi.hoisted(() => ({
  mockAuth: { user: null as any, isLoading: false },
  mockToast: vi.fn(),
  mockApi: {
    searchMemories: vi.fn(),
    createMemory: vi.fn(),
    updateMemory: vi.fn(),
    deleteMemory: vi.fn(),
  },
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockAuth,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: mockApi,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: mockSupabaseFrom },
}));

const memoryFixture = (id: string, tags: string[] = []) => ({
  id,
  title: `Memory ${id}`,
  content: `Content for ${id}`,
  type: 'context',
  tags,
  metadata: {},
  is_private: false,
  is_archived: false,
  access_count: 0,
  last_accessed_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
});

// Build a chainable mock of supabase.from('memory_entries').update(...)
const setupSupabaseMock = () => {
  const result: any = Promise.resolve({ error: null });
  result.eq = vi.fn(() => result);

  const builder: any = {
    update: vi.fn(() => result),
    select: vi.fn(() => Promise.resolve({ data: [], error: null })),
  };
  mockSupabaseFrom.mockImplementation(() => builder);
  return builder;
};

const enableCustomApiKey = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole('switch'));
  await user.type(
    screen.getByPlaceholderText('Enter your LanOnasis API key'),
    'lk_test_1234',
  );
};

// Search for "deployment" so both fixture memories are returned, then
// select all results and open the bulk tag panel.
const searchAndSelectAll = async (
  user: ReturnType<typeof userEvent.setup>,
) => {
  await user.click(screen.getByText('Memory Search'));
  await user.type(
    screen.getByPlaceholderText('Search by keywords or semantic meaning...'),
    'deployment',
  );
  await user.keyboard('{Enter}');
  await screen.findByText('Content for m1');

  await user.click(screen.getByText('Select All'));
  await user.click(screen.getByText('Bulk Tag'));
};

const applyBulkTag = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByPlaceholderText('e.g., important, reviewed'), 'reviewed');
  await user.click(screen.getByText('Add Tags'));
};

beforeEach(() => {
  mockAuth.user = null;
  mockAuth.isLoading = false;
  mockToast.mockReset();
  mockApi.searchMemories.mockReset();
  mockApi.createMemory.mockReset();
  mockApi.updateMemory.mockReset();
  mockApi.deleteMemory.mockReset();
  mockSupabaseFrom.mockReset();
});

describe('MemoryWorkbench custom API key support (issue #60)', () => {
  it('routes bulk tag updates through apiClient.updateMemory when a custom API key is active', async () => {
    mockApi.searchMemories.mockResolvedValue({
      error: null,
      data: [memoryFixture('m1'), memoryFixture('m2')],
    });
    mockApi.updateMemory.mockResolvedValue({
      error: null,
      data: memoryFixture('m1', ['reviewed']),
    });

    const user = userEvent.setup();
    render(<MemoryWorkbench />);

    await enableCustomApiKey(user);
    await searchAndSelectAll(user);
    await applyBulkTag(user);

    // Search must have carried the custom API key
    expect(mockApi.searchMemories).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'deployment', apiKey: 'lk_test_1234' }),
    );

    // Every selected memory is updated through the API client with the key
    expect(mockApi.updateMemory).toHaveBeenCalledTimes(2);
    expect(mockApi.updateMemory).toHaveBeenCalledWith(
      'm1',
      { tags: ['reviewed'] },
      'lk_test_1234',
    );
    expect(mockApi.updateMemory).toHaveBeenCalledWith(
      'm2',
      { tags: ['reviewed'] },
      'lk_test_1234',
    );

    // Supabase must not be touched at all in custom-key mode
    expect(mockSupabaseFrom).not.toHaveBeenCalled();

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Tags added' }),
    );
  });

  it('keeps the Supabase path for bulk tagging when no custom API key is active', async () => {
    mockAuth.user = { id: 'user-1' };
    const builder = setupSupabaseMock();
    mockApi.searchMemories.mockResolvedValue({
      error: null,
      data: [memoryFixture('m1')],
    });

    const user = userEvent.setup();
    render(<MemoryWorkbench />);

    await searchAndSelectAll(user);
    await applyBulkTag(user);

    // Supabase update path is used, not the API client
    expect(mockSupabaseFrom).toHaveBeenCalledWith('memory_entries');
    expect(builder.update).toHaveBeenCalledWith({ tags: ['reviewed'] });
    expect(mockApi.updateMemory).not.toHaveBeenCalled();

    // Search without a custom key must not send an apiKey
    expect(mockApi.searchMemories).toHaveBeenCalledWith(
      expect.not.objectContaining({ apiKey: expect.anything() }),
    );
  });

  it('surfaces apiClient errors from bulk tagging as a destructive toast', async () => {
    mockApi.searchMemories.mockResolvedValue({
      error: null,
      data: [memoryFixture('m1')],
    });
    mockApi.updateMemory.mockResolvedValue({
      error: 'Invalid API key',
      data: null,
    });

    const user = userEvent.setup();
    render(<MemoryWorkbench />);

    await enableCustomApiKey(user);
    await searchAndSelectAll(user);
    await applyBulkTag(user);

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bulk tag failed',
        description: 'Invalid API key',
        variant: 'destructive',
      }),
    );
  });
});
