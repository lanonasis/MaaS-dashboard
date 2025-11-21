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
  Loader2,
  Shield,
  Zap,
  ArrowRight,
  Lock
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
import { useLanonasis } from "@/lib/lanonasis-sdk";
import { useSecuritySDK } from "@/lib/lanonasis-security-sdk";

const MemoryCard = ({ memory, onSelect }: { memory: Memory; onSelect?: () => void }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-2 rounded-lg border border-[#2D2D2D] bg-gradient-to-br from-[#252526] to-[#1E1E1E] p-3 hover:from-[#2A2D2E] hover:to-[#252526] hover:border-[#007ACC]/50 transition-all duration-200",
        onSelect && "cursor-pointer"
      )}
      data-testid={`memory-card-${memory.id}`}
    >
        <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-[#CCCCCC] leading-tight line-clamp-2">
            {memory.title}
            </h3>
            <motion.div whileHover={{ scale: 1.05 }}>
              <Badge variant="outline" className="text-[8px] bg-[#007ACC]/10 border-[#007ACC]/30 text-[#007ACC]">
                {memory.type}
              </Badge>
            </motion.div>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[#888888]">
            <div className="flex items-center gap-1">
            <memory.icon className="h-3 w-3" />
            <span>{format(memory.date, "MMM d")}</span>
            </div>
            {memory.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1 bg-[#007ACC]/10 px-1.5 py-0.5 rounded text-[#007ACC] text-[9px]">
                <span>#{tag}</span>
            </div>
            ))}
        </div>
    </motion.div>
  );
};

const WelcomeView = ({ onLogin, isConnecting }: { onLogin: () => void, isConnecting: boolean }) => {
    return (
        <div className="p-6 space-y-8 flex flex-col items-center justify-center min-h-[400px]">
             <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="h-14 w-14 bg-gradient-to-br from-[#007ACC] to-[#0E639C] rounded-full flex items-center justify-center shadow-lg shadow-[#007ACC]/30">
                 <Brain className="h-7 w-7 text-white" />
             </motion.div>
             <div className="space-y-3 text-center">
                <h3 className="text-lg font-bold text-white">Your Memory Awaits</h3>
                <p className="text-sm text-gray-400 max-w-[240px] mx-auto leading-relaxed">
                    Connect to your personal AI orchestrator. Store, search, and recall your development context instantly.
                </p>
             </div>
             <Button 
              onClick={onLogin} 
              disabled={isConnecting} 
              className="bg-gradient-to-r from-[#007ACC] to-[#0E639C] hover:shadow-lg hover:shadow-[#007ACC]/50 text-white font-medium w-full max-w-[220px] group"
             >
                {isConnecting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Initializing SDK...
                    </>
                ) : (
                    <>
                        Connect to Memory
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </>
                )}
             </Button>
             <Separator className="w-full bg-[#2D2D2D]" />
             <div className="space-y-2 w-full">
               <p className="text-xs text-[#888888] text-center font-medium">What you can do:</p>
               <div className="grid grid-cols-2 gap-2">
                 <div className="flex items-center gap-2 p-2 rounded bg-[#1E1E1E]">
                   <Sparkles className="h-3 w-3 text-yellow-500" />
                   <span className="text-[10px] text-gray-400">Semantic Search</span>
                 </div>
                 <div className="flex items-center gap-2 p-2 rounded bg-[#1E1E1E]">
                   <Lock className="h-3 w-3 text-green-500" />
                   <span className="text-[10px] text-gray-400">Scoped Keys</span>
                 </div>
               </div>
             </div>
        </div>
    )
};

