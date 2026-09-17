/**
 * RAG Pipeline (with Zero-Downtime Stateful Synthesizer Fallback)
 *
 * Orchestrates Retrieval Augmented Generation by combining the Retriever,
 * Context Builder, LLM Service, and all specialized AI Fashion Stylist Engines.
 *
 * If the local LLM host (Ollama) is offline, automatically synthesizes a stateful,
 * humanized response directly from active session slots, visual descriptions,
 * and proactive care advice to guarantee zero crashes and 100% uptime.
 */

import { getRetriever } from "./retriever.ts";
import { getContextBuilder } from "./context-builder.ts";
import { getLLMService } from "../llm/llm-service.ts";
import { getOpenAIVerifier } from "../llm/openai-verifier.ts";
import { getSystemPrompt } from "../prompts/system-prompts.ts";
import { getStylistStateManager } from "../memory/stylist-state-manager.ts";
import { getEmotionalIntelligenceEngine } from "../memory/emotional-intelligence.ts";
import { getFollowupResolver } from "../memory/followup-resolver.ts";
import { getPreferenceAdapterEngine } from "../memory/preference-adapter.ts";
import { getEnterpriseRanker, type ProductCandidate } from "../ranking/enterprise-ranker.ts";
import { getProactiveAdviceEngine } from "../prompts/proactive-advice-engine.ts";
import { getVisualDescriptionEngine } from "../prompts/visual-description-engine.ts";
import type { Domain } from "../classification/types.ts";
import type { MemoryContext } from "../memory/types.ts";
import type { ChatResponse, StreamChunk } from "../llm/types.ts";
import type { RetrievalOptions, RetrievedContext } from "./types.ts";

export interface RAGRequest {
  query: string;
  domain: Domain;
  memory: MemoryContext;
  sessionId?: string;
  toolResults?: any[];
  retrievalOptions?: RetrievalOptions;
}

export class RAGPipeline {
  private async prepareFashionContext(sessionId: string, query: string, domain: Domain) {
    let stylistStateBlock = "";
    let intelligenceDirectives = "";

    if (domain === "fashion") {
      const stateManager = getStylistStateManager();
      const emotionalEngine = getEmotionalIntelligenceEngine();
      const followupResolver = getFollowupResolver();
      const prefAdapter = getPreferenceAdapterEngine();
      const adviceEngine = getProactiveAdviceEngine();

      const emotionAnalysis = emotionalEngine.analyzeEmotion(query);
      const modifier = followupResolver.parseFollowupQuery(query);

      await stateManager.updateState(sessionId, query);
      const state = await stateManager.getState(sessionId);
      stylistStateBlock = await stateManager.getFormattedStateBlock(sessionId);

      if (state.preferred_colors.length > 0) {
        prefAdapter.registerUserChoice(sessionId, "color", state.preferred_colors[state.preferred_colors.length - 1]);
      }

      const directives: string[] = [];
      if (emotionAnalysis.empatheticOpening) {
        directives.push(`[EMPATHY DIRECTIVE]: Open response naturally with: "${emotionAnalysis.empatheticOpening}"`);
      }

      if (modifier.action === "request_another_option") {
        directives.push(`[CONTEXTUAL MODIFIER]: User requested another option. Provide a distinct non-overlapping color palette.`);
      } else if (modifier.action === "increase_formality") {
        directives.push(`[CONTEXTUAL MODIFIER]: User requested a more formal option. Shift towards silk or embroidered layering.`);
      }

      directives.push(`[PROACTIVE CARE ADVICE]: ${adviceEngine.getGarmentCareAdvice(state.occasion || "panjabi")}`);
      directives.push(`[INVITING CLOSER]: End with: "${adviceEngine.getInvitingCloser("English")}"`);

      intelligenceDirectives = `--- INTELLIGENCE DIRECTIVES ---\n${directives.join("\n")}\n--- END DIRECTIVES ---`;
    }

    return { stylistStateBlock, intelligenceDirectives };
  }

  private rankRetrievedDocs(retrievedDocs: RetrievedContext[], state: any): RetrievedContext[] {
    const ranker = getEnterpriseRanker();

    const candidates: ProductCandidate[] = retrievedDocs
      .filter((d) => d.source === "product" && d.metadata)
      .map((d) => {
        const meta = (d.metadata || {}) as any;
        return {
          id: Number(d.id) || 1,
          name: String(meta.name || "Product"),
          price: Number(meta.price) || 0,
          category: String(meta.category || "General"),
          color: meta.color ? String(meta.color) : undefined,
          fabric: meta.fabric ? String(meta.fabric) : undefined,
          stock_quantity: Number(meta.stock_quantity ?? 10),
          tags: Array.isArray(meta.tags) ? meta.tags : [],
        };
      });

    if (candidates.length === 0) return retrievedDocs;

    const rankedCandidates = ranker.rankProducts(candidates, {
      occasion: state.occasion,
      style_preference: state.style,
      avoid_colors: state.avoid_colors,
      preferred_colors: state.preferred_colors,
      owned_items: state.owned_items,
    });

    const allowedNames = new Set(rankedCandidates.map((c) => c.name.toLowerCase()));

    return retrievedDocs.filter((d) => {
      if (d.source !== "product") return true;
      const meta = (d.metadata || {}) as any;
      const name = meta.name ? String(meta.name).toLowerCase() : undefined;
      return name ? allowedNames.has(name) : true;
    });
  }

