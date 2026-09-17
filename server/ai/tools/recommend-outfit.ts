/**
 * Recommend Outfit Tool
 */

import { SearchProductsTool } from "./search-products.ts";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";

export class RecommendOutfitTool implements AITool {
  name = "recommend_outfit";
  description = "Finds clothing items suitable for a specific occasion or style.";
  triggers = ["outfit_recommendation", "complete_the_look", "color_matching"];

  private searchTool = new SearchProductsTool();

  async execute(query: string, context: ToolContext): Promise<ToolResult> {
    // For now, outfit recommendation delegates to the semantic search tool,
    // but appends stylistic framing to the query.
    // A future enhancement could query a specific "fashion_rules" collection first,
    // then query products.
    
    const enhancedQuery = `${query} (fashion, clothing, outfit)`;
    
    const result = await this.searchTool.execute(enhancedQuery, context);
    
    if (result.success && result.data.results) {
      return {
        toolName: this.name,
        success: true,
        data: {
          recommendedItems: result.data.results,
          occasion: query, // context for the LLM
        },
      };
    }
    
    return result;
  }
}
