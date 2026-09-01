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
    authMocks.signInWithPassword.mockResolvedValue({ error: null });
    authMocks.signUp.mockResolvedValue({ error: null });
    authMocks.signInWithOAuth.mockResolvedValue({ error: null });
  });

  it('uses linkedin_oidc when the LinkedIn social button is clicked', async () => {
    render(
      <MemoryRouter>
        <AuthForm initialMode="login" />
      </MemoryRouter>
    );

    const linkedInButton = screen.getByRole('button', { name: /LinkedIn/i });
    linkedInButton.click();

    await waitFor(() => {
      expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'linkedin_oidc',
        options: {
          redirectTo: 'https://dashboard.lanonasis.com/auth/callback',
          scopes: undefined,
        },
      });
    });
  });

  it('passes github provider and scopes unchanged', async () => {
    render(
      <MemoryRouter>
        <AuthForm initialMode="login" />
      </MemoryRouter>
    );

    const githubButton = screen.getByRole('button', { name: /GitHub/i });
    githubButton.click();

    await waitFor(() => {
      expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'github',
        options: {
          redirectTo: 'https://dashboard.lanonasis.com/auth/callback',
          scopes: 'read:user user:email',
        },
      });
    });
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
