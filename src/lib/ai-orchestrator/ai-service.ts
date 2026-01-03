/**
 * AI Service - LLM API Integration Layer
 *
 * Provides a unified interface for AI-powered responses using
 * the backend API which connects to LLM services (OpenAI/Anthropic).
 */

import type { MemorySearchResult } from '@lanonasis/memory-client';

export interface AICompletionRequest {
  messages: AIMessage[];
  userContext: UserContextData;
  memories?: MemorySearchResult[];
  temperature?: number;
  maxTokens?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface UserContextData {
  userId: string;
  email: string;
  name?: string;
  preferences?: Record<string, unknown>;
}

export interface AICompletionResponse {
  content: string;
  suggestedActions?: string[];
  metadata?: {
    model: string;
    tokensUsed?: number;
    processingTime?: number;
  };
}

export interface WorkflowGenerationRequest {
  goal: string;
  userContext: UserContextData;
  memories?: MemorySearchResult[];
}

export interface WorkflowStep {
  id: string;
  label: string;
  detail: string;
  dependsOnStepIds: string[];
  suggestedTool: string;
  expectedOutcome: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface WorkflowPlanResponse {
  id: string;
  goal: string;
  summary: string;
  priority: 'high' | 'medium' | 'low';
  suggestedTimeframe: string;
  steps: WorkflowStep[];
  risks: string[];
  missingInfo: string[];
  notes?: string;
  usedMemories: string[];
  createdAt: string;
}

const getApiBaseUrl = () => {
  // Prefer core API, fallback to window location for same-origin
  return (
    import.meta.env.VITE_CORE_API_BASE_URL ||
    import.meta.env.VITE_API_URL?.replace('/v1', '') ||
    ''
  );
};

/**
 * AI Service class for making LLM API calls
 */
export class AIService {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(authToken?: string) {
    this.baseUrl = getApiBaseUrl();
    this.authToken = authToken || null;
  }

  /**
   * Set the authentication token for API calls
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Generate a chat completion using the AI backend
   */
  async chat(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/ai/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        messages: request.messages,
        userContext: request.userContext,
        memories: request.memories?.map(m => ({
          id: m.id,
          content: m.content,
          type: m.type,
          tags: m.tags,
          score: m.score
        })),
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens ?? 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `AI service error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate a workflow plan using the AI backend
   */
  async generateWorkflow(request: WorkflowGenerationRequest): Promise<WorkflowPlanResponse> {
    const response = await fetch(`${this.baseUrl}/api/orchestrator/execute`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        goal: request.goal,
        memories: request.memories?.map(m => ({
          id: m.id,
          content: m.content,
          type: m.type,
          tags: m.tags
        }))
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Workflow generation error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Detect user intent from a message
   */
  async detectIntent(
    message: string,
    userContext: UserContextData,
    conversationHistory: AIMessage[]
  ): Promise<{
    type: 'create_workflow' | 'query_information' | 'store_context' | 'execute_action' | 'general';
    action?: string;
    params?: Record<string, unknown>;
    confidence: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/ai/detect-intent`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        message,
        userContext,
        conversationHistory: conversationHistory.slice(-5) // Last 5 messages for context
      })
    });

    if (!response.ok) {
      // Fallback to keyword-based detection if API fails
      return this.fallbackIntentDetection(message);
    }

    return response.json();
  }

  /**
   * Fallback keyword-based intent detection
   */
  private fallbackIntentDetection(message: string): {
    type: 'create_workflow' | 'query_information' | 'store_context' | 'execute_action' | 'general';
    action?: string;
    params?: Record<string, unknown>;
    confidence: number;
  } {
    const lowerMessage = message.toLowerCase();

    // Workflow creation patterns
    const workflowPatterns = [
      'create workflow', 'plan workflow', 'help me', 'i need to',
      'build plan', 'set up workflow', 'make a plan', 'create a plan'
    ];
    if (workflowPatterns.some(p => lowerMessage.includes(p))) {
      return { type: 'create_workflow', confidence: 0.8 };
    }

    // Query patterns
    const queryPatterns = ['what', 'how', 'why', 'when', 'where', 'who', 'explain', 'tell me'];
    if (queryPatterns.some(p => lowerMessage.startsWith(p))) {
      return { type: 'query_information', confidence: 0.7 };
    }

    // Store context patterns
    const storePatterns = ['remember', 'save this', 'note', 'store', 'keep in mind'];
    if (storePatterns.some(p => lowerMessage.includes(p))) {
      return { type: 'store_context', confidence: 0.9 };
    }

    // Action patterns
    const actionPatterns = ['list my', 'show my', 'get my', 'create a', 'search for'];
    if (actionPatterns.some(p => lowerMessage.includes(p))) {
      return { type: 'execute_action', confidence: 0.75 };
    }

    return { type: 'general', confidence: 0.5 };
  }
}

/**
 * Create an AI Service instance
 */
export function createAIService(authToken?: string): AIService {
  return new AIService(authToken);
}

/**
 * Build a system prompt for the AI assistant
 */
export function buildSystemPrompt(userContext: UserContextData, memories: MemorySearchResult[]): string {
  const memoryContext = memories.length > 0
    ? `\n\nUser's relevant memories:\n${memories.map(m => `- ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n')}`
    : '';

  return `You are the LanOnasis AI Assistant, a helpful and personalized AI embedded in the user's dashboard.

About the user:
- Name: ${userContext.name || 'User'}
- Email: ${userContext.email}
${memoryContext}

Your capabilities:
1. Answer questions using the user's stored memories and context
2. Help create workflow plans for complex tasks
3. Provide personalized recommendations based on user history
4. Execute actions on connected tools (GitHub, ClickUp, etc.)
5. Remember important context for future conversations

Guidelines:
- Be concise but helpful
- Reference specific memories when relevant
- Suggest follow-up actions when appropriate
- Be proactive about identifying what the user might need
- Use the user's name when appropriate for a personal touch

Always prioritize accuracy and helpfulness over verbosity.`;
}
