import { pgTable, text, varchar, timestamp, boolean, numeric, jsonb, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email"),
  full_name: text("full_name"),
  company_name: text("company_name"),
  phone: text("phone"),
  avatar_url: text("avatar_url"),
  role: text("role"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertProfileSchema = createInsertSchema(profiles).omit({
  created_at: true,
  updated_at: true,
});
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profiles.$inferSelect;

export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  key: text("key").notNull(),
  service: varchar("service", { length: 100 }).default("all"),
  expires_at: timestamp("expires_at"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  created_at: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

export const apiLogs = pgTable("api_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id"),
  endpoint: text("endpoint").notNull(),
  request_method: text("request_method").notNull(),
  service: text("service").notNull(),
  request_data: jsonb("request_data"),
  response_data: jsonb("response_data"),
  response_status: numeric("response_status"),
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({
  id: true,
  created_at: true,
});
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  balance: numeric("balance").default("0"),
  currency: varchar("currency", { length: 3 }).default("USD"),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  wallet_id: uuid("wallet_id"),
  type: text("type").notNull(),
  amount: numeric("amount").notNull(),
  currency: varchar("currency", { length: 3 }).default("USD"),
  status: text("status").notNull(),
  description: text("description"),
  reference: text("reference"),
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export const verificationDocuments = pgTable("verification_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  document_type: text("document_type").notNull(),
  document_number: text("document_number"),
  status: text("status").notNull(),
  rejection_reason: text("rejection_reason"),
  verified_at: timestamp("verified_at"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertVerificationDocumentSchema = createInsertSchema(verificationDocuments).omit({
  id: true,
  created_at: true,
});
export type InsertVerificationDocument = z.infer<typeof insertVerificationDocumentSchema>;
export type VerificationDocument = typeof verificationDocuments.$inferSelect;

// Memory entries table for vector memory storage
export const memoryEntries = pgTable("memory_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  content: text("content").notNull(),
  type: text("type"), // context, project, knowledge, etc.
  tags: jsonb("tags"), // array of tags
  metadata: jsonb("metadata"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

export const insertMemoryEntrySchema = createInsertSchema(memoryEntries).omit({
  id: true,
  created_at: true,
  updated_at: true,
});
export type InsertMemoryEntry = z.infer<typeof insertMemoryEntrySchema>;
export type MemoryEntry = typeof memoryEntries.$inferSelect;

// Workflow runs table for orchestrator history
export const workflowRuns = pgTable("workflow_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull(), // analyzing, planning, executing, completed, failed
  steps: jsonb("steps"), // array of step objects
  results: jsonb("results"),
  error_message: text("error_message"),
  used_memories: jsonb("used_memories"), // array of memory IDs used as context
  created_at: timestamp("created_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

export const insertWorkflowRunSchema = createInsertSchema(workflowRuns).omit({
  id: true,
  created_at: true,
});
export type InsertWorkflowRun = z.infer<typeof insertWorkflowRunSchema>;
export type WorkflowRun = typeof workflowRuns.$inferSelect;
