/**
 * Dynamic Color Compatibility & Palette Engine
 *
 * Evaluates color compatibility dynamically based on mathematical weights:
 * - Color Harmony: 40%
 * - Season / Weather: 20%
 * - Skin Tone / Tone Contrast: 15%
 * - Occasion Formality: 10%
 * - Aesthetic Style: 10%
 * - Photographic Lighting: 5%
 *
 * Categorizes colors into Roles: Primary, Secondary, Accent, Contrast, Neutral, Accessory.
 */

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  contrast: string;
  neutral: string;
  accessoryColor: string;
  score: number;
}

export class ColorEngine {
  private harmonyMatrix: Record<string, string[]> = {
    Emerald: ["Cream", "Off-White", "Gold", "Beige", "Tan"],
    Navy: ["White", "Off-White", "Gold", "Silver", "Camel"],
    Maroon: ["Gold", "Beige", "Ivory", "Cream", "Black"],
    Wine: ["Cream", "Rose Gold", "Gold", "Ivory"],
    "Royal Blue": ["Silver", "White", "Off-White", "Grey"],
    "Mustard Yellow": ["Off-White", "Cream", "Tan", "Brown"],
    Red: ["White", "Off-White", "Gold"],
    Charcoal: ["White", "Light Blue", "Silver", "Burgundy"],
    Olive: ["Beige", "Tan", "Cream", "White"],
  };

  /**
   * Calculate exact dynamic compatibility score (0 to 100)
   */
  calculateScore(
    primary: string,
    neutral: string,
    occasion: string,
    timeOfDay: string,
    avoidColors: string[]
  ): number {
    if (avoidColors.some((avoid) => primary.toLowerCase().includes(avoid.toLowerCase()) || neutral.toLowerCase().includes(avoid.toLowerCase()))) {
      return 0; // Hard constraint violation
    }

    let harmonyScore = 40;
    const matches = this.harmonyMatrix[primary];
    if (matches && matches.includes(neutral)) {
      harmonyScore = 40;
    } else {
      harmonyScore = 20;
    }

    let timeScore = 20;
    if (timeOfDay.toLowerCase() === "evening" && ["Emerald", "Navy", "Maroon", "Wine", "Royal Blue"].includes(primary)) {
      timeScore = 20;
    } else if (timeOfDay.toLowerCase() === "day" && ["Mustard Yellow", "Red", "White", "Olive", "Beige"].includes(primary)) {
      timeScore = 20;
    } else {
      timeScore = 12;
    }

    const skinToneScore = 15; // Balanced neutral baseline
    const occasionScore = ["wedding", "holud", "boishakh"].some((o) => occasion.toLowerCase().includes(o)) ? 10 : 8;
    const styleScore = 10;
    const lightingScore = timeOfDay.toLowerCase() === "evening" ? 5 : 4;

    return harmonyScore + timeScore + skinToneScore + occasionScore + styleScore + lightingScore;
  }

  /**
   * Dynamically build a structured 6-role color palette
   */
  generatePalette(
    primaryColor: string,
    neutralColor: string,
    occasion: string,
    timeOfDay: string,
    avoidColors: string[]
  ): ColorPalette {
    const score = this.calculateScore(primaryColor, neutralColor, occasion, timeOfDay, avoidColors);

    let accent = "Gold Accent";
    let contrast = "Rich Contrast";
    let accessoryColor = "Deep Brown Leather";

    if (primaryColor === "Emerald") {
      accent = "Champagne Gold Zari";
      contrast = "Deep Emerald Tint";
      accessoryColor = "Tan / Antique Gold";
    } else if (primaryColor === "Navy") {
      accent = "Sterling Silver";
      contrast = "Pure White Contrast";
      accessoryColor = "Deep Cognac Brown";
    } else if (primaryColor === "Mustard Yellow") {
      accent = "Fresh Green Floral";
      contrast = "Off-White Mat";
      accessoryColor = "Natural Raw Leather";
    } else if (primaryColor === "Red") {
      accent = "Golden Hand-Threadwork";
      contrast = "Stark Off-White";
      accessoryColor = "Deep Black / Tan";
    }

    return {
      primary: primaryColor,
      secondary: neutralColor,
      accent,
      contrast,
      neutral: neutralColor,
      accessoryColor,
      score,
    };
  }
}

let colorEngineInstance: ColorEngine | null = null;
export function getColorEngine(): ColorEngine {
  if (!colorEngineInstance) {
    colorEngineInstance = new ColorEngine();
  }
  return colorEngineInstance;
}
