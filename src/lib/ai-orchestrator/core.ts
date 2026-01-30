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

import { supabase } from '@/integrations/supabase/client';
import { createToolRegistry, type ToolRegistry } from '@/lib/ai-orchestrator/tool-registry';
import { createAIService, type AIService, type AICompletionResponse } from '@/lib/ai-orchestrator/ai-service';

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

    // Enhanced fallback response based on query type and context
    const lowerQuery = query.toLowerCase();
    const userName = this.userContext?.user_name?.split(' ')[0] || '';
    const greeting = userName ? `${userName}, ` : '';

    // No memories found - provide helpful guidance
    if (memories.length === 0) {
      // Detect query type for contextual response
      if (lowerQuery.includes('api') || lowerQuery.includes('key')) {
        return `${greeting}I don't have any stored context about your API keys or configurations yet. You can:\n\n1. Navigate to the **API Keys** section to manage your keys\n2. Save important API notes using the Quick Memory Store\n3. Ask me to "remember" any API-related information for future reference`;
      }
      if (lowerQuery.includes('workflow') || lowerQuery.includes('plan')) {
        return `${greeting}I don't have workflow history to reference yet. Try creating a workflow by saying something like "help me plan [your goal]" and I'll generate an actionable plan for you.`;
      }
      if (lowerQuery.includes('memory') || lowerQuery.includes('memor')) {
        return `${greeting}Your memory bank is ready to use! You can:\n\n1. Use the **Quick Memory Store** to save notes, context, or insights\n2. Search for memories using semantic search\n3. Ask me to "remember" something and I'll store it for you`;
      }
      return `${greeting}I don't have relevant stored context for that question yet. You can save information by telling me to "remember" something, or use the Memory Workbench to store notes and context that I can reference in future conversations.`;
    }

    // Use memories to construct a more informative answer
    const context = memories
      .slice(0, 3)
      .map((m, i) => `${i + 1}. **${m.type || 'note'}**: ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`)
      .join('\n\n');

    return `${greeting}Based on your stored memories, here's what I found:\n\n${context}\n\n${memories.length > 3 ? `(${memories.length - 3} more relevant memories available)\n\n` : ''}Would you like me to:\n- Elaborate on any of these points?\n- Search for more specific information?\n- Create a workflow based on this context?`;
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

    // Enhanced fallback response with personalization and context-awareness
    const userName = this.userContext?.user_name?.split(' ')[0] || '';
    const greeting = userName ? `${userName}, ` : '';
    const lowerInput = input.toLowerCase();
    const historyLength = this.conversationHistory.length;

    // Greetings
    if (lowerInput.match(/^(hi|hello|hey|good morning|good afternoon|good evening)/i)) {
      const timeGreeting = new Date().getHours() < 12 ? 'morning' : (new Date().getHours() < 18 ? 'afternoon' : 'evening');
      return `Good ${timeGreeting}${userName ? `, ${userName}` : ''}! I'm your AI assistant. I can help you:\n\n- **Create workflows** for complex tasks\n- **Search your memories** for relevant context\n- **Store important information** for future reference\n- **Answer questions** about your stored data\n\nWhat would you like to work on today?`;
    }

    // Thanks/acknowledgment
    if (lowerInput.match(/^(thanks|thank you|thx|ty|appreciate)/i)) {
      return `You're welcome${userName ? `, ${userName}` : ''}! Let me know if there's anything else I can help with.`;
    }

    // Help request
    if (lowerInput.includes('help') || lowerInput.includes('what can you do')) {
      return `${greeting}Here's what I can help you with:\n\n**Workflows & Planning**\n- Say "help me plan [goal]" to create an actionable workflow\n- I'll break down complex tasks into manageable steps\n\n**Memory Management**\n- "Remember [information]" to store context\n- "Search memories for [topic]" to find relevant info\n\n**Dashboard Actions**\n- "List my API keys" to see your keys\n- "Show my workflows" to view past plans\n\n**Questions**\n- Ask me anything and I'll use your stored context to help\n\nWhat would you like to try?`;
    }

    // Context-aware response based on conversation history
    if (historyLength > 2) {
      const lastAssistantMsg = this.conversationHistory
        .filter(m => m.role === 'assistant')
        .slice(-1)[0];

      if (lastAssistantMsg?.content.includes('workflow')) {
        return `${greeting}I can help you refine that workflow further. Would you like to:\n- Break down a specific step?\n- Add more context to the plan?\n- Execute one of the steps?`;
      }
    }

    // Response with memories context
    if (memories.length > 0) {
      const topMemoryType = memories[0].type || 'context';
      return `${greeting}I found ${memories.length} relevant ${memories.length === 1 ? 'memory' : 'memories'} related to your message (mostly ${topMemoryType} type). Would you like me to:\n\n- Search for more specific information?\n- Create a workflow based on this context?\n- Store additional notes about this topic?`;
    }

    // Default varied responses
    const defaultResponses = [
      `${greeting}I'm ready to help! Try asking me to:\n- Create a workflow for a project\n- Search your memories\n- Remember important context`,
      `${greeting}How can I assist you today? I can create workflows, search your memories, or help you organize your thoughts.`,
      `${greeting}I'm here to help you work smarter. Would you like to create a plan, store some context, or search your memory bank?`
    ];

    // Use conversation history length to vary response
    return defaultResponses[historyLength % defaultResponses.length];
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
