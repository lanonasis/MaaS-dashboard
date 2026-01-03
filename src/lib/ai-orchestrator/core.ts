/**
 * AI Orchestrator Core - The Brain of the Dashboard Assistant
 *
 * Handles:
 * - Intent detection (AI-powered)
 * - Memory recall (semantic search)
 * - Workflow planning (LLM-generated)
 * - Context management (personalized)
 * - Personalization (user data integration)
 * - Tool execution via ToolRegistry
 */

import { getDashboardMemoryClient } from '@/lib/memory-sdk/dashboard-adapter';
import type { MemorySearchResult, MemoryType } from '@lanonasis/memory-client';
import { createToolRegistry, type ToolRegistry } from '@/lib/ai-orchestrator/tool-registry';
import { createAIService, type AIService, type AICompletionResponse } from '@/lib/ai-orchestrator/ai-service';

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
  private memoryClient = getDashboardMemoryClient();
  private toolRegistry: ToolRegistry | null = null;
  private aiService: AIService;
  private conversationHistory: AIMessage[] = [];
  private userContext: UserContext | null = null;
  private authToken: string | null = null;

  constructor(userContext: UserContext, authToken?: string) {
    this.userContext = userContext;
    this.authToken = authToken || null;
    this.aiService = createAIService(authToken);
    this.initializeToolRegistry();
  }

  /**
   * Set the authentication token for API calls
   */
  setAuthToken(token: string) {
    this.authToken = token;
    this.aiService.setAuthToken(token);
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
   * Recall relevant memories using semantic search
   */
  private async recallMemories(query: string): Promise<MemorySearchResult[]> {
    try {
      const memories = await this.memoryClient.search({
        query,
        limit: 10,
        threshold: 0.7
      });

      return memories;
    } catch (error) {
      console.error('Error recalling memories:', error);
      return [];
    }
  }

  /**
   * Detect user intent from input using AI service
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
    // Try AI-powered intent detection first
    if (this.authToken && this.userContext) {
      try {
        const result = await this.aiService.detectIntent(
          userInput,
          {
            userId: this.userContext.user_id,
            email: this.userContext.user_email,
            name: this.userContext.user_name
          },
          this.conversationHistory
        );
        return result;
      } catch (error) {
        console.warn('AI intent detection failed, using fallback:', error);
      }
    }

    // Fallback to keyword-based detection
    return this.fallbackIntentDetection(userInput);
  }

  /**
   * Fallback keyword-based intent detection
   */
  private fallbackIntentDetection(userInput: string): {
    type: 'create_workflow' | 'query_information' | 'store_context' | 'execute_action' | 'general';
    action?: string;
    params?: Record<string, any>;
    confidence: number;
  } {
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

    // MCP Services patterns
    if (lowerInput.includes('service') && !lowerInput.includes('api key')) {
      if (lowerInput.includes('list') || lowerInput.includes('show') || lowerInput.includes('get')) {
        if (lowerInput.includes('configured') || lowerInput.includes('my')) {
          return { action: 'dashboard.mcp_services.list_configured', params: {} };
        }
        return { action: 'dashboard.mcp_services.list', params: {} };
      }
      if (lowerInput.includes('configure') || lowerInput.includes('setup') || lowerInput.includes('set up')) {
        const serviceMatch = lowerInput.match(/(?:configure|setup|set up)\s+(\w+)/);
        const serviceKey = serviceMatch ? serviceMatch[1] : '';
        return { action: 'dashboard.mcp_services.configure', params: { service_key: serviceKey } };
      }
      if (lowerInput.includes('enable')) {
        const serviceMatch = lowerInput.match(/enable\s+(\w+)/);
        const serviceKey = serviceMatch ? serviceMatch[1] : '';
        return { action: 'dashboard.mcp_services.enable', params: { service_key: serviceKey } };
      }
      if (lowerInput.includes('disable')) {
        const serviceMatch = lowerInput.match(/disable\s+(\w+)/);
        const serviceKey = serviceMatch ? serviceMatch[1] : '';
        return { action: 'dashboard.mcp_services.disable', params: { service_key: serviceKey } };
      }
      if (lowerInput.includes('test')) {
        const serviceMatch = lowerInput.match(/test\s+(\w+)/);
        const serviceKey = serviceMatch ? serviceMatch[1] : '';
        return { action: 'dashboard.mcp_services.test', params: { service_key: serviceKey } };
      }
    }

    // MCP Usage patterns
    if (lowerInput.includes('mcp') && (lowerInput.includes('usage') || lowerInput.includes('analytics'))) {
      return { action: 'dashboard.mcp_usage.get_stats', params: {} };
    }
    if (lowerInput.includes('request') && lowerInput.includes('log')) {
      return { action: 'dashboard.mcp_usage.get_logs', params: {} };
    }
    if (lowerInput.includes('top action') || lowerInput.includes('most used')) {
      return { action: 'dashboard.mcp_usage.get_top_actions', params: {} };
    }
    if (lowerInput.includes('breakdown') && lowerInput.includes('service')) {
      return { action: 'dashboard.mcp_usage.get_service_breakdown', params: {} };
    }

    // MCP API Keys patterns (enhanced)
    if (lowerInput.includes('mcp') && (lowerInput.includes('api key') || lowerInput.includes('key'))) {
      if (lowerInput.includes('list') || lowerInput.includes('show')) {
        return { action: 'dashboard.mcp_api_keys.list', params: {} };
      }
      if (lowerInput.includes('create') || lowerInput.includes('generate') || lowerInput.includes('new')) {
        return { action: 'dashboard.mcp_api_keys.create', params: {} };
      }
      if (lowerInput.includes('revoke') || lowerInput.includes('delete')) {
        return { action: 'dashboard.mcp_api_keys.revoke', params: {} };
      }
      if (lowerInput.includes('rotate')) {
        return { action: 'dashboard.mcp_api_keys.rotate', params: {} };
      }
    }

    // Legacy API Keys patterns
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

    // Generic Analytics patterns
    if (lowerInput.includes('usage') || lowerInput.includes('analytics') || lowerInput.includes('stats')) {
      return { action: 'dashboard.analytics.get_usage', params: {} };
    }

    return null;
  }

  /**
   * Create a workflow plan using AI backend
   */
  private async createWorkflow(
    goal: string,
    memories: MemorySearchResult[]
  ): Promise<WorkflowPlan> {
    // Try to use the AI service for workflow generation
    if (this.authToken && this.userContext) {
      try {
        const workflowResponse = await this.aiService.generateWorkflow({
          goal,
          userContext: {
            userId: this.userContext.user_id,
            email: this.userContext.user_email,
            name: this.userContext.user_name
          },
          memories
        });

        return {
          id: workflowResponse.id || `wf_${Date.now()}`,
          goal: workflowResponse.goal || goal,
          summary: workflowResponse.summary,
          priority: workflowResponse.priority,
          suggestedTimeframe: workflowResponse.suggestedTimeframe,
          steps: workflowResponse.steps.map(step => ({
            ...step,
            status: 'pending' as const
          })),
          risks: workflowResponse.risks || [],
          missingInfo: workflowResponse.missingInfo || [],
          usedMemories: workflowResponse.usedMemories || memories.map(m => m.id),
          context: {
            userContext: this.userContext,
            timestamp: new Date().toISOString(),
            notes: workflowResponse.notes
          },
          createdAt: workflowResponse.createdAt || new Date().toISOString()
        };
      } catch (error) {
        console.warn('AI workflow generation failed, using fallback:', error);
      }
    }

    // Fallback to local generation
    const workflowId = `wf_${Date.now()}`;

    return {
      id: workflowId,
      goal,
      summary: `Plan for: ${goal}`,
      priority: this.assessPriority(goal),
      suggestedTimeframe: this.estimateTimeframe(goal),
      steps: await this.generateStepsFallback(goal, memories),
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
   * Fallback workflow step generation when AI is unavailable
   */
  private async generateStepsFallback(
    goal: string,
    memories: MemorySearchResult[]
  ): Promise<WorkflowStep[]> {
    // Generate contextual steps based on goal keywords
    const steps: WorkflowStep[] = [];
    const lowerGoal = goal.toLowerCase();

    // Step 1: Always start with gathering context
    steps.push({
      id: 'step_1',
      label: 'Gather relevant context',
      detail: `Review existing memories and gather information related to: ${goal}`,
      dependsOnStepIds: [],
      suggestedTool: 'memory.search',
      expectedOutcome: 'Complete understanding of relevant context and requirements'
    });

    // Step 2: Main action based on goal type
    if (lowerGoal.includes('analyz') || lowerGoal.includes('review') || lowerGoal.includes('assess')) {
      steps.push({
        id: 'step_2',
        label: 'Perform analysis',
        detail: 'Analyze the gathered information to extract insights',
        dependsOnStepIds: ['step_1'],
        suggestedTool: 'dashboard',
        expectedOutcome: 'Analysis complete with key insights identified'
      });
    } else if (lowerGoal.includes('create') || lowerGoal.includes('build') || lowerGoal.includes('develop')) {
      steps.push({
        id: 'step_2',
        label: 'Create deliverable',
        detail: 'Build the requested item based on gathered requirements',
        dependsOnStepIds: ['step_1'],
        suggestedTool: 'dashboard',
        expectedOutcome: 'Deliverable created and ready for review'
      });
    } else {
      steps.push({
        id: 'step_2',
        label: 'Execute main task',
        detail: 'Perform the primary action to achieve the goal',
        dependsOnStepIds: ['step_1'],
        suggestedTool: 'dashboard',
        expectedOutcome: 'Main task completed successfully'
      });
    }

    // Step 3: Verification and documentation
    steps.push({
      id: 'step_3',
      label: 'Verify and document',
      detail: 'Confirm results are correct and save for future reference',
      dependsOnStepIds: ['step_2'],
      suggestedTool: 'memory.create',
      expectedOutcome: 'Results verified and documentation stored'
    });

    return steps;
  }

  /**
   * Answer information queries using AI
   */
  private async answerQuery(
    query: string,
    memories: MemorySearchResult[]
  ): Promise<string> {
    // Try AI-powered response generation
    if (this.authToken && this.userContext) {
      try {
        const response = await this.aiService.chat({
          messages: [
            ...this.conversationHistory.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            })),
            { role: 'user' as const, content: query }
          ],
          userContext: {
            userId: this.userContext.user_id,
            email: this.userContext.user_email,
            name: this.userContext.user_name,
            preferences: this.userContext.preferences
          },
          memories
        });

        return response.content;
      } catch (error) {
        console.warn('AI query response failed, using fallback:', error);
      }
    }

    // Fallback response
    if (memories.length === 0) {
      return "I don't have any relevant information stored yet. Could you provide more context or try asking in a different way?";
    }

    // Use memories to construct answer
    const context = memories
      .slice(0, 3)
      .map(m => `- ${m.content.substring(0, 150)}${m.content.length > 150 ? '...' : ''}`)
      .join('\n');

    return `Based on your stored context:\n\n${context}\n\nWould you like me to elaborate on any of these points?`;
  }

  /**
   * Store conversation context as memory
   */
  private async storeContext(content: string): Promise<void> {
    await this.memoryClient.create({
      title: `Context from ${new Date().toLocaleDateString()}`,
      content,
      type: 'context' as MemoryType,
      tags: ['conversation', 'context', this.userContext?.user_id || ''],
      metadata: {
        session_id: this.userContext?.current_session_id,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Store conversation history as memory
   */
  private async storeConversationContext(): Promise<void> {
    if (this.conversationHistory.length % 5 === 0) {
      // Store every 5 messages
      const conversationSummary = this.conversationHistory
        .slice(-5)
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');

      await this.memoryClient.create({
        title: `Conversation snapshot - ${new Date().toLocaleString()}`,
        content: conversationSummary,
        type: 'context' as MemoryType,
        tags: ['conversation', 'ai-assistant'],
        metadata: {
          session_id: this.userContext?.current_session_id,
          message_count: this.conversationHistory.length
        }
      });
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
   * Helper: Generate general response using AI
   */
  private async generateGeneralResponse(
    input: string,
    memories: MemorySearchResult[]
  ): Promise<string> {
    // Try AI-powered response generation
    if (this.authToken && this.userContext) {
      try {
        const response = await this.aiService.chat({
          messages: [
            ...this.conversationHistory.map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            })),
            { role: 'user' as const, content: input }
          ],
          userContext: {
            userId: this.userContext.user_id,
            email: this.userContext.user_email,
            name: this.userContext.user_name,
            preferences: this.userContext.preferences
          },
          memories
        });

        return response.content;
      } catch (error) {
        console.warn('AI general response failed, using fallback:', error);
      }
    }

    // Fallback response with personalization
    const userName = this.userContext?.user_name?.split(' ')[0] || '';
    const greeting = userName ? `${userName}, ` : '';

    if (memories.length > 0) {
      return `${greeting}I understand. Based on your previous context, I can help you with that. What would you like me to do?`;
    }

    return `${greeting}I'm here to help! You can ask me questions, create workflows, or save important context for later. What would you like to do?`;
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
export function createAIOrchestrator(userContext: UserContext, authToken?: string): AIOrchestrator {
  return new AIOrchestrator(userContext, authToken);
}
