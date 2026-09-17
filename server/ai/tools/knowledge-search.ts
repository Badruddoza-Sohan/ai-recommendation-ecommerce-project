/**
 * Knowledge Search Tool
 *
 * Explict tool for answering general policy, shipping, and FAQ questions.
 * This is technically what the RAG pipeline does by default, but having it as a tool
 * allows the system to forcefully search for specific terms if needed.
 */

import { getRetriever } from "../rag/retriever.ts";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";

export class KnowledgeSearchTool implements AITool {
  name = "knowledge_search";
  description = "Search the support knowledge base for FAQs, policies, and shipping info.";
  triggers = ["shipping_info", "payment_methods", "account_help", "product_info", "style_guidance", "seasonal_trends"];

  async execute(query: string, _context: ToolContext): Promise<ToolResult> {
    const retriever = getRetriever();
    
    // We boost topK slightly for explicit tool calls to ensure we get an answer
    const results = await retriever.retrieve(query, {
      collections: ["knowledge"],
      topK: 5,
      minScore: 0.2 // Lower threshold to ensure recall for explicit queries
    });

    if (results.length === 0) {
      return {
        toolName: this.name,
        success: false,
        data: null,
        error: "No relevant information found in the knowledge base."
      };
    }

    return {
      toolName: this.name,
      success: true,
      data: {
        articles: results.map(r => r.content)
      }
    };
  }
}
