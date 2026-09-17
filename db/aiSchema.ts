/**
 * AI System Database Schema
 *
 * Replaces db/mlSchema.ts with a clean, purpose-built schema for the
 * Ollama-powered local AI assistant.
 *
 * Tables:
 *  - ai_embeddings         Unified vector store (replaces knowledge_embeddings)
 *  - conversation_summaries Long-term conversation memory
 *  - memory_entities        Extracted entities (order IDs, names, etc.)
 *  - tool_executions        Tool call history and results
 *  - ai_metrics             Performance and usage metrics
 *  - intent_examples        Training data for intent classification
 *  - escalation_tickets     Human handoff tickets (kept from old schema)
 *  - ai_feedback            User feedback on AI responses
 */

import {
  mysqlTable,
  integer,
  text,
  real,
  index,
  sql,
} from "./mysql.ts";

// ─── Timestamps helper (MySQL millisecond timestamp) ──────────────────────────
const NOW = sql`ROUND(UNIX_TIMESTAMP(NOW(3)) * 1000)`;

// ============================================================
// 1. AI EMBEDDINGS — Unified vector store for all collections
// ============================================================
export const aiEmbeddings = mysqlTable("ai_embeddings", {
  id: integer("id").primaryKey().notNull(),
  /** Which collection this embedding belongs to */
  collection: text("collection").notNull(), // "knowledge" | "products" | "intents" | "chat_summaries"
  /** External ID (e.g., product id, knowledge article id, intent label) */
  sourceId: text("source_id").notNull(),
  /** JSON float array: the embedding vector */
  embedding: text("embedding").notNull(),
  /** JSON object: extra info attached to this vector */
  metadata: text("metadata"),
  /** Embedding model used (e.g., "nomic-embed-text") */
  modelName: text("model_name").notNull(),
  /** Vector dimension (e.g., 768 for nomic-embed-text) */
  dimension: integer("dimension").notNull(),
  createdAt: integer("created_at").default(NOW).notNull(),
  updatedAt: integer("updated_at").default(NOW).notNull(),
}, (table) => ({
  collectionIdx: index("ae_collection_idx").on(table.collection),
  sourceIdx: index("ae_source_idx").on(table.sourceId),
  collectionSourceIdx: index("ae_collection_source_idx").on(table.collection, table.sourceId),
}));

export type AIEmbedding = typeof aiEmbeddings.$inferSelect;
export type InsertAIEmbedding = typeof aiEmbeddings.$inferInsert;

// ============================================================
// 2. CONVERSATION SUMMARIES — Long-term memory
// ============================================================
export const conversationSummaries = mysqlTable("conversation_summaries", {
  id: integer("id").primaryKey().notNull(),
  /** Chat session ID */
  sessionId: text("session_id").notNull(),
  /** User ID (null for guests) */
  userId: integer("user_id"),
  /** LLM-generated summary of the conversation so far */
  summary: text("summary").notNull(),
  /** JSON snapshot of all known entities at summary time */
  entitySnapshot: text("entity_snapshot"),
  /** How many messages were summarized */
  messageCount: integer("message_count").notNull().default(0),
  /** Message ID up to which this summary covers */
  upToMessageId: integer("up_to_message_id"),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("cs_session_idx").on(table.sessionId),
  userIdx: index("cs_user_idx").on(table.userId),
}));

export type ConversationSummary = typeof conversationSummaries.$inferSelect;
export type InsertConversationSummary = typeof conversationSummaries.$inferInsert;

// ============================================================
// 3. MEMORY ENTITIES — Extracted entities per session/user
// ============================================================
export const memoryEntities = mysqlTable("memory_entities", {
  id: integer("id").primaryKey().notNull(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  /** Entity type: "order_id" | "product_name" | "email" | "phone" | "address" | "name" | "preference" | "size" | "color" */
  entityType: text("entity_type").notNull(),
  /** The extracted key (e.g., "last_mentioned_order") */
  entityKey: text("entity_key").notNull(),
  /** The extracted value (e.g., "ORD-2024-0001") */
  entityValue: text("entity_value").notNull(),
  /** Extraction confidence 0–1 */
  confidence: real("confidence").default(1.0),
  createdAt: integer("created_at").default(NOW).notNull(),
  updatedAt: integer("updated_at").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("me_session_idx").on(table.sessionId),
  userIdx: index("me_user_idx").on(table.userId),
  typeIdx: index("me_type_idx").on(table.entityType),
}));

export type MemoryEntity = typeof memoryEntities.$inferSelect;
export type InsertMemoryEntity = typeof memoryEntities.$inferInsert;

// ============================================================
// 4. TOOL EXECUTIONS — History of tool calls
// ============================================================
export const toolExecutions = mysqlTable("tool_executions", {
  id: integer("id").primaryKey().notNull(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  /** Which tool was called (e.g., "track_order", "search_products") */
  toolName: text("tool_name").notNull(),
  /** JSON input parameters */
  input: text("input").notNull(),
  /** JSON output result */
  output: text("output"),
  /** Execution duration in milliseconds */
  durationMs: integer("duration_ms"),
  /** Whether the tool succeeded */
  success: integer("success").default(1).notNull(),
  /** Error message if failed */
  error: text("error"),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("te_session_idx").on(table.sessionId),
  toolIdx: index("te_tool_idx").on(table.toolName),
  createdIdx: index("te_created_idx").on(table.createdAt),
}));

