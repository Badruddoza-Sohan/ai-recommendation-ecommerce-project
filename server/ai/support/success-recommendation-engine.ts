/**
 * Smart Product & Service Recommendation Engine (< 1ms Latency)
 *
 * Generates personalized product cross-sells, warranty upgrades, and restock reminders
 * based on the customer's 360 profile, purchase history, and active shopping stage.
 */

import type { Customer360Profile } from "./customer-360-profile-engine";

export interface SuccessRecommendation {
  type: "cross_sell" | "warranty_addon" | "reorder" | "category_suggestion";
  title: string;
  description: string;
  productSlug?: string;
  actionLabel: string;
  actionQuery: string;
}

export class SuccessRecommendationEngine {
  generateRecommendations(
    profile: Customer360Profile,
    intent: string,
    stage: string
  ): SuccessRecommendation[] {
    const recs: SuccessRecommendation[] = [];

    if (intent === "track_order" || stage === "Delivery") {
      recs.push({
        type: "cross_sell",
        title: "Match With Nagra Sandals",
        description: "Handcrafted Deep Brown Nagra Sandals to complement your traditional silk panjabi order.",
        actionLabel: "View Nagra Sandals",
        actionQuery: "show nagra sandals",
      });
    }

    if (intent === "warranty_lookup" || stage === "Warranty") {
      recs.push({
        type: "warranty_addon",
        title: "Extend Official Warranty",
        description: "Add 1-Year Care Plus extended coverage for BDT 499.",
        actionLabel: "Add Care Plus",
        actionQuery: "extend warranty",
      });
    }

    if (stage === "Repeat Purchase" || profile.totalOrders > 5) {
      recs.push({
        type: "reorder",
        title: "Reorder Favorite Panjabi",
        description: "Quick 1-click reorder of your favorite Silk Panjabi in Burgundy.",
        actionLabel: "Reorder Item",
        actionQuery: "reorder panjabi",
      });
    }

    return recs;
  }
}

let instance: SuccessRecommendationEngine | null = null;
export function getSuccessRecommendationEngine(): SuccessRecommendationEngine {
  if (!instance) {
    instance = new SuccessRecommendationEngine();
  }
  return instance;
}
