import type { 
  Profile, InsertProfile, 
  ApiKey, InsertApiKey, 
  ApiLog, InsertApiLog,
  MemoryEntry, InsertMemoryEntry,
  WorkflowRun, InsertWorkflowRun
} from "@shared/schema";

export interface IStorage {
  getProfile(userId: string): Promise<Profile | null>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile>;
  
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  
  getApiLogs(userId: string, limit?: number): Promise<ApiLog[]>;
  createApiLog(log: InsertApiLog): Promise<ApiLog>;
  
  // Memory methods
  getRecentMemories(userId: string, limit?: number): Promise<MemoryEntry[]>;
  createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry>;
  
  // Workflow methods
  getWorkflowRuns(userId: string, limit?: number): Promise<WorkflowRun[]>;
  createWorkflowRun(run: InsertWorkflowRun): Promise<WorkflowRun>;
  updateWorkflowRun(id: string, updates: Partial<InsertWorkflowRun>): Promise<WorkflowRun>;
}

export class DbStorage implements IStorage {
  constructor(private db: any) {}
  
  async getProfile(userId: string): Promise<Profile | null> {
    const { profiles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db.select().from(profiles).where(eq(profiles.id, userId));
    return result[0] || null;
  }
  
  async createProfile(profile: InsertProfile): Promise<Profile> {
    const { profiles } = await import("@shared/schema");
    const result = await this.db.insert(profiles).values(profile).returning();
    return result[0];
  }
  
  async updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile> {
    const { profiles } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db
      .update(profiles)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(profiles.id, userId))
      .returning();
    return result[0];
  }
  
  async getApiKeys(userId: string): Promise<ApiKey[]> {
    const { apiKeys } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    return await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.user_id, userId))
      .orderBy(desc(apiKeys.created_at));
  }
  
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const { apiKeys } = await import("@shared/schema");
    const result = await this.db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }
  
  async deleteApiKey(id: string, userId: string): Promise<void> {
    const { apiKeys } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");
    await this.db
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.user_id, userId)));
  }
  
  async getApiLogs(userId: string, limit: number = 100): Promise<ApiLog[]> {
    const { apiLogs } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    return await this.db
      .select()
      .from(apiLogs)
      .where(eq(apiLogs.user_id, userId))
      .orderBy(desc(apiLogs.created_at))
      .limit(limit);
  }
  
  async createApiLog(log: InsertApiLog): Promise<ApiLog> {
    const { apiLogs } = await import("@shared/schema");
    const result = await this.db.insert(apiLogs).values(log).returning();
    return result[0];
  }
  
  async getRecentMemories(userId: string, limit: number = 20): Promise<MemoryEntry[]> {
    const { memoryEntries } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    return await this.db
      .select()
      .from(memoryEntries)
      .where(eq(memoryEntries.user_id, userId))
      .orderBy(desc(memoryEntries.created_at))
      .limit(limit);
  }
  
  async createMemoryEntry(entry: InsertMemoryEntry): Promise<MemoryEntry> {
    const { memoryEntries } = await import("@shared/schema");
    const result = await this.db.insert(memoryEntries).values(entry).returning();
    return result[0];
  }
  
  async getWorkflowRuns(userId: string, limit: number = 20): Promise<WorkflowRun[]> {
    const { workflowRuns } = await import("@shared/schema");
    const { eq, desc } = await import("drizzle-orm");
    return await this.db
      .select()
      .from(workflowRuns)
      .where(eq(workflowRuns.user_id, userId))
      .orderBy(desc(workflowRuns.created_at))
      .limit(limit);
  }
  
  async createWorkflowRun(run: InsertWorkflowRun): Promise<WorkflowRun> {
    const { workflowRuns } = await import("@shared/schema");
    const result = await this.db.insert(workflowRuns).values(run).returning();
    return result[0];
  }
  
  async updateWorkflowRun(id: string, updates: Partial<InsertWorkflowRun>): Promise<WorkflowRun> {
    const { workflowRuns } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    const result = await this.db
      .update(workflowRuns)
      .set(updates)
      .where(eq(workflowRuns.id, id))
      .returning();
    return result[0];
  }
}
