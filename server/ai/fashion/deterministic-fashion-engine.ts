/**
 * Deterministic Fashion Decision Engine
 *
 * The central brain that replaces ALL LLM decision-making for fashion.
 * Reads user session state, consults the Fashion Knowledge Base, applies
 * deterministic rules, and outputs a structured JSON recommendation.
 *
 * The LLM NEVER decides colors, fabrics, combinations, or scores.
 * It only receives this JSON and paraphrases it into natural language.
 *
 * Performance target: < 20ms
 */

import {
  OCCASION_CLOTHING,
  FABRIC_RULES,
  STYLE_DNA,
  ALTERNATIVE_PALETTES,
  ACCESSORY_RULES,
  getCurrentSeason,
  pickBestColor,
  pickComplementaryColor,
} from "./fashion-knowledge.ts";

import type { OccasionRules } from "./fashion-knowledge.ts";
import type { StylistSessionState } from "../memory/stylist-state-manager.ts";
import type { ContextualModifier } from "../memory/followup-resolver.ts";

// ─── Output Interface ─────────────────────────────────────────────────────────

export interface OutfitItem {
  name: string;
  color: string;
  fabric?: string;
  reason: string;
  productId?: string;
}

export interface FashionRecommendation {
  matchScore: number;
  occasion: string;
  queryType: "occasion_look" | "complete_outfit" | "color_match";

  look: {
    top: OutfitItem;
    bottom: OutfitItem;
    footwear: OutfitItem;
    accessories?: OutfitItem;
    optionalLayer?: OutfitItem;
    colorPalette: string;
  };

  reasoning: {
    color: string;
    fabric: string;
    weather: string;
  };

