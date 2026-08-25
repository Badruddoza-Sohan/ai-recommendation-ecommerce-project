/**
 * Embedding Types
 */

export interface EmbeddingRecord {
  id: number;
  collection: string;
  sourceId: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  modelName: string;
  dimension: number;
  createdAt: number;
}

export type EmbeddingCollection =
  | "knowledge"
  | "products"
  | "intents"
  | "chat_summaries";

export interface VectorSearchResult {
  sourceId: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface EmbeddingCacheEntry {
  text: string;
  embedding: number[];
  cachedAt: number;
}
