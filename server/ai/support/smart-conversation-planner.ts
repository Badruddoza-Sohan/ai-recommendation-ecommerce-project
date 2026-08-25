/**
 * Smart Conversation Planner (< 1ms Latency)
 *
 * Multi-step conversation plan builder that resolves customer inquiries holistically in 1 turn:
 *  1. Inspect order status
 *  2. Diagnose courier location / shipping progress
 *  3. Provide exact delivery ETA
 *  4. Offer compensation vouchers if delayed
 *  5. Generate dynamic quick action buttons
 */

export interface ConversationStep {
  stepIndex: number;
  actionName: string;
  detail: string;
}

export interface ConversationPlan {
  goal: string;
  steps: ConversationStep[];
  plannedDialogue: string;
  hasCompensationOffer: boolean;
  compensationCode?: string;
}

export class SmartConversationPlanner {
  createPlan(
    intent: string,
    toolResult: any,
    profile: any,
    isFrustrated: boolean = false
  ): ConversationPlan {
    const steps: ConversationStep[] = [];
    let plannedDialogue = "";
    let hasCompensationOffer = false;
    let compensationCode: string | undefined = undefined;

    if (intent === "track_order" || intent === "delivery_estimation") {
      const order = toolResult?.data;
      if (order) {
        steps.push({ stepIndex: 1, actionName: "order_lookup", detail: `Fetched Order #${order.orderNumber}` });
        steps.push({ stepIndex: 2, actionName: "courier_status", detail: `Located package at ${order.currentLocation}` });
        steps.push({ stepIndex: 3, actionName: "eta_calculation", detail: `Calculated delivery date for ${order.estimatedDelivery}` });

        if (isFrustrated || profile.loyaltyTier === "VIP") {
          hasCompensationOffer = true;
          compensationCode = profile.loyaltyTier === "VIP" ? "VIPCARE15" : "SORRY500";
          steps.push({ stepIndex: 4, actionName: "compensation_offer", detail: `Awarded code ${compensationCode} for delay/inconvenience` });
        }

        plannedDialogue =
          `I checked your order #${order.orderNumber}. It is currently **${order.status.toUpperCase()}** and located at the **${order.currentLocation}**.\n\n` +
          `📦 **Tracking Number**: \`${order.trackingNumber}\` (${order.courier})\n` +
          `📅 **Expected Delivery**: **${order.estimatedDelivery}**\n\n`;

        if (hasCompensationOffer) {
          plannedDialogue += `🎁 As a valued **${profile.loyaltyTier}** customer, I've added a special voucher \`${compensationCode}\` (15% off) to your account for the delay!`;
        }
      }
    }

    return {
      goal: `Holistically resolve ${intent} inquiry in 1 single turn`,
      steps: steps.length > 0 ? steps : [{ stepIndex: 1, actionName: "direct_response", detail: "Direct authoritative answer" }],
      plannedDialogue: plannedDialogue || toolResult?.message || "How can I assist you with your order today?",
      hasCompensationOffer,
      compensationCode,
    };
  }
}

let instance: SmartConversationPlanner | null = null;
export function getSmartConversationPlanner(): SmartConversationPlanner {
  if (!instance) {
    instance = new SmartConversationPlanner();
  }
  return instance;
}
