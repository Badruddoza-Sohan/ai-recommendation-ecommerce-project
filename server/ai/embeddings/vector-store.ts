/**
 * Vector Store
 *
 * SQLite-based vector store for semantic similarity search.
 * Uses cosine similarity computed in TypeScript (no native extensions needed).
 *
 * Collections: "knowledge" | "products" | "intents" | "chat_summaries"
 *
 * Design decisions:
 *  - Embeddings stored as JSON float arrays in TEXT column
 *  - At query time, all embeddings for a collection are loaded into memory
 *    and similarity is computed in JS. This is fast enough for <100k vectors.
 *  - For production scale (>100k), migrate to a dedicated vector DB (pgvector, Qdrant, etc.)
 */

import { getDb } from "../../../api/queries/connection.js";
import { aiEmbeddings } from "../../../db/aiSchema.js";
import { eq, and } from "../../../db/mysql.js";
import { cosineSimilarity } from "./embedding-service.ts";
import type { EmbeddingCollection, VectorSearchResult } from "./types.ts";

// ─── In-memory Index ──────────────────────────────────────────────────────────

interface IndexEntry {
  sourceId: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

// Lightweight in-memory index per collection, rebuilt on demand
const collectionCache = new Map<EmbeddingCollection, {
  entries: IndexEntry[];
  loadedAt: number;
}>();

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ─── Vector Store ─────────────────────────────────────────────────────────────

export class VectorStore {
  // ── Write Operations ────────────────────────────────────────────────────

  /**
   * Insert or update an embedding for a given (collection, sourceId) pair.
   */
  async upsert(
    collection: EmbeddingCollection,
    sourceId: string,
    embedding: number[],
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    const db = getDb();
    const now = Date.now();
    const modelName = process.env.EMBEDDING_MODEL ?? "nomic-embed-text";

    // Check if exists
    const existing = await db
      .select({ id: (aiEmbeddings as any).id })
      .from(aiEmbeddings)
      .where(
        and(
          eq(aiEmbeddings.collection, collection),
          eq(aiEmbeddings.sourceId, sourceId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(aiEmbeddings)
        .set({
          embedding: JSON.stringify(embedding),
          metadata: JSON.stringify(metadata),
          updatedAt: now,
        })
        .where(eq(aiEmbeddings.id, existing[0].id));
    } else {
      await db.insert(aiEmbeddings).values({
        collection,
        sourceId,
        embedding: JSON.stringify(embedding),
        metadata: JSON.stringify(metadata),
        modelName,
        dimension: embedding.length,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Invalidate collection cache
    collectionCache.delete(collection);
  }

  /**
   * Delete all embeddings for a (collection, sourceId) pair.
   */
  async delete(
    collection: EmbeddingCollection,
    sourceId: string
  ): Promise<void> {
    const db = getDb();
    await db
      .delete(aiEmbeddings)
      .where(
        and(
          eq(aiEmbeddings.collection, collection),
          eq(aiEmbeddings.sourceId, sourceId)
        )
      );
    collectionCache.delete(collection);
  }

  /**
   * Delete all embeddings in a collection.
   */
  async deleteCollection(collection: EmbeddingCollection): Promise<void> {
    const db = getDb();
    await db
      .delete(aiEmbeddings)
      .where(eq(aiEmbeddings.collection, collection));
    collectionCache.delete(collection);
  }

  // ── Search ──────────────────────────────────────────────────────────────

  /**
   * Find the top-K most similar embeddings to the query vector.
   *
   * @param collection - Which collection to search
   * @param queryEmbedding - Query vector
   * @param topK - Maximum number of results to return
   * @param minScore - Minimum cosine similarity threshold (default: 0.0)
   */
  async search(
    collection: EmbeddingCollection,
    queryEmbedding: number[],
    topK = 5,
    minScore = 0.0
  ): Promise<VectorSearchResult[]> {
    const entries = await this.loadCollection(collection);

    if (entries.length === 0) return [];

    // Compute cosine similarity for all entries
    const scored = entries.map((entry) => ({
      sourceId: entry.sourceId,
      score: cosineSimilarity(queryEmbedding, entry.embedding),
      metadata: entry.metadata,
    }));

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    // Filter by minimum score and take top-K
    return scored
      .filter((r) => r.score >= minScore)
      .slice(0, topK);
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  /**
   * Count embeddings in a collection.
   */
  async count(collection: EmbeddingCollection): Promise<number> {
    const entries = await this.loadCollection(collection);
    return entries.length;
  }

  /**
   * Check if a (collection, sourceId) pair exists.
   */
  async exists(
    collection: EmbeddingCollection,
    sourceId: string
  ): Promise<boolean> {
    const db = getDb();
    const result = await db
      .select({ id: (aiEmbeddings as any).id })
      .from(aiEmbeddings)
      .where(
        and(
          eq(aiEmbeddings.collection, collection),
          eq(aiEmbeddings.sourceId, sourceId)
        )
      )
      .limit(1);
    return result.length > 0;
  }

  /**
   * Invalidate all cached collections (e.g., after bulk import).
   */
  invalidateCache(): void {
    collectionCache.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private async loadCollection(
    collection: EmbeddingCollection
  ): Promise<IndexEntry[]> {
    const cached = collectionCache.get(collection);
    if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
      return cached.entries;
    }

    const MAX_LOAD = 5000;
    const db = getDb();
    const rows = await db
      .select({
        sourceId: (aiEmbeddings as any).sourceId,
        embedding: (aiEmbeddings as any).embedding,
        metadata: (aiEmbeddings as any).metadata,
      })
      .from(aiEmbeddings)
      .where(eq(aiEmbeddings.collection, collection))
      .limit(MAX_LOAD);
      
    if (rows.length === MAX_LOAD) {
       console.warn(`[VectorStore] Warning: Collection ${collection} reached memory safety limit of ${MAX_LOAD}. Partial search results possible. Please migrate to a dedicated Vector DB.`);
    }

    const entries: IndexEntry[] = rows.map((row: any) => ({
      sourceId: row.sourceId,
      embedding: JSON.parse(row.embedding) as number[],
      metadata: row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {},
    }));

    collectionCache.set(collection, { entries, loadedAt: Date.now() });
    return entries;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _vectorStore: VectorStore | null = null;

export function getVectorStore(): VectorStore {
  if (!_vectorStore) {
    _vectorStore = new VectorStore();
  }
  return _vectorStore;
}
