
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
import { useState } from "react";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSupabaseAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

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

  // Render the active page content
  const renderContent = () => {
    switch (activePage) {
      case 'overview':
        return (
          <div className="space-y-8">
            <UserProfile />
            <ApiDashboard />
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
            <DashboardOverview />
            <MemoryAnalytics />
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
          variant="ghost"
          size="icon"
          className="fixed top-20 left-4 z-50 lg:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        {/* Sidebar */}
        <DashboardSidebar
          className={cn(
            "fixed lg:relative inset-y-0 left-0 z-40 transform transition-transform duration-200 ease-in-out lg:transform-none",
            "top-16 h-[calc(100vh-4rem)]",
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
          onNavigate={() => {
            // Close sidebar on mobile after navigation
            if (window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }}
        />

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {/* Top Bar */}
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
            <div className="flex justify-end items-center px-6 py-3">
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