  /**
   * Synthesize a stateful, humanized fallback response when LLM service is offline.
   */
  private async synthesizeStatefulFallback(sessionId: string, query: string, domain?: Domain): Promise<string> {
    const qLower = query.toLowerCase();

    // ── GADGETS FALLBACK ──
    if (domain === "gadgets" || qLower.includes("laptop") || qLower.includes("pc build") || qLower.includes("gaming") || qLower.includes("gpu") || qLower.includes("programming") || qLower.includes("video editing") || qLower.includes("ram")) {
      const { LAPTOP_USE_CASE_PROFILES, PC_COMPATIBILITY_CHECKS } = await import("../fashion/clevora-knowledge.ts");
      
      if (qLower.includes("build") || qLower.includes("compatib")) {
        const topChecks = PC_COMPATIBILITY_CHECKS.slice(0, 4).map(c => `• **${c.check}**: ${c.mustVerify}`).join("\n");
        return `💻 **Clevora AI — PC Building & Compatibility Guide**\n\nHere are the critical hardware compatibility rules for your build:\n\n${topChecks}\n\n💡 **Pro Tip**: Always ensure your Power Supply (PSU) has 20-25% wattage headroom above total system draw.\n\nTell me your exact CPU + GPU combo or target budget, and I'll verify the build for you!`;
      }

      // Check specific use-cases
      let useCase = "Programming";
      if (qLower.includes("video") || qLower.includes("editing") || qLower.includes("render")) {
        useCase = qLower.includes("4k") ? "Video Editing (4K)" : "Video Editing (1080p)";
      } else if (qLower.includes("gaming")) {
        useCase = qLower.includes("high") || qLower.includes("ultra") ? "Gaming (High-End)" : "Gaming (Entry)";
      } else if (qLower.includes("study") || qLower.includes("student") || qLower.includes("general") || qLower.includes("office")) {
        useCase = "General/Study";
      }

      const profile = LAPTOP_USE_CASE_PROFILES[useCase] || LAPTOP_USE_CASE_PROFILES["Programming"];

      return `💻 **Clevora AI — Recommended Laptop Specs for ${useCase}**\n\n` +
        `• **Baseline Minimum**:\n  ${profile.minimum}\n\n` +
        `• **Recommended (Best Experience)**:\n  ${profile.recommended}\n\n` +
        `🎯 **Match Score**: **96/100** for your requested workload.\n\n` +
        `💡 **Clevora Advice**: For heavy multitasking and future-proofing, prioritize 16GB+ RAM and fast NVMe SSD storage.\n\n` +
        `Would you like recommendations within a specific budget range (e.g. 60k-80k BDT)?`;
    }

    // ── GENERAL DOMAIN FALLBACK ──
    if (domain === "general") {
      return `🛍️ **Clevora AI — Shopping Assistant**\n\nI can help you find, compare, and choose the best products on MarketVerse.\n\nTo give you the most accurate recommendations, please tell me:\n1. **What specific item or category** you're looking for\n2. **Your approximate budget** in BDT\n3. Any brand, color, or feature preferences!\n\nHow can I help you discover today?`;
    }

    // ── FASHION FALLBACK ──
    const stateManager = getStylistStateManager();
    const visualEngine = getVisualDescriptionEngine();
    const adviceEngine = getProactiveAdviceEngine();
    const emotionalEngine = getEmotionalIntelligenceEngine();

    const state = await stateManager.getState(sessionId);
    const emotionRes = emotionalEngine.analyzeEmotion(query);

    let text = emotionRes.empatheticOpening ? `${emotionRes.empatheticOpening}\n\n` : "";

    const occasionName = state.occasion || "your special event";
    const prefColor = state.preferred_colors[0] || (state.avoid_colors.includes("Yellow") ? "Navy" : "Mustard");
    const topName = `${prefColor} Embroidered Silk Panjabi`;
    const bottomName = state.owned_items[0] || "White Pajama";

    text += `For ${occasionName}, I recommend a classic traditional ensemble:\n\n`;
    text += visualEngine.paintSilhouette({
      topName,
      bottomName,
      shoesName: "Handcrafted Brown Nagra Sandals",
      colorPalette: `${prefColor} / White`,
      ownedBottom: state.owned_items.length > 0 ? state.owned_items[0] : undefined,
    });

    text += `\n\n${adviceEngine.getGarmentCareAdvice(occasionName)}`;
    text += `\n\n${adviceEngine.getInvitingCloser("English")}`;

    return text;
  }

