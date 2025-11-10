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
              content: `You are a personal AI orchestrator. You help users plan and execute multi-step workflows.
              
Given the user's recent memories and their goal, create a detailed 3-7 step workflow plan. 
For each step, specify:
- action: A clear description of what to do
- tool: Which tool or service to use (e.g., "memory_search", "data_analysis", "email", "report_generation")
- reasoning: Why this step is important

Also identify which memories are relevant to this workflow.

Return your response as JSON with this structure:
{
  "steps": [{ "action": "...", "tool": "...", "reasoning": "..." }],
  "notes": "Overall strategy and notes",
  "usedMemories": ["memory_id1", "memory_id2"]
}`
            },
            {
              role: 'user',
              content: `Recent memories:\n${JSON.stringify(memoryContext, null, 2)}\n\nGoal: ${goal}`
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
        results: { notes: workflowPlan.notes },
        used_memories: workflowPlan.usedMemories || [],
        completed_at: new Date()
      });
      
      res.json({
        id: workflowRun.id,
        steps: workflowPlan.steps,
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
      
      res.json(runs);
    } catch (error) {
      console.error("Error fetching workflow runs:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
