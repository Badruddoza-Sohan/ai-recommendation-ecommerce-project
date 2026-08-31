/**
 * Fast Support Intent Engine (< 1ms Latency)
 *
 * Sub-millisecond intent classification engine for Customer Support queries.
 * Combines high-precision regex, phrase scoring, keyword matching, and synonym expansion
 * across English, Bangla, and Banglish without requiring heavy vector embeddings or LLM inference.
 */

export type SupportIntent =
  | "track_order"
  | "order_status"
  | "cancel_order"
  | "order_cancel"
  | "return_item"
  | "order_return"
  | "exchange_item"
  | "refund_status"
  | "payment_issue"
  | "update_shipping_address"
  | "delivery_delay"
  | "warranty_lookup"
  | "seller_contact"
  | "escalate_agent"
  | "human_escalation"
  | "ticket_status"
  | "delivery_estimation"
  | "stock_check"
  | "invoice_download"
  | "policy_query"
  | "greeting"
  | "thank_you"
  | "goodbye"
  | "unknown";

export interface IntentClassificationResult {
  intent: SupportIntent;
  confidence: number;
  extractedOrderId?: string;
  extractedTicketId?: string;
  language: "English" | "Bangla" | "Banglish";
  matchedRule?: string;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function matchesKeywords(text: string, targetWords: string[], maxDistance: number = 1): boolean {
  const tokens = text.toLowerCase().split(/[\s,./?!_()-]+/);
  for (const token of tokens) {
    if (!token || token.length < 3) continue;
    for (const target of targetWords) {
      if (token === target) return true;
      if (token.length >= 4 && target.length >= 4 && Math.abs(token.length - target.length) <= maxDistance) {
        if (levenshtein(token, target) <= maxDistance) return true;
      }
    }
  }
  return false;
}

export class FastSupportIntentEngine {
  classify(text: string): IntentClassificationResult {
    const raw = text.trim();
    const lower = raw.toLowerCase();

    // Language Detection
    const containsBanglaUnicode = /[\u0980-\u09FF]/.test(raw);
    const isBanglish = matchesKeywords(lower, ["amar", "kothay", "khub", "bolun", "korbo", "kobe", "pabo", "jante", "dorkar", "chai", "taka"]);
    const language: "English" | "Bangla" | "Banglish" = containsBanglaUnicode
      ? "Bangla"
      : isBanglish
      ? "Banglish"
      : "English";

    // Extract Order ID (#ORD-XXXXX or ORD-XXXXX or digits after order)
    const orderMatch = raw.match(/(?:#?ORD[-_]?\d+)|(?:order\s*#?\s*(\d+))/i);
    const extractedOrderId = orderMatch ? (orderMatch[1] ? `ORD-${orderMatch[1]}` : orderMatch[0].toUpperCase().replace("#", "")) : undefined;

    // Extract Ticket ID (TCKT-XXXXX)
    const ticketMatch = raw.match(/TCKT[-_]?\d+/i);
    const extractedTicketId = ticketMatch ? ticketMatch[0].toUpperCase() : undefined;

    // 1. Hostile / Direct Human Agent Escalation
    if (
      lower.includes("talk to human") || lower.includes("talk to a person") ||
      lower.includes("real person") || lower.includes("human support") ||
      lower.includes("connect me to agent") || lower.includes("fraud") || lower.includes("court") || lower.includes("police")
    ) {
      return { intent: "escalate_agent", confidence: 0.99, extractedOrderId, extractedTicketId, language, matchedRule: "human_escalation" };
    }

    // 2. Policy Queries (Check before action queries like return_item)
    if (
      lower.includes("return policy") || lower.includes("refund policy") || lower.includes("shipping policy") ||
      lower.includes("what is the policy") || lower.includes("policy for") || lower.includes("rules for return") ||
      lower.includes("policy")
    ) {
      return { intent: "policy_query", confidence: 0.97, extractedOrderId, extractedTicketId, language, matchedRule: "policy_query" };
    }

    // 3. Cancel Order
    if (
      lower.includes("cancel order") || lower.includes("cancel it") || lower.includes("cancel this") ||
      lower.includes("cancel korbo") || lower.includes("want to cancel") ||
      matchesKeywords(lower, ["cancel", "cancle", "cancelling", "cancellation", "abort"])
    ) {
      return { intent: "cancel_order", confidence: 0.98, extractedOrderId, extractedTicketId, language, matchedRule: "cancel_order" };
    }

    // 4. Return Item
    if (
      lower.includes("return item") || lower.includes("return korbo") || lower.includes("send back") ||
      lower.includes("রিটার্ন") || lower.includes("ফিরত") ||
      matchesKeywords(lower, ["return", "riturn", "returning", "damaged", "broken", "wrong item", "faulty", "defective"])
    ) {
      return { intent: "return_item", confidence: 0.96, extractedOrderId, extractedTicketId, language, matchedRule: "return_item" };
    }

    // 5. Update Shipping Address
    if (
      lower.includes("change address") || lower.includes("update address") || lower.includes("new address") ||
      lower.includes("change delivery address") || matchesKeywords(lower, ["address", "thikana", "location"])
    ) {
      return { intent: "update_shipping_address", confidence: 0.95, extractedOrderId, extractedTicketId, language, matchedRule: "update_shipping_address" };
    }

    // 6. Refund Status & Money Back
    if (
      lower.includes("money back") || lower.includes("refund status") || lower.includes("taka ferot") || lower.includes("when will i get money") ||
      matchesKeywords(lower, ["refund", "rifund", "reimbursement", "payout"])
    ) {
      return { intent: "refund_status", confidence: 0.97, extractedOrderId, extractedTicketId, language, matchedRule: "refund_status" };
    }

    // 7. Payment Issues / Payment Diagnostics
    if (
      lower.includes("payment failed") || lower.includes("money deducted") || lower.includes("taka kete nise") ||
      matchesKeywords(lower, ["payment", "bkash", "nagad", "card", "failed", "deducted", "sslcommerz"])
    ) {
      return { intent: "payment_issue", confidence: 0.96, extractedOrderId, extractedTicketId, language, matchedRule: "payment_issue" };
    }

    // 8. Track Order / Shipping Location
    if (
      extractedOrderId ||
      lower.includes("where is my order") || lower.includes("order status") || lower.includes("track order") ||
      lower.includes("amar order") || lower.includes("kothay") || lower.includes("track my order") ||
      matchesKeywords(lower, ["track", "tracking", "courier", "shipment"])
    ) {
      return { intent: "track_order", confidence: 0.98, extractedOrderId, extractedTicketId, language, matchedRule: "track_order" };
    }

    // 10. Ticket Status Lookup
    if (extractedTicketId || lower.includes("ticket status") || lower.includes("my ticket") || lower.includes("complaint status")) {
      return { intent: "ticket_status", confidence: 0.96, extractedOrderId, extractedTicketId, language, matchedRule: "ticket_status" };
    }

    // 11. Exchange Item
    if (
      lower.includes("exchange item") || lower.includes("change size") || lower.includes("exchange korbo") ||
      matchesKeywords(lower, ["exchange", "exchanj", "replace", "replacement", "swap"])
    ) {
      return { intent: "exchange_item", confidence: 0.96, extractedOrderId, extractedTicketId, language, matchedRule: "exchange_item" };
    }

    // 12. Delivery Estimation / Delay
    if (
      lower.includes("when delivery") || lower.includes("delivery time") || lower.includes("kobe pabo") ||
      matchesKeywords(lower, ["delay", "late", "delayed", "eta"])
    ) {
      return { intent: "delivery_estimation", confidence: 0.95, extractedOrderId, extractedTicketId, language, matchedRule: "delivery_estimation" };
    }

    // 13. Stock Availability Inquiry
    if (
      lower.includes("in stock") || lower.includes("out of stock") ||
      matchesKeywords(lower, ["stock", "stok", "available", "restock"])
    ) {
      return { intent: "stock_check", confidence: 0.95, extractedOrderId, extractedTicketId, language, matchedRule: "stock_check" };
    }

    // 14. Download Invoice
    if (
      lower.includes("download invoice") || lower.includes("pdf invoice") ||
      matchesKeywords(lower, ["invoice", "invois", "bill", "receipt", "memo"])
    ) {
      return { intent: "invoice_download", confidence: 0.97, extractedOrderId, extractedTicketId, language, matchedRule: "invoice_download" };
    }

    // 15. Warranty Lookup
    if (
      lower.includes("warranty period") || lower.includes("claim warranty") ||
      matchesKeywords(lower, ["warranty", "waranty", "guarantee"])
    ) {
      return { intent: "warranty_lookup", confidence: 0.96, extractedOrderId, extractedTicketId, language, matchedRule: "warranty_lookup" };
    }

    // 16. Seller Inquiry
    if (
      lower.includes("talk to seller") || lower.includes("contact seller") ||
      matchesKeywords(lower, ["seller", "vendor", "shopkeeper"])
    ) {
      return { intent: "seller_contact", confidence: 0.95, extractedOrderId, extractedTicketId, language, matchedRule: "seller_contact" };
    }

    // 17. Greetings & Polite Closings
    if (matchesKeywords(lower, ["hi", "hello", "hey", "assalamu alaikum", "slaam", "good morning", "good evening", "helo", "halow"])) {
      return { intent: "greeting", confidence: 0.99, extractedOrderId, extractedTicketId, language, matchedRule: "greeting" };
    }

    if (matchesKeywords(lower, ["thank", "thanks", "dhonnobad", "thank you", "tnx", "thx"])) {
      return { intent: "thank_you", confidence: 0.99, extractedOrderId, extractedTicketId, language, matchedRule: "thank_you" };
    }

    if (matchesKeywords(lower, ["bye", "goodbye", "see you", "tata"])) {
      return { intent: "goodbye", confidence: 0.99, extractedOrderId, extractedTicketId, language, matchedRule: "goodbye" };
    }

    return { intent: "unknown", confidence: 0.3, extractedOrderId, extractedTicketId, language, matchedRule: "fallback_unknown" };
  }
}

let instance: FastSupportIntentEngine | null = null;
export function getFastSupportIntentEngine(): FastSupportIntentEngine {
  if (!instance) {
    instance = new FastSupportIntentEngine();
  }
  return instance;
}