export type ToolExecution = typeof toolExecutions.$inferSelect;
export type InsertToolExecution = typeof toolExecutions.$inferInsert;

// ============================================================
// 5. AI METRICS — Performance and usage tracking
// ============================================================
export const aiMetrics = mysqlTable("ai_metrics", {
  id: integer("id").primaryKey().notNull(),
  /** Component: "llm" | "embedding" | "vector_search" | "tool" | "rag" | "total" */
  component: text("component").notNull(),
  /** Metric name: "latency_ms" | "token_count" | "hit_rate" | "error_count" */
  metricName: text("metric_name").notNull(),
  /** Numeric value */
  value: real("value").notNull(),
  /** JSON extra context */
  metadata: text("metadata"),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  componentIdx: index("am_component_idx").on(table.component),
  metricIdx: index("am_metric_idx").on(table.metricName),
  createdIdx: index("am_created_idx").on(table.createdAt),
}));

export type AIMetric = typeof aiMetrics.$inferSelect;
export type InsertAIMetric = typeof aiMetrics.$inferInsert;

// ============================================================
// 6. INTENT EXAMPLES — Training data for intent classification
// ============================================================
export const intentExamples = mysqlTable("intent_examples", {
  id: integer("id").primaryKey().notNull(),
  /** Domain: "support" | "fashion" | "voice" | "seller" | "recommendation" */
  domain: text("domain").notNull(),
  /** Intent label (e.g., "order_status", "outfit_recommendation") */
  intent: text("intent").notNull(),
  /** Example utterance */
  text: text("text").notNull(),
  /** Pre-computed embedding (JSON float[]) — null until embedded */
  embedding: text("embedding"),
  /** Source: "seed" | "learned" | "imported" */
  source: text("source").default("seed").notNull(),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  domainIdx: index("ie_domain_idx").on(table.domain),
  intentIdx: index("ie_intent_idx").on(table.intent),
  domainIntentIdx: index("ie_domain_intent_idx").on(table.domain, table.intent),
}));

export type IntentExample = typeof intentExamples.$inferSelect;
export type InsertIntentExample = typeof intentExamples.$inferInsert;

// ============================================================
// 7. ESCALATION TICKETS — Human handoff (kept from old schema)
// ============================================================
export const escalationTickets = mysqlTable("escalation_tickets", {
  id: integer("id").primaryKey().notNull(),
  ticketNumber: text("ticket_number").notNull().unique(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response"),
  aiConfidence: real("ai_confidence"),
  escalationReason: text("escalation_reason").notNull(),
  sentimentScore: real("sentiment_score"),
  status: text("status").default("open").notNull(), // "open" | "in_progress" | "resolved" | "closed"
  priority: text("priority").default("medium").notNull(), // "low" | "medium" | "high" | "urgent"
  assignedAgentId: integer("assigned_agent_id"),
  resolution: text("resolution"),
  resolvedAt: integer("resolved_at"),
  createdAt: integer("created_at").default(NOW).notNull(),
  updatedAt: integer("updated_at").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("et_session_idx").on(table.sessionId),
  userIdx: index("et_user_idx").on(table.userId),
  statusIdx: index("et_status_idx").on(table.status),
}));

export type EscalationTicket = typeof escalationTickets.$inferSelect;
export type InsertEscalationTicket = typeof escalationTickets.$inferInsert;

// ============================================================
// 8. AI FEEDBACK — User feedback on AI responses
// ============================================================
export const aiFeedback = mysqlTable("ai_feedback", {
  id: integer("id").primaryKey().notNull(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  /** ID of the chat_messages row being rated */
  messageId: integer("message_id"),
  /** "helpful" | "not_helpful" */
  feedback: text("feedback").notNull(),
  /** Optional comment from user */
  comment: text("comment"),
  /** What intent was classified */
  intent: text("intent"),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  sessionIdx: index("af_session_idx").on(table.sessionId),
  feedbackIdx: index("af_feedback_idx").on(table.feedback),
}));

export type AIFeedback = typeof aiFeedback.$inferSelect;
export type InsertAIFeedback = typeof aiFeedback.$inferInsert;

// ============================================================
// 9. TICKET MESSAGES — Live Admin to Customer Chat Messages
// ============================================================
export const ticketMessages = mysqlTable("ticket_messages", {
  id: integer("id").primaryKey().notNull(),
  ticketId: integer("ticket_id").notNull(),
  senderType: text("sender_type").notNull(), // "user" | "admin" | "system"
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: integer("created_at").default(NOW).notNull(),
}, (table) => ({
  ticketIdx: index("tm_ticket_idx").on(table.ticketId),
}));

export type TicketMessage = typeof ticketMessages.$inferSelect;
export type InsertTicketMessage = typeof ticketMessages.$inferInsert;
