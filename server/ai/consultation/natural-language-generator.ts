/**
 * Luxury Boutique Natural Language Generator (NLG) & Stylist Persona Layer
 *
 * Formats fashion recommendations into short, elegant, conversational responses
 * that feel like chatting with an experienced luxury fashion consultant in a premium boutique.
 */

import { DynamicLook } from "./dynamic-outfit-engine";
import { StylistSessionState } from "../memory/stylist-state-manager";
import { FollowupAction } from "../memory/followup-resolver";

export class NaturalLanguageGenerator {
  /**
   * Generates a clean, short, luxury boutique styling dialogue
   */
  generateBoutiqueDialogue(
    state: StylistSessionState,
    looks: DynamicLook[],
    action: FollowupAction = "none"
  ): string {
    const mainLook = looks[0];

    // Handle targeted single item modification ("I don't like brown", "change shoes", "change top")
    if (action === "change_shoes") {
      const topName = mainLook?.top?.name || "panjabi";
      const footwearName = mainLook?.footwear?.name || "Black Leather Loafers";
      return (
        `Sure! Let's keep everything else.\n\n` +
        `👞 ${footwearName}\n\n` +
        `They'll pair beautifully with the ${topName.toLowerCase()} while giving the outfit a cleaner modern finish.`
      );
    }

    if (action === "change_shirt_only") {
      const topName = mainLook?.top?.name || "Fine Silk Panjabi";
      return (
        `Sure! Let's keep everything else.\n\n` +
        `👕 ${topName}\n\n` +
        `This brings a fresh visual focal point while keeping the rest of your look perfectly balanced.`
      );
    }

    // Handle Premium Upgrade
    if (action === "increase_formality") {
      return this.generatePremiumDialogue(mainLook);
    }

    // Handle Cheaper / Budget Option
    if (action === "make_cheaper") {
      return this.generateCheaperDialogue(mainLook);
    }

    // Handle Color Palette Variation
    if (action === "change_colors") {
      return this.generateColorVariationDialogue(looks);
    }

    // Standard Main Recommendation / "Another Option"
    return this.generateMainRecommendationDialogue(state, looks, action === "request_another_option");
  }

  /**
   * Direct color pairing guidance for general color questions (e.g. "What pairs with Navy Blue?")
   */
  generateColorPairingAdvice(colorName: string): string {
    const color = colorName.charAt(0).toUpperCase() + colorName.slice(1).toLowerCase();
    return (
      `✨ ${color} is extremely versatile! Here are the best pairing options:\n\n` +
      `• Crisp White / Cream (Classic & Refined Contrast)\n` +
      `• Tan / Cognac Leather (Warm Sophisticated Contrast)\n` +
      `• Deep Wine / Plum (Rich Evening Look)\n` +
      `• Charcoal or Olive (Balanced Modern Tone)\n\n` +
      `✨ Styling tip\n\n` +
      `Pair a ${color.toLowerCase()} top with cream or white bottoms for a clean, sharp look that transitions effortlessly between daytime and evening events.`
    );
  }

