/**
 * Slot Completion Engine & Consultation Gate
 *
 * Enforces a mandatory, code-level Consultation Gate in the AI Fashion Stylist pipeline.
 * Ensures the chatbot NEVER generates product recommendations when required occasion
 * slots are missing, conducting a structured 1-question-at-a-time guided consultation instead.
 */

import type { StylistSessionState } from "../memory/stylist-state-manager.ts";

export interface RequiredSlotDefinition {
  slotKey: string;
  name: string;
  question: string;
  options: string[];
}

export interface OccasionSlotMatrix {
  occasion: string;
  requiredSlots: RequiredSlotDefinition[];
}

export interface SlotCheckResult {
  isComplete: boolean;
  missingSlot?: RequiredSlotDefinition;
  probingQuestion?: string;
}

/**
 * Occasion Slot Matrix Definitions
 */
const OCCASION_MATRICES: Record<string, RequiredSlotDefinition[]> = {
  "Wedding Ceremony": [
    {
      slotKey: "event_role",
      name: "Role",
      question: "That sounds exciting! I'd love to help with your wedding look. Are you attending as:",
      options: ["Groom", "Family Member", "Guest"],
    },
  ],

  "Wedding Reception": [
    {
      slotKey: "event_role",
      name: "Role",
      question: "A wedding reception is a fantastic occasion! Are you attending as:",
      options: ["Groom", "Family Member", "Guest"],
    },
  ],

  "Holud": [
    {
      slotKey: "style",
      name: "Style Preference",
      question: "Gaye Holud celebrations are vibrant and festive! Do you prefer a:",
      options: ["Traditional Panjabi & Pajama", "Modern Yellow / Mustard Fusion"],
    },
  ],

  "University": [
    {
      slotKey: "event_role",
      name: "University Event Type",
      question: "Is this for a formal university presentation or regular daily campus wear?",
      options: ["Formal Presentation / Defense", "Regular Daily Campus Casual"],
    },
  ],

  "Office": [
    {
      slotKey: "style",
      name: "Workplace Dress Code",
      question: "What is your workplace dress code environment?",
      options: ["Business Formal (Suit / Blazer)", "Smart Casual (Oxford Shirt & Chinos)"],
    },
  ],

  "Interview": [
    {
      slotKey: "event_role",
      name: "Industry Sector",
      question: "Which industry is your job interview in?",
      options: ["Corporate / Banking / MNC", "Tech / Creative Startup / Agency"],
    },
  ],

  "Pohela Boishakh": [],
  "Eid ul-Fitr": [],
  "Gym / Workout": [],
  "Casual / Date Night": [],
};

// Generic Fallback Matrix for any unspecified occasion
const GENERIC_OCCASION_MATRIX: RequiredSlotDefinition[] = [
  {
    slotKey: "event_role",
    name: "Role or Vibe",
    question: "I'd love to help style you! Could you clarify your role or vibe for this event?",
    options: ["Formal Guest / Host", "Casual Participant", "VIP / Highlighted Person"],
  },
  {
    slotKey: "budget",
    name: "Budget",
    question: "What budget range should we target for your outfit?",
    options: ["Budget Friendly (< 5,000 BDT)", "Mid-Range (5,000 - 12,000 BDT)", "Premium / Luxury (> 12,000 BDT)"],
  },
];

export class SlotCompletionEngine {
  /**
   * Evaluates session state against occasion slot requirements.
   * If any required slot is missing, returns the EXACT 1 probing question to present.
   */
  evaluateSlots(state: StylistSessionState): SlotCheckResult {
    console.log(`[RUNTIME-TRACE] [SlotCompletionEngine] ENTER evaluateSlots for session: ${state.sessionId}`);
    
    // Dynamic Q&A: If the user owns a shirt and wants a pant
    const hasShirt = state.owned_items?.some(i => i.toLowerCase().includes("shirt"));
    const wantsPant = state.locked_items?.some(i => i.toLowerCase().includes("pant")) || state.style?.toLowerCase().includes("pant"); // we might need target items from query
    
    // Check if we need to dynamically inject target-item based slots
    // To do this properly, we should actually rely on the query understanding's `targetItems` which isn't fully passed in state, but wait, `StylistSessionState` tracks this.
    // Let's modify the generic occasion flow to still trigger occasion first, but if occasion is set, we move to dynamic rules.

    if (!state.occasion) {
      console.log(`[RUNTIME-TRACE] [SlotCompletionEngine] Missing Slot: Occasion -> Returning Probing Question`);
      return {
        isComplete: false,
        probingQuestion: this.formatQuestion({
          slotKey: "occasion",
          name: "Occasion",
          question: "I'd be happy to help style you! What occasion or event are you dressing for?",
          options: ["Wedding / Reception / Holud", "Office / Job Interview", "University / Campus", "Festive (Pohela Boishakh / Eid)", "Casual / Date Night"],
        }),
      };
    }

    const normalizedOccasion = this.normalizeOccasion(state.occasion);
    const requiredSlots = OCCASION_MATRICES[normalizedOccasion] || GENERIC_OCCASION_MATRIX;

    for (const slotDef of requiredSlots) {
      const value = this.getSlotValue(state, slotDef.slotKey);
      if (!value) {
        console.log(`[RUNTIME-TRACE] [SlotCompletionEngine] Missing Slot: ${slotDef.name} (${slotDef.slotKey}) -> Returning Probing Question`);
        return {
          isComplete: false,
          missingSlot: slotDef,
          probingQuestion: this.formatQuestion(slotDef),
        };
      }
    }

    console.log(`[RUNTIME-TRACE] [SlotCompletionEngine] ALL REQUIRED SLOTS COMPLETE! Proceeding to Recommendation Engine.`);
    return { isComplete: true };
  }

  private normalizeOccasion(raw: string): string {
    const lower = raw.toLowerCase();
    if (lower.includes("gym") || lower.includes("workout") || lower.includes("fitness")) return "Gym / Workout";
    if (lower.includes("casual") || lower.includes("date night")) return "Casual / Date Night";
    if (lower.includes("holud")) return "Holud";
    if (lower.includes("reception") || lower.includes("walima")) return "Wedding Reception";
    if (lower.includes("wedding") || lower.includes("akd") || lower.includes("mehendi") || lower.includes("ceremony")) return "Wedding Ceremony";
    if (lower.includes("university") || lower.includes("campus") || lower.includes("class")) return "University";
    if (lower.includes("office") || lower.includes("work")) return "Office";
    if (lower.includes("interview")) return "Interview";
    if (lower.includes("pohela boishakh") || lower.includes("boishakh")) return "Pohela Boishakh";
    return raw;
  }

  private getSlotValue(state: StylistSessionState, slotKey: string): string | undefined {
    if (slotKey === "event_role") return state.event_details || state.event_role;
    if (slotKey === "event_time") return state.event_time;
    if (slotKey === "event_setting") return state.event_setting;
    if (slotKey === "style") return state.style;
    if (slotKey === "budget") return state.price_constraint || state.budget;
    return undefined;
  }

  private formatQuestion(slotDef: RequiredSlotDefinition): string {
    const optionBullets = slotDef.options.map((opt) => `• ${opt}`).join("\n");
    return `${slotDef.question}\n\n${optionBullets}`;
  }
}

let instance: SlotCompletionEngine | null = null;
export function getSlotCompletionEngine(): SlotCompletionEngine {
  if (!instance) {
    instance = new SlotCompletionEngine();
  }
  return instance;
}
