/**
 * Regression + state tests for UserProfile — gh#207.
 *
 * Covers:
 *  1. Loading skeleton renders initially and clears after the 10 s safety
 *     timeout when the profile fetch never resolves. Without the fix
 *     (no safety timeout, no finish helper) the skeleton would persist
 *     forever and this test would fail.
 *  2. Loaded-state: when a user exists and the profile fetch resolves,
 *     the name / email / org ID are rendered.
 *  3. Snapshots for both the skeleton and the loaded states.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UserProfile } from '../UserProfile';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Profile rows we feed back through the mocked supabase .from('profiles')
// chain. Tests can call `setProfileRow(...)` between assertions.
let profileRow: any = null;
let profileQueryMode: 'resolve' | 'pending' = 'resolve';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table !== 'profiles') {
        throw new Error(`Unexpected supabase.from table in test: ${table}`);
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockImplementation(() => {
              if (profileQueryMode === 'pending') {
                return new Promise(() => {
                  /* never resolves — exercises the safety-net timeout path */
                });
              }
              return Promise.resolve({ data: profileRow, error: null });
            }),
          }),
        }),
      };
    }),
  },
}));

// Auth hook — each test configures the user shape it needs.
const mockUseSupabaseAuth = vi.fn();
vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockUseSupabaseAuth(),
}));

// Toast — the component calls toast(...) on save. We don't assert on it
// here, but the hook must return a stable function or React will warn.
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const authedUser = {
  id: 'user-abc-123',
  email: 'jane.doe@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Jane Doe', role: 'admin' },
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
} as any;

const resolvedProfile = {
  id: 'user-abc-123',
  email: 'jane.doe@example.com',
  full_name: 'Jane Doe',
  company_name: 'Acme Corp',
  organization_id: 'org-xyz-999',
  role: 'admin',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserProfile — gh#207 regression', () => {
  beforeEach(() => {
    vi.useRealTimers();
    profileRow = null;
    profileQueryMode = 'resolve';
    mockUseSupabaseAuth.mockReset();
    mockToast.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  // ---- Case 1: loading skeleton + safety timeout ----------------------------
  describe('with a profile fetch that never resolves', () => {
    it('shows the loading skeleton initially and clears it after the 10s safety timeout', async () => {
      profileQueryMode = 'pending';
      mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

      vi.useFakeTimers();
      const { container } = render(<UserProfile />);

      // Skeleton is rendered up front.
      expect(screen.getByText(/Loading profile data/i)).toBeInTheDocument();
      // The animated pulse skeleton wrapper is present (proves the skeleton
      // branch and not the loaded branch).
      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();

      // Advance just past the 10 s safety timeout defined in the component.
      await act(async () => {
        vi.advanceTimersByTime(10_001);
      });

      // After the safety timer fires, the skeleton must be gone and
      // loadingProfile cleared — the component falls into the loaded branch
      // (which will simply show "Not set" placeholders because no profile
      // row was ever returned).
      expect(screen.queryByText(/Loading profile data/i)).not.toBeInTheDocument();
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
      expect(screen.getByText(/User Profile/i)).toBeInTheDocument();
    });
  });

  // ---- Case 2: valid user with resolved profile -----------------------------
  describe('with a valid user and a resolved profile row', () => {
    it('renders the profile data (name, email, org ID)', async () => {
      profileRow = resolvedProfile;
      profileQueryMode = 'resolve';
      mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

      render(<UserProfile />);

      // Wait for the supabase mock to flush so profile state is populated.
      expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
      expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
      expect(screen.getByText('org-xyz-999')).toBeInTheDocument();
      // Company name also surfaces as part of the loaded card.
      expect(screen.getByText('Acme Corp')).toBeInTheDocument();
      // Action buttons only appear in the loaded branch.
      expect(
        screen.getByRole('button', { name: /edit profile/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /change password/i })
      ).toBeInTheDocument();
    });
  });

  // ---- Case 3: snapshots ----------------------------------------------------
  describe('snapshots', () => {
    it('matches the loading skeleton snapshot', () => {
      profileQueryMode = 'pending';
      mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

      vi.useFakeTimers();
      const { container } = render(<UserProfile />);

      // Don't wait for the safety timer — snapshot the skeleton as-rendered.
      expect(container.firstChild).toMatchSnapshot();
    });

    it('matches the loaded profile snapshot', async () => {
      profileRow = resolvedProfile;
      profileQueryMode = 'resolve';
      mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

      const { container } = render(<UserProfile />);

      // Resolve the supabase mock before snapshotting.
      expect(await screen.findByText('Jane Doe')).toBeInTheDocument();
      expect(container.firstChild).toMatchSnapshot();
    });
  });

  // ---- Defensive: user is null (parent guard case) --------------------------
  it('renders nothing when user is null (parent guard handles this)', () => {
    profileQueryMode = 'pending';
    mockUseSupabaseAuth.mockReturnValue({ user: null });

    const { container } = render(<UserProfile />);

    // Component returns null when user is falsy — Dashboard.tsx should
    // gate the mount on user?.id. Lock that contract in.
    expect(container).toBeEmptyDOMElement();
    // No skeleton leaks through.
    expect(screen.queryByText(/Loading profile data/i)).not.toBeInTheDocument();
  });

  // ---- Defensive: auth-resolved-but-id-missing path --------------------------
  // When user.id is undefined, the effect's "user has no id" early-return
  // calls finishLoading() SYNCHRONOUSLY in the same microtask as the mount —
  // before the 10s safety timer ever fires. The skeleton flashes for one
  // paint but resolves on the very next one. This is the "auth not yet
  // resolved" race that the fix addresses.
  it('skips straight to the loaded branch when user has no id', async () => {
    profileQueryMode = 'pending';
    mockUseSupabaseAuth.mockReturnValue({
      user: { ...authedUser, id: undefined, email: undefined },
    });

    const { container } = render(<UserProfile />);

    // Let the synchronous finishLoading() flush.
    await act(async () => {
      await Promise.resolve();
    });

    // The skeleton must not have stuck. The loaded branch shows the
    // "Not set" placeholders because there's no profile row to fetch.
    expect(screen.queryByText(/Loading profile data/i)).not.toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    expect(screen.getByText(/User Profile/i)).toBeInTheDocument();
    expect(screen.getByText('Not linked')).toBeInTheDocument();
  });

  // ---- Sanity: "Not set" placeholders when no profile row is returned -------
  it('shows placeholder fallback text when the fetch resolves with no row', async () => {
    profileRow = null;
    profileQueryMode = 'resolve';
    mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

    render(<UserProfile />);

    // Wait for the empty branch to settle in.
    await act(async () => {
      await Promise.resolve();
    });

    // Email comes from authedUser regardless.
    expect(screen.getByText('jane.doe@example.com')).toBeInTheDocument();
    // Profile-derived fields fall back to the per-field placeholder text.
    expect(screen.getByText('Not set')).toBeInTheDocument();        // company_name
    expect(screen.getByText('Not linked')).toBeInTheDocument();     // organization_id
  });

  // Touch userEvent so the import isn't flagged as unused in lint runs that
  // strip the case above; the dialog tests live with the component.
  it('exposes the Edit Profile dialog trigger to user interaction', async () => {
    profileRow = resolvedProfile;
    mockUseSupabaseAuth.mockReturnValue({ user: authedUser });

    const user = userEvent.setup();
    render(<UserProfile />);

    const editBtn = await screen.findByRole('button', { name: /edit profile/i });
    await user.click(editBtn);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
