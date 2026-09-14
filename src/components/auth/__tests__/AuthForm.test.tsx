import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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

  // COV-022 expansion: hit remaining branch lines in AuthForm.tsx
  describe('COV-022 expansion — validation, flows, social providers', () => {
    it('rejects empty email with "Email is required" (branch ~88)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects malformed email with "Email is invalid" (branch ~90)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm /></MemoryRouter>);
      // Disable HTML5 form validation so React's onSubmit fires for invalid emails
      const form = document.querySelector('form');
      form?.setAttribute('novalidate', 'true');
      const emailInput = screen.getByLabelText('Email') as HTMLInputElement;
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'not-an-email', name: 'email' } });
      fireEvent.change(passwordInput, { target: { value: 'goodpassword', name: 'password' } });
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      await waitFor(() => {
        expect(screen.getByText('Email is invalid')).toBeInTheDocument();
      });
      expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it('rejects password shorter than 6 chars (branch ~96)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm /></MemoryRouter>);
      await user.type(screen.getByLabelText('Email'), 'a@b.com');
      await user.type(screen.getByLabelText('Password'), 'short');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
      expect(authMocks.signInWithPassword).not.toHaveBeenCalled();
    });

    it('clears field error once user starts typing (branch ~76)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(screen.getByText('Email is required')).toBeInTheDocument();

      // Typing in the email field clears the email error
      await user.type(screen.getByLabelText('Email'), 'a');
      expect(screen.queryByText('Email is required')).not.toBeInTheDocument();
    });

    it('submits login form successfully (branch ~128)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Email'), 'login@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
          email: 'login@example.com',
          password: 'password123',
        });
      });
    });

    it('rejects register with empty name (branch ~102)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="register" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(authMocks.signUp).not.toHaveBeenCalled();
    });

    it('rejects register with empty confirm password (branch ~104)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="register" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Name'), 'Alice');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
      expect(authMocks.signUp).not.toHaveBeenCalled();
    });

    it('rejects register with mismatched confirm password (branch ~106)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="register" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Name'), 'Alice');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm password'), 'different456');
      await user.click(screen.getByRole('button', { name: 'Create account' }));
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      expect(authMocks.signUp).not.toHaveBeenCalled();
    });

    it('submits register form successfully (branch ~138)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="register" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Name'), 'Alice');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');
      await user.type(screen.getByLabelText('Confirm password'), 'password123');
      await user.click(screen.getByRole('button', { name: 'Create account' }));

      await waitFor(() => {
        expect(authMocks.signUp).toHaveBeenCalledWith({
          email: 'new@example.com',
          password: 'password123',
          options: expect.objectContaining({
            data: { full_name: 'Alice' },
            emailRedirectTo: 'https://dashboard.lanonasis.com/auth/callback',
          }),
        });
      });
    });

    it('surfaces auth error via toast (branch ~158)', async () => {
      const user = userEvent.setup();
      // Throw a real Error so the catch block extracts the message
      authMocks.signInWithPassword.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.type(screen.getByLabelText('Email'), 'bad@example.com');
      await user.type(screen.getByLabelText('Password'), 'wrongpass1');
      await user.click(screen.getByRole('button', { name: 'Sign in' }));

      await waitFor(() => {
        expect(authMocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Authentication failed',
            description: 'Invalid credentials',
            variant: 'destructive',
          })
        );
      });
    });

    it('passes apple provider with "email name" scopes (branch ~204)', async () => {
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      screen.getByRole('button', { name: /Apple/i }).click();
      await waitFor(() => {
        expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({
          provider: 'apple',
          options: {
            redirectTo: 'https://dashboard.lanonasis.com/auth/callback',
            scopes: 'email name',
          },
        });
      });
    });

    it('uses production callback URL for notion provider (branch ~191)', async () => {
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      // jsdom defaults location.hostname to '' which is not localhost — the production
      // URL fallback is only used when isLocalhost matches. To hit the conditional we
      // assert the production URL is used (non-localhost case).
      screen.getByRole('button', { name: /Notion/i }).click();
      await waitFor(() => {
        expect(authMocks.signInWithOAuth).toHaveBeenCalledWith(
          expect.objectContaining({
            provider: 'notion',
            options: expect.objectContaining({
              redirectTo: 'https://dashboard.lanonasis.com/auth/callback',
            }),
          })
        );
      });
    });

    it('shows Twitter OAuth Configuration Required on twitter failure (branch ~218)', async () => {
      const user = userEvent.setup();
      authMocks.signInWithOAuth.mockRejectedValueOnce(new Error('Unsupported provider'));
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: /Twitter/i }));
      await waitFor(() => {
        expect(authMocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Twitter OAuth Configuration Required',
            variant: 'destructive',
          })
        );
      });
    });

    it('shows Notion OAuth Redirect URI Issue on notion failure (branch ~224)', async () => {
      const user = userEvent.setup();
      authMocks.signInWithOAuth.mockRejectedValueOnce(new Error('redirect_uri_mismatch'));
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: /Notion/i }));
      await waitFor(() => {
        expect(authMocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Notion OAuth Redirect URI Issue',
            variant: 'destructive',
          })
        );
      });
    });

    it('shows generic Login failed for other providers (branch ~213)', async () => {
      const user = userEvent.setup();
      authMocks.signInWithOAuth.mockRejectedValueOnce(new Error('Provider down'));
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: /Google/i }));
      await waitFor(() => {
        expect(authMocks.toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Login failed',
            description: 'Provider down',
            variant: 'destructive',
          })
        );
      });
    });

    it('toggles password visibility (branch ~256 showPassword)', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      // Click the eye toggle button
      const toggleButton = screen.getByRole('button', { name: '' }); // Icon-only button
      // Actually find by svg class
      const eyeButton = passwordInput.parentElement?.querySelector('button');
      expect(eyeButton).toBeInTheDocument();
      if (eyeButton) {
        await user.click(eyeButton);
        expect(passwordInput.type).toBe('text');
      }
    });

    it('forgot-password mode hides password + social login sections', () => {
      render(<MemoryRouter><AuthForm initialMode="forgot-password" /></MemoryRouter>);
      // No password field
      expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();
      // No social login buttons
      expect(screen.queryByRole('button', { name: /Google/i })).not.toBeInTheDocument();
    });

    it('footer switches between login and register modes', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      // Footer starts as "Create one" — clicking it switches to register
      await user.click(screen.getByRole('button', { name: 'Create one' }));
      expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();

      // Footer in register shows "Sign in" — clicking switches back
      await user.click(screen.getByRole('button', { name: 'Sign in' }));
      expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    });

    it('switching to forgot-password from login via "Forgot password?" link', async () => {
      const user = userEvent.setup();
      render(<MemoryRouter><AuthForm initialMode="login" /></MemoryRouter>);
      await user.click(screen.getByRole('button', { name: 'Forgot password?' }));
      expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    });
  });
});
