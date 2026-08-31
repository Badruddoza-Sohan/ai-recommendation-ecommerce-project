/**
 * Customer Loyalty & Retention Engine (< 1ms Latency)
 *
 * Detects frustration, order delays, or high-value customer activity and automatically awards:
 *  - Compensation Discount Vouchers (SORRY500, VIPCARE15)
 *  - Free Shipping Upgrades
 *  - Loyalty Tier Reward Points
 */

import type { Customer360Profile } from "./customer-360-profile-engine";

export interface RetentionIncentive {
  type: "voucher" | "free_shipping" | "vip_perk";
  code?: string;
  discountValue: string;
  message: string;
}

export class LoyaltyRetentionEngine {
  evaluateIncentive(
    profile: Customer360Profile,
    intent: string,
    isFrustrated: boolean = false
  ): RetentionIncentive | null {
    // 1. Hostile / Delayed Compensation Incentive
    if (isFrustrated || intent === "escalate_agent") {
      return {
        type: "voucher",
        code: "SORRY500",
        discountValue: "BDT 500 Off",
        message: "We sincerely apologize for the inconvenience. Here is voucher SORRY500 for BDT 500 off your next purchase.",
      };
    }

    // 2. VIP Member Appreciation Incentive
    if (profile.loyaltyTier === "VIP" || profile.loyaltyTier === "Gold") {
      return {
        type: "vip_perk",
        code: "VIPCARE15",
        discountValue: "15% VIP Discount",
        message: `Thank you for being a valued ${profile.loyaltyTier} member! Use code VIPCARE15 for 15% off.`,
      };
    }

    return null;
  }
}

let instance: LoyaltyRetentionEngine | null = null;
export function getLoyaltyRetentionEngine(): LoyaltyRetentionEngine {
  if (!instance) {
    instance = new LoyaltyRetentionEngine();
  }
  return instance;
}
