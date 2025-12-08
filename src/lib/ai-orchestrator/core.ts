/**
 * AI Orchestrator Core - The Brain of the Dashboard Assistant
 *
 * Handles:
 * - Intent detection
 * - Memory recall
 * - Workflow planning
 * - Context management
 * - Personalization
 * - Tool execution via ToolRegistry
 */

import { supabase } from '@/integrations/supabase/client';
import { createToolRegistry, type ToolRegistry } from '@/lib/ai-orchestrator/tool-registry';

// Local type definitions for memory operations
export interface MemorySearchResult {
  id: string;
  content: string;
  type: string;
  tags?: string[];
  similarity?: number;
  created_at: string;
}

export type MemoryType = 'context' | 'insight' | 'reference' | 'plan';

export interface UserContext {
  user_id: string;
  user_email: string;
  user_name?: string;
  preferences?: Record<string, any>;
  recent_actions?: string[];
  current_session_id: string;
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

export interface WorkflowPlan {
  id: string;
  goal: string;
  summary: string;
  priority: 'high' | 'medium' | 'low';
  suggestedTimeframe: string;
  steps: WorkflowStep[];
  risks: string[];
  missingInfo: string[];
  usedMemories: string[];
  context: Record<string, any>;
  createdAt: string;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export class AIOrchestrator {
  private toolRegistry: ToolRegistry | null = null;
  private conversationHistory: AIMessage[] = [];
  private userContext: UserContext | null = null;

  constructor(userContext: UserContext) {
    this.userContext = userContext;
    this.initializeToolRegistry();
  }

  /**
   * Initialize tool registry for AI tool access
   */
  private async initializeToolRegistry() {
    try {
      this.toolRegistry = await createToolRegistry(this.userContext!.user_id);
    } catch (error) {
      console.error('Failed to initialize tool registry:', error);
    }
  }

  /**
   * Process user request and generate response
   */
  async processRequest(userInput: string): Promise<{
    response: string;
    workflow?: WorkflowPlan;
    suggestedActions?: string[];
  }> {
    // 1. Add user message to history
    this.addMessage('user', userInput);

    // 2. Recall relevant memories
    const relevantMemories = await this.recallMemories(userInput);

    // 3. Detect intent
    const intent = await this.detectIntent(userInput, relevantMemories);

    // 4. Generate response based on intent
    let response: string;
    let workflow: WorkflowPlan | undefined;

    switch (intent.type) {
      case 'create_workflow':
        workflow = await this.createWorkflow(userInput, relevantMemories);
        response = this.generateWorkflowResponse(workflow);
        break;

      case 'query_information':
        response = await this.answerQuery(userInput, relevantMemories);
        break;

      case 'store_context':
        await this.storeContext(userInput);
        response = "I've stored that context for future reference.";
        break;

      case 'execute_action':
        response = await this.executeAction(intent.action!, intent.params);
        break;

      default:
        response = await this.generateGeneralResponse(userInput, relevantMemories);
    }

    // 5. Add assistant response to history
    this.addMessage('assistant', response);

    // 6. Store conversation context
    await this.storeConversationContext();

    return {
      response,
      workflow,
      suggestedActions: this.getSuggestedActions(intent)
    };
  }

  /**
   * Recall relevant memories using Supabase direct query
   * Note: For semantic search, a backend with embeddings would be needed.
   * This uses text-based filtering as a fallback.
   */
  private async recallMemories(query: string): Promise<MemorySearchResult[]> {
    try {
      if (!this.userContext?.user_id) {
        return [];
      }

      // Escape special characters that could break the filter
      // Replace commas and other reserved chars with wildcards for safer matching
      const safeQuery = query.replace(/[,.'":;!?()]/g, '%');

      // Query memories from Supabase directly using separate filters combined
      // This avoids the .or() syntax issues with commas in user input
      const contentResults = await supabase
        .from('memory_entries')
        .select('*')
        .eq('user_id', this.userContext.user_id)
        .ilike('content', `%${safeQuery}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      const titleResults = await supabase
        .from('memory_entries')
        .select('*')
        .eq('user_id', this.userContext.user_id)
        .ilike('title', `%${safeQuery}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      if (contentResults.error || titleResults.error) {
        console.error('Error querying memories:', contentResults.error || titleResults.error);
        return [];
      }

      // Combine and deduplicate results
      const combined = [...(contentResults.data || []), ...(titleResults.data || [])];
      const seen = new Set<string>();
      const unique = combined.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
      }).slice(0, 10);

      // Transform to expected format
      return unique.map(m => ({
        id: m.id,
        content: m.content || '',
        type: m.memory_type || 'context',
        tags: m.tags || [],
        similarity: 0.8, // Placeholder since we're doing text match
        created_at: m.created_at
      }));
    } catch (error) {
      console.error('Error recalling memories:', error);
      return [];
    }
  }

  /**
   * Detect user intent from input
   */
  private async detectIntent(
    userInput: string,
    memories: MemorySearchResult[]
  ): Promise<{
    type: 'create_workflow' | 'query_information' | 'store_context' | 'execute_action' | 'general';
    action?: string;
    params?: Record<string, any>;
    confidence: number;
  }> {
    const lowerInput = userInput.toLowerCase();

    // Keywords for tool execution
    const toolActionKeywords = [
      'list my', 'show my', 'get my', 'fetch my', 'retrieve my',
      'create a', 'make a', 'generate a', 'add a', 'new',
      'search for', 'find in', 'look up',
      'revoke', 'delete', 'remove', 'update'
    ];

    // Keywords for workflow creation
    const workflowKeywords = [
      'create workflow', 'plan workflow', 'help me', 'i need to',
      'build plan', 'set up workflow', 'configure workflow'
    ];

    // Keywords for information queries
    const queryKeywords = [
      'what', 'how', 'why', 'when', 'where', 'who',
      'explain', 'tell me', 'show me about', 'describe'
    ];

    // Keywords for context storage
    const storeKeywords = [
      'remember', 'save this', 'note', 'store', 'keep in mind'
    ];

    // Detect tool action intent - check for specific patterns
    if (toolActionKeywords.some(kw => lowerInput.includes(kw))) {
      const actionIntent = this.parseToolAction(lowerInput);
      if (actionIntent) {
        return {
          type: 'execute_action',
          action: actionIntent.action,
          params: actionIntent.params,
          confidence: 0.85
        };
      }
    }

    // Detect workflow intent
    if (workflowKeywords.some(kw => lowerInput.includes(kw))) {
      return {
        type: 'create_workflow',
        confidence: 0.8
      };
    }

    // Detect query intent
    if (queryKeywords.some(kw => lowerInput.startsWith(kw))) {
      return {
        type: 'query_information',
        confidence: 0.7
      };
    }

    // Detect store intent
    if (storeKeywords.some(kw => lowerInput.includes(kw))) {
      return {
        type: 'store_context',
        confidence: 0.9
      };
    }

    return {
      type: 'general',
      confidence: 0.5
    };
  }

  /**
   * Parse tool action from user input
   */
  private parseToolAction(input: string): { action: string; params: Record<string, any> } | null {
    const lowerInput = input.toLowerCase();

    // API Keys patterns
    if (lowerInput.includes('list') && (lowerInput.includes('api key') || lowerInput.includes('keys'))) {
      return { action: 'dashboard.api_keys.list', params: {} };
    }
    if (lowerInput.includes('create') && lowerInput.includes('api key')) {
      return { action: 'dashboard.api_keys.create', params: {} };
    }

    // Memory patterns
    if (lowerInput.includes('search') && (lowerInput.includes('memor') || lowerInput.includes('context'))) {
      const queryMatch = lowerInput.match(/search (?:for |in |my )?(?:memor(?:y|ies) )?(?:for |about )?(.+)/);
      const query = queryMatch ? queryMatch[1] : '';
      return { action: 'dashboard.memory.search', params: { query } };
    }

    // Workflow patterns
    if (lowerInput.includes('list') && lowerInput.includes('workflow')) {
      return { action: 'dashboard.workflow.list', params: {} };
    }

    // Analytics patterns
    if (lowerInput.includes('usage') || lowerInput.includes('analytics') || lowerInput.includes('stats')) {
      return { action: 'dashboard.analytics.get_usage', params: {} };
    }

    return null;
  }

  /**
   * Create a workflow plan
   */
  private async createWorkflow(
    goal: string,
    memories: MemorySearchResult[]
  ): Promise<WorkflowPlan> {
    // This will call the AI backend to generate the workflow
    // For now, return a structured plan

    const workflowId = `wf_${Date.now()}`;

    return {
      id: workflowId,
      goal,
      summary: `AI-generated plan for: ${goal}`,
      priority: this.assessPriority(goal),
      suggestedTimeframe: this.estimateTimeframe(goal),
      steps: await this.generateSteps(goal, memories),
      risks: this.identifyRisks(goal),
      missingInfo: this.identifyMissingInfo(goal, memories),
      usedMemories: memories.map(m => m.id),
      context: {
        userContext: this.userContext,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };
  }

  /**
   * Generate workflow steps using AI
   */
  private async generateSteps(
    goal: string,
    memories: MemorySearchResult[]
  ): Promise<WorkflowStep[]> {
    // Call AI service to generate steps
    // For now, return example steps
    return [
      {
        id: 'step_1',
        label: 'Gather requirements',
        detail: 'Collect all necessary information and context',
        dependsOnStepIds: [],
        suggestedTool: 'memory.search',
        expectedOutcome: 'Complete list of requirements'
      },
      {
        id: 'step_2',
        label: 'Execute main task',
        detail: 'Perform the primary action',
        dependsOnStepIds: ['step_1'],
        suggestedTool: 'dashboard',
        expectedOutcome: 'Task completed successfully'
      },
      {
        id: 'step_3',
        label: 'Verify and document',
        detail: 'Confirm results and store for future reference',
        dependsOnStepIds: ['step_2'],
        suggestedTool: 'memory.create',
        expectedOutcome: 'Documentation stored in memory'
      }
    ];
  }

  /**
   * Answer information queries
   */
  private async answerQuery(
    query: string,
    memories: MemorySearchResult[]
  ): Promise<string> {
    if (memories.length === 0) {
      return "I don't have any relevant information stored yet. Could you provide more context?";
    }

    // Use memories to construct answer
    const context = memories
      .slice(0, 3)
      .map(m => m.content)
      .join('\n\n');

    return `Based on what I remember:\n\n${context}\n\nIs this helpful? I can provide more details if needed.`;
  }

  /**
   * Store conversation context as memory using Supabase directly
   */
  private async storeContext(content: string): Promise<void> {
    if (!this.userContext?.user_id) return;

    try {
      await supabase.from('memory_entries').insert({
        user_id: this.userContext.user_id,
        title: `Context from ${new Date().toLocaleDateString()}`,
        content,
        memory_type: 'context',
        tags: ['conversation', 'context'],
        metadata: {
          session_id: this.userContext?.current_session_id,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Failed to store context:', error);
    }
  }

  /**
   * Store conversation history as memory using Supabase directly
   */
  private async storeConversationContext(): Promise<void> {
    if (!this.userContext?.user_id) return;

    if (this.conversationHistory.length % 5 === 0 && this.conversationHistory.length > 0) {
      // Store every 5 messages
      const conversationSummary = this.conversationHistory
        .slice(-5)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      try {
        await supabase.from('memory_entries').insert({
          user_id: this.userContext.user_id,
          title: `Conversation snapshot - ${new Date().toLocaleString()}`,
          content: conversationSummary,
          memory_type: 'context',
          tags: ['conversation', 'ai-assistant'],
          metadata: {
            session_id: this.userContext?.current_session_id,
            message_count: this.conversationHistory.length
          }
        });
      } catch (error) {
        console.error('Failed to store conversation context:', error);
      }
    }
  }

  /**
   * Execute an action via tool registry (dashboard or MCP tools)
   */
  private async executeAction(action: string, params?: Record<string, any>): Promise<string> {
    if (!this.toolRegistry) {
      return 'Tool registry not initialized. Please try again.';
    }

    try {
      // Parse action format: "tool_id.action_id"
      const [toolId, actionId] = action.split('.');

      if (!toolId || !actionId) {
        return 'Invalid action format. Use "tool_id.action_id"';
      }

      // Check if AI has permission
      if (!this.toolRegistry.canUseAction(toolId, actionId)) {
        return `I don't have permission to perform "${actionId}" on ${toolId}. Please grant me access in the AI Tools settings.`;
      }

      // Execute the action
      const result = await this.toolRegistry.executeAction(toolId, actionId, params || {});

      // Format the result for the user
      return `✓ Action completed successfully!\n\nResult: ${JSON.stringify(result, null, 2)}`;
    } catch (error: any) {
      console.error('Tool execution error:', error);
      return `⚠️ Failed to execute action: ${error.message}`;
    }
  }

  /**
   * Get available tools for the user
   */
  getAvailableTools(): string[] {
    if (!this.toolRegistry) return [];

    const tools = this.toolRegistry.getEnabledTools();
    return tools.map(tool => `${tool.id}: ${tool.description}`);
  }

  /**
   * Helper: Add message to conversation history
   */
  private addMessage(role: 'user' | 'assistant' | 'system', content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Helper: Assess workflow priority
   */
  private assessPriority(goal: string): 'high' | 'medium' | 'low' {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'critical', 'emergency'];
    const lowerGoal = goal.toLowerCase();

    if (urgentKeywords.some(kw => lowerGoal.includes(kw))) {
      return 'high';
    }

    return 'medium';
  }

  /**
   * Helper: Estimate timeframe
   */
  private estimateTimeframe(goal: string): string {
    // Simple heuristic based on goal complexity
    const wordCount = goal.split(' ').length;

    if (wordCount < 10) return '15-30 minutes';
    if (wordCount < 20) return '30-60 minutes';
    return '1-2 hours';
  }

  /**
   * Helper: Identify risks
   */
  private identifyRisks(goal: string): string[] {
    // Placeholder - will be enhanced with AI
    return [
      'Ensure all dependencies are available before starting',
      'Verify access permissions for required resources'
    ];
  }

  /**
   * Helper: Identify missing information
   */
  private identifyMissingInfo(goal: string, memories: MemorySearchResult[]): string[] {
    if (memories.length < 3) {
      return ['More context needed - please provide additional details'];
    }
    return [];
  }

  /**
   * Helper: Generate workflow response message
   */
  private generateWorkflowResponse(workflow: WorkflowPlan): string {
    return `I've created a ${workflow.priority}-priority workflow with ${workflow.steps.length} steps. ` +
           `Estimated time: ${workflow.suggestedTimeframe}. ` +
           (workflow.risks.length > 0 ? `\n\n⚠️ Please note: ${workflow.risks[0]}` : '');
  }

  /**
   * Helper: Generate general response
   */
  private async generateGeneralResponse(
    input: string,
    memories: MemorySearchResult[]
  ): Promise<string> {
    return `I understand. ${memories.length > 0 ? 'Based on previous context, I can help you with that.' : 'How can I assist you further?'}`;
  }

  /**
   * Helper: Get suggested follow-up actions
   */
  private getSuggestedActions(intent: any): string[] {
    switch (intent.type) {
      case 'create_workflow':
        return ['Execute workflow', 'Modify workflow', 'Save as template'];
      case 'query_information':
        return ['Show more details', 'Search related topics', 'Save to memory'];
      default:
        return ['Ask another question', 'Create a workflow', 'View memories'];
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(): AIMessage[] {
    return this.conversationHistory;
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

/**
 * Create an AI Orchestrator instance
 */
export function createAIOrchestrator(userContext: UserContext): AIOrchestrator {
  return new AIOrchestrator(userContext);
}
