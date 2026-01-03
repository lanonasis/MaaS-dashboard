import type { Express, Request, Response } from "express";
import type { IStorage } from "./storage";
import { insertApiKeySchema, insertProfileSchema } from "@shared/schema";
import crypto from "crypto";

type AuthenticatedRequest = Request & { user?: { id: string; email: string } };

/**
 * Extract suggested actions from AI response text
 */
function extractSuggestedActions(text: string): string[] {
  const actions: string[] = [];

  // Look for action-oriented phrases
  const actionPatterns = [
    /(?:you (?:can|could|might|should)|try|consider)\s+([^.!?\n]+)/gi,
    /(?:would you like to|want me to)\s+([^.!?\n]+)/gi
  ];

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null && actions.length < 3) {
      const action = match[1].trim();
      if (action.length > 10 && action.length < 60) {
        actions.push(action.charAt(0).toUpperCase() + action.slice(1));
      }
    }
  }

  // Default suggestions if none found
  if (actions.length === 0) {
    return ['Tell me more', 'Create a workflow', 'Search memories'];
  }

  return actions;
}

/**
 * Keyword-based intent detection fallback
 */
function keywordIntentDetection(message: string): {
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

  // Action patterns with specific action extraction
  if (lowerMessage.includes('list') && (lowerMessage.includes('api key') || lowerMessage.includes('keys'))) {
    return { type: 'execute_action', action: 'dashboard.api_keys.list', params: {}, confidence: 0.85 };
  }
  if (lowerMessage.includes('search') && lowerMessage.includes('memor')) {
    const queryMatch = lowerMessage.match(/search (?:for |in |my )?(?:memor(?:y|ies) )?(?:for |about )?(.+)/);
    return {
      type: 'execute_action',
      action: 'dashboard.memory.search',
      params: { query: queryMatch?.[1] || '' },
      confidence: 0.85
    };
  }

  const actionPatterns = ['list my', 'show my', 'get my', 'create a', 'search for'];
  if (actionPatterns.some(p => lowerMessage.includes(p))) {
    return { type: 'execute_action', confidence: 0.75 };
  }

  return { type: 'general', confidence: 0.5 };
}

