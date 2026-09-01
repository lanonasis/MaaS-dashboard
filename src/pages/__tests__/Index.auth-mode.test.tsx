import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Index from '../Index';
import { ThemeProvider } from '@/hooks/useTheme';

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: null,
    isLoading: false,
  }),
}));

vi.mock('@/components/ai/AIAssistant', () => ({
  AIAssistant: () => null,
}));

describe('Index auth mode routing', () => {
  it('opens forgot-password mode directly from query params', () => {
    render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/?showAuth=true&mode=forgot-password']}>
          <Routes>
            <Route path="/" element={<Index />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });
});
