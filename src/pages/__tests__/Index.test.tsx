import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import Index from '../Index';

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({ user: null, isLoading: false }),
}));

vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

describe('Index landing page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the canonical tagline 'Memory-as-a-Service Platform'", () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Index />
      </MemoryRouter>
    );

    expect(screen.getByText('Memory-as-a-Service Platform')).toBeInTheDocument();
  });

  it('keeps the value-proposition headline', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Index />
      </MemoryRouter>
    );

    expect(
      screen.getByRole('heading', { name: /Continuity intelligence\s+for thinking partners/i })
    ).toBeInTheDocument();
  });

  it("does not render the legacy 'Context-as-a-Service' wording", () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Index />
      </MemoryRouter>
    );

    expect(screen.queryByText(/Context-as-a-Service/i)).not.toBeInTheDocument();
  });
});