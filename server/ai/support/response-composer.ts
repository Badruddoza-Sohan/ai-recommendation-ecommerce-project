/**
 * Support Response Composer (10/10 Architecture Component)
 *
 * Merges outputs from domain engines into the unified `UnifiedAIResponse` schema.
 * Attaches metadata (confidence, source attribution, explainability) and dynamic UI actions.
 */

import type { UnifiedAIResponse, AIResponseAction, AIResponseSection } from "../renderers/types";
import type { WorkflowOrchestrationResult } from "./workflow-orchestrator";

export class SupportResponseComposer {
  compose(result: WorkflowOrchestrationResult): UnifiedAIResponse {
    const {
      intent,
      query: _query,
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
    } = result;

    let title = "Support Center";
    let summary = "How can I assist you today?";
    const sections: AIResponseSection[] = [];
    const actions: AIResponseAction[] = [];

    // 1. Compose Title & Summary based on Domain Results
    if (orderResult?.data) {
      const o = orderResult.data;
      title = `Order Tracking (${o.orderNumber})`;
      summary = `Order ${o.orderNumber} is currently ${o.status}. Total: BDT ${o.totalAmount.toFixed(2)}.`;
      
      sections.push({
        heading: "Order Details",
        content: `Status: **${o.status}**\nCourier: **${o.courier}**\nEstimated Delivery: **${o.estimatedDelivery}**`,
        type: "text",
      });

      if (o.items.length > 0) {
        sections.push({
          heading: "Items Purchased",
          content: o.items.map((i) => `• ${i.name} (x${i.quantity}) - BDT ${i.price.toFixed(2)}`).join("\n"),
          type: "bullet_list",
        });
      }

      actions.push({ label: "Track Again", actionQuery: "Track my order" });
      actions.push({ label: "Return Policy", actionQuery: "What is your return policy?" });
      actions.push({ label: "Talk to Human Admin", actionQuery: "Connect to live human admin" });
    } else if (returnResult?.data) {
      const r = returnResult.data;
      title = "Return & Exchange Policy";
      summary = `Items can be returned within ${r.returnWindowDays} days of delivery with ${r.pickupFee.toLowerCase()}.`;

      sections.push({
        heading: "Return Guidelines",
        content: r.rules.map((rule) => `• ${rule}`).join("\n"),
        type: "bullet_list",
      });

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
      actions.push({ label: "Talk to Human Admin", actionQuery: "Connect to human agent" });
    } else if (paymentResult?.data) {
      const p = paymentResult.data;
      title = "Payments & Refund Timeline";
      summary = `Refunds take ${p.mobileBankingETA} for Mobile Banking (bKash/Nagad) and ${p.cardETA} for Credit Cards.`;

      sections.push({
        heading: "Refund Guidelines",
        content: p.details.map((d) => `• ${d}`).join("\n"),
        type: "bullet_list",
      });

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
      actions.push({ label: "Return Policy", actionQuery: "Return policy" });
    } else if (warrantyResult?.data) {
      const w = warrantyResult.data;
      title = "Electronic Warranty Policy";
      summary = w.coverage;

      sections.push({
        heading: "Service Centers",
        content: w.serviceCenters.map((s) => `• ${s}`).join("\n"),
        type: "bullet_list",
      });

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
    } else if (escalationResult?.data) {
      const e = escalationResult.data;
      title = "Live Admin Ticket";
      summary = e.message;

      actions.push({ label: "Talk to Human Admin", actionQuery: "Connect to human agent" });
    } else if (policyResult) {
      title = policyResult.title || "Store Policy";
      summary = policyResult.summary || "Here are our store guidelines.";

      if (policyResult.details) {
        sections.push({
          heading: "Policy Rules",
          content: policyResult.details.map((d: string) => `• ${d}`).join("\n"),
          type: "bullet_list",
        });
      }

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
      actions.push({ label: "Return Policy", actionQuery: "Return policy" });
    } else if (knowledgeResult) {
      title = knowledgeResult.title || "Knowledge Base";
      summary = knowledgeResult.content || knowledgeResult.snippet || "Here is the information from our store documentation.";

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
    } else {
      title = "AI Support Assistant";
      summary = "Hello! I am your AI Support Assistant. I can help you track orders, request returns, verify payments, and answer store policies.";

      actions.push({ label: "Track Order", actionQuery: "Track my order" });
      actions.push({ label: "Return Policy", actionQuery: "Return policy" });
      actions.push({ label: "Payments", actionQuery: "Payment methods" });
    }

    // Compose Deterministic Fallback Text
    let rawFallbackText = `**${title}**\n\n${summary}`;
    if (sections.length > 0) {
      rawFallbackText += `\n\n${sections.map((s) => (s.heading ? `**${s.heading}**:\n${s.content}` : s.content)).join("\n\n")}`;
    }

    return {
      title,
      summary,
      sections,
      actions,
      metadata: {
        confidence,
        source,
        explainabilityReason,
        latencyMs,
        intent,
        language,
      },
      rawFallbackText,
    };
  }
}

let instance: SupportResponseComposer | null = null;
export function getSupportResponseComposer(): SupportResponseComposer {
  if (!instance) {
    instance = new SupportResponseComposer();
  }
  return instance;
}
