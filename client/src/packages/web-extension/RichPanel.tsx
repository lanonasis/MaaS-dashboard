import React, { useState, useEffect } from "react";
import { 
  Search, 
  Plus, 
  RefreshCw, 
  Terminal, 
  SendHorizontal,
  Check,
  Brain,
  Key,
  LogOut,
  User,
  Settings,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  Paperclip,
  Sparkles,
  Bot,
  LayoutGrid,
  Loader2
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
import { Memory } from "../shared/types";
import { useLanonasis } from "@/lib/lanonasis-sdk"; // Using the new SDK

const MemoryCard = ({ memory }: { memory: Memory }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-md border border-[#2D2D2D] bg-[#252526] p-3 hover:bg-[#2A2D2E] hover:border-[#3C3C3C] transition-all duration-200 cursor-pointer",
      )}
      data-testid={`memory-card-${memory.id}`}
    >
        <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-[#CCCCCC] leading-tight line-clamp-2">
            {memory.title}
            </h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#888888]">
            <div className="flex items-center gap-1">
            <memory.icon className="h-3 w-3" />
            <span>{format(memory.date, "dd/MM/yyyy")}</span>
            </div>
            {memory.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1 bg-[#1E1E1E] px-1.5 py-0.5 rounded text-[#CCCCCC]">
                <span>#{tag}</span>
            </div>
            ))}
        </div>
    </motion.div>
  );
};

const WelcomeView = ({ onLogin, isConnecting }: { onLogin: () => void, isConnecting: boolean }) => {
    return (
        <div className="p-4 space-y-8 flex flex-col items-center justify-center h-full text-center">
             <div className="h-12 w-12 bg-[#007ACC]/10 rounded-full flex items-center justify-center mb-2">
                 <Brain className="h-6 w-6 text-[#007ACC]" />
             </div>
             <div className="space-y-2">
                <h3 className="text-sm font-medium text-white">Connect to Memory</h3>
                <p className="text-xs text-gray-500 max-w-[200px] mx-auto">
                    Access your vector storage and context orchestrator.
                </p>
             </div>
             <Button onClick={onLogin} disabled={isConnecting} className="bg-[#007ACC] hover:bg-[#0063A5] w-full max-w-[200px]">
                {isConnecting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connecting...
                    </>
                ) : (
                    "Connect with SDK"
                )}
             </Button>
        </div>
    )
};

const ApiKeyManager = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1E1E1E] border-[#3C3C3C] text-white">
                <DialogHeader>
                    <DialogTitle>API Keys</DialogTitle>
                    <DialogDescription>Manage your scoped access keys.</DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <p className="text-xs text-gray-500">No keys generated yet.</p>
                </div>
            </DialogContent>
        </Dialog>
    )
};


export const RichPanel = () => {
    const { client, isAuthenticated, isConnecting, login, logout } = useLanonasis();
    const [searchQuery, setSearchQuery] = useState("");
    const [showApiKeys, setShowApiKeys] = useState(false);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isAssistantOpen, setIsAssistantOpen] = useState(true);
    const [isMemoriesOpen, setIsMemoriesOpen] = useState(true);

    useEffect(() => {
        if (isAuthenticated) {
            client.memory.list(searchQuery).then(setMemories);
        }
    }, [isAuthenticated, searchQuery, client]);

    return (
        <div className="flex h-full w-full bg-[#1E1E1E] text-[#CCCCCC] font-mono overflow-hidden relative flex-col">
             <div className="flex items-center justify-between p-3 bg-[#1E1E1E] border-b border-[#3C3C3C] select-none shrink-0">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-[#007ACC]" />
                    <h1 className="text-sm font-bold tracking-tight text-white">Lanonasis Memory</h1>
                </div>
                <Button size="sm" variant="ghost" onClick={isAuthenticated ? logout : login} disabled={isConnecting}>
                    {isConnecting ? "..." : (isAuthenticated ? "Log out" : "Log in")}
                </Button>
             </div>

            <ScrollArea className="flex-1 bg-[#252526]">
                <div className="flex flex-col min-h-full">
                    {/* Memory Assistant Section */}
                    <Collapsible open={isAssistantOpen} onOpenChange={setIsAssistantOpen} className="border-b border-[#3C3C3C]">
                        <div className="flex items-center justify-between px-3 py-2 bg-[#1E1E1E] hover:bg-[#2A2D2E] cursor-pointer group" onClick={() => setIsAssistantOpen(!isAssistantOpen)}>
                        <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-[#007ACC]" />
                            <span className="text-[11px] font-bold text-[#CCCCCC] uppercase tracking-wider">AI Orchestrator</span>
                        </div>
                        <ChevronRight className={cn("h-3.5 w-3.5 text-[#CCCCCC] transition-transform", isAssistantOpen && "rotate-90")} />
                        </div>
                        <CollapsibleContent>
                            <div className="bg-[#1E1E1E] p-4 border-b border-[#3C3C3C]">
                            {isAuthenticated ? (
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="h-6 w-6 rounded-full bg-[#007ACC]/20 flex items-center justify-center shrink-0">
                                            <Sparkles className="h-3.5 w-3.5 text-[#007ACC]" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-[#CCCCCC]">SDK Initialized. I'm ready to orchestrate.</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-2">
                                    <p className="text-xs text-[#888888] italic">Connect SDK to enable orchestration.</p>
                                </div>
                            )}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>

                    <div className="flex-1 p-3 space-y-4">
                        {isAuthenticated ? (
                            <>
                                <Input 
                                    placeholder="Search vector store..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-[#3C3C3C]/50 border-none"
                                />
                                <div className="space-y-2">
                                    {memories.map((memory) => (
                                    <MemoryCard key={memory.id} memory={memory} />
                                    ))}
                                </div>
                            </>
                        ) : (
                            <WelcomeView onLogin={login} isConnecting={isConnecting} />
                        )}
                    </div>
                </div>
            </ScrollArea>
            
             <div className="p-3 bg-[#1E1E1E] border-t border-[#3C3C3C]">
                <div className="relative">
                    <Terminal className="absolute left-3 top-3 h-4 w-4 text-[#007ACC]" />
                    <Input 
                        className="pl-9 bg-[#252526] border-[#3C3C3C]" 
                        placeholder={isAuthenticated ? "Send to vector memory..." : "Connect to chat..."} 
                        disabled={!isAuthenticated}
                    />
                </div>
                {isAuthenticated && (
                    <div className="mt-2 flex justify-between items-center">
                        <Badge variant="outline" className="text-[9px] border-[#3C3C3C] text-green-500">
                            SDK Connected
                        </Badge>
                        <span className="text-[9px] text-[#666666]">v1.2.0</span>
                    </div>
                )}
             </div>
             
             <ApiKeyManager isOpen={showApiKeys} onClose={() => setShowApiKeys(false)} />
        </div>
    );
};
