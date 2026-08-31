/**
 * Enterprise Support Decision Engine (100% Deterministic Intelligence)
 *
 * All business logic, database lookups, policy evaluations, refund calculations,
 * and next-action decisions are computed in pure TypeScript (<20ms).
 *
 * Produces a clean, authoritative SupportDecisionResult JSON object for the LLM renderer.
 */

import { getFastSupportIntentEngine, SupportIntent } from "./fast-support-intent-engine.ts";
import { getSupportStateManager } from "./support-state-manager.ts";
import { getSupportToolDispatcher } from "./support-tool-dispatcher.ts";
import { getDeterministicPolicyEngine } from "./deterministic-policy-engine.ts";
import { getFTS5KnowledgeEngine } from "./fts5-knowledge-engine";
import { getCustomer360ProfileEngine } from "./customer-360-profile-engine";
import { getSuccessIntelligenceEngine } from "./success-intelligence-engine";
import { getPredictiveAssistanceEngine } from "./predictive-assistance-engine";
import { getSuccessRecommendationEngine } from "./success-recommendation-engine";
import { getSmartConversationPlanner } from "./smart-conversation-planner";
import { getLoyaltyRetentionEngine } from "./loyalty-retention-engine";

export interface SupportDecisionResult {
  intent: SupportIntent;
  query: string;
  language: "English" | "Bangla" | "Banglish";
  order?: {
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
    courier?: string;
    estimatedDelivery?: string;
    shippingAddress?: string;
  };
  policy?: {
    category: string;
    title: string;
    summary: string;
    details: string[];
    banglaSummary?: string;
  };
  knowledge?: {
    title: string;
    content: string;
    confidence: number;
  };
  ticket?: {
    ticketNumber: string;
    status: string;
    userMessage: string;
  };
  nextActions: Array<{ label: string; actionQuery: string; icon?: string }>;
  tone: "positive" | "empathetic" | "neutral" | "urgent";
  rawFallbackText: string;
  latencyMs: number;
}

export class SupportDecisionEngine {
  private intentEngine = getFastSupportIntentEngine();
  private stateManager = getSupportStateManager();
  private toolDispatcher = getSupportToolDispatcher();
  private policyEngine = getDeterministicPolicyEngine();
  private knowledgeEngine = getFTS5KnowledgeEngine();
  private profileEngine = getCustomer360ProfileEngine();
  private stageEngine = getSuccessIntelligenceEngine();
  private predictiveEngine = getPredictiveAssistanceEngine();
  private recEngine = getSuccessRecommendationEngine();
  private planner = getSmartConversationPlanner();
  private loyaltyEngine = getLoyaltyRetentionEngine();

