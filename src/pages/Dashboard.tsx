
import { Layout } from "@/components/layout/Layout";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { ApiDashboard } from "@/components/dashboard/ApiDashboard";
import MCPServerManager from "@/components/mcp/MCPServerManager";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { WorkflowOrchestrator } from "@/components/orchestrator/WorkflowOrchestrator";
import { WorkflowScheduler } from "@/components/orchestrator/WorkflowScheduler";
import { MemoryVisualizer } from "@/components/dashboard/MemoryVisualizer";
import { MemoryAnalytics } from "@/components/dashboard/MemoryAnalytics";
import { MCPToolTracker } from "@/components/mcp/MCPToolTracker";
import { AIToolsSection } from "@/components/dashboard/AIToolsSection";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { MemoryWorkbench } from "@/components/dashboard/MemoryWorkbench";
import { MCPServicesPage } from "@/pages/MCPServicesPage";
import { APIKeysPage } from "@/pages/APIKeysPage";
import { MCPUsagePage } from "@/pages/MCPUsagePage";
import { IntelligencePanel } from "@/components/dashboard/IntelligencePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sun,
  Moon,
  Laptop,
  Key,
  Zap,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLocation, useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

const SIDEBAR_COLLAPSED_KEY = 'maas-sidebar-collapsed';
const DESKTOP_BREAKPOINT = 1024;

const PAGE_META: Record<string, { title: string; subtitle?: string }> = {
  'overview':          { title: 'Overview' },
  'api-keys':          { title: 'Router Keys',       subtitle: 'Manage API access keys' },
  'orchestrator':      { title: 'Orchestrator',      subtitle: 'AI workflow automation' },
  'ai-tools':          { title: 'AI Tools' },
  'memory-visualizer': { title: 'Context Explorer' },
  'memory-analytics':  { title: 'Context Analytics' },
  'mcp-tracking':      { title: 'Request Tracking' },
  'scheduler':         { title: 'Scheduler' },
  'mcp-services':      { title: 'API Services' },
  'mcp-usage':         { title: 'Usage Analytics' },
  'extensions':        { title: 'MCP Extensions' },
};

