/**
 * Fast Stylist Engine
 *
 * High-speed deterministic recommendation & response synthesizer.
 * Integrates Luxury Boutique Natural Language Generator (NLG) for human-like persona responses.
 */

import { getDynamicOutfitEngine, DynamicLook } from "./dynamic-outfit-engine";
import { getNaturalLanguageGenerator } from "./natural-language-generator";
import { getFollowupResolver } from "../memory/followup-resolver";
import type { StylistSessionState } from "../memory/stylist-state-manager";

export class FastStylistEngine {
  private dynamicEngine = getDynamicOutfitEngine();
  private nlg = getNaturalLanguageGenerator();
  private followupResolver = getFollowupResolver();

  /**
   * Synthesize a structured, luxury boutique fashion response using dynamic look composition and NLG persona.
   */
  synthesizeResponse(state: StylistSessionState, userQuery: string = ""): string {
    const qLower = userQuery.toLowerCase();

    // 1. Direct Color Pairing Guidance Check (e.g. "What pairs with Navy Blue?")
    const colorPairingMatch = qLower.match(/(?:what pairs with|what matches with|what goes with|how to pair|pair with)\s+([a-z\s]+)/i);
    if (colorPairingMatch && colorPairingMatch[1]) {
      const colorQuery = colorPairingMatch[1].replace(/\?|\./g, "").trim();
      return this.nlg.generateColorPairingAdvice(colorQuery);
    }

    // 2. Parse Follow-up Modifiers
    const modifier = this.followupResolver.parseFollowupQuery(userQuery);

    // Map state structure to StylistState for outfit generation
    const mappedState: any = {
      occasion: state.occasion || "wedding",
      eventRole: state.event_role || "guest",
      timeOfDay: state.event_time || "evening",
      stylePreference: state.style || "traditional",
      budgetRange: { min: 0, max: state.price_constraint?.includes("10,000") || state.price_constraint?.includes("5,000") ? 5000 : 15000 },
      preferredColors: state.preferred_colors || [],
      negativeConstraints: { avoidColors: state.avoid_colors || [] },
      ownedWardrobeItems: state.owned_items || [],
      lockedItemKeys: state.locked_items || [],
    };

    // Generate ranked looks dynamically
    const looks: DynamicLook[] = this.dynamicEngine.generateLooks(mappedState);

    // Transform into warm, human-like luxury boutique dialogue matching NLG target presentation format
    return this.nlg.generateBoutiqueDialogue(state, looks, modifier.action);
  }
}

let engineInstance: FastStylistEngine | null = null;
export function getFastStylistEngine(): FastStylistEngine {
  if (!engineInstance) {
    engineInstance = new FastStylistEngine();
  }
  return engineInstance;
}
