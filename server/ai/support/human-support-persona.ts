/**
 * Senior Customer Support Executive Persona Layer (< 10ms Execution)
 *
 * Transforms raw structured database results and policy data into warm, humanized,
 * empathetic customer support dialogue matching senior e-commerce executive standards.
 */

import type { SupportIntent } from "./fast-support-intent-engine";
import type { StructuredSupportResponse } from "./support-response-composer";

export class HumanSupportPersona {
  formatDialogue(
    intent: SupportIntent,
    response: StructuredSupportResponse,
    language: "English" | "Bangla" | "Banglish" = "English"
  ): string {
    const rawText = response.mainText;

    if (intent === "greeting") {
      if (language === "Bangla" || language === "Banglish") {
        return "হ্যালো! 👋 MarketVerse সাপোর্ট সেন্টারে আপনাকে স্বাগতম। আজকের জন্য আপনাকে কীভাবে সাহায্য করতে পারি?";
      }
      return "Hello! 👋 Welcome to MarketVerse Support. I'm here to assist you with order tracking, returns, refunds, or product questions. How can I help you today?";
    }

    if (intent === "thank_you") {
      return "You're very welcome! If you need anything else down the line, don't hesitate to reach out. Have a wonderful day! 😊";
    }

    if (intent === "goodbye") {
      return "Goodbye! Thanks for choosing MarketVerse. Feel free to message us anytime if you need further help.";
    }

    if (intent === "return_item" && language === "Bangla") {
      return "অর্ডারটি রিটার্নের যোগ্য। ডেলিভারির ৭ দিনের মধ্যে বিনামূল্যে ডোরস্টেপ পিকআপ সুবিধা পাবেন। রিটার্ন প্রক্রিয়া নিশ্চিত করতে নিচের বোতামে চাপুন।";
    }

    if (intent === "track_order" && response.orderData) {
      const order = response.orderData;
      return (
        `I checked your order #${order.orderNumber}. It's currently **${order.status.toUpperCase()}** and located at the **${order.currentLocation}**.\n\n` +
        `📦 **Tracking Number**: \`${order.trackingNumber}\` (${order.courier})\n` +
        `📅 **Expected Delivery**: **${order.estimatedDelivery}**\n\n` +
        `Everything is moving smoothly according to schedule. Is there anything specific you'd like to adjust for this shipment?`
      );
    }

    if (intent === "cancel_order" && response.orderData) {
      const order = response.orderData;
      if (order.status === "cancelled") {
        return (
          `I've processed the cancellation for Order #${order.orderNumber}. Your refund of **BDT ${order.totalAmount}** will be credited to your original payment channel within 3–5 business days.\n\n` +
          `A confirmation receipt has also been recorded under your account.`
        );
      }
    }

    if (intent === "escalate_agent" && response.ticketData) {
      const ticket = response.ticketData;
      return (
        `I understand this requires special attention. I have created Support Ticket **#${ticket.ticketNumber}** for you with High Priority.\n\n` +
        `A senior support executive has been assigned to your case and will respond within **15–30 minutes**.\n\n` +
        `You can track updates directly in this chat or under your User Dashboard.`
      );
    }

    return rawText;
  }
}

let instance: HumanSupportPersona | null = null;
export function getHumanSupportPersona(): HumanSupportPersona {
  if (!instance) {
    instance = new HumanSupportPersona();
  }
  return instance;
}
