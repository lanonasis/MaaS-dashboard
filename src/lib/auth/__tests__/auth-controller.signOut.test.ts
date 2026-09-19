/**
 * Tests for createAuthController().signOut toast + throw semantics.
 *
 * Regression coverage: when throwOnAuthError is true (the mode used by
 * useSupabaseAuth), the controller must NOT also show its own destructive
 * toast — Dashboard.handleLogout is responsible for surfacing the failure
 * UI. The throw itself is preserved so the caller's try/catch still fires.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAuthController } from '../auth-controller';

const makeSupabaseStub = (overrides: Record<string, unknown> = {}) => ({
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    ...overrides,
  },
});

const makeCentralAuthStub = () => ({
  exchangeSupabaseToken: vi.fn().mockResolvedValue(true),
  clearSSOCookies: vi.fn().mockResolvedValue(true),
});

describe('createAuthController().signOut error path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('with throwOnAuthError: true — suppresses controller toast AND re-throws', async () => {
    const mockToast = vi.fn();
    const mockNavigate = vi.fn();
    const supabase = makeSupabaseStub({
      signOut: vi.fn().mockResolvedValue({
        error: new Error('Supabase unreachable'),
      }),
    });
    const centralAuth = makeCentralAuthStub();

    const controller = createAuthController(
      {
        supabase: supabase as never,
        centralAuth,
        navigate: mockNavigate,
        toast: mockToast,
        isDev: false,
        throwOnAuthError: true,
      },
      'TestProvider'
    );

    let thrown: unknown = null;
    try {
      await controller.signOut();
    } catch (err) {
      thrown = err;
    }

    // Must re-throw so the caller's try/catch fires.
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toBe('Supabase unreachable');
    // Must NOT show the controller's destructive toast — the caller owns
    // the failure UI.
    expect(mockToast).not.toHaveBeenCalled();
    // Must NOT navigate on failure.
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('with throwOnAuthError: false — shows controller toast and does not throw', async () => {
    const mockToast = vi.fn();
    const mockNavigate = vi.fn();
    const supabase = makeSupabaseStub({
      signOut: vi.fn().mockResolvedValue({
        error: new Error('Supabase unreachable'),
      }),
    });
    const centralAuth = makeCentralAuthStub();

    const controller = createAuthController(
      {
        supabase: supabase as never,
        centralAuth,
        navigate: mockNavigate,
        toast: mockToast,
        isDev: false,
        // throwOnAuthError omitted — defaults to false
      },
      'TestProvider'
    );

    let thrown: unknown = null;
    try {
      await controller.signOut();
    } catch (err) {
      thrown = err;
    }

    // Must NOT throw when caller has not opted into re-throw semantics.
    expect(thrown).toBeNull();
    // Must show the controller's destructive toast so the caller (which
    // has no try/catch) still gets feedback.
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error signing out',
        variant: 'destructive',
        description: expect.stringContaining('Supabase unreachable'),
      })
    );
  });

  it('with throwOnAuthError: true — happy path still clears SSO cookies, signs out, navigates', async () => {
    const mockToast = vi.fn();
    const mockNavigate = vi.fn();
    const clearSSOCookies = vi.fn().mockResolvedValue(true);
    const signOutMock = vi.fn().mockResolvedValue({ error: null });
    const supabase = makeSupabaseStub({ signOut: signOutMock });
    const centralAuth = { ...makeCentralAuthStub(), clearSSOCookies };

    const controller = createAuthController(
      {
        supabase: supabase as never,
        centralAuth,
        navigate: mockNavigate,
        toast: mockToast,
        isDev: false,
        throwOnAuthError: true,
      },
      'TestProvider'
    );

    await controller.signOut();

    // SSO cookies cleared first.
    expect(clearSSOCookies).toHaveBeenCalledTimes(1);
    // Supabase signOut called.
    expect(signOutMock).toHaveBeenCalledTimes(1);
    // Single navigate to "/".
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    // No toast on success.
    expect(mockToast).not.toHaveBeenCalled();
  });
});