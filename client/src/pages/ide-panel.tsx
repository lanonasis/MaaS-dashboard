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
  MessageSquare, 
  SendHorizontal,
  MoreHorizontal,
  Copy,
  Check,
  Brain,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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

const IdePanel = () => {
  const [activeTab, setActiveTab] = useState<"memories" | "chat">("memories");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatInput, setChatInput] = useState("");

  const filteredMemories = MOCK_MEMORIES.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#1E1E1E] text-[#CCCCCC] font-mono overflow-hidden justify-center">
      {/* Sidebar Container - Fixed width to simulate IDE panel */}
      <div className="w-full max-w-[400px] h-full flex flex-col border-x border-[#3C3C3C] bg-[#252526] shadow-2xl relative">
        
        {/* Header */}
        <div className="p-4 space-y-4 border-b border-[#3C3C3C] bg-[#1E1E1E]/50 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Brain className="h-5 w-5 text-[#007ACC]" />
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-green-500 rounded-full border border-[#1E1E1E]" />
              </div>
              <h1 className="text-sm font-bold tracking-tight text-white">Lanonasis Memory</h1>
            </div>
            <Badge variant="outline" className="bg-[#007ACC]/10 text-[#007ACC] border-[#007ACC]/20 text-[10px] px-2 h-5">
              Connected
            </Badge>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#888888]" />
            <Input
              placeholder="Search memories..."
              className="bg-[#3C3C3C]/50 border-none pl-9 h-9 text-sm focus-visible:ring-1 focus-visible:ring-[#007ACC] placeholder:text-[#888888]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-[#0E639C] hover:bg-[#1177BB] text-white h-8 text-xs font-medium border border-white/5"
              data-testid="button-create"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create
            </Button>
            <Button 
              variant="secondary"
              className="flex-1 bg-[#3C3C3C] hover:bg-[#4D4D4D] text-[#CCCCCC] h-8 text-xs font-medium border border-white/5"
              data-testid="button-refresh"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content Area */}
        <ScrollArea className="flex-1 px-3 py-2">
          <div className="space-y-6 pb-4">
            
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-[#888888] uppercase tracking-wider">Your Memories</span>
              <span className="text-[11px] text-[#888888]">{MOCK_MEMORIES.length} TOTAL</span>
            </div>

            {/* Context Group */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[#2D2D2D]/50 rounded border border-[#2D2D2D]">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-500/80" />
                <span className="text-xs font-medium text-[#CCCCCC]">Context</span>
                <span className="ml-auto text-[10px] text-[#888888]">{filteredMemories.length}</span>
              </div>

              <div className="space-y-2 mt-2">
                {filteredMemories.map((memory) => (
                  <MemoryCard key={memory.id} memory={memory} />
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Minimal Chat Interface - Fixed at bottom */}
        <div className="p-3 bg-[#1E1E1E] border-t border-[#3C3C3C]">
          <div className="relative">
            <div className="absolute left-3 top-3 text-[#007ACC]">
              <Terminal className="h-4 w-4" />
            </div>
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask AI to refine context..."
              className="w-full min-h-[80px] bg-[#252526] border border-[#3C3C3C] rounded-md pl-9 pr-10 py-2.5 text-sm text-[#CCCCCC] placeholder:text-[#666666] resize-none focus:outline-none focus:border-[#007ACC] focus:ring-1 focus:ring-[#007ACC]"
              data-testid="input-chat"
            />
            <div className="absolute right-2 bottom-2 flex gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-[#888888] hover:text-[#CCCCCC] hover:bg-[#3C3C3C]"
              >
                <PaperclipIcon className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                className="h-7 w-7 bg-[#0E639C] hover:bg-[#1177BB] text-white rounded-sm"
                data-testid="button-send"
              >
                <SendHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

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
