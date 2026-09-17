/**
 * Seller Workflow Orchestrator
 * Coordinates deterministic engines, handles follow-up queries, resolves conflicts, and generates unified AIResponse.
 */

import type { AIResponse, SellerContext } from "./types.ts";
import { getDescriptionEngine } from "./engines/description-engine.ts";
import { getSEOEngine } from "./engines/seo-engine.ts";
import { getInventoryEngine } from "./engines/inventory-engine.ts";
import { getPricingEngine } from "./engines/pricing-engine.ts";
import { getAnalyticsEngine } from "./engines/analytics-engine.ts";
import { getProductQualityEngine } from "./engines/product-quality-engine.ts";
import { getSellerResponseComposer } from "./seller-response-composer.ts";
import { getSellerLLMRenderer } from "./seller-llm-renderer.ts";
import { getSellerStateManager } from "./seller-state-manager.ts";

export class SellerWorkflowOrchestrator {
  async processQuery(params: {
    sessionId?: string;
    message: string;
    context?: Partial<SellerContext>;
    intent?: string;
    history?: { role: string; content: string }[];
  }): Promise<{
    structuredResponse: AIResponse;
    renderedText: string;
    intent: string;
  }> {
    const startTime = Date.now();
    const sessionId = params.sessionId || `session_seller_${Date.now()}`;
    const stateManager = getSellerStateManager();

    // Update state with any new context passed from request
    const context = await stateManager.updateState(sessionId, {
      ...params.context,
      sessionId,
    });

    const lowerMessage = params.message.toLowerCase();
    const detected = this.detectIntent(lowerMessage);
    const intent = (params.intent && params.intent !== "unknown") ? params.intent : detected;
    const modifier = this.extractModifier(lowerMessage);

    // Execute required deterministic engines in parallel based on query intent
    const descriptionEngine = getDescriptionEngine();
    const seoEngine = getSEOEngine();
    const inventoryEngine = getInventoryEngine();
    const pricingEngine = getPricingEngine();
    const analyticsEngine = getAnalyticsEngine();
    const qualityEngine = getProductQualityEngine();

    let descResult;
    let seoResult;
    let inventoryResult;
    let pricingResult;
    let analyticsResult;
    let qualityResult;

    const isSeo = intent === "keywords_seo" || intent === "seo_optimization" || lowerMessage.includes("seo") || lowerMessage.includes("keyword") || lowerMessage.includes("tag");
    const isInv = intent === "inventory_alert" || intent === "inventory_insights" || lowerMessage.includes("inventory") || lowerMessage.includes("stock") || lowerMessage.includes("restock");
    const isPrice = intent === "pricing_analysis" || intent === "pricing_advice" || lowerMessage.includes("price") || lowerMessage.includes("discount") || lowerMessage.includes("margin") || lowerMessage.includes("pricing");
    const isAnalytics = intent === "sales_analytics" || intent === "analytics_insights" || lowerMessage.includes("sales") || lowerMessage.includes("revenue") || lowerMessage.includes("insight") || lowerMessage.includes("analytics");
    const isQuality = intent === "product_quality" || lowerMessage.includes("quality") || lowerMessage.includes("audit") || lowerMessage.includes("score");
    const isDesc = (intent === "product_description" || lowerMessage.includes("description") || lowerMessage.includes("title") || lowerMessage.includes("write") || !!modifier) && !isSeo && !isInv && !isPrice && !isAnalytics && !isQuality;

    if (isSeo) {
      seoResult = seoEngine.analyze(context);
    } else if (isInv) {
      inventoryResult = await inventoryEngine.analyze(context);
    } else if (isPrice) {
      pricingResult = pricingEngine.analyze(context);
    } else if (isAnalytics) {
      analyticsResult = analyticsEngine.analyze(context);
    } else if (isQuality) {
      qualityResult = qualityEngine.evaluate(context);
    } else if (isDesc) {
      descResult = descriptionEngine.generate(context, modifier);
    } else {
      // General multi-engine audit
      descResult = descriptionEngine.generate(context, modifier);
      seoResult = seoEngine.analyze(context);
      inventoryResult = await inventoryEngine.analyze(context);
      analyticsResult = analyticsEngine.analyze(context);
      qualityResult = qualityEngine.evaluate(context);
    }

    const effectiveIntent = isSeo ? "keywords_seo" : isInv ? "inventory_alert" : isPrice ? "pricing_analysis" : isAnalytics ? "analytics_insights" : isQuality ? "product_quality" : isDesc ? "product_description" : "general_guidance";

    // 2. Compose Unified AIResponse JSON
    const composer = getSellerResponseComposer();
    const structuredResponse = composer.compose({
      intent: effectiveIntent,
      context,
      description: descResult,
      seo: seoResult,
      inventory: inventoryResult,
      pricing: pricingResult,
      analytics: analyticsResult,
      quality: qualityResult,
    });

    structuredResponse.metadata.executionTimeMs = Date.now() - startTime;

    // 3. Render via Presentation Layer (OpenAI with Full Context + fallback to Local LLM / Synthesis)
    const renderer = getSellerLLMRenderer();
    const renderedText = await renderer.render(structuredResponse, params.message, context, params.history);

    return {
      structuredResponse,
      renderedText,
      intent: effectiveIntent,
    };
  }

  private detectIntent(message: string): string {
    if (message.includes("keyword") || message.includes("seo") || message.includes("tag")) return "keywords_seo";
    if (message.includes("inventory") || message.includes("stock") || message.includes("restock")) return "inventory_alert";
    if (message.includes("price") || message.includes("margin") || message.includes("discount") || message.includes("pricing")) return "pricing_analysis";
    if (message.includes("sales") || message.includes("revenue") || message.includes("analytics") || message.includes("insight")) return "analytics_insights";
    if (message.includes("quality") || message.includes("audit") || message.includes("score")) return "product_quality";
    if (message.includes("description") || message.includes("write") || message.includes("title") || message.includes("generate")) return "product_description";
    return "general_guidance";
  }

  private extractModifier(message: string): string | undefined {
    if (message.includes("shorter") || message.includes("short")) return "short";
    if (message.includes("premium") || message.includes("luxury")) return "premium";
    if (message.includes("technical") || message.includes("feature")) return "technical";
    return undefined;
  }
}

let instance: SellerWorkflowOrchestrator | null = null;
export function getSellerWorkflowOrchestrator(): SellerWorkflowOrchestrator {
  if (!instance) instance = new SellerWorkflowOrchestrator();
  return instance;
}
