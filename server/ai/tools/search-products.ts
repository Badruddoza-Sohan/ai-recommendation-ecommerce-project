/**
 * Search Products Tool
 */

import { getVectorStore } from "../embeddings/vector-store.ts";
import { getEmbeddingService } from "../embeddings/embedding-service.ts";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";

export class SearchProductsTool implements AITool {
  name = "search_products";
  description = "Search for products based on a semantic query, budget, and category.";
  triggers = ["product_recommendation", "search", "trending_products", "similar_products"];

  async execute(query: string, context: ToolContext): Promise<ToolResult> {
    const embedder = getEmbeddingService();
    const vectorStore = getVectorStore();

    // The user's query itself is the semantic search string
    const queryEmbedding = await embedder.embed(query);
    
    // We fetch a larger pool (top 15) to allow for budget/category filtering
    const vectorResults = await vectorStore.search("products", queryEmbedding, 15, 0.3);

    if (vectorResults.length === 0) {
      return {
        toolName: this.name,
        success: true,
        data: {
          results: [],
          message: "No matching products found.",
        },
      };
    }

    // Filter by entities if present (e.g., max_budget)
    const entities = context.memory.entities;
    let maxBudget: number | null = null;
    let exactPrice: number | null = null;

    if (entities.price_budget?.length > 0) {
      const budgetEntity = entities.price_budget[0]; // Take most recent
      const val = parseFloat(budgetEntity.value);
      if (!isNaN(val)) {
        if (budgetEntity.key === "max_budget") maxBudget = val;
        if (budgetEntity.key === "exact_price") exactPrice = val;
      }
    }

    // Apply filtering
    let filtered = vectorResults;

    if (maxBudget !== null) {
      filtered = filtered.filter(r => (r.metadata.price as number) <= (maxBudget as number));
    }
    
    if (exactPrice !== null) {
      // Allow 20% variance for "exact" price searches semantically
      const variance = exactPrice * 0.2;
      filtered = filtered.filter(r => {
        const p = r.metadata.price as number;
        return p >= exactPrice! - variance && p <= exactPrice! + variance;
      });
    }

    // Sort by score and take top 5
    const topResults = filtered
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => ({
        id: r.sourceId,
        name: r.metadata.name,
        price: r.metadata.price,
        description: r.metadata.description,
        score: r.score
      }));

    return {
      toolName: this.name,
      success: true,
      data: {
        results: topResults,
        filtersApplied: { maxBudget, exactPrice }
      },
    };
  }
}
