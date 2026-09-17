/**
 * Deterministic Policy Engine (0% Hallucinations)
 *
 * Provides exact, authoritative e-commerce policy answers directly from structured rules.
 * Eliminates LLM hallucinated return periods, fake refund timelines, and incorrect COD policies.
 */

export interface PolicyRule {
  category: "return" | "refund" | "shipping" | "warranty" | "cod" | "general";
  title: string;
  summary: string;
  details: string[];
  banglaSummary: string;
}

const POLICY_DATASET: Record<string, PolicyRule> = {
  return: {
    category: "return",
    title: "MarketVerse Return Policy",
    summary: "Items can be returned within 7 days of delivery with free doorstep pickup.",
    details: [
      "7-Day Window: Return request must be submitted within 7 days of receipt.",
      "Condition: Product must be unworn, unwashed, and in original packaging with tags intact.",
      "Free Pickup: Doorstep courier pickup is free across Bangladesh.",
      "Exclusions: Undergarments, personalized custom items, and unsealed cosmetics are non-returnable for hygiene reasons.",
    ],
    banglaSummary: "পণ্য ডেলিভারির ৭ দিনের মধ্যে বিনামূল্যে রিটার্ন করা যাবে।",
  },

  refund: {
    category: "refund",
    title: "MarketVerse Refund Policy",
    summary: "Refunds are processed within 3-5 business days directly to your original payment channel.",
    details: [
      "bKash / Nagad / Rocket: Refund credited within 24-48 hours after return verification.",
      "Credit / Debit Cards: Refund processed within 3-5 business days.",
      "Cash on Delivery Orders: Refund disbursed via bKash or Bank Transfer upon return approval.",
    ],
    banglaSummary: "রিফান্ড ৩-৫ কর্মদিবসের মধ্যে আপনার মূল পেমেন্ট মাধ্যমে জমা হবে।",
  },

  shipping: {
    category: "shipping",
    title: "Shipping & Delivery Charges",
    summary: "Free shipping on orders over BDT 5,000. Standard shipping fee is BDT 120.",
    details: [
      "Free Delivery: Automatic free shipping applied on cart totals exceeding BDT 5,000.",
      "Dhaka Metro Delivery: 24 to 48 hours via fast courier dispatch.",
      "Outside Dhaka: 3 to 5 business days nationwide.",
    ],
    banglaSummary: "৫,০০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি। ঢাকা সিটিতে ২৪-৪৮ ঘণ্টার মধ্যে ডেলিভারি।",
  },

  warranty: {
    category: "warranty",
    title: "Electronic Brand Warranty Policy",
    summary: "Official electronics include a 1-year brand warranty with authorized service center support.",
    details: [
      "1-Year Coverage: Covers manufacturing defects and internal hardware malfunctions.",
      "Service Center: Free repair and component replacement at official Dhaka/Chittagong service centers.",
    ],
    banglaSummary: "ইলেকট্রনিক্স পণ্যে ১ বছরের অফিশিয়াল ওয়ারেন্টি ও ফ্রি সার্ভিস অন্তর্ভুক্ত।",
  },

  cod: {
    category: "cod",
    title: "Cash on Delivery (COD) Policy",
    summary: "Cash on Delivery is available nationwide across Bangladesh up to BDT 50,000.",
    details: [
      "Nationwide COD: Available in all 64 districts.",
      "Order Limit: Maximum BDT 50,000 per COD order.",
      "Inspection: Customers may inspect packaging condition before making payment.",
    ],
    banglaSummary: "সারাদেশে সর্বোচ্চ ৫০,০০০ টাকা পর্যন্ত ক্যাশ অন ডেলিভারি প্রযোজ্য।",
  },

  payment: {
    category: "refund",
    title: "Accepted Payment Methods & Refunds",
    summary: "We accept bKash, Nagad, Rocket, Credit/Debit Cards, and Cash on Delivery (COD).",
    details: [
      "Mobile Banking: Instant payment via bKash, Nagad, and Rocket.",
      "Cards: Visa, MasterCard, and AMEX accepted.",
      "Cash on Delivery: Pay cash upon order delivery up to BDT 50,000.",
    ],
    banglaSummary: "বিকাশ, নগদ, রকেট, কার্ড এবং ক্যাশ অন ডেলিভারি গ্রহণযোগ্য।",
  },
};

export class DeterministicPolicyEngine {
  getPolicy(query: string, _language: "English" | "Bangla" | "Banglish" = "English"): PolicyRule | null {
    const lower = query.toLowerCase();

    if (lower.includes("return") || lower.includes("riturn") || lower.includes("send back")) {
      return POLICY_DATASET.return;
    }
    if (lower.includes("refund") || lower.includes("money back") || lower.includes("taka ferot")) {
      return POLICY_DATASET.refund;
    }
    if (lower.includes("shipping") || lower.includes("delivery charge") || lower.includes("courier fee") || lower.includes("free shipping")) {
      return POLICY_DATASET.shipping;
    }
    if (lower.includes("warranty") || lower.includes("guarantee") || lower.includes("service center")) {
      return POLICY_DATASET.warranty;
    }
    if (lower.includes("payment") || lower.includes("pay") || lower.includes("bkash") || lower.includes("nagad") || lower.includes("card")) {
      return POLICY_DATASET.payment;
    }
    if (lower.includes("cod") || lower.includes("cash on delivery") || lower.includes("cash delivery")) {
      return POLICY_DATASET.cod;
    }

    return null;
  }
}

let instance: DeterministicPolicyEngine | null = null;
export function getDeterministicPolicyEngine(): DeterministicPolicyEngine {
  if (!instance) {
    instance = new DeterministicPolicyEngine();
  }
  return instance;
}
