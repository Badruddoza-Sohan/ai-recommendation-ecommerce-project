/**
 * Conversation Manager
 *
 * The main orchestrator of the AI system.
 * Handles the complete pipeline from receiving a user message to generating a response.
 */

import { getSessionService } from "./session-service.ts";
import { getMemoryManager } from "../memory/memory-manager.ts";
import { getIntentClassifier } from "../classification/intent-classifier.ts";
import { getSentimentAnalyzer } from "../classification/sentiment-analyzer.ts";
import { getRAGPipeline } from "../rag/rag-pipeline.ts";
import { getToolRegistry } from "../tools/tool-registry.ts";
import { getFollowupResolver } from "../memory/followup-resolver.ts";
import { getStylistStateManager } from "../memory/stylist-state-manager.ts";
import type { ChatRequest, ChatResult } from "./types.ts";
import type { StreamChunk } from "../llm/types.ts";
import { randomUUID } from "node:crypto";
import { getFastSupportEngine } from "../support/fast-support-engine.ts";
import { getWorkflowOrchestrator } from "../support/workflow-orchestrator.ts";
import { getSupportResponseComposer } from "../support/response-composer.ts";
import { getSupportLLMRenderer } from "../support/support-llm-renderer.ts";

export class ConversationManager {
  private async resolveDomain(message: string, requestedDomain?: string): Promise<"support" | "fashion" | "gadgets" | "general" | "voice" | "seller" | "recommendation"> {
    const lower = message.toLowerCase();
    const explicitDomain = requestedDomain && requestedDomain !== "support" ? requestedDomain : null;

    if (explicitDomain === "fashion" || explicitDomain === "gadgets" || explicitDomain === "general" || explicitDomain === "voice" || explicitDomain === "seller" || explicitDomain === "recommendation") {
      return explicitDomain;
    }

    const waistFitSignals = /(waist\s*(size|measurement)|pant\s*size|trouser\s*size|jeans\s*size|shirt\s*size|size\s*\d{2,3}\b|\b\d{2,3}\b\s*(inch|inches|waist|size))/i;
    if (waistFitSignals.test(lower) && /(shirt|pant|trouser|jeans|waist|outfit|dress|saree|kurta|matching)/i.test(lower)) {
      return "fashion";
    }

    const supportSignals = /(order|refund|return|cancel|delivery|shipping|tracking|payment|account|login|password|invoice|support|customer service|ticket|complaint|replace|exchange|cancel my order|track my order)/i;
    if (supportSignals.test(lower)) {
      return "support";
    }

    const fashionSignals = /(shirt|dress|kurta|saree|pant|trouser|jeans|outfit|style|fashion|matching|occasion|wedding|eid|panjabi|shoes|watch|color|look|pair with|match with|dress code|waist)/i;
    if (fashionSignals.test(lower)) {
      return "fashion";
    }

    const gadgetsSignals = /(laptop|pc build|gaming pc|gpu|rtx|gtx|ram|ssd|processor|intel|ryzen|monitor|motherboard|video editing|programming|coding|specs|tech|gadget|phone|headphone|tablet|smartwatch)/i;
    if (gadgetsSignals.test(lower)) {
      return "gadgets";
    }

    const generalSignals = /(buy|shop|recommend|find|compare|product|best|looking for|need a|want a|look for)/i;
    if (generalSignals.test(lower)) {
      return "general";
    }

    return "support";
  }

  private normalizeMessageForDomain(message: string, domain: string, chatHistory: Array<{ role: string; content: string }> = []): string {
    const trimmed = message.trim();
    if (domain !== "fashion" || !trimmed) return message;

    const recentAssistant = [...chatHistory].reverse().find((item) => item.role === "assistant");
    const hasWaistPrompt = recentAssistant && /waist size|waist|pant\s*size|trouser\s*size|jeans\s*size/i.test(recentAssistant.content);
    const looksLikeWaistSize = /^(?:[0-9]{2,3})(?:\s*(?:in|inch|inches|cm))?$/i.test(trimmed);

    if (hasWaistPrompt && looksLikeWaistSize) {
      return `I need pants in waist size ${trimmed}.`;
    }

    return message;
  }

