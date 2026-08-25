/**
 * Support Response Composer & Dynamic Quick Action Generator (< 20ms)
 *
 * Constructs structured UI card objects (Order Cards, Timeline Cards, Refund Cards, Ticket Badges)
 * and generates dynamic context-aware quick action buttons for the frontend chat interface.
 */

import type { SupportIntent } from "./fast-support-intent-engine";

export interface QuickActionButton {
  label: string;
  actionQuery: string;
  icon?: string;
}

export interface StructuredSupportResponse {
  type: "text" | "order_card" | "refund_card" | "ticket_card" | "policy_card";
  mainText: string;
  orderData?: any;
  ticketData?: any;
  quickActions: QuickActionButton[];
}

export class SupportResponseComposer {
  compose(
    intent: SupportIntent,
    toolResult: any,
    policyResult: any,
    knowledgeMatches: any[],
    _language: "English" | "Bangla" | "Banglish" = "English"
  ): StructuredSupportResponse {
    // 1. Order Tracking / Delivery Estimation
    if (intent === "track_order" || intent === "delivery_estimation") {
      if (toolResult?.success && toolResult.data) {
        return {
          type: "order_card",
          mainText: toolResult.message,
          orderData: toolResult.data,
          quickActions: [
            { label: "📍 Track Courier", actionQuery: "track again", icon: "truck" },
            { label: "✏️ Change Address", actionQuery: "change address", icon: "map-pin" },
            { label: "📄 Download Invoice", actionQuery: "download invoice", icon: "file-text" },
            { label: "🚫 Cancel Order", actionQuery: "cancel order", icon: "x-circle" },
            { label: "👨‍💼 Talk to Human", actionQuery: "talk to human", icon: "headphones" },
          ],
        };
      }
    }

    // 2. Cancellation
    if (intent === "cancel_order") {
      if (toolResult?.success && toolResult.data) {
        return {
          type: "order_card",
          mainText: toolResult.message,
          orderData: toolResult.data,
          quickActions: [
            { label: "💳 Check Refund Status", actionQuery: "check refund status", icon: "credit-card" },
            { label: "👨‍💼 Talk to Human", actionQuery: "talk to human", icon: "headphones" },
          ],
        };
      }
    }

    // 3. Return & Exchange
    if (intent === "return_item" || intent === "exchange_item") {
      if (toolResult?.success && toolResult.data) {
        return {
          type: "order_card",
          mainText: toolResult.message,
          orderData: toolResult.data,
          quickActions: [
            { label: "📦 Free Doorstep Pickup", actionQuery: "confirm return pickup", icon: "package" },
            { label: "🔄 Exchange Size", actionQuery: "exchange size", icon: "refresh" },
            { label: "👨‍💼 Talk to Human", actionQuery: "talk to human", icon: "headphones" },
          ],
        };
      }
    }

    // 4. Ticket Status / Escalation
    if (intent === "ticket_status" || intent === "escalate_agent") {
      if (toolResult?.success && toolResult.data) {
        return {
          type: "ticket_card",
          mainText: toolResult.message,
          ticketData: toolResult.data,
          quickActions: [
            { label: "🕒 Check SLA Status", actionQuery: "check ticket status", icon: "clock" },
            { label: "👨‍💼 Priority Human Connect", actionQuery: "priority connect", icon: "user-check" },
          ],
        };
      }
    }

    // 5. Policy Queries
    if (policyResult) {
      return {
        type: "policy_card",
        mainText: `${policyResult.summary}\n\n${policyResult.details.map((d: string) => `• ${d}`).join("\n")}`,
        quickActions: [
          { label: "📦 View Eligible Orders", actionQuery: "track my order", icon: "package" },
          { label: "👨‍💼 Ask Support Executive", actionQuery: "talk to human", icon: "headphones" },
        ],
      };
    }

    // 6. Knowledge Match Fallback
    if (knowledgeMatches && knowledgeMatches.length > 0) {
      return {
        type: "text",
        mainText: knowledgeMatches[0].answer,
        quickActions: [
          { label: "📦 Track Order", actionQuery: "track my order", icon: "truck" },
          { label: "👨‍💼 Talk to Human", actionQuery: "talk to human", icon: "headphones" },
        ],
      };
    }

    // Default Fallback Response
    return {
      type: "text",
      mainText: toolResult?.message || "I'd be happy to assist you with your order, shipping, returns, or account settings. What would you like help with?",
      quickActions: [
        { label: "📦 Track My Order", actionQuery: "track my order", icon: "truck" },
        { label: "💳 Payment & Refund", actionQuery: "check refund status", icon: "credit-card" },
        { label: "📄 Return Policy", actionQuery: "return policy", icon: "help" },
        { label: "👨‍💼 Talk to Human", actionQuery: "talk to human", icon: "headphones" },
      ],
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
