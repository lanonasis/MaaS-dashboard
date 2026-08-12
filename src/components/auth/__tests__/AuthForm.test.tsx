import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthForm from '../AuthForm';

const authMocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: authMocks.resetPasswordForEmail,
      signInWithPassword: authMocks.signInWithPassword,
      signUp: authMocks.signUp,
      signInWithOAuth: authMocks.signInWithOAuth,
    },
  },
  getRedirectUrl: () => 'https://dashboard.lanonasis.com/auth/callback',
  getPasswordResetUrl: () => 'https://dashboard.lanonasis.com/auth/reset-password',
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: authMocks.toast,
  }),
}));

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it('renders forgot-password mode when requested initially', () => {
    render(
      <MemoryRouter>
        <AuthForm initialMode="forgot-password" />
      </MemoryRouter>
    );

    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('keeps a visible reset confirmation after submitting forgot-password flow', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthForm initialMode="forgot-password" />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Email'), 'person@example.com');
    await user.click(screen.getByRole('button', { name: 'Send reset link' }));

    await waitFor(() => {
      expect(authMocks.resetPasswordForEmail).toHaveBeenCalledWith('person@example.com', {
        redirectTo: 'https://dashboard.lanonasis.com/auth/reset-password',
      });
    });

    expect(screen.getByText('Reset link sent')).toBeInTheDocument();
    expect(screen.getByText('Check your email for password reset instructions.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
  });
});