const Dashboard = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSupabaseAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const pageTitleRef = useRef<HTMLHeadingElement>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= DESKTOP_BREAKPOINT;
  });

  const syncBodyScrollLock = useCallback((shouldLock: boolean) => {
    if (typeof document === "undefined") return;

    if (shouldLock) {
      if (previousBodyOverflowRef.current === null) {
        previousBodyOverflowRef.current = document.body.style.overflow;
      }
      document.body.style.overflow = "hidden";
      return;
    }

    if (previousBodyOverflowRef.current !== null) {
      document.body.style.overflow = previousBodyOverflowRef.current;
      previousBodyOverflowRef.current = null;
    }
  }, []);

  // Close mobile drawer and return focus to the toggle button
  const closeSidebar = (focusTarget?: HTMLElement | null) => {
    setSidebarOpen(false);
    requestAnimationFrame(() => (focusTarget ?? toggleButtonRef.current)?.focus());
  };
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const handleCollapsedChange = (value: boolean) => {
    setCollapsed(value);
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
    } catch (e) {
      console.warn('Failed to save sidebar collapsed state:', e);
    }
  };

  // Escape key closes mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen && !isDesktopViewport) {
        closeSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDesktopViewport, sidebarOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Move focus into sidebar when drawer opens on mobile
  useEffect(() => {
    if (sidebarOpen && !isDesktopViewport) {
      const sidebar = document.getElementById('dashboard-sidebar');
      const firstFocusable = sidebar?.querySelector<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }
  }, [isDesktopViewport, sidebarOpen]);

  // Body scroll lock while mobile drawer is open; restored on resize past breakpoint
  useEffect(() => {
    const shouldLock = sidebarOpen && !isDesktopViewport;
    syncBodyScrollLock(shouldLock);
    if (!shouldLock) return;

    return () => {
      syncBodyScrollLock(false);
    };
  }, [isDesktopViewport, sidebarOpen, syncBodyScrollLock]);

  // Determine active page based on route
  const getActivePage = () => {
    const path = location.pathname;
    if (path.includes('/api-keys')) return 'api-keys';
    if (path.includes('/orchestrator')) return 'orchestrator';
    if (path.includes('/scheduler')) return 'scheduler';
    if (path.includes('/memory-visualizer')) return 'memory-visualizer';
    if (path.includes('/memory-analytics')) return 'memory-analytics';
    if (path.includes('/mcp-tracking')) return 'mcp-tracking';
    if (path.includes('/mcp-services')) return 'mcp-services';
    if (path.includes('/mcp-usage')) return 'mcp-usage';
    if (path.includes('/ai-tools')) return 'ai-tools';
    if (path.includes('/extensions')) return 'extensions';
    return 'overview';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const activePage = getActivePage();
  const pageMeta = PAGE_META[activePage] ?? { title: 'Dashboard' };

  useEffect(() => {
    document.title = `${pageMeta.title} | MaaS Dashboard`;
  }, [pageMeta.title]);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      setIsDesktopViewport(desktop);
      syncBodyScrollLock(sidebarOpen && !desktop);
      if (desktop) {
        setSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarOpen, syncBodyScrollLock]);

  // Render the active page content
  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return (
          <div className="space-y-8">
            <UserProfile />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ApiDashboard />
              </div>
              <div className="lg:col-span-1">
                <IntelligencePanel compact />
              </div>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Welcome to Your Dashboard</h3>
                  <p className="text-muted-foreground">
                    Manage your API keys, configure MCP servers, and orchestrate intelligent workflows.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => navigate('/dashboard/orchestrator')} className="gap-2">
                      <Zap className="h-4 w-4" />
                      Try AI Orchestrator
                    </Button>
                    <Button onClick={() => navigate('/dashboard/api-keys')} variant="outline" className="gap-2">
                      <Key className="h-4 w-4" />
                      Manage API Keys
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'api-keys':
        return <APIKeysPage />;
      case 'orchestrator':
        return <WorkflowOrchestrator />;
      case 'ai-tools':
        return <AIToolsSection />;
      case 'memory-visualizer':
        return (
          <div className="space-y-8">
            <MemoryWorkbench />
            <MemoryVisualizer />
          </div>
        );
      case 'memory-analytics':
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <DashboardOverview />
                <MemoryAnalytics />
              </div>
              <div className="lg:col-span-1">
                <IntelligencePanel />
              </div>
            </div>
          </div>
        );
      case 'mcp-tracking':
        return <MCPToolTracker />;
      case 'scheduler':
        return <WorkflowScheduler />;
      case 'mcp-services':
        return <MCPServicesPage />;
      case 'mcp-usage':
        return <MCPUsagePage />;
      case 'extensions':
        return <MCPServerManager />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Mobile Sidebar Toggle */}
        <Button
          ref={toggleButtonRef}
          variant="ghost"
          size="icon"
          className="fixed top-16 left-4 z-50 lg:hidden"
          onClick={() => sidebarOpen ? closeSidebar() : setSidebarOpen(true)}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          aria-expanded={sidebarOpen}
          aria-controls="dashboard-sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Sidebar */}
        <DashboardSidebar
          id="dashboard-sidebar"
          isInteractive={isDesktopViewport || sidebarOpen}
          className={cn(
            "fixed lg:static left-0 top-16 bottom-0 z-40 transform transition-transform duration-200 ease-in-out lg:transform-none",
            "lg:h-auto",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          collapsed={collapsed}
          onCollapsedChange={handleCollapsedChange}
          onNavigate={() => {
            // Close sidebar on mobile after navigation
            if (!isDesktopViewport) {
              closeSidebar(pageTitleRef.current);
            }
          }}
        />

        {/* Mobile Overlay */}
        {!isDesktopViewport && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex justify-between items-center px-6 py-3">
              {/* Page title */}
              <div className="flex flex-col min-w-0">
                <h1
                  ref={pageTitleRef}
                  tabIndex={-1}
                  className="text-base font-semibold leading-tight truncate focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {pageMeta.title}
                </h1>
                {pageMeta.subtitle && (
                  <p className="text-xs text-muted-foreground truncate">{pageMeta.subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label="Theme settings"
                    >
                      {resolvedTheme === "dark" ? (
                        <Moon className="h-5 w-5" />
                      ) : (
                        <Sun className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      <Laptop className="h-4 w-4 mr-2" />
                      System
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Page Content */}
          <div className="p-6 lg:p-8">
            {renderContent()}
          </div>
        </main>
      </div>
    </Layout>
  );
};

export default Dashboard;
