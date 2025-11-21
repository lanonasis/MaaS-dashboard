/**
 * React Hook for AI Orchestrator
 * Provides easy access to the AI assistant in any component
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createAIOrchestrator, AIOrchestrator } from '@/lib/ai-orchestrator/core';
import type { WorkflowPlan, AIMessage, UserContext } from '@/lib/ai-orchestrator/core';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useToast } from './use-toast';

export function useAIOrchestrator() {
  const { user } = useSupabaseAuth();
  const { toast } = useToast();
  const [orchestrator, setOrchestrator] = useState<AIOrchestrator | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<AIMessage[]>([]);

  // Initialize orchestrator when user is available
  useEffect(() => {
    if (user) {
      const userContext: UserContext = {
        user_id: user.id,
        user_email: user.email || '',
        user_name: user.user_metadata?.full_name,
        current_session_id: `session_${Date.now()}`
      };

      const aiOrchestrator = createAIOrchestrator(userContext);
      setOrchestrator(aiOrchestrator);
    }
  }, [user]);

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
