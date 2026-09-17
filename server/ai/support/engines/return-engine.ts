/**
 * Return Domain Engine
 *
 * Handles 7-day return policy checks, eligibility calculations, and pickup rules.
 * 100% deterministic TypeScript logic (<5ms).
 */

import { getDeterministicPolicyEngine } from "../deterministic-policy-engine.ts";

export interface ReturnEngineResult {
  success: boolean;
  source: "policy";
  confidence: number;
  explainabilityReason: string;
  data: {
    returnWindowDays: number;
    isEligible: boolean;
    pickupFee: string;
    rules: string[];
    banglaSummary: string;
  };
}

export class ReturnEngine {
  private policyEngine = getDeterministicPolicyEngine();

  async process(_query: string, orderDate?: Date): Promise<ReturnEngineResult> {
    const policy = this.policyEngine.getPolicy("return");
    let isEligible = true;
    let explainabilityReason = "Query matched standard 7-day return policy criteria.";

    if (orderDate) {
      const diffTime = Math.abs(Date.now() - orderDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        isEligible = false;
        explainabilityReason = `Order delivered ${diffDays} days ago, exceeding the 7-day return window.`;
      }
    }

    return {
      success: true,
      source: "policy",
      confidence: 0.99,
      explainabilityReason,
      data: {
        returnWindowDays: 7,
        isEligible,
        pickupFee: "Free Doorstep Pickup",
        rules: policy?.details || [
          "7-Day Window: Return request must be submitted within 7 days.",
          "Condition: Product must be unworn and in original tags.",
        ],
        banglaSummary: policy?.banglaSummary || "পণ্য ডেলিভারির ৭ দিনের মধ্যে বিনামূল্যে রিটার্ন করা যাবে।",
      },
    };
  }
}
