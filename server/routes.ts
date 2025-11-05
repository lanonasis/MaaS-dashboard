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
}
