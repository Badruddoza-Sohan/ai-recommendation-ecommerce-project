/**
 * Hybrid Retriever (with Zero-Downtime Fallback)
 *
 * Combines dense vector search (semantic similarity) with
 * sparse keyword search (exact match) for high-recall retrieval.
 *
 * If vector embedding service (Ollama nomic-embed-text) is offline or fails,
 * automatically falls back to pure SQLite keyword search to guarantee zero crashes.
 */

import { getVectorStore } from "../embeddings/vector-store.ts";
import { getEmbeddingService } from "../embeddings/embedding-service.ts";
import { getDb } from "../../../api/queries/connection.ts";
import { supportKnowledge, products } from "../../../db/schema.ts";
import { or, like } from "../../../db/mysql.ts";
import type { RetrievedContext, RetrievalOptions } from "./types.ts";

export class Retriever {
  /**
   * Search across specified collections and merge results.
   */
  async retrieve(
    query: string,
    options: RetrievalOptions = {}
  ): Promise<RetrievedContext[]> {
    const {
      topK = 3,
      minScore = 0.3,
      collections = ["knowledge"],
    } = options;

    if (!query || query.trim().length < 2) return [];

    const results: RetrievedContext[] = [];
    const embedder = getEmbeddingService();
    let queryEmbedding: number[] | null = null;

    try {
      queryEmbedding = await embedder.embed(query);
    } catch (e) {
      console.warn("[Retriever] Vector embedding service unavailable, activating SQL keyword search fallback.");
    }

    for (const collection of collections) {
      if (collection === "knowledge") {
        const kbResults = await this.searchKnowledge(query, queryEmbedding, topK, minScore);
        results.push(...kbResults);
      } else if (collection === "products") {
        const prodResults = await this.searchProducts(query, queryEmbedding, topK, minScore);
        results.push(...prodResults);
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  // ── Private: Knowledge Base ────────────────────────────────────────────────

  private async searchKnowledge(
    query: string,
    queryEmbedding: number[] | null,
    topK: number,
    minScore: number
  ): Promise<RetrievedContext[]> {
    const vectorStore = getVectorStore();
    const db = getDb();

    let vectorResults: any[] = [];
    if (queryEmbedding) {
      try {
        vectorResults = await vectorStore.search("knowledge", queryEmbedding, topK * 2, minScore);
      } catch (e) {
        // Fallback
      }
    }

    const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    let keywordResults: any[] = [];

    if (keywords.length > 0) {
      try {
        const conditions = keywords.map((kw) =>
          or(
            like(supportKnowledge.question, `%${kw}%`),
            like(supportKnowledge.keywords, `%${kw}%`)
          )
        );

        keywordResults = await db
          .select({
            id: (supportKnowledge as any).id,
            question: (supportKnowledge as any).question,
            answer: (supportKnowledge as any).answer,
          })
          .from(supportKnowledge)
          .where(or(...conditions))
          .limit(topK);
      } catch (e) {
        // Fallback
      }
    }

    const merged = new Map<string, RetrievedContext>();

    for (const vr of vectorResults) {
      merged.set(vr.sourceId, {
        id: vr.sourceId,
        source: "knowledge",
        content: `Q: ${vr.metadata.question}\nA: ${vr.metadata.answer}`,
        score: vr.score * 0.7,
      });
    }

    for (const kr of keywordResults) {
      const idStr = String(kr.id);
      const existing = merged.get(idStr);
      if (existing) {
        existing.score += 0.3;
      } else {
        merged.set(idStr, {
          id: idStr,
          source: "knowledge",
          content: `Q: ${kr.question}\nA: ${kr.answer}`,
          score: 0.5,
        });
      }
    }

    return Array.from(merged.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // ── Private: Products ──────────────────────────────────────────────────────

  private async searchProducts(
    query: string,
    queryEmbedding: number[] | null,
    topK: number,
    minScore: number
  ): Promise<RetrievedContext[]> {
    const vectorStore = getVectorStore();
    const db = getDb();

    let vectorResults: any[] = [];
    if (queryEmbedding) {
      try {
        vectorResults = await vectorStore.search("products", queryEmbedding, topK, minScore);
      } catch (e) {
        // Fallback
      }
    }

    if (vectorResults.length > 0) {
      return vectorResults.map((vr) => {
        const price = vr.metadata.price || 0;
        return {
          id: vr.sourceId,
          source: "product",
          content: `Product: ${vr.metadata.name} | Price: ${price} BDT | Desc: ${vr.metadata.description}`,
          score: vr.score,
          metadata: vr.metadata,
        };
      });
    }

    // Keyword Fallback for Products via SQLite
    const keywords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (keywords.length > 0) {
      try {
        const conditions = keywords.map((kw) =>
          or(
            like(products.name, `%${kw}%`),
            like(products.description, `%${kw}%`)
          )
        );

        const prodRows = await db
          .select({
            id: (products as any).id,
            name: (products as any).name,
            price: (products as any).price,
            description: (products as any).description,
          })
          .from(products)
          .where(or(...conditions))
          .limit(topK);

        return prodRows.map((p: any) => ({
          id: String(p.id),
          source: "product",
          content: `Product: ${p.name} | Price: ${p.price} BDT | Desc: ${p.description || ""}`,
          score: 0.5,
          metadata: { name: p.name, price: p.price, stock_quantity: 10 },
        }));
      } catch (e) {
        // Return empty array instead of throwing
      }
    }

    return [];
  }
}

let _retriever: Retriever | null = null;

export function getRetriever(): Retriever {
  if (!_retriever) {
    _retriever = new Retriever();
  }
  return _retriever;
}
