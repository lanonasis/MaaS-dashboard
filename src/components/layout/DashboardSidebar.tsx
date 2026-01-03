/**
 * Dashboard Sidebar Navigation
 * Organized navigation with grouped sections
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  User,
  Key,
  Zap,
  Brain,
  Eye,
  BarChart3,
  Activity,
  Calendar,
  Box,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronRight,
  Home,
  Database,
  Workflow,
  Server,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    defaultOpen: true,
    items: [
      { id: 'overview', label: 'Overview', icon: User, path: '/dashboard' },
    ],
  },
  {
    id: 'mcp',
    title: 'MCP Router',
    icon: Server,
    defaultOpen: true,
    items: [
      { id: 'mcp-services', label: 'Services', icon: Box, path: '/dashboard/mcp-services', badge: 'New' },
      { id: 'api-keys', label: 'API Keys', icon: Key, path: '/dashboard/api-keys' },
      { id: 'mcp-usage', label: 'Usage Analytics', icon: TrendingUp, path: '/dashboard/mcp-usage' },
      { id: 'mcp-tracking', label: 'Request Tracking', icon: Activity, path: '/dashboard/mcp-tracking' },
      { id: 'extensions', label: 'MCP Extensions', icon: Settings, path: '/dashboard/extensions' },
    ],
  },
  {
    id: 'ai',
    title: 'AI & Workflows',
    icon: Workflow,
    defaultOpen: true,
    items: [
      { id: 'orchestrator', label: 'Orchestrator', icon: Zap, path: '/dashboard/orchestrator', badge: 'New' },
      { id: 'ai-tools', label: 'AI Tools', icon: Brain, path: '/dashboard/ai-tools', badge: 'New' },
      { id: 'scheduler', label: 'Scheduler', icon: Calendar, path: '/dashboard/scheduler' },
    ],
  },
  {
    id: 'memory',
    title: 'Memory',
    icon: Database,
    defaultOpen: false,
    items: [
      { id: 'memory-visualizer', label: 'Visualizer', icon: Eye, path: '/dashboard/memory-visualizer' },
      { id: 'memory-analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/memory-analytics' },
    ],
  },
];

interface DashboardSidebarProps {
  onNavigate?: (path: string) => void;
  className?: string;
}

export function DashboardSidebar({ onNavigate, className }: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    NAV_SECTIONS.forEach(section => {
      if (section.defaultOpen) initial.add(section.id);
    });
    return initial;
  });

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.(path);
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className={cn("w-64 border-r border-border bg-card/50 flex flex-col", className)}>
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {NAV_SECTIONS.map((section) => {
            const isOpen = openSections.has(section.id);
            const SectionIcon = section.icon;
            const hasActiveItem = section.items.some(item => isActive(item.path));

            return (
              <div key={section.id} className="mb-2">
                {/* Section Header */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    hasActiveItem
                      ? "text-foreground bg-muted/50"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <SectionIcon className="h-4 w-4" />
                    {section.title}
                  </span>
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>

                {/* Section Items */}
                {isOpen && (
                  <div className="mt-1 ml-4 pl-2 border-l border-border/50 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const active = isActive(item.path);

                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigate(item.path)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <ItemIcon className="h-4 w-4" />
                            {item.label}
                          </span>
                          {item.badge && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {item.badge}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-xs"
          asChild
        >
          <a href="https://www.lanonasis.com">
            <Home className="h-3 w-3" />
            Return to Homepage
          </a>
        </Button>
      </div>
    </aside>
  );
}

export default DashboardSidebar;
