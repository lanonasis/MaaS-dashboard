/**
 * React Hook for AI Orchestrator
 * Provides easy access to the AI assistant in any component
 *
 * Features:
 * - AI-powered responses using LLM backend
 * - Personalized context from user data and memories
 * - Workflow planning and generation
 * - Tool execution via MCP integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { createAIOrchestrator, AIOrchestrator } from '@/lib/ai-orchestrator/core';
import type { WorkflowPlan, AIMessage, UserContext } from '@/lib/ai-orchestrator/core';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useToast } from './use-toast';

export function useAIOrchestrator() {
  const { user, session } = useSupabaseAuth();
  const { toast } = useToast();
  const [orchestrator, setOrchestrator] = useState<AIOrchestrator | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([]);
  const sessionTokenRef = useRef<string | null>(null);

  // Initialize orchestrator when user is available
  useEffect(() => {
    if (user) {
      const authToken = session?.access_token || null;
      sessionTokenRef.current = authToken;

      const userContext: UserContext = {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.user_metadata?.full_name || user.user_metadata?.name,
        preferences: user.user_metadata?.preferences,
        current_session_id: `session_${Date.now()}`
      };

      const aiOrchestrator = createAIOrchestrator(userContext, authToken || undefined);
      setOrchestrator(aiOrchestrator);
    } else {
      setOrchestrator(null);
      sessionTokenRef.current = null;
    }
  }, [user, session?.access_token]);

  // Update auth token when session changes
  useEffect(() => {
    if (orchestrator && session?.access_token && session.access_token !== sessionTokenRef.current) {
      orchestrator.setAuthToken(session.access_token);
      sessionTokenRef.current = session.access_token;
    }
  }, [orchestrator, session?.access_token]);

  /**
   * Send a message to the AI assistant
   */
  const sendMessage = useCallback(async (message: string) => {
    if (!orchestrator || !message.trim()) {
      return null;
    }

    setIsProcessing(true);

    try {
      const result = await orchestrator.processRequest(message);

      // Update conversation history
      setConversationHistory(orchestrator.getConversationHistory());

      return result;
    } catch (error: any) {
      console.error('AI Orchestrator error:', error);
      toast({
        title: 'AI Assistant Error',
        description: error.message || 'Failed to process request',
        variant: 'destructive'
      });
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [orchestrator, toast]);

  /**
   * Create a workflow
   */
  const createWorkflow = useCallback(async (goal: string): Promise<WorkflowPlan | null> => {
    const result = await sendMessage(goal);
    return result?.workflow || null;
  }, [sendMessage]);

  /**
   * Ask a question
   */
  const askQuestion = useCallback(async (question: string): Promise<string | null> => {
    const result = await sendMessage(question);
    return result?.response || null;
  }, [sendMessage]);

  /**
   * Store context/memory
   */
  const storeContext = useCallback(async (context: string): Promise<void> => {
    await sendMessage(`Remember this: ${context}`);
  }, [sendMessage]);

  /**
   * Clear conversation history
   */
  const clearHistory = useCallback(() => {
    if (orchestrator) {
      orchestrator.clearHistory();
      setConversationHistory([]);
    }
  }, [orchestrator]);

  /**
   * Get suggested actions based on current context
   */
  const getSuggestions = useCallback((): string[] => {
    if (conversationHistory.length === 0) {
      return [
        'Create a new workflow',
        'Ask me a question',
        'Store important context'
      ];
    }

    return [
      'Tell me more',
      'Create a workflow',
      'Search my memories'
    ];
  }, [conversationHistory]);

  return {
    // State
    isReady: !!orchestrator,
    isProcessing,
    conversationHistory,

    // Actions
    sendMessage,
    createWorkflow,
    askQuestion,
    storeContext,
    clearHistory,
    getSuggestions
  };
}
