/**
 * AI Assistant Component
 *
 * A floating chat interface that provides AI-powered assistance throughout the dashboard.
 * Features include natural language interaction, context-aware responses, workflow generation,
 * tool execution, and memory-powered conversations.
 *
 * Key Capabilities:
 * - Natural language processing with intent detection
 * - Memory recall and context awareness
 * - Tool execution (API keys, memory management, workflows, analytics)
 * - Workflow planning and creation
 * - Conversation history and persistent context
 * - Real-time suggestions and quick actions
 *
 * @component
 * @example
 * ```tsx
 * import { AIAssistant } from '@/components/ai/AIAssistant';
 *
 * function Dashboard() {
 *   return (
 *     <div>
 *       <AIAssistant />
 *     </div>
 *   );
 * }
 * ```
 *
 * @requires useAIOrchestrator hook to be available in component tree
 * @requires AI backend API endpoints to be configured
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAIOrchestrator } from '@/hooks/useAIOrchestrator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Brain,
  Loader2,
  Zap,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export function AIAssistant() {
  const {
    isReady,
    isProcessing,
    conversationHistory,
    sendMessage,
    getSuggestions
  } = useAIOrchestrator();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const message = inputValue.trim();
    setInputValue('');

    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const suggestions = getSuggestions();

  if (!isReady) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          size="icon"
        >
          <Sparkles className="h-6 w-6 text-white" />
        </Button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <Card
          className={cn(
            "fixed bottom-6 right-6 shadow-2xl z-50 transition-all duration-300 bg-card/95 backdrop-blur-sm border-border",
            isMinimized ? "w-80 h-16" : "w-96 h-[600px]"
          )}
        >
          {/* Header */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Brain className="h-5 w-5 text-blue-600" />
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
              {isProcessing && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {!isMinimized && (
            <CardContent className="p-0 flex flex-col h-[calc(600px-73px)]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4 bg-card" ref={scrollRef}>
                {conversationHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="p-4 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900">
                      <Sparkles className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">Welcome!</h3>
                      <p className="text-sm text-muted-foreground">
                        I'm your AI assistant. I can help you create workflows, answer questions, and remember important context.
                      </p>
                    </div>
                    <div className="space-y-2 w-full">
                      <p className="text-xs text-muted-foreground">Try asking:</p>
                      {suggestions.map((suggestion, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setInputValue(suggestion)}
                        >
                          <MessageSquare className="h-3 w-3 mr-2" />
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {conversationHistory.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-lg p-3 space-y-1",
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-muted'
                          )}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                          <p
                            className={cn(
                              "text-xs opacity-70",
                              message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'
                            )}
                          >
                            {formatDistanceToNow(new Date(message.timestamp), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                            <span className="text-sm text-muted-foreground">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input Area */}
              <div className="p-4 border-t bg-card">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Ask me anything..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isProcessing}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isProcessing}
                    size="icon"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Quick Actions */}
                {conversationHistory.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {suggestions.slice(0, 2).map((suggestion, i) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-secondary/80"
                        onClick={() => setInputValue(suggestion)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </>
  );
}