export function registerRoutes(app: Express, storage: IStorage) {
  
  app.get("/api/profile", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const profile = await storage.getProfile(req.user.id);
      
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.patch("/api/profile", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validation = insertProfileSchema.partial().safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.issues });
      }
      
      const profile = await storage.updateProfile(req.user.id, validation.data);
      res.json(profile);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/api-keys", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const apiKeys = await storage.getApiKeys(req.user.id);
      res.json(apiKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.post("/api/api-keys", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const key = `sk_live_${crypto.randomBytes(32).toString('hex')}`;
      
      const validation = insertApiKeySchema.safeParse({
        ...req.body,
        user_id: req.user.id,
        key,
      });
      
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid data", errors: validation.error.issues });
      }
      
      const apiKey = await storage.createApiKey(validation.data);
      res.json(apiKey);
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.delete("/api/api-keys/:id", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      await storage.deleteApiKey(req.params.id, req.user.id);
      res.json({ message: "API key deleted" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get("/api/api-logs", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getApiLogs(req.user.id, limit);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching API logs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Memory Endpoints
  app.get("/api/memories/recent", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const memories = await storage.getRecentMemories(req.user.id, limit);
      
      // Transform to match the expected response format
      const response = memories.map(memory => ({
        id: memory.id,
        contentSnippet: memory.content.substring(0, 200) + (memory.content.length > 200 ? '...' : ''),
        type: memory.type || 'note',
        tags: Array.isArray(memory.tags) ? memory.tags : [],
        createdAt: memory.created_at
      }));
      
      res.json(response);
    } catch (error) {
      console.error("Error fetching memories:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Orchestrator Endpoints
  app.post("/api/orchestrator/execute", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { goal } = req.body;
      
      if (!goal || typeof goal !== 'string') {
        return res.status(400).json({ message: "Goal is required" });
      }
      
      // Fetch user's recent memories for context
      const recentMemories = await storage.getRecentMemories(req.user.id, 10);

      // Prepare memory context for LLM
      const memoryContext = recentMemories.map(m => ({
        id: m.id,
        type: m.type,
        content: m.content.substring(0, 500),
        tags: m.tags
      }));

      // Load MCP tools configuration
      let mcpTools: string[] = [];
      try {
        const mcpConfig = await import('../src/config/mcp-servers.json');
        mcpTools = Object.keys(mcpConfig.default?.mcpServers || {});
      } catch (error) {
        console.warn('Could not load MCP configuration:', error);
      }

      // Call LLM to generate workflow plan
      // Note: This requires OpenAI API key or similar LLM service
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (!openaiApiKey) {
        return res.status(500).json({ 
          message: "LLM service not configured. Please set OPENAI_API_KEY environment variable." 
        });
      }
      
      // Make LLM request
      const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are the LanOnasis Orchestrator, an opinionated AI project operator.

You see:
- The user's high-level goal
- A slice of their recent memories from the LanOnasis Memory Service
- Available MCP (Model Context Protocol) tools the user has configured

Your job:
1. Turn the goal into a realistic, execution-ready workflow
2. Use existing memories whenever relevant, and say so explicitly
3. Push back gently on bad or vague requests (e.g., "launch in 1 hour" with no assets)
4. Always output STRICTLY in the JSON schema provided

Guidelines:
- Be concrete and practical, not fluffy
- Prefer fewer, more impactful steps (3-7) over long task lists
- If critical information is missing, call it out in "missingInfo"
- If a goal is unrealistic, downgrade priority and list constraints in "risks"
- Suggest which internal tool or area of the app should be used:
  - "memory.search" for searching stored memories
  - "mcp.<tool_name>" for MCP tools (e.g., "mcp.github", "mcp.perplexity-ask", "mcp.supabase")
  - "cli" for terminal actions
  - "dashboard" for UI actions
  - Use the specific MCP tools that are available (listed in the user message) when relevant

Think like a senior operator who cares about focus, safety, and leverage.

Return your response as JSON with this exact structure:
{
  "summary": "AI-generated interpretation of the goal (1-2 sentences)",
  "priority": "high" | "medium" | "low",
  "suggestedTimeframe": "e.g., Today (30-60 minutes), This week, etc.",
  "steps": [
    {
      "id": "1",
      "label": "Brief step title",
      "detail": "Detailed explanation of what to do and how",
      "dependsOnStepIds": ["2"],
      "suggestedTool": "memory.search" | "mcp.clickup" | "cli" | "dashboard",
      "expectedOutcome": "What success looks like for this step"
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "missingInfo": ["Missing detail 1", "Missing detail 2"],
  "notes": "Additional strategy notes or context",
  "usedMemories": ["memory_id1", "memory_id2"]
}`
            },
            {
              role: 'user',
              content: `Recent memories:\n${JSON.stringify(memoryContext, null, 2)}\n\nAvailable MCP Tools:\n${mcpTools.length > 0 ? mcpTools.join(', ') : 'None configured'}\n\nGoal: ${goal}`
            }
          ],
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });
      
      if (!llmResponse.ok) {
        throw new Error(`LLM API error: ${llmResponse.statusText}`);
      }
      
      const llmData = await llmResponse.json();
      const workflowPlan = JSON.parse(llmData.choices[0].message.content);

      // Store workflow run in database
      const workflowRun = await storage.createWorkflowRun({
        user_id: req.user.id,
        goal,
        status: 'completed',
        steps: workflowPlan.steps,
        results: {
          summary: workflowPlan.summary,
          priority: workflowPlan.priority,
          suggestedTimeframe: workflowPlan.suggestedTimeframe,
          notes: workflowPlan.notes,
          risks: workflowPlan.risks,
          missingInfo: workflowPlan.missingInfo
        },
        used_memories: workflowPlan.usedMemories || [],
        completed_at: new Date()
      });

      res.json({
        id: workflowRun.id,
        summary: workflowPlan.summary,
        priority: workflowPlan.priority,
        suggestedTimeframe: workflowPlan.suggestedTimeframe,
        steps: workflowPlan.steps,
        risks: workflowPlan.risks || [],
        missingInfo: workflowPlan.missingInfo || [],
        notes: workflowPlan.notes,
        usedMemories: workflowPlan.usedMemories || [],
        createdAt: workflowRun.created_at
      });
      
    } catch (error) {
      console.error("Error executing workflow:", error);
      res.status(500).json({ 
        message: "Failed to execute workflow", 
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  
  // AI Chat Completion Endpoint
  app.post("/api/ai/chat", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { messages, userContext, memories, temperature = 0.7, maxTokens = 1024 } = req.body;

      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: "Messages array is required" });
      }

      // Get API key from environment
      const openaiApiKey = process.env.OPENAI_API_KEY;
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      if (!openaiApiKey && !anthropicApiKey) {
        return res.status(500).json({
          message: "LLM service not configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY."
        });
      }

      // Fetch additional context from user's memories
      const recentMemories = await storage.getRecentMemories(req.user.id, 10);
      const memoryContext = [...(memories || []), ...recentMemories.map(m => ({
        id: m.id,
        content: m.content.substring(0, 300),
        type: m.type,
        tags: m.tags
      }))];

      // Build system prompt with user context
      const systemPrompt = `You are the LanOnasis AI Assistant, a helpful and personalized AI embedded in the user's dashboard.

About the user:
- Name: ${userContext?.name || 'User'}
- Email: ${userContext?.email || req.user.email}

${memoryContext.length > 0 ? `User's relevant context:\n${memoryContext.map(m => `- [${m.type || 'note'}] ${m.content}`).join('\n')}` : ''}

Your capabilities:
1. Answer questions using the user's stored memories and context
2. Help create workflow plans for complex tasks
3. Provide personalized recommendations based on user history
4. Execute actions on connected tools (GitHub, ClickUp, etc.)
5. Remember important context for future conversations

Guidelines:
- Be concise but helpful (2-4 sentences for simple questions, more for complex ones)
- Reference specific memories when relevant
- Suggest follow-up actions when appropriate
- Use the user's name occasionally for a personal touch
- If you don't know something, say so and offer alternatives`;

      // Prefer Anthropic if available, fallback to OpenAI
      if (anthropicApiKey) {
        const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: maxTokens,
            system: systemPrompt,
            messages: messages.filter((m: { role: string }) => m.role !== 'system').map((m: { role: string; content: string }) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content
            }))
          })
        });

        if (!anthropicResponse.ok) {
          throw new Error(`Anthropic API error: ${anthropicResponse.statusText}`);
        }

        const anthropicData = await anthropicResponse.json();

        return res.json({
          content: anthropicData.content[0].text,
          suggestedActions: extractSuggestedActions(anthropicData.content[0].text),
          metadata: {
            model: 'claude-3-haiku-20240307',
            tokensUsed: anthropicData.usage?.input_tokens + anthropicData.usage?.output_tokens
          }
        });
      }

      // OpenAI fallback
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages
          ],
          temperature,
          max_tokens: maxTokens
        })
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      const responseContent = openaiData.choices[0].message.content;

      res.json({
        content: responseContent,
        suggestedActions: extractSuggestedActions(responseContent),
        metadata: {
          model: 'gpt-4o-mini',
          tokensUsed: openaiData.usage?.total_tokens
        }
      });

    } catch (error) {
      console.error("Error in AI chat:", error);
      res.status(500).json({
        message: "Failed to process AI request",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI Intent Detection Endpoint
  app.post("/api/ai/detect-intent", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { message, userContext, conversationHistory } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

      if (!openaiApiKey && !anthropicApiKey) {
        // Fallback to keyword-based detection
        return res.json(keywordIntentDetection(message));
      }

      const intentPrompt = `Analyze the user's message and determine their intent. Respond with ONLY a JSON object.

User message: "${message}"

Recent conversation context:
${conversationHistory?.slice(-3).map((m: { role: string; content: string }) => `${m.role}: ${m.content}`).join('\n') || 'No recent messages'}

Classify the intent as one of:
- "create_workflow": User wants to create a plan, workflow, or multi-step process
- "query_information": User is asking a question or seeking information
- "store_context": User wants to save/remember something
- "execute_action": User wants to perform an action (list items, search, create something)
- "general": General conversation or unclear intent

If "execute_action", also extract:
- action: The specific action (e.g., "dashboard.api_keys.list", "dashboard.memory.search")
- params: Any parameters extracted from the message

Response format:
{"type": "intent_type", "action": "optional_action", "params": {}, "confidence": 0.0-1.0}`;

      const apiKey = anthropicApiKey || openaiApiKey;
      const isAnthropic = !!anthropicApiKey;

      if (isAnthropic) {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey!,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 256,
            messages: [{ role: 'user', content: intentPrompt }]
          })
        });

        if (!response.ok) {
          return res.json(keywordIntentDetection(message));
        }

        const data = await response.json();
        try {
          const intentResult = JSON.parse(data.content[0].text);
          return res.json(intentResult);
        } catch {
          return res.json(keywordIntentDetection(message));
        }
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: intentPrompt }],
          temperature: 0.3,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        return res.json(keywordIntentDetection(message));
      }

      const data = await response.json();
      const intentResult = JSON.parse(data.choices[0].message.content);
      res.json(intentResult);

    } catch (error) {
      console.error("Error detecting intent:", error);
      res.json(keywordIntentDetection(req.body.message || ''));
    }
  });

  // Get workflow history
  app.get("/api/orchestrator/runs", async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const runs = await storage.getWorkflowRuns(req.user.id, limit);

      // Transform runs to include all fields from results
      const transformedRuns = runs.map(run => ({
        id: run.id,
        goal: run.goal,
        summary: (run.results as any)?.summary,
        priority: (run.results as any)?.priority,
        suggestedTimeframe: (run.results as any)?.suggestedTimeframe,
        steps: run.steps || [],
        risks: (run.results as any)?.risks || [],
        missingInfo: (run.results as any)?.missingInfo || [],
        notes: (run.results as any)?.notes || '',
        used_memories: run.used_memories || [],
        created_at: run.created_at,
        status: run.status
      }));

      res.json(transformedRuns);
    } catch (error) {
      console.error("Error fetching workflow runs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