  async evaluate(
    sessionId: string,
    query: string,
    userId?: number,
    currentPath?: string
  ): Promise<SupportDecisionResult> {
    const startTime = Date.now();

    // 1. Fast Intent Classification (< 1ms)
    const classification = this.intentEngine.classify(query);
    const { intent, extractedOrderId, extractedTicketId, language } = classification;

    // 2. Fetch Customer 360° Profile (< 1ms)
    const profile = await this.profileEngine.getProfile(userId);

    // 3. Update Support State (< 1ms)
    const state = await this.stateManager.updateState(
      sessionId,
      query,
      extractedOrderId,
      extractedTicketId,
      language,
      userId
    );

    const activeOrder = extractedOrderId || state.activeOrderId;
    const activeTicket = extractedTicketId || state.activeTicketId;

    // 4. Shopping Journey Stage (< 1ms)
    const stageDetection = this.stageEngine.detectStage(query, intent, undefined, currentPath);

    // 5. Execute DB Tool Dispatcher (< 20ms)
    let toolResult: any = null;
    if (intent !== "greeting" && intent !== "thank_you" && intent !== "goodbye" && intent !== "policy_query" && intent !== "unknown") {
      toolResult = await this.toolDispatcher.dispatch(intent, query, activeOrder, activeTicket, userId || state.userId);
    }

    // 6. Deterministic Policy Lookup (< 1ms)
    let policyResult: any = null;
    if (intent === "policy_query" || intent === "unknown") {
      policyResult = this.policyEngine.getPolicy(query, language);
    }

    // 7. Knowledge Search if Needed (< 5ms)
    let knowledgeMatches: any[] = [];
    if (!toolResult?.success && !policyResult && intent === "unknown") {
      knowledgeMatches = await this.knowledgeEngine.search(query);
    }

    // 8. Smart Conversation Plan & Tone (< 1ms)
    const isFrustrated = intent === "escalate_agent" || query.toLowerCase().includes("fraud") || query.toLowerCase().includes("terrible");
    const plan = this.planner.createPlan(intent, toolResult, profile, isFrustrated);

    const tone: "positive" | "empathetic" | "neutral" | "urgent" = isFrustrated
      ? "empathetic"
      : intent === "track_order" || intent === "thank_you"
      ? "positive"
      : "neutral";

    // 9. Build Next Actions
    const nextActions = this.buildNextActions(intent, toolResult, policyResult);

    // 10. Generate Fallback Text Template
    const rawFallbackText = plan.plannedDialogue || this.buildFallbackText(intent, toolResult, policyResult, knowledgeMatches, language);

    const latencyMs = Date.now() - startTime;

    // Extract Order Data
    let order: SupportDecisionResult["order"] = undefined;
    if (toolResult?.data?.orderNumber || toolResult?.data?.id) {
      const d = toolResult.data;
      order = {
        id: String(d.id || d.orderNumber),
        orderNumber: String(d.orderNumber || d.id),
        status: String(d.status || "Processing"),
        totalAmount: Number(d.totalAmount || d.total || 0),
        items: Array.isArray(d.items) ? d.items.map((i: any) => ({ name: String(i.name), quantity: Number(i.quantity || 1), price: Number(i.price || 0) })) : [],
        courier: d.courier || "Standard Delivery",
        estimatedDelivery: d.estimatedDelivery || "1-3 Business Days",
        shippingAddress: d.shippingAddress || d.address,
      };
    }

    // Extract Policy Data
    let policy: SupportDecisionResult["policy"] = undefined;
    if (policyResult) {
      policy = {
        category: policyResult.category,
        title: policyResult.title,
        summary: policyResult.summary,
        details: policyResult.details || [],
        banglaSummary: policyResult.banglaSummary,
      };
    }

    // Extract Knowledge Data
    let knowledge: SupportDecisionResult["knowledge"] = undefined;
    if (knowledgeMatches.length > 0) {
      knowledge = {
        title: knowledgeMatches[0].title || "Knowledge Article",
        content: knowledgeMatches[0].content || knowledgeMatches[0].snippet || "",
        confidence: knowledgeMatches[0].score || 0.8,
      };
    }

    return {
      intent,
      query,
      language,
      order,
      policy,
      knowledge,
      nextActions,
      tone,
      rawFallbackText,
      latencyMs,
    };
  }

  private buildNextActions(intent: SupportIntent, toolResult: any, policyResult: any) {
    const actions: Array<{ label: string; actionQuery: string }> = [];

    if (intent === "track_order") {
      actions.push({ label: "Track Again", actionQuery: "Track my order" });
      actions.push({ label: "Returns", actionQuery: "Return policy" });
      actions.push({ label: "Talk to Admin", actionQuery: "Connect to live human admin" });
    } else if (intent === "cancel_order") {
      actions.push({ label: "View Orders", actionQuery: "Show my orders" });
      actions.push({ label: "Contact Support", actionQuery: "Talk to live admin" });
    } else if (intent === "return_item" || intent === "exchange_item") {
      actions.push({ label: "Return Policy", actionQuery: "What is your return policy?" });
      actions.push({ label: "Talk to Admin", actionQuery: "Connect to human agent" });
    } else {
      actions.push({ label: "Track Order", actionQuery: "Track my order" });
      actions.push({ label: "Return Policy", actionQuery: "Return policy" });
      actions.push({ label: "Payments", actionQuery: "Payment methods" });
    }

    return actions;
  }

  private buildFallbackText(intent: SupportIntent, toolResult: any, policyResult: any, knowledgeMatches: any[], language: string): string {
    if (language === "Bangla") {
      if (toolResult?.message) return toolResult.message;
      if (policyResult?.banglaSummary) return policyResult.banglaSummary;
      return "ধন্যবাদ সাথে থাকার জন্য। আমি আপনাকে কীভাবে সাহায্য করতে পারি?";
    }

    if (toolResult?.message) {
      return toolResult.message;
    }
    if (policyResult?.summary) {
      return `${policyResult.title}: ${policyResult.summary}`;
    }
    if (knowledgeMatches.length > 0) {
      return knowledgeMatches[0].content;
    }

    return "Hello! I am your AI Support Assistant. How can I assist you with your order, shipping, or returns today?";
  }
}

let instance: SupportDecisionEngine | null = null;
export function getSupportDecisionEngine(): SupportDecisionEngine {
  if (!instance) {
    instance = new SupportDecisionEngine();
  }
  return instance;
}
