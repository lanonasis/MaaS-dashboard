import type { Express, Request, Response } from "express";
import type { IStorage } from "./storage";
import { insertApiKeySchema, insertProfileSchema } from "@shared/schema";
import crypto from "crypto";

type AuthenticatedRequest = Request & { user?: { id: string; email: string } };

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