  private async buildSystemPrompt(domain: string): Promise<string> {
    const { getDb } = await import("../../../api/queries/connection.ts");
    const { products, productImages, categories } = await import("../../../db/schema.ts");
    const { eq, sql, desc } = await import("drizzle-orm");
    const db = getDb();
    
    let catalogContext = "";
    try {
      let q: any = db.select({
        id: products.id,
        name: products.name,
        price: products.price,
        slug: products.slug,
        imageUrl: productImages.imageUrl,
        categorySlug: categories.slug
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id));

      if (domain === "fashion") {
         q = q.where(sql`${categories.slug} LIKE '%fashion%' OR ${categories.slug} LIKE '%clothing%'`);
      } else if (domain === "gadgets" || domain === "tech") {
         q = q.where(sql`${categories.slug} LIKE '%electronic%' OR ${categories.slug} LIKE '%gadget%' OR ${categories.slug} LIKE '%tech%'`);
      }

      const items = await q.orderBy(desc(products.reviewCount)).limit(150);

      const uniqueItems = new Map();
      for (const item of items) {
         if (!uniqueItems.has(item.id)) {
             uniqueItems.set(item.id, item);
         }
      }

      catalogContext = Array.from(uniqueItems.values()).map((p: any) => 
        `- ${p.name} (Price: ${p.price} BDT) [ID: ${p.id}] [Slug: ${p.slug}] [Image URL: ${p.imageUrl || ''}]`
      ).join("\n");
    } catch (e) {
      console.warn("Failed to fetch products for context", e);
    }

    return `You are Clevora AI, a helpful shopping assistant for the Bangladeshi market. You are currently helping the user in the "${domain}" category.
Here is our current product catalog in stock for this domain (top 150 items):
${catalogContext ? catalogContext : "The catalog is currently empty."}

Instructions:
1. STRICT SCOPE: You are a shopping and product advisor. If the user asks for anything outside of product advice, shopping, or the specific "${domain}" category (for example, asking to write code, solve math, write an essay, or give recipes), you MUST politely refuse and state that you only assist with shopping and recommendations for ${domain}. Do NOT attempt to fulfill the out-of-scope request.
2. FIRST, always provide real-world advice tailored to the "${domain}" category. 
   - If in "gadgets" or "tech", tell the user what specific specs and actual real-world models (e.g., Acer Nitro, Lenovo IdeaPad, etc.) are best.
   - If in "fashion", provide styling advice, fit recommendations, and suggest color pairings or trends.
3. THEN, suggest matching products from our catalog (if any).
4. When suggesting products from our catalog, you MUST include the product image and a clickable markdown link to order the product in this exact format: 
   ![Product Image]({Image URL})
   [Order {Product Name}](/product/{Slug})
5. If the user asks for a product or category that is NOT in our catalog, or if our catalog is empty:
   - You MUST explicitly state "We currently don't have this in our store." or "We currently don't have this exact item."
   - Still provide the real-world advice as instructed in step 2.
   - Suggest 2-3 similar alternatives that ARE in our catalog, if available, with links and images.
6. Do NOT invent products that aren't in the catalog context provided above when saying what's in our store.
7. NEVER mention, suggest, or recommend other real-world retailers, competitors, or places to buy. Only recommend buying from our store.
8. If you need more information (like budget, style, size, or use case), ask a follow-up question. Keep in mind the current domain is "${domain}".
9. Format your response nicely using markdown tables where appropriate.`;
  }

