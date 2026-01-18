/**
 * Dashboard Sidebar Navigation
 * Organized navigation with grouped sections
 * Enhanced with search, keyboard shortcuts, and quick actions
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  Search,
  Command,
  Clock,
  Star,
  PanelLeftClose,
  PanelLeft,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  shortcut?: string; // Keyboard shortcut hint
}

interface NavSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultOpen?: boolean;
}

// Recent pages stored in localStorage
const RECENT_PAGES_KEY = 'maas-recent-pages';
const MAX_RECENT_PAGES = 5;

const NAV_SECTIONS: NavSection[] = [
  {
    id: 'home',
    title: 'Home',
    icon: Home,
    defaultOpen: true,
    items: [
      { id: 'overview', label: 'Overview', icon: User, path: '/dashboard', shortcut: 'G H' },
    ],
  },
  {
    id: 'mcp',
    title: 'MCP Router',
    icon: Server,
    defaultOpen: true,
    items: [
      { id: 'mcp-services', label: 'Services', icon: Box, path: '/dashboard/mcp-services', badge: 'New', shortcut: 'G S' },
      { id: 'api-keys', label: 'Router Keys', icon: Key, path: '/dashboard/api-keys', shortcut: 'G K' },
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
      { id: 'orchestrator', label: 'Orchestrator', icon: Zap, path: '/dashboard/orchestrator', badge: 'New', shortcut: 'G O' },
      { id: 'ai-tools', label: 'AI Tools', icon: Brain, path: '/dashboard/ai-tools', badge: 'New', shortcut: 'G A' },
      { id: 'scheduler', label: 'Scheduler', icon: Calendar, path: '/dashboard/scheduler' },
    ],
  },
  {
    id: 'memory',
    title: 'Memory',
    icon: Database,
    defaultOpen: false,
    items: [
      { id: 'memory-visualizer', label: 'Visualizer', icon: Eye, path: '/dashboard/memory-visualizer', shortcut: 'G M' },
      { id: 'memory-analytics', label: 'Analytics', icon: BarChart3, path: '/dashboard/memory-analytics' },
    ],
  },
];

// Flatten all nav items for search
const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap(section =>
  section.items.map(item => ({ ...item, section: section.title }))
);

interface RecentPage {
  path: string;
  label: string;
  timestamp: number;
}

interface DashboardSidebarProps {
  onNavigate?: (path: string) => void;
  className?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function DashboardSidebar({
  onNavigate,
  className,
  collapsed = false,
  onCollapsedChange
}: DashboardSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openSections, setOpenSections] = React.useState<Set<string>>(() => {
    const initial = new Set<string>();
    NAV_SECTIONS.forEach(section => {
      if (section.defaultOpen) initial.add(section.id);
    });
    return initial;
  });

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // Recent pages state
  const [recentPages, setRecentPages] = React.useState<RecentPage[]>(() => {
    try {
      const stored = localStorage.getItem(RECENT_PAGES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Favorites state
  const [favorites, setFavorites] = React.useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('maas-favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return ALL_NAV_ITEMS.filter(item =>
      item.label.toLowerCase().includes(query) ||
      item.section.toLowerCase().includes(query)
    ).slice(0, 5);
  }, [searchQuery]);

  // Track recent pages
  const trackRecentPage = useCallback((path: string, label: string) => {
    setRecentPages(prev => {
      const filtered = prev.filter(p => p.path !== path);
      const updated = [{ path, label, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT_PAGES);
      localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((path: string) => {
    setFavorites(prev => {
      const updated = prev.includes(path)
        ? prev.filter(p => p !== path)
        : [...prev, path];
      localStorage.setItem('maas-favorites', JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('sidebar-search');
        searchInput?.focus();
      }

      // Cmd/Ctrl + B to toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        onCollapsedChange?.(!collapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [collapsed, onCollapsedChange]);

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

  const handleNavigate = (path: string, label?: string) => {
    navigate(path);
    onNavigate?.(path);
    if (label) {
      trackRecentPage(path, label);
    }
    setSearchQuery('');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Get favorite items
  const favoriteItems = useMemo(() => {
    return ALL_NAV_ITEMS.filter(item => favorites.includes(item.path));
  }, [favorites]);

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "min-h-full border-r border-border bg-card flex flex-col shadow-lg transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Sidebar Header with Search */}
        <div className="p-3 border-b border-border space-y-3">
          {/* Collapse Toggle */}
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">MaaS Dashboard</span>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onCollapsedChange?.(!collapsed)}
                >
                  {collapsed ? (
                    <PanelLeft className="h-4 w-4" />
                  ) : (
                    <PanelLeftClose className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{collapsed ? 'Expand' : 'Collapse'} sidebar</p>
                <p className="text-xs text-muted-foreground">Ctrl+B</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Search Input */}
          {!collapsed && (
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="sidebar-search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                className="pl-8 pr-8 h-9 text-sm bg-muted/50"
              />
              <kbd className="absolute right-2 top-2 pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          )}

          {/* Search Results Dropdown */}
          {!collapsed && isSearchFocused && searchResults.length > 0 && (
            <div className="absolute left-3 right-3 top-[120px] z-50 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
              {searchResults.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path, item.label)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
                  >
                    <ItemIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">{item.section}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="px-2 space-y-1">
            {/* Favorites Section */}
            {!collapsed && favoriteItems.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Star className="h-3 w-3" />
                  Favorites
                </div>
                <div className="space-y-0.5">
                  {favoriteItems.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <button
                        key={`fav-${item.id}`}
                        onClick={() => handleNavigate(item.path, item.label)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent Pages Section */}
            {!collapsed && recentPages.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  Recent
                </div>
                <div className="space-y-0.5">
                  {recentPages.slice(0, 3).map((page) => {
                    const navItem = ALL_NAV_ITEMS.find(item => item.path === page.path);
                    const ItemIcon = navItem?.icon || Home;
                    const active = isActive(page.path);
                    return (
                      <button
                        key={`recent-${page.path}`}
                        onClick={() => handleNavigate(page.path, page.label)}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          active
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        )}
                      >
                        <ItemIcon className="h-4 w-4" />
                        {page.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Main Navigation Sections */}
            {NAV_SECTIONS.map((section) => {
              const isOpen = openSections.has(section.id);
              const SectionIcon = section.icon;
              const hasActiveItem = section.items.some(item => isActive(item.path));

              return (
                <div key={section.id} className="mb-1">
                  {/* Section Header */}
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => {
                            if (section.items.length === 1) {
                              handleNavigate(section.items[0].path, section.items[0].label);
                            } else {
                              toggleSection(section.id);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center justify-center p-2 rounded-md transition-colors",
                            hasActiveItem
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          )}
                        >
                          <SectionIcon className="h-5 w-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{section.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
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
                  )}

                  {/* Section Items - Fixed with solid background */}
                  {!collapsed && isOpen && (
                    <div className="mt-1 ml-4 pl-2 border-l border-border/50 space-y-0.5 bg-card">
                      {section.items.map((item) => {
                        const ItemIcon = item.icon;
                        const active = isActive(item.path);
                        const isFavorite = favorites.includes(item.path);

                        return (
                          <div
                            key={item.id}
                            className="group flex items-center"
                          >
                            <button
                              onClick={() => handleNavigate(item.path, item.label)}
                              className={cn(
                                "flex-1 flex items-center justify-between px-3 py-1.5 rounded-md text-sm transition-colors",
                                active
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <ItemIcon className="h-4 w-4" />
                                {item.label}
                              </span>
                              <span className="flex items-center gap-1">
                                {item.shortcut && (
                                  <kbd className="hidden group-hover:inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] font-medium text-muted-foreground">
                                    {item.shortcut}
                                  </kbd>
                                )}
                                {item.badge && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {item.badge}
                                  </Badge>
                                )}
                              </span>
                            </button>
                            {/* Favorite toggle */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.path);
                              }}
                              className={cn(
                                "p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity",
                                isFavorite
                                  ? "text-yellow-500"
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Star className={cn("h-3 w-3", isFavorite && "fill-current")} />
                            </button>
                          </div>
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
        <div className="p-3 border-t border-border space-y-2">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full"
                  asChild
                >
                  <a href="https://www.lanonasis.com">
                    <Home className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Return to Homepage</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <>
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
              <p className="text-[10px] text-muted-foreground text-center">
                Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono">?</kbd> for shortcuts
              </p>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}

export default DashboardSidebar;
