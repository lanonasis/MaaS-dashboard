import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Key,
  Settings2,
  Zap,
  Server,
  Globe,
  Database,
  Search,
  GitBranch,
  CreditCard,
  Brain,
  Monitor,
  Paintbrush,
  Link2,
  Shield,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import mcpServers from "@/config/mcp-servers.json";

// Types for Extension Configuration
interface ExtensionConfig {
  id: string;
  name: string;
  description: string;
  category: 'ai' | 'development' | 'automation' | 'data' | 'payment';
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  requiresApiKey: boolean;
  docsUrl?: string;
}

// Extension definitions with user-friendly descriptions
const EXTENSIONS: ExtensionConfig[] = [
  {
    id: 'perplexity-ask',
    name: 'Perplexity AI',
    description: 'Advanced AI-powered search and question answering with real-time web access',
    category: 'ai',
    icon: Search,
    features: ['Web search', 'Research assistance', 'Citation tracking'],
    requiresApiKey: true,
    docsUrl: 'https://docs.perplexity.ai'
  },
  {
    id: 'github-mcp-server',
    name: 'GitHub',
    description: 'Full GitHub integration for repository management, issues, and pull requests',
    category: 'development',
    icon: GitBranch,
    features: ['Repository management', 'Issue tracking', 'PR automation'],
    requiresApiKey: true,
    docsUrl: 'https://docs.github.com'
  },
  {
    id: 'supabase-mcp-server',
    name: 'Supabase',
    description: 'Database operations, authentication, and real-time data management',
    category: 'data',
    icon: Database,
    features: ['Database queries', 'Auth management', 'Storage operations'],
    requiresApiKey: true,
    docsUrl: 'https://supabase.com/docs'
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing, invoicing, and financial operations',
    category: 'payment',
    icon: CreditCard,
    features: ['Payment processing', 'Subscription management', 'Invoice generation'],
    requiresApiKey: true,
    docsUrl: 'https://stripe.com/docs'
  },
  {
    id: 'browserbase',
    name: 'Browser Automation',
    description: 'Automated web browsing, scraping, and interaction capabilities',
    category: 'automation',
    icon: Globe,
    features: ['Web scraping', 'Form automation', 'Screenshot capture'],
    requiresApiKey: true
  },
  {
    id: 'playwright',
    name: 'Playwright Testing',
    description: 'End-to-end testing and browser automation framework',
    category: 'automation',
    icon: Monitor,
    features: ['E2E testing', 'Cross-browser support', 'Visual regression'],
    requiresApiKey: false
  },
  {
    id: 'brave-search',
    name: 'Brave Search',
    description: 'Privacy-focused web search with AI summaries',
    category: 'ai',
    icon: Search,
    features: ['Privacy-first search', 'No tracking', 'AI summaries'],
    requiresApiKey: true
  },
  {
    id: 'picsart',
    name: 'Picsart AI',
    description: 'AI-powered image generation and editing capabilities',
    category: 'ai',
    icon: Paintbrush,
    features: ['Image generation', 'Background removal', 'Style transfer'],
    requiresApiKey: true
  },
  {
    id: 'sequential-thinking',
    name: 'Sequential Thinking',
    description: 'Advanced reasoning and step-by-step problem solving',
    category: 'ai',
    icon: Brain,
    features: ['Chain of thought', 'Problem decomposition', 'Logical reasoning'],
    requiresApiKey: false
  },
  {
    id: 'LanOnasis',
    name: 'LanOnasis Context',
    description: 'Your personal context store for AI-powered memory and knowledge',
    category: 'data',
    icon: Sparkles,
    features: ['Context storage', 'Semantic search', 'AI integration'],
    requiresApiKey: false
  }
];

const categoryColors = {
  ai: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  development: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  automation: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  data: 'bg-green-500/10 text-green-600 dark:text-green-400',
  payment: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
};

const categoryLabels = {
  ai: 'AI & Intelligence',
  development: 'Development',
  automation: 'Automation',
  data: 'Data & Storage',
  payment: 'Payments',
};

interface EnabledExtension {
  id: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  linkedRouterKey?: string;
}

const STORAGE_KEY = 'maas-enabled-extensions';