const SecurityKeyDialog = ({ isOpen, onClose, onGenerate }: { isOpen: boolean; onClose: () => void; onGenerate?: () => void }) => {
    const [environment, setEnvironment] = useState<'development' | 'staging' | 'production'>('development');
    const { client, isInitialized, initialize } = useSecuritySDK();
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
      if (!isInitialized) await initialize();
      setIsGenerating(true);
      const key = await client.generateScopedKey(`${environment.toUpperCase()} Key`, 'read:write', environment);
      console.log("Generated Key:", key);
      setIsGenerating(false);
      onGenerate?.();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-gradient-to-br from-[#1E1E1E] to-[#252526] border-[#3C3C3C] text-white max-w-md shadow-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-white">
                        <Shield className="h-5 w-5 text-[#007ACC]" />
                        Generate Scoped Key
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 mt-2">
                        Create a secure, environment-specific API key with granular permissions.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Environment</label>
                        <div className="grid grid-cols-3 gap-2">
                          {['development', 'staging', 'production'].map(env => (
                            <button
                              key={env}
                              onClick={() => setEnvironment(env as any)}
                              className={cn(
                                "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                                environment === env
                                  ? "bg-[#007ACC] text-white shadow-lg shadow-[#007ACC]/30"
                                  : "bg-[#2D2D2D] text-gray-400 hover:bg-[#3C3C3C]"
                              )}
                            >
                              {env.charAt(0).toUpperCase() + env.slice(1)}
                            </button>
                          ))}
                        </div>
                    </div>

                    <div className="bg-[#1E1E1E] border border-[#3C3C3C] rounded-lg p-3 text-xs text-gray-400 space-y-1">
                      <p className="flex items-center gap-2"><Zap className="h-3 w-3 text-yellow-500" /> Full read/write access</p>
                      <p className="flex items-center gap-2"><Shield className="h-3 w-3 text-green-500" /> Automatically rotated every 90 days</p>
                      <p className="flex items-center gap-2"><Lock className="h-3 w-3 text-blue-500" /> Encrypted in transit and at rest</p>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={onClose} className="text-gray-400">Cancel</Button>
                    <Button 
                      onClick={handleGenerate} 
                      disabled={isGenerating}
                      className="bg-[#007ACC] hover:bg-[#0063A5] text-white"
                    >
                      {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isGenerating ? "Generating..." : "Generate Key"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
};

export const RichPanel = () => {
    const { client, isAuthenticated, isConnecting, login, logout } = useLanonasis();
    const [searchQuery, setSearchQuery] = useState("");
    const [showSecurityDialog, setShowSecurityDialog] = useState(false);
    const [memories, setMemories] = useState<Memory[]>([]);
    const [isAssistantOpen, setIsAssistantOpen] = useState(true);
    const [isMemoriesOpen, setIsMemoriesOpen] = useState(true);
    const [chatInput, setChatInput] = useState("");

    useEffect(() => {
        if (isAuthenticated) {
            client.memory.list(searchQuery).then(setMemories);
        }
    }, [isAuthenticated, searchQuery, client]);

    return (
        <div className="flex h-full w-full bg-gradient-to-b from-[#1E1E1E] to-[#0D0D0D] text-[#CCCCCC] font-mono overflow-hidden relative flex-col">
             <div className="flex items-center justify-between p-4 bg-[#1E1E1E]/80 backdrop-blur-sm border-b border-[#3C3C3C] select-none shrink-0">
                <motion.div className="flex items-center gap-2" whileHover={{ scale: 1.02 }}>
                    <motion.div animate={{ rotate: isAuthenticated ? 360 : 0 }} transition={{ duration: 0.6 }}>
                      <Brain className="h-5 w-5 text-[#007ACC]" />
                    </motion.div>
                    <div className="flex flex-col">
                      <h1 className="text-sm font-bold tracking-tight text-white">Lanonasis</h1>
                      <span className="text-[9px] text-[#888888]">Memory Orchestrator</span>
                    </div>
                </motion.div>
                
                <div className="flex items-center gap-2">
                  {isAuthenticated && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                      <Button size="sm" variant="ghost" onClick={() => setShowSecurityDialog(true)} className="h-8 gap-1 text-[#888888] hover:text-[#007ACC]">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="text-xs">Keys</span>
                      </Button>
                    </motion.div>
                  )}
                  <Button size="sm" variant="ghost" onClick={isAuthenticated ? logout : login} disabled={isConnecting} className="h-8">
                    {isConnecting ? "..." : (isAuthenticated ? <LogOut className="h-4 w-4" /> : "Log in")}
                  </Button>
                </div>
             </div>

            <ScrollArea className="flex-1 bg-[#252526]/50">
                <div className="flex flex-col min-h-full p-3 space-y-3">
                    {/* AI Assistant Status */}
                    {isAuthenticated && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-2 rounded-lg bg-gradient-to-r from-[#007ACC]/10 to-[#0E639C]/10 border border-[#007ACC]/20">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-[#007ACC] font-medium">Orchestrator Ready</span>
                      </motion.div>
                    )}

                    {/* Search */}
                    {isAuthenticated && (
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#888888]" />
                        <Input 
                            placeholder="Search your memory..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-[#1E1E1E] border-[#2D2D2D] pl-8 focus:border-[#007ACC]/50"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="space-y-2 flex-1">
                        {isAuthenticated ? (
                            <>
                                {memories.length === 0 ? (
                                  <div className="text-center py-8">
                                    <p className="text-xs text-[#888888] italic">No memories yet. Start pasting context below.</p>
                                  </div>
                                ) : (
                                  memories.map((memory) => (
                                  <MemoryCard key={memory.id} memory={memory} />
                                  ))
                                )}
                            </>
                        ) : (
                            <WelcomeView onLogin={login} isConnecting={isConnecting} />
                        )}
                    </div>
                </div>
            </ScrollArea>
            
             {/* Enhanced Chat Input */}
             <div className="p-4 bg-[#1E1E1E] border-t border-[#3C3C3C] shrink-0 space-y-2">
                <div className="relative group">
                    <div className="absolute left-3 top-3 text-[#007ACC]">
                        <Terminal className="h-4 w-4" />
                    </div>
                    <textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder={isAuthenticated ? "Paste context to remember or ask AI..." : "Connect to access orchestrator..."}
                      disabled={!isAuthenticated}
                      className="w-full min-h-[60px] bg-[#252526] border border-[#3C3C3C] rounded-lg pl-9 pr-10 py-3 text-sm text-[#CCCCCC] placeholder:text-[#666666] resize-none focus:outline-none focus:border-[#007ACC]/50 focus:ring-1 focus:ring-[#007ACC]/20 disabled:opacity-50 transition-all"
                    />
                    <div className="absolute right-2 bottom-2 flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-[#888888] hover:text-[#CCCCCC] hover:bg-[#3C3C3C]"
                        disabled={!isAuthenticated}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-7 w-7 bg-gradient-to-r from-[#007ACC] to-[#0E639C] hover:shadow-lg hover:shadow-[#007ACC]/30 text-white rounded-md disabled:opacity-50"
                        disabled={!isAuthenticated || !chatInput.trim()}
                      >
                        <SendHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                </div>
                {isAuthenticated && (
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] text-[#666666]">AI Orchestrator Active</span>
                        <span className="text-[9px] text-[#666666]">v1.2.0</span>
                    </div>
                )}
             </div>
             
             <SecurityKeyDialog isOpen={showSecurityDialog} onClose={() => setShowSecurityDialog(false)} />
        </div>
    );
};
