/**
 * Workflow Orchestrator (10/10 Architecture Core)
 *
 * Coordinates intent classification, session state, and domain engines.
 * Dispatches requests to specialized domain engines (Order, Return, Payment, Warranty, Escalation, Policy, Knowledge)
 * and passes results to the Response Composer.
 *
 * Completely replaces monolithic decision logic.
 */

import { getFastSupportIntentEngine, type SupportIntent } from "./fast-support-intent-engine.ts";
import { getSupportStateManager } from "./support-state-manager.ts";
import { OrderEngine, type OrderEngineResult } from "./engines/order-engine.ts";
import { ReturnEngine, type ReturnEngineResult } from "./engines/return-engine.ts";
import { PaymentEngine, type PaymentEngineResult } from "./engines/payment-engine.ts";
import { WarrantyEngine, type WarrantyEngineResult } from "./engines/warranty-engine.ts";
import { EscalationEngine, type EscalationEngineResult } from "./engines/escalation-engine.ts";
import { getDeterministicPolicyEngine } from "./deterministic-policy-engine.ts";
import { getFTS5KnowledgeEngine } from "./fts5-knowledge-engine.ts";

export interface WorkflowOrchestrationResult {
  intent: SupportIntent;
  query: string;
  language: "English" | "Bangla" | "Banglish";
  source: "database" | "policy" | "knowledge_base" | "tool";
  confidence: number;
  explainabilityReason: string;
  orderResult?: OrderEngineResult;
  returnResult?: ReturnEngineResult;
  paymentResult?: PaymentEngineResult;
  warrantyResult?: WarrantyEngineResult;
  escalationResult?: EscalationEngineResult;
  policyResult?: any;
  knowledgeResult?: any;
  latencyMs: number;
}

export class WorkflowOrchestrator {
  private intentEngine = getFastSupportIntentEngine();
  private stateManager = getSupportStateManager();
  private orderEngine = new OrderEngine();
  private returnEngine = new ReturnEngine();
  private paymentEngine = new PaymentEngine();
  private warrantyEngine = new WarrantyEngine();
  private escalationEngine = new EscalationEngine();
  private policyEngine = getDeterministicPolicyEngine();
  private knowledgeEngine = getFTS5KnowledgeEngine();

  async orchestrate(
    sessionId: string,
    query: string,
    userId?: number,
    _currentPath?: string
  ): Promise<WorkflowOrchestrationResult> {
    const startTime = Date.now();

    // 1. Intent Classification (< 1ms)
    const classification = this.intentEngine.classify(query);
    const { intent, extractedOrderId, extractedTicketId, language } = classification;

    // 2. State & Session Entity Tracking (< 1ms)
    const state = await this.stateManager.updateState(
      sessionId,
      query,
      extractedOrderId,
      extractedTicketId,
      language,
      userId
    );

    const activeOrder = extractedOrderId || state.activeOrderId;

    let source: "database" | "policy" | "knowledge_base" | "tool" = "database";
    let confidence = classification.confidence || 0.95;
    let explainabilityReason = `Intent classified as '${intent}' using high-speed embedding & pattern matcher.`;

    let orderResult: OrderEngineResult | undefined;
    let returnResult: ReturnEngineResult | undefined;
    let paymentResult: PaymentEngineResult | undefined;
    let warrantyResult: WarrantyEngineResult | undefined;
    let escalationResult: EscalationEngineResult | undefined;
    let policyResult: any;
    let knowledgeResult: any;

    // 3. Domain Dispatcher
    switch (intent) {
      case "track_order":
      case "order_status":
      case "delivery_estimation":
      case "cancel_order":
      case "order_cancel":
        orderResult = await this.orderEngine.process(query, activeOrder, userId || state.userId);
        source = orderResult.source;
        confidence = orderResult.confidence;
        explainabilityReason = orderResult.explainabilityReason;
        break;

      case "return_item":
      case "order_return":
      case "exchange_item":
        returnResult = await this.returnEngine.process(query);
        source = returnResult.source;
        confidence = returnResult.confidence;
        explainabilityReason = returnResult.explainabilityReason;
        break;

      case "payment_issue":
      case "refund_status":
        paymentResult = await this.paymentEngine.process(query);
        source = paymentResult.source;
        confidence = paymentResult.confidence;
        explainabilityReason = paymentResult.explainabilityReason;
        break;

      case "warranty_lookup":
        warrantyResult = await this.warrantyEngine.process(query);
        source = warrantyResult.source;
        confidence = warrantyResult.confidence;
        explainabilityReason = warrantyResult.explainabilityReason;
        break;

      case "escalate_agent":
      case "human_escalation":
        escalationResult = await this.escalationEngine.process(query, userId || state.userId, sessionId);
        source = escalationResult.source;
        confidence = escalationResult.confidence;
        explainabilityReason = escalationResult.explainabilityReason;
        break;

      case "policy_query":
        policyResult = this.policyEngine.getPolicy(query, language);
        if (!policyResult) {
          const matches = await this.knowledgeEngine.search(query);
          if (matches.length > 0) {
            knowledgeResult = matches[0];
            source = "knowledge_base";
            confidence = matches[0].confidence || 0.85;
            explainabilityReason = "FTS5 search matched knowledge base article.";
          } else {
            source = "policy";
            confidence = 0.7;
            explainabilityReason = "Default store assistance policy information.";
          }
        } else {
          source = "policy";
          confidence = 0.99;
          explainabilityReason = "Rule matched authoritative store policy database.";
        }
        break;

      default:
        policyResult = this.policyEngine.getPolicy(query, language);
        if (policyResult) {
          source = "policy";
          confidence = 0.95;
          explainabilityReason = "Query matched standard policy rules.";
        } else {
          const matches = await this.knowledgeEngine.search(query);
          if (matches.length > 0) {
            knowledgeResult = matches[0];
            source = "knowledge_base";
            confidence = matches[0].confidence || 0.85;
            explainabilityReason = "FTS5 vector search matched knowledge base article.";
          } else {
            source = "tool";
            confidence = 0.7;
            explainabilityReason = "General support inquiry routed to fallback assistant.";
          }
        }
        break;
    }

    const latencyMs = Date.now() - startTime;

    return {
      intent,
      query,
      language,
      source,
      confidence,
      explainabilityReason,
      orderResult,
      returnResult,
      paymentResult,
      warrantyResult,
      escalationResult,
      policyResult,
      knowledgeResult,
      latencyMs,
    };
  }
}

let instance: WorkflowOrchestrator | null = null;
export function getWorkflowOrchestrator(): WorkflowOrchestrator {
  if (!instance) {
    instance = new WorkflowOrchestrator();
  }
  return instance;
}
