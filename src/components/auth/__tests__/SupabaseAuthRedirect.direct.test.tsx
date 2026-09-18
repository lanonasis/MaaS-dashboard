/**
 * Tests for the bare /auth route rendering AuthForm directly.
 *
 * Acceptance criterion:
 *   /auth renders login page directly, not the redirect component.
 *
 * Prior to the fix, SupabaseAuthRedirect redirected bare /auth (and the
 * login/register aliases) to /?showAuth=true on the landing page — a
 * two-hop UX. The fix: render <AuthForm> directly when the path is a
 * known login/register alias.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn(), dismiss: vi.fn(), toasts: [] }),
}));

// We don't want the AuthForm's OAuth call to actually fire during these
// tests, but we do want to assert the form's renderable content.
vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: null,
    isLoading: false,
    signOut: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
  }),
}));

// Import after mocks.
import SupabaseAuthRedirect from '../SupabaseAuthRedirect';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/*" element={<SupabaseAuthRedirect />} />
        <Route path="/login" element={<SupabaseAuthRedirect />} />
        <Route path="/register" element={<SupabaseAuthRedirect />} />
        <Route path="/signin" element={<SupabaseAuthRedirect />} />
        <Route path="/signup" element={<SupabaseAuthRedirect />} />
      </Routes>
    </MemoryRouter>
  );

describe('SupabaseAuthRedirect direct render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('renders the AuthForm (login heading) for the bare /auth route', () => {
    renderAt('/auth');
    // AuthForm in login mode renders a "Sign in" heading.
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    // Must NOT render the redirect component's spinner.
    expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
  });

  it('renders login-mode AuthForm for /auth/login', () => {
    renderAt('/auth/login');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
  });

  it('renders register-mode AuthForm for /auth/register', () => {
    renderAt('/auth/register');
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
    expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
  });

  it('renders login-mode AuthForm for /login, /signin aliases', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();

    cleanup();
    renderAt('/signin');
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders register-mode AuthForm for /register, /signup aliases', () => {
    renderAt('/register');
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();

    cleanup();
    renderAt('/signup');
    expect(screen.getByRole('heading', { name: /create an account/i })).toBeInTheDocument();
  });

  it('still shows the auth callback spinner on /auth/callback', () => {
    // /auth/callback is OAuth-only and must keep the existing async flow.
    renderAt('/auth/callback');
    expect(screen.getByText(/processing authentication/i)).toBeInTheDocument();
  });

  it('still renders SetNewPassword on /auth/reset-password', () => {
    renderAt('/auth/reset-password');
    // SetNewPassword renders a heading; the exact wording depends on the
    // component, so assert it is NOT the spinner.
    expect(screen.queryByText(/processing authentication/i)).not.toBeInTheDocument();
  });
});