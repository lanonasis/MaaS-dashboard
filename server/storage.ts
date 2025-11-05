import type { Profile, InsertProfile, ApiKey, InsertApiKey, ApiLog, InsertApiLog } from "@shared/schema";

export interface IStorage {
  getProfile(userId: string): Promise<Profile | null>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  updateProfile(userId: string, updates: Partial<InsertProfile>): Promise<Profile>;
  
  getApiKeys(userId: string): Promise<ApiKey[]>;
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  deleteApiKey(id: string, userId: string): Promise<void>;
  
  getApiLogs(userId: string, limit?: number): Promise<ApiLog[]>;
  createApiLog(log: InsertApiLog): Promise<ApiLog>;
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
}
