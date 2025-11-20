import React, { useState } from "react";
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Lightbulb, 
  Terminal, 
  FileCode, 
  Hash, 
  Calendar, 
  SendHorizontal,
  Copy,
  Check,
  Brain,
  Zap,
  Key,
  LogOut,
  User,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  Globe,
  Shield
} from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

// Mock Data for Memories
const MOCK_MEMORIES = [
  {
    id: "1",
    title: "Onasis-CORE - Development TODO",
    type: "todo",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Implement vector storage for context persistence.",
    icon: Terminal
  },
  {
    id: "2",
    title: "Code from /vscode-api-guidelines.md",
    type: "code",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Follow the strict API guidelines for extension development.",
    icon: FileCode
  },
  {
    id: "3",
    title: "Code from /lanonasis-maas/.kiro/ide-extension-ux-enhancement/requirements.md",
    type: "code",
    date: new Date(2025, 10, 14),
    tags: ["2"],
    content: "Requirements for the UX enhancement of the IDE extension.",
    icon: FileCode
  },
  {
    id: "4",
    title: "CLI v3.2.13+ Features & Capabilities (Nov 2025)",
    type: "docs",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "New CLI features include auto-completion and faster indexing.",
    icon: Hash
  },
  {
    id: "5",
    title: "Documentation Status & Gap Analysis (Nov 2025)",
    type: "docs",
    date: new Date(2025, 10, 13),
    tags: ["5"],
    content: "Gap analysis shows missing docs for the new vector API.",
    icon: Hash
  },
  {
    id: "6",
    title: "MCP Server Status - 17 Tools Production Ready (Nov 2025)",
    type: "status",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "17 tools are now production ready on the MCP server.",
    icon: Zap
  },
  {
    id: "7",
    title: "CI/CD & Workflow Improvements (Nov 2025)",
    type: "workflow",
    date: new Date(2025, 10, 13),
    tags: ["6"],
    content: "Improved CI/CD pipelines with faster build times.",
    icon: Terminal
  }
];

const MOCK_API_KEYS = [
  { id: "key_1", name: "Production Key", scope: "read:write", created: "2025-10-01", lastUsed: "Just now" },
  { id: "key_2", name: "Development Key", scope: "read", created: "2025-11-15", lastUsed: "2 hours ago" },
];

