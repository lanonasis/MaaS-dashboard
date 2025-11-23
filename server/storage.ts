import { db } from "../shared/db";
import { users, memories, apiKeys } from "../shared/schema";
import type { InsertUser, User, InsertMemory, Memory, InsertApiKey, ApiKey } from "../shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Memory operations
  getMemories(userId: string): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | undefined>;
  createMemory(memory: InsertMemory & { userId: string }): Promise<Memory>;
  updateMemory(id: string, memory: Partial<InsertMemory>): Promise<Memory | undefined>;
  deleteMemory(id: string): Promise<boolean>;
  searchMemories(userId: string, query: string): Promise<Memory[]>;

  // API Key operations
  createApiKey(key: InsertApiKey & { userId: string }): Promise<ApiKey>;
  getApiKeys(userId: string): Promise<ApiKey[]>;
  getApiKeyByToken(token: string): Promise<ApiKey | undefined>;
  rotateApiKey(keyId: string): Promise<ApiKey | undefined>;
  revokeApiKey(keyId: string): Promise<boolean>;
}

export class Storage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getMemories(userId: string): Promise<Memory[]> {
    return db.select().from(memories).where(eq(memories.userId, userId));
  }

  async getMemory(id: string): Promise<Memory | undefined> {
    const result = await db.select().from(memories).where(eq(memories.id, id)).limit(1);
    return result[0];
  }

  async createMemory(memory: InsertMemory & { userId: string }): Promise<Memory> {
    const result = await db.insert(memories).values(memory).returning();
    return result[0];
  }

  async updateMemory(id: string, updates: Partial<InsertMemory>): Promise<Memory | undefined> {
    const result = await db.update(memories).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(memories.id, id)).returning();
    return result[0];
  }

  async deleteMemory(id: string): Promise<boolean> {
    const result = await db.delete(memories).where(eq(memories.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async searchMemories(userId: string, query: string): Promise<Memory[]> {
    // Simple text search - can be enhanced with full-text search
    const queryLower = query.toLowerCase();
    const allMemories = await this.getMemories(userId);
    return allMemories.filter(m => 
      m.title.toLowerCase().includes(queryLower) ||
      m.content.toLowerCase().includes(queryLower) ||
      m.tags.some(tag => tag.toLowerCase().includes(queryLower))
    );
  }

  async createApiKey(key: InsertApiKey & { userId: string }): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values(key).returning();
    return result[0];
  }

  async getApiKeys(userId: string): Promise<ApiKey[]> {
    return db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async getApiKeyByToken(token: string): Promise<ApiKey | undefined> {
    const result = await db.select().from(apiKeys).where(eq(apiKeys.token, token)).limit(1);
    return result[0];
  }

  async rotateApiKey(keyId: string): Promise<ApiKey | undefined> {
    const result = await db.update(apiKeys).set({
      lastRotated: new Date(),
    }).where(eq(apiKeys.id, keyId)).returning();
    return result[0];
  }

  async revokeApiKey(keyId: string): Promise<boolean> {
    const result = await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new Storage();