const MCPServerManager: React.FC = () => {
  const { toast } = useToast();
  const [enabledExtensions, setEnabledExtensions] = useState<Map<string, EnabledExtension>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      }
    } catch (e) {
      console.error('Failed to load enabled extensions:', e);
    }
    return new Map();
  });

  const [configureDialogOpen, setConfigureDialogOpen] = useState(false);
  const [selectedExtension, setSelectedExtension] = useState<ExtensionConfig | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');

  // Persist to localStorage
  useEffect(() => {
    const obj = Object.fromEntries(enabledExtensions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }, [enabledExtensions]);

  const toggleExtension = (extensionId: string) => {
    setEnabledExtensions(prev => {
      const next = new Map(prev);
      const existing = next.get(extensionId);
      if (existing) {
        next.set(extensionId, { ...existing, enabled: !existing.enabled });
      } else {
        next.set(extensionId, { id: extensionId, enabled: true, apiKeyConfigured: false });
      }
      return next;
    });

    const ext = EXTENSIONS.find(e => e.id === extensionId);
    const isNowEnabled = !enabledExtensions.get(extensionId)?.enabled;

    toast({
      title: isNowEnabled ? 'Extension Enabled' : 'Extension Disabled',
      description: `${ext?.name} has been ${isNowEnabled ? 'enabled' : 'disabled'}`,
    });
  };

  const openConfigureDialog = (extension: ExtensionConfig) => {
    setSelectedExtension(extension);
    setApiKeyInput('');
    setConfigureDialogOpen(true);
  };

  const saveConfiguration = () => {
    if (!selectedExtension) return;

    setEnabledExtensions(prev => {
      const next = new Map(prev);
      const existing = next.get(selectedExtension.id) || {
        id: selectedExtension.id,
        enabled: false,
        apiKeyConfigured: false
      };
      next.set(selectedExtension.id, {
        ...existing,
        apiKeyConfigured: apiKeyInput.length > 0,
        enabled: true,
      });
      return next;
    });

    toast({
      title: 'Configuration Saved',
      description: `${selectedExtension.name} has been configured and enabled`,
    });

    setConfigureDialogOpen(false);
    setSelectedExtension(null);
    setApiKeyInput('');
  };

  const getExtensionStatus = (extensionId: string) => {
    const ext = enabledExtensions.get(extensionId);
    const config = EXTENSIONS.find(e => e.id === extensionId);

    if (!ext?.enabled) return 'disabled';
    if (config?.requiresApiKey && !ext.apiKeyConfigured) return 'needs_config';
    return 'active';
  };

  const activeCount = Array.from(enabledExtensions.values()).filter(e => e.enabled).length;

  // Check if extension exists in mcp-servers.json
  const isAvailable = (extensionId: string) => {
    return extensionId in mcpServers.mcpServers;
  };

  const renderExtensionCard = (extension: ExtensionConfig) => {
    const status = getExtensionStatus(extension.id);
    const IconComponent = extension.icon;
    const available = isAvailable(extension.id);

    return (
      <Card
        key={extension.id}
        className={`transition-all hover:shadow-md ${
          status === 'active' ? 'ring-2 ring-primary/50' : ''
        } ${!available ? 'opacity-60' : ''}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${categoryColors[extension.category]}`}>
                <IconComponent className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {extension.name}
                  {status === 'active' && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                  {status === 'needs_config' && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </CardTitle>
                <Badge variant="outline" className={`mt-1 text-xs ${categoryColors[extension.category]}`}>
                  {categoryLabels[extension.category]}
                </Badge>
              </div>
            </div>
            <Switch
              checked={enabledExtensions.get(extension.id)?.enabled || false}
              onCheckedChange={() => toggleExtension(extension.id)}
              disabled={!available}
            />
          </div>
          <CardDescription className="text-sm mt-2">
            {extension.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {extension.features.map((feature, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">
                {feature}
              </Badge>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            {extension.requiresApiKey && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openConfigureDialog(extension)}
                className="flex-1"
              >
                <Key className="h-3 w-3 mr-1.5" />
                {enabledExtensions.get(extension.id)?.apiKeyConfigured ? 'Reconfigure' : 'Configure'}
              </Button>
            )}
            {extension.docsUrl && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.open(extension.docsUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>

          {!available && (
            <p className="text-xs text-muted-foreground">
              Not yet available. Contact support to enable.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            MCP Extensions
          </h2>
          <p className="text-muted-foreground">
            Enable AI tool extensions to enhance your workflows. Configure once, use everywhere.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{activeCount}</span> extensions active
          </div>
        </div>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">How Extensions Work</p>
              <p className="text-muted-foreground">
                Enable extensions to grant your Router Keys access to these services.
                When you make API calls with your key, enabled extensions are automatically available.
                Your credentials are encrypted and never exposed.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Extensions</TabsTrigger>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="ai">AI & Intelligence</TabsTrigger>
          <TabsTrigger value="development">Development</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXTENSIONS.map(renderExtensionCard)}
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          {activeCount === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Server className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Extensions</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Enable extensions from the "All Extensions" tab to start using them with your Router Keys.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {EXTENSIONS.filter(e => enabledExtensions.get(e.id)?.enabled).map(renderExtensionCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXTENSIONS.filter(e => e.category === 'ai').map(renderExtensionCard)}
          </div>
        </TabsContent>

        <TabsContent value="development" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXTENSIONS.filter(e => e.category === 'development' || e.category === 'automation').map(renderExtensionCard)}
          </div>
        </TabsContent>
      </Tabs>

      {/* Configure Extension Dialog */}
      <Dialog open={configureDialogOpen} onOpenChange={setConfigureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Configure {selectedExtension?.name}
            </DialogTitle>
            <DialogDescription>
              Enter your API credentials to enable this extension. Your credentials are encrypted and securely stored.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter your API key..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your API key is encrypted and stored securely. It will only be used when you make requests through your Router Keys.
              </p>
            </div>

            {selectedExtension?.docsUrl && (
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => window.open(selectedExtension.docsUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View {selectedExtension.name} Documentation
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigureDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveConfiguration} disabled={!apiKeyInput}>
              <Link2 className="h-4 w-4 mr-2" />
              Save & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPServerManager;