const MemoryCard = ({ memory }: { memory: typeof MOCK_MEMORIES[0] }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(memory.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -5 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "group relative flex flex-col gap-1.5 rounded-sm p-2 hover:bg-[var(--vscode-list-hoverBackground)] transition-colors duration-100 cursor-pointer border border-transparent hover:border-[var(--vscode-focusBorder)]",
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`memory-card-${memory.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
            <memory.icon className="h-3.5 w-3.5 text-[var(--vscode-editor-foreground)] opacity-70 shrink-0" />
            <h3 className="text-[13px] text-[var(--vscode-editor-foreground)] leading-tight line-clamp-1">
            {memory.title}
            </h3>
        </div>
        {isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-[var(--vscode-editor-foreground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)] -mt-0.5 -mr-1 shrink-0 rounded-sm"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 text-[11px] text-[var(--vscode-descriptionForeground)] pl-5.5">
        <div className="flex items-center gap-1 opacity-60">
          <span>{format(memory.date, "MMM d")}</span>
        </div>
        {memory.tags.map((tag) => (
          <div key={tag} className="flex items-center gap-0.5 px-1 rounded bg-[var(--vscode-badge-background)]/10 text-[var(--vscode-editor-foreground)] opacity-60">
            <Hash className="h-2.5 w-2.5" />
            <span>{tag}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

const WelcomeView = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="p-4 space-y-6 select-none">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[var(--vscode-editor-foreground)]">Welcome to Lanonasis Memory</h2>
        </div>
        <p className="text-[13px] text-[var(--vscode-descriptionForeground)] leading-relaxed">
          Authenticate to access synchronized context and scoped API keys.
        </p>
        
        <div className="space-y-2 pt-2">
          <Button 
            className="w-full vscode-button"
            onClick={onLogin}
            data-testid="btn-connect-browser"
          >
            Connect in Browser
          </Button>
          <Button 
            className="w-full vscode-button vscode-button-secondary"
            onClick={onLogin}
            data-testid="btn-enter-key"
          >
            Enter API Key
          </Button>
        </div>
      </div>

      <div className="h-px bg-[var(--vscode-panel-border)] w-full" />

      <div className="space-y-4">
        <h3 className="text-[11px] font-bold text-[var(--vscode-editor-foreground)] uppercase opacity-80">Features</h3>
        
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="mt-0.5">
               <Brain className="h-4 w-4 text-[var(--vscode-button-background)]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">Intelligent Memory</h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Vector search and semantic understanding for your codebase.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5">
               <Globe className="h-4 w-4 text-[var(--vscode-button-background)]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[12px] font-medium text-[var(--vscode-editor-foreground)]">Real-time Sync</h4>
              <p className="text-[11px] text-[var(--vscode-descriptionForeground)] leading-relaxed opacity-80">
                Synchronized context across all your devices.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ApiKeyManager = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[var(--vscode-editor-background)] border-[var(--vscode-panel-border)] text-[var(--vscode-editor-foreground)] max-w-md gap-0 p-0 overflow-hidden shadow-2xl">
        <DialogHeader className="p-4 border-b border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBarSectionHeader-background)]">
          <DialogTitle className="text-[13px] font-semibold flex items-center gap-2">
            <Key className="h-4 w-4 text-[var(--vscode-button-background)]" />
            Manage Scoped API Keys
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--vscode-descriptionForeground)] uppercase">Create New Key</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Key Name (e.g., CI/CD Pipeline)" 
                className="vscode-input h-7 text-[13px]"
              />
              <Button size="sm" className="vscode-button h-7">
                Generate
              </Button>
            </div>
          </div>

          <div className="h-px bg-[var(--vscode-panel-border)] w-full" />

          <div className="space-y-2">
            <label className="text-[11px] font-medium text-[var(--vscode-descriptionForeground)] uppercase">Active Keys</label>
            {MOCK_API_KEYS.map(key => (
              <div key={key.id} className="flex items-center justify-between p-2 rounded-sm hover:bg-[var(--vscode-list-hoverBackground)] border border-transparent hover:border-[var(--vscode-focusBorder)] group">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium">{key.name}</span>
                    <Badge variant="outline" className="text-[10px] border-[var(--vscode-panel-border)] text-[var(--vscode-descriptionForeground)] h-4 px-1 font-normal">
                      {key.scope}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[var(--vscode-descriptionForeground)] opacity-70">Last used: {key.lastUsed}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-[var(--vscode-descriptionForeground)] hover:text-[var(--vscode-editor-foreground)] opacity-0 group-hover:opacity-100 transition-opacity">
                   <Briefcase className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter className="p-2 border-t border-[var(--vscode-panel-border)] bg-[var(--vscode-sideBar-background)]">
          <Button variant="secondary" size="sm" onClick={onClose} className="vscode-button vscode-button-secondary h-6 text-[12px]">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const IdePanel = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [showApiKeys, setShowApiKeys] = useState(false);
  
  // Collapsible States
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [isMemoriesOpen, setIsMemoriesOpen] = useState(true);

  const filteredMemories = MOCK_MEMORIES.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[var(--vscode-sideBar-background)] text-[var(--vscode-sideBar-foreground)] font-sans overflow-hidden justify-center select-none">
      {/* Sidebar Container */}
      <div className="w-full max-w-[400px] h-full flex flex-col bg-[var(--vscode-sideBar-background)] relative">
        
        {/* Top Header / User Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--vscode-sideBar-background)]">
          <div className="flex items-center gap-2">
             <span className="text-[11px] font-bold uppercase tracking-wide text-[var(--vscode-sideBarTitle-foreground)]">Lanonasis Memory</span>
          </div>
          
          <div className="flex items-center gap-1">
             {isAuthenticated ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm">
                     <Settings className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="bg-[var(--vscode-menu-background)] border-[var(--vscode-panel-border)] text-[var(--vscode-menu-foreground)] min-w-[160px] p-1 gap-0.5 shadow-xl">
                   <DropdownMenuLabel className="text-[11px] text-[var(--vscode-descriptionForeground)] px-2 py-1.5 font-normal">My Account</DropdownMenuLabel>
                   <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                   <DropdownMenuItem className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5 focus:bg-[var(--vscode-menu-selectionBackground)] focus:text-[var(--vscode-menu-selectionForeground)]" onClick={() => setShowApiKeys(true)}>
                     <Key className="mr-2 h-3.5 w-3.5 opacity-70" />
                     <span>API Keys</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5 focus:bg-[var(--vscode-menu-selectionBackground)] focus:text-[var(--vscode-menu-selectionForeground)]">
                     <User className="mr-2 h-3.5 w-3.5 opacity-70" />
                     <span>Profile</span>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-[var(--vscode-panel-border)] my-1" />
                   <DropdownMenuItem className="text-[13px] hover:bg-[var(--vscode-menu-selectionBackground)] hover:text-[var(--vscode-menu-selectionForeground)] cursor-pointer rounded-sm px-2 py-1.5 focus:bg-[var(--vscode-menu-selectionBackground)] focus:text-[var(--vscode-menu-selectionForeground)]" onClick={() => setIsAuthenticated(false)}>
                     <LogOut className="mr-2 h-3.5 w-3.5 opacity-70" />
                     <span>Log out</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             ) : (
               <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
             )}
             <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm">
                <MoreHorizontal className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
             </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col min-h-full">
            
            {/* Memory Assistant Section */}
            <Collapsible open={isAssistantOpen} onOpenChange={setIsAssistantOpen}>
              <div className="vscode-section-header group" onClick={() => setIsAssistantOpen(!isAssistantOpen)}>
                <ChevronRight className={cn("h-4 w-4 text-[var(--vscode-icon-foreground)] transition-transform mr-0.5 opacity-80", isAssistantOpen && "rotate-90")} />
                <span className="text-[11px] font-bold text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase">Memory Assistant</span>
              </div>
              <CollapsibleContent>
                 <div className="min-h-[80px] p-4 text-[13px] text-[var(--vscode-descriptionForeground)] flex items-center justify-center text-center italic opacity-80">
                   {isAuthenticated ? 
                     "Ready to assist. Ask me to recall context or refine prompts." : 
                     "Please connect to enable AI assistance."
                   }
                 </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Memories Section */}
            <Collapsible open={isMemoriesOpen} onOpenChange={setIsMemoriesOpen} className="flex-1 flex flex-col">
              <div className="vscode-section-header group" onClick={() => setIsMemoriesOpen(!isMemoriesOpen)}>
                <div className="flex items-center">
                   <ChevronRight className={cn("h-4 w-4 text-[var(--vscode-icon-foreground)] transition-transform mr-0.5 opacity-80", isMemoriesOpen && "rotate-90")} />
                   <span className="text-[11px] font-bold text-[var(--vscode-sideBarSectionHeader-foreground)] uppercase">Memories</span>
                </div>
                <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm">
                    <Search className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-[var(--vscode-list-hoverBackground)] rounded-sm">
                    <RefreshCw className="h-3.5 w-3.5 text-[var(--vscode-icon-foreground)]" />
                  </Button>
                </div>
              </div>
              
              <CollapsibleContent className="flex-1">
                {isAuthenticated ? (
                  <div className="p-2 space-y-2">
                    {/* Authenticated View */}
                    <div className="relative mb-3">
                      <Input
                        placeholder="Search memories..."
                        className="vscode-input h-7 text-[13px] pl-2"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2 mb-4">
                      <Button className="flex-1 vscode-button h-7 gap-1.5">
                        <Plus className="h-3.5 w-3.5" />
                        Create
                      </Button>
                      <Button className="flex-1 vscode-button vscode-button-secondary h-7 gap-1.5">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync
                      </Button>
                    </div>

                    <div className="space-y-0.5">
                        {filteredMemories.map((memory) => (
                          <MemoryCard key={memory.id} memory={memory} />
                        ))}
                    </div>
                  </div>
                ) : (
                  /* Unauthenticated Welcome View */
                  <WelcomeView onLogin={() => setIsAuthenticated(true)} />
                )}
              </CollapsibleContent>
            </Collapsible>

          </div>
        </ScrollArea>

        {/* Bottom Chat Interface - VS Code Chat Input Style */}
        <div className="p-3 bg-[var(--vscode-sideBar-background)] border-t border-[var(--vscode-panel-border)]">
          <div className="relative bg-[var(--vscode-input-background)] border border-[var(--vscode-input-border)] focus-within:border-[var(--vscode-focusBorder)] rounded-[2px] transition-colors">
            <div className="p-2 pb-8">
                <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isAuthenticated ? "Refine context..." : "Connect to chat"}
                disabled={!isAuthenticated}
                className="w-full min-h-[40px] bg-transparent border-none text-[13px] text-[var(--vscode-input-foreground)] placeholder:text-[var(--vscode-input-placeholderForeground)] resize-none focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                />
            </div>
            
            <div className="absolute left-2 bottom-1.5 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-[var(--vscode-icon-foreground)] hover:bg-[var(--vscode-list-hoverBackground)] rounded-[2px]"
                disabled={!isAuthenticated}
              >
                <PaperclipIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="absolute right-2 bottom-1.5">
              <Button
                size="icon"
                className="h-6 w-6 bg-[var(--vscode-button-background)] hover:bg-[var(--vscode-button-hoverBackground)] text-[var(--vscode-button-foreground)] rounded-[2px] disabled:opacity-50"
                disabled={!isAuthenticated}
              >
                <SendHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <ApiKeyManager isOpen={showApiKeys} onClose={() => setShowApiKeys(false)} />

      </div>
    </div>
  );
};

function PaperclipIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

export default IdePanel;
