import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMemorySchema } from "../shared/schema";
import { randomBytes } from "crypto";

declare global {
  namespace Express {
    interface User {
      id: string;
    }
    interface Request {
      user?: Express.User;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Memory Routes
  app.get("/api/memories", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const memories = await storage.getMemories(userId);
      res.json(memories);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch memories" });
    }
  });

  app.get("/api/memories/search", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      const { q } = req.query;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!q || typeof q !== "string") return res.status(400).json({ error: "Missing query" });

      const results = await storage.searchMemories(userId, q);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Search failed" });
    }
  });

  app.post("/api/memories", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const validated = insertMemorySchema.parse(req.body);
      const memory = await storage.createMemory({ ...validated, userId });
      res.status(201).json(memory);
    } catch (error) {
      res.status(400).json({ error: "Invalid memory data" });
    }
  });

  app.patch("/api/memories/:id", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const memory = await storage.getMemory(req.params.id);
      if (!memory || memory.userId !== userId) return res.status(404).json({ error: "Not found" });

      const validated = insertMemorySchema.partial().parse(req.body);
      const updated = await storage.updateMemory(req.params.id, validated);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Invalid update data" });
    }
  });

  app.delete("/api/memories/:id", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const memory = await storage.getMemory(req.params.id);
      if (!memory || memory.userId !== userId) return res.status(404).json({ error: "Not found" });

      await storage.deleteMemory(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete memory" });
    }
  });

  // API Key Routes
  app.get("/api/keys", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const keys = await storage.getApiKeys(userId);
      res.json(keys.map(k => ({ ...k, token: k.token.slice(0, 12) + "..." })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch keys" });
    }
  });

  app.post("/api/keys/generate", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { name, environment, scope } = req.body;
      const token = `sk_${environment}_${randomBytes(32).toString("hex")}`;

      const key = await storage.createApiKey({
        name,
        token,
        environment,
        scope: scope || "read:write",
        userId,
      });

      res.status(201).json({ ...key, token });
    } catch (error) {
      res.status(400).json({ error: "Failed to generate key" });
    }
  });

  app.post("/api/keys/:id/rotate", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const key = await storage.getApiKeyByToken(req.params.id);
      if (!key || key.userId !== userId) return res.status(404).json({ error: "Not found" });

      const rotated = await storage.rotateApiKey(key.id);
      res.json(rotated);
    } catch (error) {
      res.status(500).json({ error: "Failed to rotate key" });
    }
  });

  app.post("/api/keys/:id/revoke", async (req: Request, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const key = await storage.getApiKeyByToken(req.params.id);
      if (!key || key.userId !== userId) return res.status(404).json({ error: "Not found" });

      await storage.revokeApiKey(key.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke key" });
    }
  });

  return httpServer;
}
