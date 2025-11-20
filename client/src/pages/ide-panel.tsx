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
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Shield,
  Globe,
  Briefcase,
  MoreHorizontal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  DialogTrigger,
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
  CollapsibleTrigger,
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-md border border-[#2D2D2D] bg-[#252526] p-3 hover:bg-[#2A2D2E] hover:border-[#3C3C3C] transition-all duration-200 cursor-pointer",
        isHovered && "shadow-lg"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`memory-card-${memory.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-[#CCCCCC] leading-tight line-clamp-2">
          {memory.title}
        </h3>
        {isHovered && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-[#CCCCCC] hover:text-white hover:bg-[#3C3C3C] -mt-1 -mr-1 shrink-0"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3 text-[10px] text-[#888888]">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>{format(memory.date, "dd/MM/yyyy")}</span>
        </div>
        {memory.tags.map((tag) => (
          <div key={tag} className="flex items-center gap-1 bg-[#1E1E1E] px-1.5 py-0.5 rounded text-[#CCCCCC]">
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
    <div className="p-4 space-y-8">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#CCCCCC]">Welcome to Lanonasis Memory! 🧠</h2>
        </div>
        <p className="text-xs text-[#888888] leading-relaxed">
          To get started, you need to authenticate with your Lanonasis account to access your synchronized context and scoped API keys.
        </p>
        
        <div className="space-y-2">
          <Button 
            className="w-full bg-[#007ACC] hover:bg-[#0063A5] text-white h-8 text-xs font-medium"
            onClick={onLogin}
            data-testid="btn-connect-browser"
          >
            Connect in Browser
          </Button>
          <Button 
            variant="secondary" 
            className="w-full bg-[#007ACC] hover:bg-[#0063A5] text-white h-8 text-xs font-medium"
            onClick={onLogin}
            data-testid="btn-enter-key"
          >
            Enter API Key
          </Button>
          <Button 
            variant="outline" 
            className="w-full bg-[#007ACC] hover:bg-[#0063A5] text-white border-none h-8 text-xs font-medium"
            data-testid="btn-get-key"
          >
            Get API Key
          </Button>
        </div>
      </div>

      <Separator className="bg-[#3C3C3C]" />

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-[#CCCCCC]">**What is Lanonasis Memory?**</h3>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="mt-0.5 bg-[#007ACC]/10 p-1.5 rounded h-fit">
               <Brain className="h-3.5 w-3.5 text-[#007ACC]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-[#CCCCCC]">Intelligent Memory Management</h4>
              <p className="text-[10px] text-[#888888] leading-relaxed">
                Advanced vector search and semantic understanding to store, organize, and retrieve information intelligently.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 bg-[#007ACC]/10 p-1.5 rounded h-fit">
               <Globe className="h-3.5 w-3.5 text-[#007ACC]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-[#CCCCCC]">Real-time Synchronization</h4>
              <p className="text-[10px] text-[#888888] leading-relaxed">
                Keep your memories synchronized across all platforms and devices with real-time updates.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="mt-0.5 bg-[#007ACC]/10 p-1.5 rounded h-fit">
               <Shield className="h-3.5 w-3.5 text-[#007ACC]" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-[#CCCCCC]">Enterprise Ready</h4>
              <p className="text-[10px] text-[#888888] leading-relaxed">
                Built for scale with secure scoped API keys and seamless integration with your workflow.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-[10px] text-[#888888] mb-2">**Need Help?**</p>
        <Button 
            variant="secondary" 
            className="w-full bg-[#007ACC] hover:bg-[#0063A5] text-white h-8 text-xs font-medium"
          >
            View Documentation
        </Button>
      </div>
    </div>
  );
};

const ApiKeyManager = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#252526] border-[#3C3C3C] text-[#CCCCCC] max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#CCCCCC] flex items-center gap-2">
            <Key className="h-4 w-4 text-[#007ACC]" />
            Manage Scoped API Keys
          </DialogTitle>
          <DialogDescription className="text-[#888888]">
            Manage your API keys for secure access to Lanonasis services.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#CCCCCC]">Create New Key</label>
            <div className="flex gap-2">
              <Input 
                placeholder="Key Name (e.g., CI/CD Pipeline)" 
                className="bg-[#1E1E1E] border-[#3C3C3C] text-[#CCCCCC] text-xs h-8 focus-visible:ring-[#007ACC]"
              />
              <Button size="sm" className="bg-[#007ACC] hover:bg-[#0063A5] h-8">
                Generate
              </Button>
            </div>
          </div>

          <Separator className="bg-[#3C3C3C]" />

          <div className="space-y-3">
            <label className="text-xs font-medium text-[#CCCCCC]">Active Keys</label>
            {MOCK_API_KEYS.map(key => (
              <div key={key.id} className="flex items-center justify-between p-2 rounded border border-[#3C3C3C] bg-[#1E1E1E]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[#CCCCCC]">{key.name}</span>
                    <Badge variant="outline" className="text-[9px] border-[#3C3C3C] text-[#888888] h-4 px-1">
                      {key.scope}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-[#666666]">Last used: {key.lastUsed}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-[#666666] hover:text-red-400">
                   <Briefcase className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" size="sm" onClick={onClose} className="bg-[#3C3C3C] hover:bg-[#4D4D4D] text-[#CCCCCC]">
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
    <div className="flex h-screen w-full bg-[#1E1E1E] text-[#CCCCCC] font-mono overflow-hidden justify-center">
      {/* Sidebar Container */}
      <div className="w-full max-w-[400px] h-full flex flex-col border-x border-[#3C3C3C] bg-[#252526] shadow-2xl relative">
        
        {/* Top Header / User Bar */}
        <div className="flex items-center justify-between p-2 bg-[#1E1E1E] border-b border-[#3C3C3C] select-none">
          <div className="flex items-center gap-2">
             <div className="h-5 w-5 bg-[#007ACC] rounded flex items-center justify-center text-white font-bold text-xs">L</div>
             <span className="text-xs font-medium uppercase tracking-wide text-[#CCCCCC]">Lanonasis Memory</span>
          </div>
          
          <div className="flex items-center gap-1">
             {isAuthenticated ? (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#3C3C3C]">
                     <Settings className="h-3.5 w-3.5 text-[#888888]" />
                   </Button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" className="bg-[#252526] border-[#3C3C3C] text-[#CCCCCC]">
                   <DropdownMenuLabel className="text-xs">My Account</DropdownMenuLabel>
                   <DropdownMenuSeparator className="bg-[#3C3C3C]" />
                   <DropdownMenuItem className="text-xs focus:bg-[#007ACC] focus:text-white cursor-pointer" onClick={() => setShowApiKeys(true)}>
                     <Key className="mr-2 h-3.5 w-3.5" />
                     <span>API Keys</span>
                   </DropdownMenuItem>
                   <DropdownMenuItem className="text-xs focus:bg-[#007ACC] focus:text-white cursor-pointer">
                     <User className="mr-2 h-3.5 w-3.5" />
                     <span>Profile</span>
                   </DropdownMenuItem>
                   <DropdownMenuSeparator className="bg-[#3C3C3C]" />
                   <DropdownMenuItem className="text-xs focus:bg-[#007ACC] focus:text-white cursor-pointer" onClick={() => setIsAuthenticated(false)}>
                     <LogOut className="mr-2 h-3.5 w-3.5" />
                     <span>Log out</span>
                   </DropdownMenuItem>
                 </DropdownMenuContent>
               </DropdownMenu>
             ) : (
               <div className="h-2 w-2 rounded-full bg-yellow-500" />
             )}
             <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-[#3C3C3C]">
                <MoreHorizontal className="h-3.5 w-3.5 text-[#888888]" />
             </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col min-h-full">
            
            {/* Memory Assistant Section */}
            <Collapsible open={isAssistantOpen} onOpenChange={setIsAssistantOpen} className="border-b border-[#3C3C3C]">
              <div className="flex items-center px-2 py-1 bg-[#1E1E1E] hover:bg-[#2A2D2E] cursor-pointer group" onClick={() => setIsAssistantOpen(!isAssistantOpen)}>
                <ChevronRight className={cn("h-3.5 w-3.5 text-[#CCCCCC] transition-transform mr-1", isAssistantOpen && "rotate-90")} />
                <span className="text-[11px] font-bold text-[#CCCCCC] uppercase">Memory Assistant</span>
              </div>
              <CollapsibleContent>
                 <div className="min-h-[100px] bg-[#1E1E1E] p-3 text-xs text-[#888888] flex items-center justify-center text-center italic">
                   {isAuthenticated ? 
                     "Ready to assist. Ask me to recall context or refine prompts." : 
                     "Please connect to enable AI assistance."
                   }
                 </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Memories Section */}
            <Collapsible open={isMemoriesOpen} onOpenChange={setIsMemoriesOpen} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-2 py-1 bg-[#1E1E1E] hover:bg-[#2A2D2E] cursor-pointer group" onClick={() => setIsMemoriesOpen(!isMemoriesOpen)}>
                <div className="flex items-center">
                   <ChevronRight className={cn("h-3.5 w-3.5 text-[#CCCCCC] transition-transform mr-1", isMemoriesOpen && "rotate-90")} />
                   <span className="text-[11px] font-bold text-[#CCCCCC] uppercase">Memories</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Search className="h-3 w-3 text-[#CCCCCC]" />
                  <RefreshCw className="h-3 w-3 text-[#CCCCCC]" />
                </div>
              </div>
              
              <CollapsibleContent className="flex-1 bg-[#252526]">
                {isAuthenticated ? (
                  <div className="p-2 space-y-4">
                    {/* Authenticated View */}
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-[#888888]" />
                      <Input
                        placeholder="Search memories..."
                        className="bg-[#3C3C3C]/50 border-none pl-8 h-8 text-xs focus-visible:ring-1 focus-visible:ring-[#007ACC] placeholder:text-[#666666]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button className="flex-1 bg-[#0E639C] hover:bg-[#1177BB] text-white h-7 text-xs border border-white/5">
                        <Plus className="h-3 w-3 mr-1.5" />
                        Create
                      </Button>
                      <Button variant="secondary" className="flex-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-[#CCCCCC] h-7 text-xs border border-white/5">
                        <RefreshCw className="h-3 w-3 mr-1.5" />
                        Sync
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 px-2 py-1.5 bg-[#2D2D2D]/50 rounded border border-[#2D2D2D]">
                        <Lightbulb className="h-3.5 w-3.5 text-yellow-500/80" />
                        <span className="text-xs font-medium text-[#CCCCCC]">Context</span>
                        <span className="ml-auto text-[10px] text-[#888888]">{filteredMemories.length}</span>
                      </div>
                      <div className="space-y-2">
                        {filteredMemories.map((memory) => (
                          <MemoryCard key={memory.id} memory={memory} />
                        ))}
                      </div>
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

        {/* Bottom Chat Interface - Always visible but disabled state if not auth */}
        <div className="p-3 bg-[#1E1E1E] border-t border-[#3C3C3C]">
          <div className="relative">
            <div className="absolute left-3 top-3 text-[#007ACC]">
              <Terminal className="h-4 w-4" />
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={isAuthenticated ? "Ask AI to refine context..." : "Please connect to chat..."}
              disabled={!isAuthenticated}
              className="w-full min-h-[80px] bg-[#252526] border border-[#3C3C3C] rounded-md pl-9 pr-10 py-2.5 text-sm text-[#CCCCCC] placeholder:text-[#666666] resize-none focus:outline-none focus:border-[#007ACC] focus:ring-1 focus:ring-[#007ACC] disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[#888888] hover:text-[#CCCCCC] hover:bg-[#3C3C3C]"
                disabled={!isAuthenticated}
              >
                <PaperclipIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-7 w-7 bg-[#0E639C] hover:bg-[#1177BB] text-white rounded-sm disabled:opacity-50"
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