  tips: string[];
  avoid: string[];
  alternativePalettes: Array<{ colors: string; bestFor: string }>;
  followUpQuestion?: string;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class DeterministicFashionEngine {
  /** Track which palette index was last used per session for rotation */
  private paletteIndex = new Map<string, number>();

  /**
   * Generate a complete outfit recommendation deterministically.
   */
  async recommend(
    state: StylistSessionState,
    query: string,
    modifier: ContextualModifier
  ): Promise<FashionRecommendation> {
    const startTime = Date.now();

    // 1. Determine query type
    const queryType = this.classifyQueryType(query, state);
    let occasion = state.occasion || "Casual / Date Night";
    // Only default to Casual / Date Night if no active session occasion exists and the query doesn't mention an occasion
    if (queryType === "color_match" && !this.queryMentionsOccasion(query) && !state.occasion) {
      occasion = "Casual / Date Night";
    }
    const season = getCurrentSeason();

    // 2. Get occasion rules
    const rules = OCCASION_CLOTHING[occasion] || OCCASION_CLOTHING["Casual / Date Night"];

    // 3. Resolve colors
    const { topColor, bottomColor } = this.resolveColors(state, query, rules, modifier, occasion);

    // 4. Resolve fabrics
    const topFabric = this.resolveFabric(rules, season, state, modifier);
    const bottomFabric = this.resolveBottomFabric(rules, season, modifier);

    // 5. Resolve footwear color & style
    const footwearColor = this.resolveFootwearColor(topColor, bottomColor, rules.formality, rules.footwear);

    // 6. Build outfit items
    const topName = this.buildItemName(topColor, topFabric, rules.top);
    const bottomName = this.buildItemName(bottomColor, bottomFabric, rules.bottom);
    
    let footwearName = `${footwearColor} ${rules.footwear}`;
    if (modifier.action === "change_shoes") {
      if (occasion === "Gym / Workout" || rules.formality === "Athletic") {
        footwearName = footwearColor.toLowerCase().includes("black")
          ? "White Performance Cross-Trainers / Lightweight Running Shoes"
          : "Black High-Grip Training Shoes / Running Sneakers";
      } else if (rules.formality === "Traditional" || rules.formality === "Luxury") {
        footwearName = footwearColor.toLowerCase().includes("brown")
          ? "Black Embroidered Velvet Nagra / Mojari Shoes"
          : "Tan Leather Kolhapuri Sandals / Classic Loafers";
      } else {
        footwearName = footwearColor.toLowerCase().includes("white")
          ? "Tan Suede Loafers / Minimalist Leather Chelsea Boots"
          : "Clean Minimalist White Leather Sneakers / Canvas Low-Tops";
      }
    }

    // 7. Resolve accessories
    const accessoryList = ACCESSORY_RULES[rules.formality] || ACCESSORY_RULES["Casual"];
    const accessoryName = accessoryList[0] || "Minimal Watch";

    // 8. Generate reasoning
    const reasoning = this.generateReasoning(topColor, bottomColor, topFabric, season, occasion, rules);

    // 9. Generate tips & avoid
    const tips = this.generateTips(occasion, topFabric, rules.formality);
    const avoid = this.generateAvoid(occasion, rules.formality);

    // 10. Generate alternatives
    const alternatives = this.getAlternativePalettes(occasion, [topColor, bottomColor]);

    // 11. Calculate match score
    const matchScore = this.calculateMatchScore(state, topColor, occasion, season, topFabric);

    const elapsed = Date.now() - startTime;
    console.log(`[DeterministicFashionEngine] Recommendation generated in ${elapsed}ms`);

    return {
      matchScore,
      occasion,
      queryType,

      look: {
        top: {
          name: topName,
          color: topColor,
          fabric: topFabric,
          reason: reasoning.color,
        },
        bottom: {
          name: bottomName,
          color: bottomColor,
          fabric: bottomFabric,
          reason: `Creates a clean contrast with the ${topColor.toLowerCase()} top while keeping the silhouette balanced.`,
        },
        footwear: {
          name: footwearName,
          color: footwearColor,
          reason: `Comfortable and matches the ${topColor.toLowerCase()} + ${bottomColor.toLowerCase()} palette well.`,
        },
        accessories: {
          name: accessoryName,
          color: "",
          reason: `Completes the ${rules.formality.toLowerCase()} look without overwhelming it.`,
        },
        colorPalette: `${topColor} + ${bottomColor}`,
      },

      reasoning,
      tips,
      avoid,
      alternativePalettes: alternatives,
      followUpQuestion: this.generateFollowUpQuestion(modifier, occasion),
    };
  }

  // ── Private: Follow-up Question Generation ──────────────────────────────────
  private generateFollowUpQuestion(modifier: ContextualModifier, _occasion: string): string {
    const questions = [
      "Would you like a different color palette?",
      "Would you prefer a more premium fabric for this look?",
      "Should we look at different footwear options?",
      "Would you prefer something a bit more traditional?",
      "Does this fit your budget, or should we look at other options?"
    ];
    // Pick a random question to keep it conversational, or base it on modifier
    if (modifier.action === "increase_formality") return "How do you feel about this upgraded, premium look?";
    if (modifier.action === "request_another_option") return "Does this new color combination work better for you?";
    return questions[Math.floor(Math.random() * questions.length)];
  }

  // ── Private: Query Type Classification ──────────────────────────────────────

  private queryMentionsOccasion(query: string): boolean {
    const q = query.toLowerCase();
    const keywords = ["gym", "workout", "eid", "wedding", "holud", "reception", "office", "interview", "party", "university", "presentation"];
    return keywords.some(k => q.includes(k));
  }

  private classifyQueryType(query: string, state: StylistSessionState): "occasion_look" | "complete_outfit" | "color_match" {
    const q = query.toLowerCase();
    if (
      q.includes("pair") || q.includes("match") || q.includes("go with") ||
      q.includes("color") || q.includes("colour") || q.includes("i have") ||
      q.includes("already have") || q.includes("own a")
    ) {
      return "color_match";
    }
    if (state.occasion) return "occasion_look";
    return "complete_outfit";
  }

  // ── Private: Color Resolution ───────────────────────────────────────────────

  private extractAllColorsFromQuery(query: string): string[] {
    const q = query.toLowerCase();
    const colorKeywords: Array<{ keyword: string; canonical: string }> = [
      { keyword: "navy blue", canonical: "Navy" },
      { keyword: "light blue", canonical: "Light Blue" },
      { keyword: "royal blue", canonical: "Royal Blue" },
      { keyword: "dark blue", canonical: "Navy" },
      { keyword: "forest green", canonical: "Forest Green" },
      { keyword: "light pink", canonical: "Light Pink" },
      { keyword: "dusty pink", canonical: "Light Pink" },
      { keyword: "neon green", canonical: "Neon Green" },
      { keyword: "navy", canonical: "Navy" },
      { keyword: "white", canonical: "White" },
      { keyword: "black", canonical: "Black" },
      { keyword: "grey", canonical: "Grey" },
      { keyword: "gray", canonical: "Grey" },
      { keyword: "red", canonical: "Red" },
      { keyword: "maroon", canonical: "Maroon" },
      { keyword: "burgundy", canonical: "Burgundy" },
      { keyword: "emerald", canonical: "Emerald" },
      { keyword: "olive", canonical: "Olive" },
      { keyword: "mint", canonical: "Mint" },
      { keyword: "teal", canonical: "Teal" },
      { keyword: "sage", canonical: "Sage" },
      { keyword: "pink", canonical: "Pink" },
      { keyword: "purple", canonical: "Purple" },
      { keyword: "lavender", canonical: "Lavender" },
      { keyword: "yellow", canonical: "Yellow" },
      { keyword: "mustard", canonical: "Mustard" },
      { keyword: "gold", canonical: "Gold" },
      { keyword: "orange", canonical: "Orange" },
      { keyword: "brown", canonical: "Brown" },
      { keyword: "cream", canonical: "Cream" },
      { keyword: "beige", canonical: "Beige" },
      { keyword: "charcoal", canonical: "Charcoal" },
      { keyword: "khaki", canonical: "Khaki" },
      { keyword: "coral", canonical: "Coral" },
      { keyword: "silver", canonical: "Silver" },
      { keyword: "tan", canonical: "Tan" },
      { keyword: "blue", canonical: "Navy" },
      { keyword: "green", canonical: "Emerald" },
    ];

    const found: string[] = [];
    let remaining = q;
    for (const { keyword, canonical } of colorKeywords) {
      if (remaining.includes(keyword)) {
        if (!found.includes(canonical)) {
          found.push(canonical);
        }
        remaining = remaining.replace(new RegExp(keyword, "g"), "");
      }
    }
    return found;
  }

  private resolveColors(
    state: StylistSessionState,
    query: string,
    rules: OccasionRules,
    modifier: ContextualModifier,
    occasion: string
  ): { topColor: string; bottomColor: string } {
    const avoid = state.avoid_colors.map(c => c.toLowerCase());
    const extractedColors = this.extractAllColorsFromQuery(query);

    // Case 1: User mentions 2 or more colors (e.g. "What pairs with Navy pink?", "black and gold", "pink shirt navy pants")
    if (extractedColors.length >= 2) {
      const bottomKeywords = ["pant", "jeans", "chino", "trouser", "pajama", "bottom", "short"];
      const isFirstColorBottom = bottomKeywords.some(bk => query.toLowerCase().includes(`${extractedColors[0].toLowerCase()} ${bk}`));
      if (isFirstColorBottom) {
        return { topColor: extractedColors[1], bottomColor: extractedColors[0] };
      }
      return { topColor: extractedColors[0], bottomColor: extractedColors[1] };
    }

    // Case 2: User specifies 1 color ("What pairs with Navy Blue?", "yellow shirt", "black pants")
    if (extractedColors.length === 1) {
      const specifiedColor = extractedColors[0];
      const bottomKeywords = ["pant", "jeans", "chino", "trouser", "pajama", "bottom", "short"];
      const isBottom = bottomKeywords.some(bk => query.toLowerCase().includes(bk));
      if (isBottom) {
        const topColor = pickComplementaryColor(specifiedColor, state.avoid_colors);
        return { topColor, bottomColor: specifiedColor };
      } else {
        const bottomColor = pickComplementaryColor(specifiedColor, state.avoid_colors);
        return { topColor: specifiedColor, bottomColor };
      }
    }

    // Case 3: Follow-up "show another option" → rotate palette
    if (modifier.action === "request_another_option" || modifier.action === "change_colors") {
      const palettes = ALTERNATIVE_PALETTES[occasion] || ALTERNATIVE_PALETTES["Casual / Date Night"];
      const idx = (this.paletteIndex.get(state.sessionId) || 0) + 1;
      this.paletteIndex.set(state.sessionId, idx);
      const palette = palettes[idx % palettes.length];
      return { topColor: palette[0], bottomColor: palette[1] };
    }

    // Case 4: Follow-up "make it more premium" → richer colors
    if (modifier.action === "increase_formality") {
      const luxuryColors = ["Emerald", "Burgundy", "Navy", "Royal Blue", "Maroon"];
      const topColor = pickBestColor(luxuryColors, state.preferred_colors, state.avoid_colors);
      const bottomColor = pickComplementaryColor(topColor, state.avoid_colors);
      return { topColor, bottomColor };
    }

    // Case 5: Style DNA filter
    const styleProfile = state.style ? STYLE_DNA[state.style] : null;
    const colorPool = styleProfile
      ? styleProfile.colors.filter(c => !avoid.includes(c.toLowerCase()))
      : rules.defaultColors.filter(c => !avoid.includes(c.toLowerCase()));

    const topColor = pickBestColor(colorPool, state.preferred_colors, state.avoid_colors);
    const bottomColor = pickComplementaryColor(topColor, state.avoid_colors);

    return { topColor, bottomColor };
  }

  // ── Private: Fabric Resolution ──────────────────────────────────────────────

  private resolveFabric(rules: OccasionRules, season: string, _state: StylistSessionState, modifier: ContextualModifier): string {
    const seasonRules = FABRIC_RULES[season] || FABRIC_RULES["Summer"];

    if (modifier.action === "increase_formality") {
      if (rules.formality === "Athletic") return "High-Grade Performance Blend";
      if (rules.formality === "Traditional") return "Premium Silk";
      if (rules.formality === "Business Formal" || rules.formality === "Luxury") return "Egyptian Cotton";
      return "Premium Cotton";
    }

    // Find intersection of occasion defaults and season preferences
    for (const fabric of rules.defaultFabrics) {
      if (seasonRules.preferred.some(f => fabric.toLowerCase().includes(f.toLowerCase()))) {
        return fabric;
      }
    }
    // Fallback to occasion default
    return rules.defaultFabrics[0] || "Cotton";
  }

  private resolveBottomFabric(rules: OccasionRules, _season: string, modifier: ContextualModifier): string {
    const mapping: Record<string, string> = {
      "Athletic": "Polyester Blend",
      "Casual": "Cotton",
      "Smart Casual": "Cotton Chino",
      "Business Formal": "Wool Blend",
      "Traditional": "Cotton",
      "Luxury": "Silk",
    };
    
    if (modifier.action === "increase_formality") {
      if (rules.formality === "Athletic") return "Premium Performance Blend";
      if (rules.formality === "Business Formal" || rules.formality === "Luxury") return "Premium Wool Blend";
      return "High-Quality Chino";
    }
    
    return mapping[rules.formality] || "Cotton";
  }

  // ── Private: Footwear Color ─────────────────────────────────────────────────

  private resolveFootwearColor(topColor: string, bottomColor: string, formality: string, footwearType: string): string {
    const isSneaker = footwearType.toLowerCase().includes("sneaker") || 
                      footwearType.toLowerCase().includes("trainer") || 
                      footwearType.toLowerCase().includes("canvas");

    if (formality === "Athletic" || isSneaker) {
      const darkOutfit = ["Black", "Navy", "Charcoal", "Dark"].some(c =>
        topColor.includes(c) || bottomColor.includes(c)
      );
      return darkOutfit ? "Black" : "White";
    }

    // Earth-tone footwear generally works best
    const darkOutfit = ["Black", "Navy", "Charcoal", "Dark"].some(c =>
      topColor.includes(c) || bottomColor.includes(c)
    );
    if (darkOutfit) return "Black Leather";

    const traditionalOutfit = ["Emerald", "Maroon", "Gold", "Cream", "White"].some(c =>
      topColor === c
    );
    if (traditionalOutfit) return "Brown Leather";

    return "Brown Leather";
  }

  // ── Private: Build Item Name ────────────────────────────────────────────────

  private buildItemName(color: string, fabric: string, category: string): string {
    // e.g., "Emerald Silk Panjabi" or "Navy Cotton Oxford Shirt"
    return `${color} ${fabric} ${category}`;
  }

  // ── Private: Reasoning Generation ───────────────────────────────────────────

  private generateReasoning(
    topColor: string,
    bottomColor: string,
    fabric: string,
    season: string,
    _occasion: string,
    rules: OccasionRules
  ): { color: string; fabric: string; weather: string } {
    const colorReasons: Record<string, string> = {
      "Emerald": "photographs beautifully under warm evening lighting",
      "Navy": "is a timeless classic that works across all formal settings",
      "White": "creates a clean, fresh canvas ideal for festive occasions",
      "Maroon": "exudes richness and warmth under indoor venue lighting",
      "Burgundy": "adds deep sophistication perfect for evening events",
      "Royal Blue": "commands attention while remaining elegant",
      "Black": "is universally sharp and endlessly versatile",
      "Cream": "brings a soft, understated elegance",
      "Teal": "offers a distinctive, modern take on tradition",
      "Charcoal": "provides a refined, contemporary alternative to black",
      "Olive": "gives a relaxed yet put-together appearance",
      "Yellow": "brings a vibrant, festive energy",
      "Mustard": "adds warmth and a touch of tradition",
      "Gold": "shines with opulent festive spirit",
      "Mint": "feels fresh and modern for lighter occasions",
      "Pink": "adds a confident, contemporary touch",
      "Light Pink": "creates a soft, approachable sophistication",
      "Light Blue": "keeps things clean, crisp, and professional",
      "Grey": "is effortlessly versatile and modern",
    };

    const weatherReasons: Record<string, string> = {
      "Summer": "Lightweight and breathable for Bangladesh's humid summer heat.",
      "Winter": "Provides warmth while maintaining a polished silhouette.",
      "Monsoon": "Quick-drying and resistant to moisture during the rainy season.",
      "Autumn": "Comfortable layering option for the transitional weather.",
    };

    if (rules.formality === "Athletic") {
      colorReasons["Navy"] = "is excellent for workout gear as it looks sharp and masks sweat";
      colorReasons["Black"] = "is the ultimate athletic color, looking sleek and hiding moisture";
      colorReasons["White"] = "keeps you looking fresh and reflects heat during outdoor workouts";
      colorReasons["Grey"] = "is a classic athletic staple that pairs with any sneaker";
      colorReasons["Blue"] = "brings a calm, focused energy to your workout";
      colorReasons["Red"] = "adds a high-energy pop of color to keep you motivated";
    }

    return {
      color: `${topColor} ${colorReasons[topColor] || "creates an elegant, well-balanced palette"}, paired with ${bottomColor.toLowerCase()} for contrast.`,
      fabric: `${fabric} ${rules.formality === "Luxury" ? "ensures a luxurious drape and sheen" : rules.formality === "Athletic" ? "offers maximum flexibility and moisture-wicking" : "remains comfortable and breathable throughout the day"}.`,
      weather: weatherReasons[season] || "Comfortable for the current season.",
    };
  }

  // ── Private: Tips & Avoid ───────────────────────────────────────────────────

  private generateTips(_occasion: string, fabric: string, formality: string): string[] {
    const tips: string[] = [];

    if (fabric.toLowerCase().includes("silk") || fabric.toLowerCase().includes("brocade")) {
      tips.push("Gently steam before wearing to preserve the natural luster");
    } else if (fabric.toLowerCase().includes("cotton")) {
      tips.push("Iron on medium heat for a crisp, polished finish");
    } else if (fabric.toLowerCase().includes("linen")) {
      tips.push("Embrace slight natural creasing — it's part of linen's charm");
    }

    if (formality === "Traditional" || formality === "Luxury") {
      tips.push("Keep accessories minimal to let the outfit speak");
      tips.push("Match your footwear tone with your belt or watch strap");
    } else if (formality === "Business Formal") {
      tips.push("Ensure your shirt collar is crisp and properly sized");
      tips.push("Match belt color with shoe color");
    } else if (formality === "Athletic") {
      tips.push("Choose moisture-wicking fabrics for maximum comfort");
      tips.push("Break in new shoes before a heavy workout session");
    } else {
      tips.push("Roll sleeves to elbow for a relaxed yet intentional look");
      tips.push("Keep one statement piece; let everything else be subtle");
    }

    return tips.slice(0, 3);
  }

  private generateAvoid(_occasion: string, formality: string): string[] {
    const avoidMap: Record<string, string[]> = {
      "Athletic": ["Cotton (absorbs sweat)", "Leather shoes", "Accessories that restrict movement"],
      "Casual": ["Over-accessorizing", "Heavy embroidery", "Formal ties"],
      "Smart Casual": ["Sports shoes", "Oversized fits", "Gym wear"],
      "Business Formal": ["Casual sneakers", "Denim", "Untucked shirts", "Loud patterns"],
      "Traditional": ["Western sneakers", "Denim", "Excessive gold embroidery for casual guests"],
      "Luxury": ["Casual footwear", "Synthetic fabrics", "Clashing metals (gold + silver)"],
    };

    return avoidMap[formality] || ["Clashing colors", "Over-accessorizing"];
  }

  // ── Private: Alternative Palettes ───────────────────────────────────────────

  private getAlternativePalettes(
    occasion: string,
    currentPalette: string[]
  ): Array<{ colors: string; bestFor: string }> {
    const palettes = ALTERNATIVE_PALETTES[occasion] || ALTERNATIVE_PALETTES["Casual / Date Night"];
    const bestForMap: Record<string, string> = {
      "Eid ul-Fitr": "festive celebrations",
      "Wedding Ceremony": "formal weddings",
      "Wedding Reception": "evening receptions under warm lighting",
      "Holud": "vibrant Holud ceremonies",
      "University": "campus wear",
      "Office / Corporate": "professional settings",
      "Casual / Date Night": "relaxed evening outings",
      "Gym / Workout": "active training sessions",
      "Party / Nightout": "evening parties",
    };

    return palettes
      .filter(p => !(p[0] === currentPalette[0] && p[1] === currentPalette[1]))
      .slice(0, 3)
      .map(p => ({
        colors: `${p[0]} + ${p[1]}`,
        bestFor: bestForMap[occasion] || "similar occasions",
      }));
  }

  // ── Private: Match Score Calculation ─────────────────────────────────────────

  private calculateMatchScore(
    state: StylistSessionState,
    topColor: string,
    occasion: string,
    season: string,
    fabric: string
  ): number {
    let score = 70; // Base score

    // +10 if color is in user's preferred list
    if (state.preferred_colors.some(c => c.toLowerCase() === topColor.toLowerCase())) {
      score += 10;
    }

    // +5 if occasion rules exist (well-defined occasion)
    if (OCCASION_CLOTHING[occasion]) {
      score += 8;
    }

    // +5 if fabric matches season
    const seasonRules = FABRIC_RULES[season];
    if (seasonRules && seasonRules.preferred.some(f => fabric.toLowerCase().includes(f.toLowerCase()))) {
      score += 7;
    }

    // +5 if style preference is set
    if (state.style) {
      score += 5;
    }

    // Cap at 99
    return Math.min(99, Math.round(score * 10) / 10);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _engine: DeterministicFashionEngine | null = null;

export function getDeterministicFashionEngine(): DeterministicFashionEngine {
  if (!_engine) {
    _engine = new DeterministicFashionEngine();
  }
  return _engine;
}
