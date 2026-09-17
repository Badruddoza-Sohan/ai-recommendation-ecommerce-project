/**
 * Tool Registry
 *
 * Maps intents to executable tools and records their execution in the database.
 */

import { TrackOrderTool } from "./track-order.ts";
import { CancelOrderTool } from "./cancel-order.ts";
import { SearchProductsTool } from "./search-products.ts";
import { RecommendOutfitTool } from "./recommend-outfit.ts";
import { KnowledgeSearchTool } from "./knowledge-search.ts";
import { SellerAnalyticsTool } from "./seller-analytics.ts";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";
import { getDb } from "../../../api/queries/connection.ts";

export class ToolRegistry {
  private tools: AITool[] = [];
  private intentMap: Map<string, AITool> = new Map();

  constructor() {
    this.register(new TrackOrderTool());
    this.register(new CancelOrderTool());
    this.register(new SearchProductsTool());
    this.register(new RecommendOutfitTool());
    this.register(new KnowledgeSearchTool());
    this.register(new SellerAnalyticsTool());
  }

  private register(tool: AITool) {
    this.tools.push(tool);
    for (const intent of tool.triggers) {
      this.intentMap.set(intent, tool);
    }
  }

  /**
   * Check if a specific intent has a registered tool.
   */
  shouldUseTool(intent: string): boolean {
    return this.intentMap.has(intent);
  }

  /**
   * Execute the mapped tool for an intent and log the execution.
   */
  async executeToolForIntent(
    intent: string,
    query: string,
    context: ToolContext
  ): Promise<ToolResult | null> {
    const tool = this.intentMap.get(intent);
    if (!tool) return null;

    const startTime = Date.now();
    let result: ToolResult;
    
    try {
      result = await tool.execute(query, context);
    } catch (err) {
      console.error(`[ToolRegistry] Error executing ${tool.name}:`, err);
      result = {
        toolName: tool.name,
        success: false,
        data: null,
        error: err instanceof Error ? err.message : String(err)
      };
    }

    const durationMs = Date.now() - startTime;

    // Log Execution (fire and forget to not block response)
    this.logExecution(tool.name, query, result, durationMs, context).catch(e => 
      console.error("[ToolRegistry] Failed to log execution:", e)
    );

    return result;
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async logExecution(
    toolName: string,
    input: string,
    result: ToolResult,
    durationMs: number,
    context: ToolContext
  ) {
    const db = getDb();
    
    // Dynamic import for new schema
    const { toolExecutions } = await import("../../../db/aiSchema.ts");

    await db.insert(toolExecutions).values({
      sessionId: context.sessionId,
      userId: context.userId,
      toolName,
      input: JSON.stringify({ query: input }),
      output: JSON.stringify(result.data),
      durationMs,
      success: result.success ? 1 : 0,
      error: result.error,
      createdAt: Date.now()
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _toolRegistry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!_toolRegistry) {
    _toolRegistry = new ToolRegistry();
  }
  return _toolRegistry;
}