  /**
   * Process a user message and generate a response (non-streaming).
   */
  async chat(req: ChatRequest): Promise<ChatResult> {
    const { message, userId } = req;
    const resolvedDomain = await this.resolveDomain(message, req.domain);
    const sessionId = await this.setupSession({ ...req, domain: resolvedDomain });
    const domain = resolvedDomain;

    if (domain === "support") {
      const sessions = getSessionService();
      await sessions.addMessage(sessionId, "user", message.trim());
      const supportEngine = getFastSupportEngine();
      const supportResult = await supportEngine.processQuery(sessionId, message, userId);
      const msgId = await sessions.addMessage(sessionId, "assistant", supportResult.content);

      return {
        messageId: msgId,
        sessionId,
        content: supportResult.content,
        intent: supportResult.intent,
        domain: "support",
      };
    }

    const sessions = getSessionService();
    const historyItems = await sessions.getSessionHistory(sessionId, 8);
    const chatHistory = historyItems.map(h => ({ role: h.role as "user"|"assistant"|"system", content: h.message }));
    const normalizedMessage = this.normalizeMessageForDomain(message, domain, chatHistory);

    // Save user message
    await sessions.addMessage(sessionId, "user", normalizedMessage);
    
    // Fetch updated history after save
    const updatedHistoryItems = await sessions.getSessionHistory(sessionId, 8);
    const updatedChatHistory = updatedHistoryItems.map(h => ({ role: h.role as "user"|"assistant"|"system", content: h.message }));
    
    // Fetch entire catalog (or limited) to provide to LLM
    const { getDb } = await import("../../../api/queries/connection.ts");
    const { products } = await import("../../../db/schema.ts");
    const db = getDb();
    
    // Quick fallback try catch to fetch products
    let catalogContext = "";
    try {
      const allProducts = await db.select().from(products);
      catalogContext = allProducts.map((p: any) => `- ${p.name} (Price: ${p.price} BDT) [ID: ${p.id}] [Slug: ${p.slug}]`).join("\n");
    } catch (e) {
      console.warn("Failed to fetch products for simple context");
    }

    const systemPrompt = `You are Clevora AI, a helpful shopping assistant for the Bangladeshi market. You are currently helping the user in the "${domain}" category.
Here is our current product catalog in stock:
${catalogContext ? catalogContext : "The catalog is currently empty."}

Instructions:
1. STRICT SCOPE: You are a shopping and product advisor. If the user asks for anything outside of product advice, shopping, or the specific "${domain}" category (for example, asking to write code, solve math, write an essay, or give recipes), you MUST politely refuse and state that you only assist with shopping and recommendations for ${domain}. Do NOT attempt to fulfill the out-of-scope request.
2. FIRST, always provide real-world advice tailored to the "${domain}" category. 
   - If in "gadgets" or "tech", tell the user what specific specs and actual real-world models (e.g., Acer Nitro, Lenovo IdeaPad, etc.) are best.
   - If in "fashion", provide styling advice, fit recommendations, and suggest color pairings or trends.
3. THEN, suggest matching products from our catalog (if any).
4. When suggesting products from our catalog, you MUST include a clickable markdown link to order the product in this format: [Order {Product Name}](/product/{Slug})
5. If the user asks for a product or category that is NOT in our catalog, or if our catalog is empty:
   - You MUST explicitly state "We currently don't have this in our store." or "We currently don't have this exact item."
   - Still provide the real-world advice as instructed in step 2.
   - Suggest 2-3 similar alternatives that ARE in our catalog, if available, with links.
6. Do NOT invent products that aren't in the catalog context provided above when saying what's in our store.
7. NEVER mention, suggest, or recommend other real-world retailers, competitors, or places to buy (like Ryans, Techland, Startech, Amazon, Facebook groups, etc.). Only recommend buying from our store.
8. If you need more information (like budget, style, size, or use case), ask a follow-up question. Keep in mind the current domain is "${domain}".
9. Format your response nicely using markdown tables where appropriate.`;

    const { getLLMGatewayProvider } = await import("../providers/llm-gateway-provider.ts");
    const llm = getLLMGatewayProvider();
    
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...updatedChatHistory
    ];
    
    // Generate response
    const responseText = await llm.generate(messages);
    
    const msgId = await sessions.addMessage(sessionId, "assistant", responseText);
    