  /**
   * Primary recommendation format (Sub-12 lines, clean, beautiful, friendly, confident)
   */
  private generateMainRecommendationDialogue(
    state: StylistSessionState,
    looks: DynamicLook[],
    isAnotherOption: boolean
  ): string {
    const mainLook = looks[0];
    const occasion = (state.occasion || "wedding").toLowerCase();
    const primaryColor = mainLook.palette.primary;
    const secondaryColor = mainLook.palette.secondary;
    const topMaterial = mainLook.top.material;

    const opening = isAnotherOption
      ? `✨ Here is another distinct look for you:`
      : `✨ I'd recommend this look for you:`;

    // 2-sentence rationale under "Why it works"
    const rationale = `The ${primaryColor.toLowerCase()} and ${secondaryColor.toLowerCase()} combination looks elegant for a ${occasion} without being too flashy. The ${topMaterial.toLowerCase()} fabric gives a premium look while staying comfortable throughout the event.`;

    // Color bullets (3 alternatives)
    const colorBullets = looks.slice(1, 4).map(
      (alt) => `• ${alt.palette.primary} + ${alt.palette.secondary}`
    );
    if (colorBullets.length < 3) {
      const fallbacks = ["• Navy + White", "• Wine + Cream", "• Olive + Beige"];
      for (const fb of fallbacks) {
        if (colorBullets.length < 3 && !colorBullets.includes(fb)) {
          colorBullets.push(fb);
        }
      }
    }

    return (
      `${opening}\n\n` +
      `👕 ${mainLook.top.name}\n\n` +
      `👖 ${mainLook.bottom.name}\n\n` +
      `👞 ${mainLook.footwear.name}\n\n` +
      `⌚ ${mainLook.watch.name}\n\n` +
      `✨ Why it works\n\n` +
      `${rationale}\n\n` +
      `Other colours you might like:\n\n` +
      `${colorBullets.join("\n")}\n\n` +
      `What would you like to change?`
    );
  }

  /**
   * Premium upgraded look template
   */
  private generatePremiumDialogue(mainLook: DynamicLook): string {
    const topMaterial = mainLook.top.material;

    return (
      `✨ Here is the upgraded premium look:\n\n` +
      `👕 ${mainLook.top.name}\n\n` +
      `👖 ${mainLook.bottom.name}\n\n` +
      `👞 ${mainLook.footwear.name}\n\n` +
      `⌚ ${mainLook.watch.name}\n\n` +
      `✨ Why it works\n\n` +
      `Pure ${topMaterial.toLowerCase()} and handcrafted leather elevate the outfit's texture under venue lighting, creating an unmistakable luxury presence while maintaining full comfort.\n\n` +
      `What would you like to change?`
    );
  }

  /**
   * Budget-conscious option template
   */
  private generateCheaperDialogue(mainLook: DynamicLook): string {
    return (
      `✨ Here is a budget-friendly option for you:\n\n` +
      `👕 ${mainLook.top.name}\n\n` +
      `👖 ${mainLook.bottom.name}\n\n` +
      `👞 ${mainLook.footwear.name}\n\n` +
      `⌚ ${mainLook.watch.name}\n\n` +
      `✨ Why it works\n\n` +
      `High-quality cotton provides the same rich silhouette and elegant color contrast while remaining accessible and lightweight.\n\n` +
      `What would you like to change?`
    );
  }

  /**
   * Palette variation template
   */
  private generateColorVariationDialogue(looks: DynamicLook[]): string {
    const mainLook = looks[0];

    const colorBullets = looks.slice(1, 4).map(
      (alt) => `• ${alt.palette.primary} + ${alt.palette.secondary}`
    );
    if (colorBullets.length < 3) {
      colorBullets.push("• Emerald + Cream", "• Wine + Cream", "• Olive + Beige");
    }

    return (
      `✨ Here is the look in a fresh color palette:\n\n` +
      `👕 ${mainLook.top.name}\n\n` +
      `👖 ${mainLook.bottom.name}\n\n` +
      `👞 ${mainLook.footwear.name}\n\n` +
      `⌚ ${mainLook.watch.name}\n\n` +
      `✨ Why it works\n\n` +
      `${mainLook.palette.primary} and ${mainLook.palette.secondary} create a timeless, sophisticated contrast that looks exceptionally sharp under event lighting.\n\n` +
      `Other colours you might like:\n\n` +
      `${colorBullets.join("\n")}\n\n` +
      `What would you like to change?`
    );
  }
}

let nlgInstance: NaturalLanguageGenerator | null = null;
export function getNaturalLanguageGenerator(): NaturalLanguageGenerator {
  if (!nlgInstance) {
    nlgInstance = new NaturalLanguageGenerator();
  }
  return nlgInstance;
}
