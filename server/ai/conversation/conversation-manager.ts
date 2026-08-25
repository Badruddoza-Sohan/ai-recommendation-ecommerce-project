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
  /**
   * Process a user message and generate a response (non-streaming).
   */
  async chat(req: ChatRequest): Promise<ChatResult> {
    const sessionId = await this.setupSession(req);
    const { message, userId, domain = "support" } = req;

    const sessions = getSessionService();
    const memoryManager = getMemoryManager();
    const intentClassifier = getIntentClassifier();
    const sentimentAnalyzer = getSentimentAnalyzer();
    const toolRegistry = getToolRegistry();
    const ragPipeline = getRAGPipeline();
    const followupResolver = getFollowupResolver();
    const stateManager = getStylistStateManager();
    console.log(`[RUNTIME-TRACE] [ConversationManager] ENTER chat(sessionId: ${sessionId}, message: "${message}")`);

    // 1. Check for relative follow-up queries or reset commands before saving message
    const modifier = followupResolver.parseFollowupQuery(message);
    console.log(`[RUNTIME-TRACE] [FollowupResolver] Query: "${message}" ──> Parsed Action: [${modifier.action}]`);
    if (modifier.action === "reset_conversation") {
      console.log(`[RUNTIME-TRACE] [StylistStateManager] Resetting state for session ${sessionId}`);
      await stateManager.resetState(sessionId);
    }

    // 2. Save user message to DB
    await sessions.addMessage(sessionId, "user", message);

    // 3. Extract entities and update memory
    await memoryManager.processUserMessage(sessionId, message, userId);

    // 4. Get full memory context for RAG/LLM
    const memoryContext = await memoryManager.getContext(sessionId, userId);

    // 5. Classify Intent & Sentiment (Parallel)
    const [classification, sentiment] = await Promise.all([
      intentClassifier.classify(message, domain),
      sentimentAnalyzer.analyze(message),
    ]);

    const activeState = await stateManager.getState(sessionId);

    // Override domain and intent if in active fashion consultation or follow-up modifier
    let effectiveDomain: any = classification.domain;
    let effectiveIntent = classification.intent;

    if (domain === "gadgets" || domain === "general" || domain === "seller" || domain === "support") {
      effectiveDomain = domain;
    } else if (domain === "fashion" || activeState.occasion || (modifier.action !== "none" && modifier.action !== "reset_conversation")) {
      effectiveDomain = "fashion";
      if (modifier.action !== "none" && modifier.action !== "reset_conversation") {
        effectiveIntent = "outfit_recommendation";
      }
    }

    console.log(`[RUNTIME-TRACE] [IntentClassifier] Raw: "${message}" ──> Classification: [Domain: ${classification.domain}, Intent: ${classification.intent}, Confidence: ${classification.confidence.toFixed(2)}] ──> EffectiveDomain: [${effectiveDomain}], EffectiveIntent: [${effectiveIntent}]`);

    // Fast-path: Support Domain Direct Dispatch (Zero-Ollama Enterprise Support Engine)
    if (domain === "support") {
      const supportEngine = getFastSupportEngine();
      const res = await supportEngine.processQuery(sessionId, message, userId);

      const msgId = await sessions.addMessage(sessionId, "assistant", res.content, {
        type: res.type,
        intent: res.intent,
        orderData: res.orderData,
        ticketData: res.ticketData,
        quickActions: res.quickActions,
      });

      return {
        messageId: msgId,
        sessionId,
        content: res.content,
        intent: res.intent,
        domain: "support",
      };
    }

    // Fast-path: Seller AI Domain Direct Dispatch (Enterprise AI Seller Assistant V2)
    if (domain === "seller") {
      console.log(`[RUNTIME-TRACE] [ConversationManager] Invoking Enterprise Seller Workflow Orchestrator...`);
      const { getSellerWorkflowOrchestrator } = await import("../seller/seller-workflow-orchestrator.ts");
      const orchestrator = getSellerWorkflowOrchestrator();

      // Retrieve recent conversation history for full context
      let history: { role: string; content: string }[] = [];
      try {
        const { getDb } = await import("../../../api/queries/connection.js");
        const { chatMessages } = await import("@db/schema");
        const { eq, desc } = await import("@db/mysql");
        const db = getDb();
        const past = await db
          .select({ role: chatMessages.role, content: chatMessages.content })
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, sessionId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(8);
        history = past.reverse().map((m: any) => ({ role: m.role || "user", content: m.content || "" }));
      } catch {
        // history fetch is non-blocking
      }

      const sellerResult = await orchestrator.processQuery({
        sessionId,
        message,
        context: req.context || {},
        intent: effectiveIntent,
        history,
      });

      const msgId = await sessions.addMessage(sessionId, "assistant", sellerResult.renderedText, {
        intent: sellerResult.intent,
        structuredResponse: sellerResult.structuredResponse,
      });

      return {
        messageId: msgId,
        sessionId,
        content: sellerResult.renderedText,
        structuredResponse: sellerResult.structuredResponse,
        intent: sellerResult.intent,
        domain: "seller",
      };
    }

    // Fast-path: Human Escalation
    if (sentiment.shouldEscalate || effectiveIntent === "escalate_human") {
      const responseText = "I understand you're frustrated or need complex help. I'm transferring you to a human agent now.";
      const msgId = await sessions.addMessage(sessionId, "assistant", responseText, {
        type: "escalation",
        intent: effectiveIntent,
      });
      return {
        messageId: msgId,
        sessionId,
        content: responseText,
        intent: effectiveIntent,
        domain: effectiveDomain,
      };
    }

    // 6. Tool Execution
    let toolResults: any[] = [];
    if (toolRegistry.shouldUseTool(effectiveIntent)) {
      const toolContext = { sessionId, userId, memory: memoryContext };
      const result = await toolRegistry.executeToolForIntent(
        effectiveIntent,
        message,
        toolContext
      );
      if (result) {
        toolResults.push(result);
      }
    }

    // 7. Consultation Gate & Slot Completion Engine (Mandatory Server-Side Intercept)
    if (effectiveDomain === "fashion" || effectiveIntent === "fashion_recommendation") {
      console.log(`[RUNTIME-TRACE] [ConsultationGate] Evaluating Fashion Domain Request...`);
      const state = await stateManager.updateState(sessionId, message);

      // Only check missing slots if user is NOT performing a relative follow-up modifier (e.g. "show another option", "keep shoes")
      if (modifier.action === "none") {
        const { getSlotCompletionEngine } = await import("../consultation/slot-completion-engine.ts");
        const slotEngine = getSlotCompletionEngine();
        const slotResult = slotEngine.evaluateSlots(state);

        if (!slotResult.isComplete && slotResult.probingQuestion) {
          console.log(`[RUNTIME-TRACE] [ConsultationGate] INTERCEPTED! Missing Slot -> Returning Consultation Question.`);
          const responseText = slotResult.probingQuestion;
          const msgId = await sessions.addMessage(sessionId, "assistant", responseText, {
            intent: "probing_question",
            sentiment: sentiment.sentiment,
          });

          return {
            messageId: msgId,
            sessionId,
            content: responseText,
            intent: "probing_question",
            domain: effectiveDomain,
          };
        }
      } else {
        console.log(`[RUNTIME-TRACE] [ConsultationGate] Relative Modifier Active [${modifier.action}] -> Bypassing Slot Check.`);
      }
    }

    // 8. Generate Response
    if (effectiveDomain === "fashion" && (effectiveIntent === "outfit_recommendation" || effectiveIntent === "fashion_recommendation")) {
      // ── Deterministic Fashion Engine + LLM Renderer ──
      console.log(`[RUNTIME-TRACE] [ConversationManager] Invoking Deterministic Fashion Engine...`);
      const { getDeterministicFashionEngine } = await import("../fashion/deterministic-fashion-engine.ts");
      const { getLLMRenderer } = await import("../fashion/llm-renderer.ts");
      const { getEmotionalIntelligenceEngine } = await import("../memory/emotional-intelligence.ts");

      const engine = getDeterministicFashionEngine();
      const renderer = getLLMRenderer();
      const emotionalEngine = getEmotionalIntelligenceEngine();

      const fashionState = await stateManager.getState(sessionId);
      const recommendation = await engine.recommend(fashionState, message, modifier);
      const emotionalOpening = emotionalEngine.analyzeEmotion(message).empatheticOpening;

      console.log(`[RUNTIME-TRACE] [DeterministicEngine] Recommendation JSON:`, JSON.stringify(recommendation.look));

      const responseText = await renderer.render(recommendation, emotionalOpening);

      const msgId = await sessions.addMessage(sessionId, "assistant", responseText, {
        intent: effectiveIntent,
        sentiment: sentiment.sentiment,
      });

      return {
        messageId: msgId,
        sessionId,
        content: responseText,
        intent: effectiveIntent,
        domain: effectiveDomain,
      };
    }

    // ── Non-Fashion: RAG Pipeline (unchanged) ──
    console.log(`[RUNTIME-TRACE] [ConversationManager] Invoking RAG Pipeline...`);
    const ragResponse = await ragPipeline.generateAnswer({
      query: message,
      domain: effectiveDomain,
      memory: memoryContext,
      sessionId,
      toolResults,
    });

    const responseText = ragResponse.message.content;
    const msgId = await sessions.addMessage(sessionId, "assistant", responseText, {
      intent: effectiveIntent,
      sentiment: sentiment.sentiment,
    });

    return {
      messageId: msgId,
      sessionId,
      content: responseText,
      intent: effectiveIntent,
      domain: effectiveDomain,
    };
  }

  /**
   * Process a user message and stream the response back.
   */
  async *chatStream(req: ChatRequest): AsyncGenerator<StreamChunk> {
    const t0 = Date.now();
    console.log(`[PERF-TRACE] [chatStream] START at 0ms`);
    const sessionId = await this.setupSession(req);
    console.log(`[PERF-TRACE] [chatStream] setupSession took ${Date.now() - t0}ms`);
    const { message, userId, domain = "support" } = req;

    const sessions = getSessionService();
    const memoryManager = getMemoryManager();
    const intentClassifier = getIntentClassifier();
    const sentimentAnalyzer = getSentimentAnalyzer();
    const toolRegistry = getToolRegistry();
    const ragPipeline = getRAGPipeline();
    const followupResolver = getFollowupResolver();
    const stateManager = getStylistStateManager();

    const modifier = followupResolver.parseFollowupQuery(message);
    if (modifier.action === "reset_conversation") {
      await stateManager.resetState(sessionId);
    }

    const t1 = Date.now();
    await sessions.addMessage(sessionId, "user", message);
    console.log(`[PERF-TRACE] [chatStream] sessions.addMessage took ${Date.now() - t1}ms`);

    const t2 = Date.now();
    await memoryManager.processUserMessage(sessionId, message, userId);
    console.log(`[PERF-TRACE] [chatStream] memoryManager.processUserMessage took ${Date.now() - t2}ms`);

    const t3 = Date.now();
    const memoryContext = await memoryManager.getContext(sessionId, userId);
    console.log(`[PERF-TRACE] [chatStream] memoryManager.getContext took ${Date.now() - t3}ms`);

    const t4 = Date.now();
    const [classification, sentiment] = await Promise.all([
      intentClassifier.classify(message, domain),
      sentimentAnalyzer.analyze(message),
    ]);
    console.log(`[PERF-TRACE] [chatStream] classify + sentiment took ${Date.now() - t4}ms`);

    const activeState = await stateManager.getState(sessionId);

    let effectiveDomain: any = classification.domain;
    let effectiveIntent = classification.intent;

    if (domain === "gadgets" || domain === "general" || domain === "seller" || domain === "support") {
      effectiveDomain = domain;
    } else if (domain === "fashion" || activeState.occasion || (modifier.action !== "none" && modifier.action !== "reset_conversation")) {
      effectiveDomain = "fashion";
      if (modifier.action !== "none" && modifier.action !== "reset_conversation") {
        effectiveIntent = "outfit_recommendation";
      }
    }

    // Fast-path: Human Escalation
    if (sentiment.shouldEscalate || effectiveIntent === "escalate_human") {
      const text = "I understand you're frustrated or need complex help. I'm transferring you to a human agent now.";
      yield { token: text, done: true };
      return;
    }

    // 6. Tool Execution
    let toolResults: any[] = [];
    if (toolRegistry.shouldUseTool(effectiveIntent)) {
      const toolContext = { sessionId, userId, memory: memoryContext };
      const result = await toolRegistry.executeToolForIntent(
        effectiveIntent,
        message,
        toolContext
      );
      if (result) {
        toolResults.push(result);
      }
    }

    // 7. Consultation Gate & Slot Completion Engine (Mandatory Stream Intercept)
    const isColorQuery = message.toLowerCase().includes("pair") || message.toLowerCase().includes("match") || message.toLowerCase().includes("go with") || message.toLowerCase().includes("color") || message.toLowerCase().includes("colour") || message.toLowerCase().includes("navy");

    if (effectiveDomain === "fashion" || effectiveIntent === "fashion_recommendation") {
      const state = await stateManager.updateState(sessionId, message);

      if (modifier.action === "none" && !isColorQuery) {
        const { getSlotCompletionEngine } = await import("../consultation/slot-completion-engine.ts");
        const slotEngine = getSlotCompletionEngine();
        const slotResult = slotEngine.evaluateSlots(state);

        if (!slotResult.isComplete && slotResult.probingQuestion) {
          const responseText = slotResult.probingQuestion;
          await sessions.addMessage(sessionId, "assistant", responseText, {
            intent: "probing_question",
            sentiment: sentiment.sentiment,
          });
          yield { token: responseText, done: true };
          return;
        }
      }
    }

    // 8. Generate Response (Stream)
    if (domain === "support" || effectiveDomain === "support") {
      console.log(`[RUNTIME-TRACE] [ConversationManager] Streaming via Workflow Orchestrator + Response Composer + LLM Renderer...`);
      const orchestrator = getWorkflowOrchestrator();
      const orchResult = await orchestrator.orchestrate(sessionId, message, userId);

      const composer = getSupportResponseComposer();
      const unifiedResponse = composer.compose(orchResult);

      const renderer = getSupportLLMRenderer();
      yield* renderer.streamRender(unifiedResponse);
    } else if (effectiveDomain === "fashion") {
      // ── Deterministic Fashion Engine + LLM Renderer (Stream) ──
      console.log(`[RUNTIME-TRACE] [ConversationManager] Streaming via Deterministic Fashion Engine...`);
      const { getDeterministicFashionEngine } = await import("../fashion/deterministic-fashion-engine.ts");
      const { getLLMRenderer } = await import("../fashion/llm-renderer.ts");
      const { getEmotionalIntelligenceEngine } = await import("../memory/emotional-intelligence.ts");

      const engine = getDeterministicFashionEngine();
      const renderer = getLLMRenderer();
      const emotionalEngine = getEmotionalIntelligenceEngine();

      const fashionState = await stateManager.getState(sessionId);
      const recommendation = await engine.recommend(fashionState, message, modifier);
      const emotionalOpening = emotionalEngine.analyzeEmotion(message).empatheticOpening;

      console.log(`[RUNTIME-TRACE] [DeterministicEngine] Recommendation JSON:`, JSON.stringify(recommendation.look));

      yield* renderer.streamRender(recommendation, emotionalOpening);
    } else {
      // ── Non-Fashion / General: RAG Pipeline Stream ──
      yield* ragPipeline.streamAnswer({
        query: message,
        domain: effectiveDomain,
        memory: memoryContext,
        sessionId,
        toolResults,
      });
    }
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
