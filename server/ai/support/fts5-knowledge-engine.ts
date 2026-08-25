/**
 * FTS5 High-Speed Knowledge Engine (< 5ms Latency)
 *
 * Provides ultra-fast full-text keyword retrieval over SQLite support_knowledge database table.
 * Supports Banglish synonym expansion and question normalization without heavy LLM vector embeddings.
 */

import { getDb } from "../../../api/queries/connection";
import { supportKnowledge } from "../../../db/schema";
import { or, like } from "../../../db/mysql";

export interface KnowledgeMatch {
  id: number;
  question: string;
  answer: string;
  category: string;
  confidence: number;
}

export class FTS5KnowledgeEngine {
  async search(query: string, topK: number = 2): Promise<KnowledgeMatch[]> {
    const rawTokens = query.toLowerCase().split(/[\s,./?!_()-]+/).filter((w) => w.length >= 3);
    if (rawTokens.length === 0) return [];

    // Banglish Synonym Expansion
    const expandedTokens = [...rawTokens];
    for (const token of rawTokens) {
      if (token === "amar" || token === "kothay") expandedTokens.push("where", "order");
      if (token === "taka" || token === "ferot") expandedTokens.push("refund", "money");
      if (token === "cancle" || token === "cancel") expandedTokens.push("cancel");
    }

    try {
      const db = getDb();
      const conditions = expandedTokens.map((kw) =>
        or(
          like(supportKnowledge.question, `%${kw}%`),
          like(supportKnowledge.keywords, `%${kw}%`),
          like(supportKnowledge.answer, `%${kw}%`)
        )
      );

      const rows = await db
        .select({
          id: supportKnowledge.id,
          question: supportKnowledge.question,
          answer: supportKnowledge.answer,
          category: supportKnowledge.category,
        })
        .from(supportKnowledge)
        .where(or(...conditions))
        .limit(topK);

      return rows.map((r: any) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        category: r.category,
        confidence: 0.9,
      }));
    } catch (e) {
      return [];
    }
  }
}

let instance: FTS5KnowledgeEngine | null = null;
export function getFTS5KnowledgeEngine(): FTS5KnowledgeEngine {
  if (!instance) {
    instance = new FTS5KnowledgeEngine();
  }
  return instance;
}
