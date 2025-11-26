
import { Layout } from "@/components/layout/Layout";
import { ApiDashboard } from "@/components/dashboard/ApiDashboard";
import MCPServerManager from "@/components/mcp/MCPServerManager";
import { UserProfile } from "@/components/dashboard/UserProfile";
import { WorkflowOrchestrator } from "@/components/orchestrator/WorkflowOrchestrator";
import { WorkflowScheduler } from "@/components/orchestrator/WorkflowScheduler";
import { MemoryVisualizer } from "@/components/dashboard/MemoryVisualizer";
import { MemoryAnalytics } from "@/components/dashboard/MemoryAnalytics";
import { MCPToolTracker } from "@/components/mcp/MCPToolTracker";
import { AIToolsSection } from "@/components/dashboard/AIToolsSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Sun,
  Moon,
  Laptop,
  User,
  Key,
  Zap,
  Settings,
  Database,
  Upload,
  Eye,
  BarChart3,
  Activity,
  Calendar,
  Brain,
  LogOut
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

const Dashboard = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useSupabaseAuth();

  // Determine active tab based on route
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/api-keys')) return 'api-keys';
    if (path.includes('/orchestrator')) return 'orchestrator';
    if (path.includes('/scheduler')) return 'scheduler';
    if (path.includes('/memory-visualizer')) return 'memory-visualizer';
    if (path.includes('/memory-analytics')) return 'memory-analytics';
    if (path.includes('/mcp-tracking')) return 'mcp-tracking';
    if (path.includes('/ai-tools')) return 'ai-tools';
    if (path.includes('/extensions')) return 'extensions';
    if (path.includes('/upload')) return 'upload';
    return 'overview';
  };

  const handleTabChange = (value: string) => {
    if (value === 'overview') {
      navigate('/dashboard');
    } else {
      navigate(`/dashboard/${value}`);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-6">
          <Button asChild variant="outline" size="sm" className="gap-2">
            <a href="https://www.lanonasis.com">
              <Home className="h-4 w-4" />
              Return to Homepage
            </a>
          </Button>

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
        
        <Tabs value={getActiveTab()} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-2">
            <TabsTrigger value="overview" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Key className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">API</span><span className="sm:hidden">Keys</span><span className="hidden sm:inline"> Keys</span>
            </TabsTrigger>
            <TabsTrigger value="orchestrator" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Zap className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden md:inline">Orchestrator</span><span className="md:hidden">Orch</span>
              <Badge variant="secondary" className="text-[10px] md:text-xs hidden md:inline">New</Badge>
            </TabsTrigger>
            <TabsTrigger value="ai-tools" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Brain className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">AI Tools</span><span className="sm:hidden">AI</span>
              <Badge variant="secondary" className="text-[10px] md:text-xs hidden md:inline">New</Badge>
            </TabsTrigger>
            <TabsTrigger value="memory-visualizer" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Eye className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Memory</span><span className="sm:hidden">Mem</span>
            </TabsTrigger>
            <TabsTrigger value="memory-analytics" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Analytics</span><span className="sm:hidden">Ana</span>
            </TabsTrigger>
            <TabsTrigger value="mcp-tracking" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Activity className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Tracking</span><span className="sm:hidden">Trk</span>
            </TabsTrigger>
            <TabsTrigger value="scheduler" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Calendar className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Schedule</span><span className="sm:hidden">Sch</span>
            </TabsTrigger>
            <TabsTrigger value="extensions" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm">
              <Settings className="h-3 w-3 md:h-4 md:w-4" />
              MCP
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            <UserProfile />
            <ApiDashboard />
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <h3 className="text-lg font-semibold">Welcome to Your Dashboard</h3>
                  <p className="text-gray-600">
                    Manage your API keys, configure MCP servers, and orchestrate intelligent workflows.
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => handleTabChange('orchestrator')} className="gap-2">
                      <Zap className="h-4 w-4" />
                      Try AI Orchestrator
                    </Button>
                    <Button onClick={() => handleTabChange('api-keys')} variant="outline" className="gap-2">
                      <Key className="h-4 w-4" />
                      Manage API Keys
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiDashboard />
          </TabsContent>

          <TabsContent value="orchestrator">
            <WorkflowOrchestrator />
          </TabsContent>

          <TabsContent value="ai-tools">
            <AIToolsSection />
          </TabsContent>

          <TabsContent value="memory-visualizer">
            <MemoryVisualizer />
          </TabsContent>

          <TabsContent value="memory-analytics">
            <MemoryAnalytics />
          </TabsContent>

          <TabsContent value="mcp-tracking">
            <MCPToolTracker />
          </TabsContent>

          <TabsContent value="scheduler">
            <WorkflowScheduler />
          </TabsContent>

          <TabsContent value="extensions">
            <MCPServerManager />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Dashboard;
