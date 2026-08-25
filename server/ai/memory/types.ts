/**
 * Memory Types
 */

import type { ChatMessage } from "../llm/types.ts";

export type EntityType = 
  | "order_id" 
  | "product_name" 
  | "email" 
  | "phone" 
  | "address" 
  | "name" 
  | "preference" 
  | "size" 
  | "color"
  | "brand"
  | "category"
  | "price_budget";

export interface ExtractedEntity {
  type: EntityType;
  key: string;
  value: string;
  confidence: number;
}

export interface ConversationSummary {
  sessionId: string;
  userId?: number;
  summary: string;
  entitySnapshot?: Record<string, unknown>;
  messageCount: number;
  upToMessageId?: number;
}

export interface MemoryContext {
  /** The most recent chat messages (short-term memory) */
  shortTerm: ChatMessage[];
  /** Summary of older messages (long-term memory) */
  longTermSummary?: string;
  /** Persisted entities mapped by type */
  entities: Record<EntityType, Array<{ key: string; value: string }>>;
  /** The resolved specific entity for ambiguous references like "it" or "that order" */
  resolvedReferences?: Record<string, string>;
}
