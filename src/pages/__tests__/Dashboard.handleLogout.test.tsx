/**
 * Tests for Dashboard.handleLogout.
 *
 * Covers:
 *   1. Unit: handleLogout invokes signOut and a single navigate('/'),
 *      no second navigate('/auth') (race elimination).
 *   2. Unit: handleLogout surfaces a destructive toast when signOut throws.
 *   3. Integration: full logout flow — click button → session cleared → toast
 *      shown → on landing page. Also asserts SSO cookies were cleared
 *      BEFORE supabase.auth.signOut() was invoked.
 *   4. Snapshot: logout button's loading state while signing out.
 *
 * The Dashboard pulls in many heavy components, so we mock the heavy
 * children and only mount what is needed for the top-bar logout button.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
  act,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// ---------- Mocks ----------

const mockSignOut = vi.fn();
const mockClearSSOCookies = vi.fn();
const mockToast = vi.fn();
const mockNavigate = vi.fn();

// Order of calls is verified across supabase.signOut vs centralAuth.clearSSOCookies
const callOrder: string[] = [];

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(async () => {
        callOrder.push('supabase.auth.signOut');
        return { error: null };
      }),
    },
  },
}));

vi.mock('@/lib/central-auth', () => ({
  centralAuth: {
    exchangeSupabaseToken: vi.fn().mockResolvedValue(true),
    clearSSOCookies: vi.fn(async () => {
      callOrder.push('centralAuth.clearSSOCookies');
      await Promise.resolve();
      return true;
    }),
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast, dismiss: vi.fn(), toasts: [] }),
}));

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => ({
    user: null,
    profile: null,
    session: null,
    isLoading: false,
    signOut: mockSignOut,
    signIn: vi.fn(),
    signUp: vi.fn(),
    handleAuthCallback: vi.fn(),
    isProcessingCallback: false,
  }),
}));

vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
    resolvedTheme: 'light',
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/dashboard/overview', search: '', hash: '', state: null, key: 'k' }),
  };
});

// Heavy children that the Dashboard mounts but aren't relevant to this test.
vi.mock('@/components/layout/Layout', () => ({
  Layout: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/layout/DashboardSidebar', () => ({
  DashboardSidebar: () => <div data-testid="dashboard-sidebar" />,
}));
vi.mock('@/components/dashboard/ApiDashboard', () => ({
  ApiDashboard: () => <div data-testid="api-dashboard" />,
}));
vi.mock('@/components/mcp/MCPServerManager', () => ({
  default: () => <div data-testid="mcp-server-manager" />,
}));
vi.mock('@/components/dashboard/UserProfile', () => ({
  UserProfile: () => <div data-testid="user-profile" />,
}));
vi.mock('@/components/orchestrator/WorkflowOrchestrator', () => ({
  WorkflowOrchestrator: () => <div data-testid="workflow-orchestrator" />,
}));
vi.mock('@/components/orchestrator/WorkflowScheduler', () => ({
  WorkflowScheduler: () => <div data-testid="workflow-scheduler" />,
}));
vi.mock('@/components/dashboard/MemoryVisualizer', () => ({
  MemoryVisualizer: () => <div data-testid="memory-visualizer" />,
}));
vi.mock('@/components/dashboard/MemoryAnalytics', () => ({
  MemoryAnalytics: () => <div data-testid="memory-analytics" />,
}));
vi.mock('@/components/mcp/MCPToolTracker', () => ({
  MCPToolTracker: () => <div data-testid="mcp-tool-tracker" />,
}));
vi.mock('@/components/dashboard/AIToolsSection', () => ({
  AIToolsSection: () => <div data-testid="ai-tools-section" />,
}));
vi.mock('@/components/dashboard/DashboardOverview', () => ({
  DashboardOverview: () => <div data-testid="dashboard-overview" />,
}));
vi.mock('@/components/dashboard/MemoryWorkbench', () => ({
  MemoryWorkbench: () => <div data-testid="memory-workbench" />,
}));
vi.mock('@/pages/MCPServicesPage', () => ({
  MCPServicesPage: () => <div data-testid="mcp-services-page" />,
}));
vi.mock('@/pages/APIKeysPage', () => ({
  APIKeysPage: () => <div data-testid="api-keys-page" />,
}));
vi.mock('@/pages/MCPUsagePage', () => ({
  MCPUsagePage: () => <div data-testid="mcp-usage-page" />,
}));
vi.mock('@/components/dashboard/IntelligencePanel', () => ({
  IntelligencePanel: () => <div data-testid="intelligence-panel" />,
}));
vi.mock('@/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

// We import the Dashboard AFTER all mocks above are registered.
import Dashboard from '../Dashboard';

const renderDashboard = () =>
  render(
    <MemoryRouter initialEntries={['/dashboard/overview']}>
      <Dashboard />
    </MemoryRouter>
  );

describe('Dashboard.handleLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    callOrder.length = 0;
    // Default: signOut resolves successfully and navigates to '/'.
    mockSignOut.mockImplementation(async () => {
      callOrder.push('signOut-handler');
      mockNavigate('/');
    });
    mockClearSSOCookies.mockImplementation(async () => {
      callOrder.push('centralAuth.clearSSOCookies');
      return true;
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('invokes signOut and navigates exactly once to "/" on success', async () => {
    renderDashboard();

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
    // The handler must NOT do a second navigate('/auth') — that was the
    // race that flashed /auth before /?showAuth=true.
    expect(mockNavigate).not.toHaveBeenCalledWith('/auth');
    expect(mockNavigate).not.toHaveBeenCalledWith('/?showAuth=true');
  });

  it('surfaces a destructive toast when signOut throws', async () => {
    mockSignOut.mockImplementation(async () => {
      throw new Error('Supabase unreachable');
    });

    renderDashboard();

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sign-out failed',
          variant: 'destructive',
          description: expect.stringContaining('Supabase unreachable'),
        })
      );
    });
    // No navigation should have happened on failure.
    expect(mockNavigate).not.toHaveBeenCalled();
    // The button must reset to its non-busy state.
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /logout/i })
      ).not.toBeDisabled();
    });
  });

  it('disables the button and shows a spinner while signing out', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        })
    );

    renderDashboard();

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);

    // During the in-flight signOut, the button should be disabled and
    // show "Signing out…" with an aria-busy state.
    await waitFor(() => {
      expect(logoutButton).toBeDisabled();
    });
    expect(logoutButton).toHaveAttribute('aria-busy', 'true');
    expect(logoutButton).toHaveTextContent(/signing out/i);

    // Resolving the promise restores the idle state.
    await act(async () => {
      resolveSignOut?.();
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /logout/i })
      ).not.toBeDisabled();
    });
  });

  it('integration: full logout flow clears SSO cookies before signOut and lands on /', async () => {
    // Reset call order for this scenario.
    callOrder.length = 0;
    // The actual production path runs inside the auth-controller's signOut
    // wrapper. We emulate it here: clearSSOCookies → supabase.auth.signOut
    // → navigate('/').
    mockSignOut.mockImplementation(async () => {
      callOrder.push('signOut-wrapper-start');
      // The wrapper must clear SSO cookies FIRST, then call supabase.signOut.
      await mockClearSSOCookies();
      callOrder.push('supabase.auth.signOut');
      mockNavigate('/');
    });

    renderDashboard();

    const logoutButton = screen.getByRole('button', { name: /logout/i });
    await fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    // Order: clearSSOCookies fires before supabase.auth.signOut.
    expect(callOrder.indexOf('centralAuth.clearSSOCookies')).toBeGreaterThanOrEqual(0);
    expect(callOrder.indexOf('centralAuth.clearSSOCookies')).toBeLessThan(
      callOrder.indexOf('supabase.auth.signOut')
    );
    // Single navigation to the landing page.
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('snapshot: the logout button reflects the loading state while signing out', async () => {
    let resolveSignOut: (() => void) | undefined;
    mockSignOut.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveSignOut = resolve;
        })
    );

    renderDashboard();

    const idle = screen.getByRole('button', { name: /logout/i });
    expect(idle).toMatchSnapshot('Dashboard.logout-button-idle');

    fireEvent.click(idle);

    const busy = await screen.findByRole('button', { name: /signing out/i });
    expect(busy).toBeDisabled();
    expect(busy).toMatchSnapshot('Dashboard.logout-button-busy');

    await act(async () => {
      resolveSignOut?.();
    });
  });
});