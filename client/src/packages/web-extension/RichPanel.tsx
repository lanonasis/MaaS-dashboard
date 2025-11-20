import React, { useState } from "react";
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
  LayoutGrid
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
import { MOCK_MEMORIES, MOCK_API_KEYS } from "../shared/mock-data";
import { Memory } from "../shared/types";

const MemoryCard = ({ memory }: { memory: Memory }) => {
  // ... (Keep same rich implementation or customize for web)
  return (
    // ... (Copy the Rich Memory Card logic from previous rich-panel.tsx)
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex flex-col gap-2 rounded-md border border-[#2D2D2D] bg-[#252526] p-3 hover:bg-[#2A2D2E] hover:border-[#3C3C3C] transition-all duration-200 cursor-pointer",
      )}
      data-testid={`memory-card-${memory.id}`}
    >
        {/* Simplified for brevity, in real implementation we paste the full Rich Card */}
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

const WelcomeView = ({ onLogin }: { onLogin: () => void }) => {
    // ... Copy WelcomeView from rich-panel.tsx
    return (
        <div className="p-4 space-y-8">
             {/* ... Content ... */}
             <Button onClick={onLogin}>Connect in Browser</Button>
        </div>
    )
};

const ApiKeyManager = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    // ... Copy ApiKeyManager from rich-panel.tsx
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            {/* ... Content ... */}
        </Dialog>
    )
};


export const RichPanel = () => {
    // ... Copy the RichPanel component fully from client/src/components/rich-panel.tsx
    // But ensure it imports from shared types and mock data
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    // ... rest of state

    const filteredMemories = MOCK_MEMORIES.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ... Return the JSX
    return (
        <div className="flex h-full w-full bg-[#1E1E1E] text-[#CCCCCC] font-mono overflow-hidden relative flex-col">
            {/* ... Header ... */}
             <div className="flex items-center justify-between p-3 bg-[#1E1E1E] border-b border-[#3C3C3C] select-none shrink-0">
                <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-[#007ACC]" />
                    <h1 className="text-sm font-bold tracking-tight text-white">Lanonasis Memory</h1>
                </div>
                {/* ... User Menu ... */}
                <Button size="sm" variant="ghost" onClick={() => setIsAuthenticated(!isAuthenticated)}>
                    {isAuthenticated ? "Log out" : "Log in"}
                </Button>
             </div>

            <ScrollArea className="flex-1 bg-[#252526]">
                <div className="p-3 space-y-4">
                    {isAuthenticated ? (
                        <>
                            <Input 
                                placeholder="Search..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-[#3C3C3C]/50 border-none"
                            />
                             <div className="space-y-2">
                                {filteredMemories.map((memory) => (
                                <MemoryCard key={memory.id} memory={memory} />
                                ))}
                            </div>
                        </>
                    ) : (
                         <div className="text-center p-10 text-gray-500">Please log in</div>
                    )}
                </div>
            </ScrollArea>
            
             {/* ... Chat ... */}
             <div className="p-3 bg-[#1E1E1E] border-t border-[#3C3C3C]">
                <div className="relative">
                    <Terminal className="absolute left-3 top-3 h-4 w-4 text-[#007ACC]" />
                    <Input className="pl-9 bg-[#252526] border-[#3C3C3C]" placeholder="Ask AI..." />
                </div>
             </div>
        </div>
    );
};