    return {
      messageId: msgId,
      sessionId,
      content: responseText,
      intent: "conversational",
      domain: domain,
    };
  }

  /**
   * Process a user message and stream the response back.
   */
  async *chatStream(req: ChatRequest): AsyncGenerator<StreamChunk> {
    const t0 = Date.now();
    console.log(`[PERF-TRACE] [chatStream] START at 0ms`);
    const { message, userId } = req;
    const resolvedDomain = await this.resolveDomain(message, req.domain);
    const sessionId = await this.setupSession({ ...req, domain: resolvedDomain });
    console.log(`[PERF-TRACE] [chatStream] setupSession took ${Date.now() - t0}ms`);
    const domain = resolvedDomain;

    if (domain === "support") {
      const sessions = getSessionService();
      await sessions.addMessage(sessionId, "user", message.trim());
      const supportEngine = getFastSupportEngine();
      const supportResult = await supportEngine.processQuery(sessionId, message, userId);
      await sessions.addMessage(sessionId, "assistant", supportResult.content);
      yield { token: supportResult.content, done: true };
      return;
    }

    const sessions = getSessionService();
    const memoryManager = getMemoryManager();
    const intentClassifier = getIntentClassifier();
    const sentimentAnalyzer = getSentimentAnalyzer();
    const toolRegistry = getToolRegistry();
    const ragPipeline = getRAGPipeline();
    const followupResolver = getFollowupResolver();
    const stateManager = getStylistStateManager();

    const historyItems = await sessions.getSessionHistory(sessionId, 8);
    const chatHistory = historyItems.map(h => ({ role: h.role as "user"|"assistant"|"system", content: h.message }));
    const normalizedMessage = this.normalizeMessageForDomain(message, domain, chatHistory);
    
    // Save user message
    await sessions.addMessage(sessionId, "user", normalizedMessage);
    
    // Fetch updated history after save
    const updatedHistoryItems = await sessions.getSessionHistory(sessionId, 8);
    const updatedChatHistory = updatedHistoryItems.map(h => ({ role: h.role as "user"|"assistant"|"system", content: h.message }));
    
    // Fetch entire catalog (or limited) to provide to LLM
    const { getDb } = await import("../../../api/queries/connection.ts");
    const { products } = await import("../../../db/schema.ts");
    const db = getDb();
    
    // Quick fallback try catch to fetch products
    let catalogContext = "";
    try {
      const allProducts = await db.select().from(products);
      catalogContext = allProducts.map((p: any) => `- ${p.name} (Price: ${p.price} BDT) [ID: ${p.id}] [Slug: ${p.slug}]`).join("\n");
    } catch (e) {
      console.warn("Failed to fetch products for simple context");
    }

    const systemPrompt = `You are Clevora AI, a helpful shopping assistant for the Bangladeshi market. You are currently helping the user in the "${domain}" category.
Here is our current product catalog in stock:
${catalogContext ? catalogContext : "The catalog is currently empty."}

Instructions:
1. FIRST, always provide real-world advice tailored to the "${domain}" category. 
   - If in "gadgets" or "tech", tell the user what specific specs and actual real-world models (e.g., Acer Nitro, Lenovo IdeaPad, etc.) are best.
   - If in "fashion", provide styling advice, fit recommendations, and suggest color pairings or trends.
2. THEN, suggest matching products from our catalog (if any).
3. When suggesting products from our catalog, you MUST include a clickable markdown link to order the product in this format: [Order {Product Name}](/product/{Slug})
4. If the user asks for a product or category that is NOT in our catalog, or if our catalog is empty:
   - You MUST explicitly state "We currently don't have this in our store." or "We currently don't have this exact item."
   - Still provide the real-world advice as instructed in step 1.
   - Suggest 2-3 similar alternatives that ARE in our catalog, if available, with links.
5. Do NOT invent products that aren't in the catalog context provided above when saying what's in our store.
6. NEVER mention, suggest, or recommend other real-world retailers, competitors, or places to buy (like Ryans, Techland, Startech, Amazon, Facebook groups, etc.). Only recommend buying from our store.
7. If you need more information (like budget, style, size, or use case), ask a follow-up question. Keep in mind the current domain is "${domain}".
8. Format your response nicely using markdown tables where appropriate.`;

    const { getLLMGatewayProvider } = await import("../providers/llm-gateway-provider.ts");
    const llm = getLLMGatewayProvider();
    
    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...updatedChatHistory
    ];
    
    // Stream response
    const responseText = await llm.generate(messages);
    
    await sessions.addMessage(sessionId, "assistant", responseText);
    yield { token: responseText, done: true };
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private async setupSession(req: ChatRequest): Promise<string> {
    const sessionId = req.sessionId || `session_${randomUUID()}`;
    const sessions = getSessionService();
    return sessions.getOrCreateSession(sessionId, req.userId, req.domain || "support");
  }
}

let _conversationManager: ConversationManager | null = null;

export function getConversationManager(): ConversationManager {
  if (!_conversationManager) {
    _conversationManager = new ConversationManager();
  }
  return _conversationManager;
}
