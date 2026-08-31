/**
 * Embedding Service
 *
 * Generates text embeddings via Ollama (nomic-embed-text).
 * Features:
 *  - LRU cache (avoid re-embedding identical texts)
 *  - Batch embedding with concurrency control
 *  - Dimension validation
 */

import { getLLMService } from "../llm/llm-service.ts";
import type { EmbeddingCacheEntry } from "./types.ts";

// ─── LRU Cache ────────────────────────────────────────────────────────────────

const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

class LRUEmbeddingCache {
  private readonly map = new Map<string, EmbeddingCacheEntry>();
  private readonly maxSize: number;

  constructor(maxSize: number = CACHE_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  get(text: string): number[] | null {
    const entry = this.map.get(text);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      this.map.delete(text);
      return null;
    }
    // Move to end (most recently used)
    this.map.delete(text);
    this.map.set(text, entry);
    return entry.embedding;
  }

  set(text: string, embedding: number[]): void {
    if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(text, { text, embedding, cachedAt: Date.now() });
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class EmbeddingService {
  private readonly cache = new LRUEmbeddingCache();
  private dimension: number | null = null;

  // ── Public ──────────────────────────────────────────────────────────────

  /**
   * Generate a single text embedding.
   * Results are cached by text content.
   */
  async embed(text: string): Promise<number[]> {
    const key = this.normalizeKey(text);

    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const llm = getLLMService();
      const embedding = await Promise.race([
        llm.embed(key),
        new Promise<number[]>((_, reject) =>
          setTimeout(() => reject(new Error("Embedding timeout")), 500)
        ),
      ]);

      this.validateDimension(embedding);
      this.cache.set(key, embedding);
      return embedding;
    } catch {
      const fallbackVec = this.generateFallbackEmbedding(key);
      this.cache.set(key, fallbackVec);
      return fallbackVec;
    }
  }

  private generateFallbackEmbedding(text: string): number[] {
    const dim = 768;
    const vec = new Array(dim).fill(0.01);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      const idx = (code * (i + 1)) % dim;
      vec[idx] = (vec[idx] + 0.05) % 1.0;
    }
    return vec;
  }

  /**
   * Generate embeddings for multiple texts.
   * Cached texts are resolved immediately; only uncached texts hit Ollama.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const keys = texts.map((t) => this.normalizeKey(t));
    const results: (number[] | null)[] = keys.map((k) => this.cache.get(k));

    // Collect indices that need actual embedding
    const missing: Array<{ index: number; key: string }> = [];
    for (let i = 0; i < keys.length; i++) {
      if (!results[i]) {
        missing.push({ index: i, key: keys[i] });
      }
    }

    if (missing.length > 0) {
      const llm = getLLMService();
      const embeddings = await llm.embedBatch(missing.map((m) => m.key));

      for (let i = 0; i < missing.length; i++) {
        const { index, key } = missing[i];
        this.validateDimension(embeddings[i]);
        this.cache.set(key, embeddings[i]);
        results[index] = embeddings[i];
      }
    }

    return results as number[][];
  }

  /**
   * The dimension of the embedding model's output.
   * nomic-embed-text produces 768-dimensional vectors.
   */
  getDimension(): number {
    return this.dimension ?? 768;
  }

  getCacheStats(): { size: number; maxSize: number } {
    return { size: this.cache.size, maxSize: CACHE_MAX_SIZE };
  }

  clearCache(): void {
    this.cache.clear();
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private normalizeKey(text: string): string {
    return text.replace(/\s+/g, " ").trim().toLowerCase();
  }

  private validateDimension(embedding: number[]): void {
    if (embedding.length === 0) {
      throw new Error("[EmbeddingService] Received empty embedding");
    }
    if (this.dimension === null) {
      this.dimension = embedding.length;
    } else if (embedding.length !== this.dimension) {
      throw new Error(
        `[EmbeddingService] Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`
      );
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _embeddingService: EmbeddingService | null = null;

export function getEmbeddingService(): EmbeddingService {
  if (!_embeddingService) {
    _embeddingService = new EmbeddingService();
  }
  return _embeddingService;
}

// ─── Utility: Cosine Similarity ───────────────────────────────────────────────

/**
 * Compute cosine similarity between two vectors.
 * Returns a value in [-1, 1] where 1 = identical direction.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `[cosineSimilarity] Vector length mismatch: ${a.length} vs ${b.length}`
    );
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;

  return dot / denom;
}