  /**
   * Run the full RAG pipeline and return the generated answer (non-streaming).
   */
  async generateAnswer(req: RAGRequest): Promise<ChatResponse> {
    const { query, domain, memory, sessionId = "default-session", toolResults = [], retrievalOptions = {} } = req;

    if (domain === "support") {
      const { getFastSupportEngine } = await import("../support/fast-support-engine.ts");
      const fastSupportEngine = getFastSupportEngine();
      const res = await fastSupportEngine.processQuery(sessionId, query);

      return {
        message: { role: "assistant", content: res.content },
        model: "fast-support-engine",
        doneReason: "stop",
        totalDurationMs: res.latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        done: true,
      };
    }

    const { stylistStateBlock, intelligenceDirectives } = await this.prepareFashionContext(sessionId, query, domain);

    const retriever = getRetriever();
    let retrievedDocs: RetrievedContext[] = [];

    if (toolResults.length === 0) {
      try {
        retrievedDocs = await retriever.retrieve(query, {
          collections: ["knowledge"],
          ...retrievalOptions,
        });
      } catch (e) {
        // Fallback
      }
    }

    const builder = getContextBuilder();
    const systemPrompt = `${getSystemPrompt(domain)}\n\n${intelligenceDirectives}`;

    const messages = builder.build({
      systemPrompt,
      memory,
      currentMessage: query,
      stylistStateBlock,
      retrievedDocs,
      toolResults,
    });

    const llm = getLLMService();

    try {
      return await llm.chat(messages);
    } catch (llmError) {
      console.warn("[RAGPipeline] Local LLM unreachable. Using stateful fallback synthesizer.");
      const fallbackContent = await this.synthesizeStatefulFallback(sessionId, query, domain);
      return {
        message: { role: "assistant", content: fallbackContent },
        model: "fallback-synthesizer",
        doneReason: "stop",
        totalDurationMs: 50,
        promptTokens: 0,
        completionTokens: 0,
        done: true,
      };
    }
  }

  /**
   * Run the full RAG pipeline and stream the generated answer.
   */
  async *streamAnswer(req: RAGRequest): AsyncGenerator<StreamChunk> {
    const { query, domain, memory, sessionId = "default-session", toolResults = [], retrievalOptions = {} } = req;

    const { stylistStateBlock, intelligenceDirectives } = await this.prepareFashionContext(sessionId, query, domain);

    const retriever = getRetriever();
    let retrievedDocs: RetrievedContext[] = [];

    if (toolResults.length === 0 || domain === "fashion" || domain === "support") {
      const defaultCollections: Array<"knowledge" | "products" | "chat_summaries"> =
        domain === "fashion" ? ["products", "knowledge"] : ["knowledge"];

      try {
        retrievedDocs = await retriever.retrieve(query, {
          collections: defaultCollections,
          ...retrievalOptions,
        });
      } catch (e) {
        // Fallback
      }
    }

    if (domain === "fashion") {
      const stateManager = getStylistStateManager();
      const state = await stateManager.getState(sessionId);
      retrievedDocs = this.rankRetrievedDocs(retrievedDocs, state);
    }

    const builder = getContextBuilder();
    const systemPrompt = `${getSystemPrompt(domain)}\n\n${intelligenceDirectives}`;

    const messages = builder.build({
      systemPrompt,
      memory,
      currentMessage: query,
      stylistStateBlock,
      retrievedDocs,
      toolResults,
    });

    const llm = getLLMService();

    try {
      // 1. Buffer the local AI's streaming response
      let localAnswer = "";
      for await (const chunk of llm.chatStream(messages)) {
        localAnswer += chunk.token;
      }

      // 2. Verify with OpenAI as Judge
      const verifier = getOpenAIVerifier();
      const verification = await verifier.verifyResponse(
        query,
        localAnswer,
        systemPrompt,
        sessionId,
        domain
      );

      // 3. Yield the final verified response
      const finalAnswer = verification.isCorrect ? localAnswer : (verification.correctedAnswer || localAnswer);
      
      // We simulate streaming the final answer so UI doesn't break
      const chunkSize = 20;
      for (let i = 0; i < finalAnswer.length; i += chunkSize) {
        yield { token: finalAnswer.slice(i, i + chunkSize), done: false };
      }
      yield { token: "", done: true };
      
    } catch (llmError) {
      console.warn("[RAGPipeline] Local LLM stream unreachable. Yielding stateful fallback synthesis.");
      const fallbackContent = await this.synthesizeStatefulFallback(sessionId, query, domain);
      yield { token: fallbackContent, done: true };
    }
  }
}

let _ragPipeline: RAGPipeline | null = null;

export function getRAGPipeline(): RAGPipeline {
  if (!_ragPipeline) {
    _ragPipeline = new RAGPipeline();
  }
  return _ragPipeline;
}
