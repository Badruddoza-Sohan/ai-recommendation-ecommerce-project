/**
 * Customer Success Intelligence Engine (< 1ms Latency)
 *
 * Detects the customer's current shopping journey stage:
 *  - Browsing
 *  - Product Comparison
 *  - Cart Building
 *  - Checkout
 *  - Payment
 *  - Shipping
 *  - Delivery
 *  - After-Sales
 *  - Return
 *  - Warranty
 *  - Repeat Purchase
 */

export type JourneyStage =
  | "Browsing"
  | "Product Comparison"
  | "Cart Building"
  | "Checkout"
  | "Payment"
  | "Shipping"
  | "Delivery"
  | "After-Sales"
  | "Return"
  | "Warranty"
  | "Repeat Purchase";

export interface JourneyStageDetection {
  stage: JourneyStage;
  confidence: number;
  stageGuidance: string;
}

export class SuccessIntelligenceEngine {
  detectStage(
    query: string,
    intent: string,
    activeOrderStatus?: string,
    currentPath?: string
  ): JourneyStageDetection {
    const lower = query.toLowerCase();

    // 1. Return Stage
    if (intent === "return_item" || lower.includes("return") || lower.includes("riturn") || lower.includes("damaged")) {
      return {
        stage: "Return",
        confidence: 0.98,
        stageGuidance: "Customer requires return assistance. Prioritize doorstep pickup instructions and refund timeline.",
      };
    }

    // 2. Warranty Stage
    if (intent === "warranty_lookup" || lower.includes("warranty") || lower.includes("guarantee")) {
      return {
        stage: "Warranty",
        confidence: 0.96,
        stageGuidance: "Customer inquiry regarding product warranty. Provide official brand warranty details and service center address.",
      };
    }

    // 3. Shipping / In-Transit Stage
    if (activeOrderStatus === "shipped" || intent === "track_order" || intent === "delivery_estimation" || lower.includes("where is my order")) {
      return {
        stage: "Shipping",
        confidence: 0.97,
        stageGuidance: "Customer order is currently in transit. Display live courier tracking status and arrival ETA.",
      };
    }

    // 4. Delivery Completed / After-Sales Stage
    if (activeOrderStatus === "delivered" || lower.includes("received order") || lower.includes("delivered")) {
      return {
        stage: "Delivery",
        confidence: 0.95,
        stageGuidance: "Order successfully delivered. Assist with post-delivery setup, invoice download, or product reviews.",
      };
    }

    // 5. Payment Stage
    if (intent === "payment_issue" || intent === "refund_status" || lower.includes("bkash") || lower.includes("payment failed")) {
      return {
        stage: "Payment",
        confidence: 0.96,
        stageGuidance: "Customer facing payment or refund question. Provide payment diagnostic or payout timeline.",
      };
    }

    // 6. Checkout / Cart Stage
    if (currentPath?.includes("checkout") || lower.includes("checkout")) {
      return {
        stage: "Checkout",
        confidence: 0.94,
        stageGuidance: "Customer in checkout stage. Highlight shipping thresholds and final order details.",
      };
    }

    // 7. Product Comparison / Cart Building Stage
    if (currentPath?.includes("cart") || intent === "stock_check" || lower.includes("stock") || lower.includes("available")) {
      return {
        stage: "Cart Building",
        confidence: 0.92,
        stageGuidance: "Customer reviewing items in cart. Provide stock availability and delivery fee estimates.",
      };
    }

    // 8. Repeat Purchase Stage
    if (lower.includes("buy again") || lower.includes("reorder") || lower.includes("buy another")) {
      return {
        stage: "Repeat Purchase",
        confidence: 0.95,
        stageGuidance: "Customer interested in reordering. Provide quick reorder buttons and loyalty discount incentives.",
      };
    }

    // Default Browsing Stage
    return {
      stage: "Browsing",
      confidence: 0.85,
      stageGuidance: "General browsing stage. Provide friendly assistance across catalog, policies, and order lookup.",
    };
  }
}

let instance: SuccessIntelligenceEngine | null = null;
export function getSuccessIntelligenceEngine(): SuccessIntelligenceEngine {
  if (!instance) {
    instance = new SuccessIntelligenceEngine();
  }
  return instance;
}
