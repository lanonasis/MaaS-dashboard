import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SetNewPassword from '../SetNewPassword';

const { mockGetSession, mockNavigate, mockToast, mockUpdateUser } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockNavigate: vi.fn(),
  mockToast: vi.fn(),
  mockUpdateUser: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      updateUser: mockUpdateUser,
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderResetForm = () => render(
  <MemoryRouter>
    <SetNewPassword />
  </MemoryRouter>
);

const submitMatchingPasswords = async () => {
  const password = 'unique-test-password';
  fireEvent.change(await screen.findByLabelText('New password'), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Update password' }));
};

describe('SetNewPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: 'user-1' } } },
      error: null,
    });
    mockUpdateUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates the password and redirects the active recovery session', async () => {
    renderResetForm();

    await submitMatchingPasswords();

    await waitFor(() => {
      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'unique-test-password' });
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Password updated',
    }));
  });

  it('keeps the user on the form and surfaces update failures', async () => {
    mockUpdateUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Recovery session expired'),
    });
    renderResetForm();

    await submitMatchingPasswords();

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Password reset failed',
        description: 'Recovery session expired',
        variant: 'destructive',
      }));
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('shows an expired-link recovery action when no session exists', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    renderResetForm();

    expect(await screen.findByRole('heading', { name: 'Reset link expired' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Request a new reset link' }));

    expect(mockNavigate).toHaveBeenCalledWith('/?showAuth=true&mode=forgot-password');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('re-enables the form with safe guidance when the update hangs', async () => {
    mockUpdateUser.mockReturnValue(new Promise(() => undefined));
    renderResetForm();

    const passwordInput = await screen.findByLabelText('New password');
    const confirmInput = screen.getByLabelText('Confirm new password');
    vi.useFakeTimers();

    fireEvent.change(passwordInput, {
      target: { value: 'unique-test-password' },
    });
    fireEvent.change(confirmInput, {
      target: { value: 'unique-test-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update password' }));

    await act(async () => {
      vi.advanceTimersByTime(15_001);
      await Promise.resolve();
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Password reset failed',
      description: expect.stringContaining('Do not reuse the previous password'),
      variant: 'destructive',
    }));
    expect(screen.getByRole('button', { name: 'Update password' })).toBeEnabled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
