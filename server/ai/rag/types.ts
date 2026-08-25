/**
 * RAG Types
 */

export interface RetrievedContext {
  id: string;
  source: "knowledge" | "product" | "summary" | "tool";
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface RetrievalOptions {
  topK?: number;
  minScore?: number;
  collections?: Array<"knowledge" | "products" | "chat_summaries">;
}
