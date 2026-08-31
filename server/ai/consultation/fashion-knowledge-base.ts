/**
 * Structured Bangladeshi Fashion Knowledge Base
 *
 * Deterministic rules for Bangladeshi cultural events, color psychology,
 * fabric suitability, footwear pairing, and venue rationale.
 */

export interface OccasionRule {
  name: string;
  defaultColors: string[];
  avoidColors: string[];
  defaultStyle: string;
  recommendedFabrics: string[];
  footwear: string[];
  culturalNote: string;
  photoTip: string;
}

export const FASHION_KNOWLEDGE_BASE = {
  occasions: {
    "Wedding Ceremony": {
      name: "Wedding Ceremony",
      defaultColors: ["Navy", "Emerald", "Maroon", "Gold", "Cream"],
      avoidColors: ["Yellow"],
      defaultStyle: "Traditional",
      recommendedFabrics: ["Silk", "Jamdani", "Raw Silk", "Cotton Silk"],
      footwear: ["Handcrafted Brown Nagra Sandals", "Leather Loafers"],
      culturalNote: "Rich traditional attire respects the grandeur of Bangladeshi wedding ceremonies.",
      photoTip: "Deep jewel tones (Emerald, Navy, Maroon) pop under warm hall chandeliers and camera flashes.",
    },
    "Wedding Reception": {
      name: "Wedding Reception",
      defaultColors: ["Deep Navy", "Emerald Green", "Wine Maroon", "Royal Blue"],
      avoidColors: ["Casual Yellow"],
      defaultStyle: "Traditional",
      recommendedFabrics: ["Silk", "Velvet Trim Silk", "Micro-embroidered Cotton"],
      footwear: ["Handcrafted Leather Nagra Sandals", "Formal Oxford Shoes"],
      culturalNote: "Evening receptions allow for opulent embroidery and regal dark palettes.",
      photoTip: "Velvet or silk lapel detailing catches indoor venue lighting with subtle luxury.",
    },
    "Holud": {
      name: "Holud / Gaye Holud",
      defaultColors: ["Mustard Yellow", "Turmeric Yellow", "White", "Orange", "Green"],
      avoidColors: [],
      defaultStyle: "Traditional Festive",
      recommendedFabrics: ["Handloom Cotton", "Linen", "Block Print Cotton"],
      footwear: ["Tan Leather Nagra Sandals", "Slide Loafers"],
      culturalNote: "Mustard and floral accents celebrate the joyous turmeric ritual.",
      photoTip: "Bright yellows and fresh whites create vibrant, energetic photos during day/night Holud functions.",
    },
    "Pohela Boishakh": {
      name: "Pohela Boishakh",
      defaultColors: ["Red", "White", "Off-White", "Maroon"],
      avoidColors: ["Navy Blue"],
      defaultStyle: "Ethnic Heritage",
      recommendedFabrics: ["Handloom Block Print", "Taant Cotton", "Khadi"],
      footwear: ["Traditional Leather Nagra", "Khabar Sandal"],
      culturalNote: "Red & White symbolizes the Bengali New Year heritage and spirit.",
      photoTip: "White base with red block print creates timeless outdoor photography along Ramna Botomtola.",
    },
    "Eid ul-Fitr": {
      name: "Eid ul-Fitr",
      defaultColors: ["Pastel Green", "Cream", "Sky Blue", "White", "Olive"],
      avoidColors: [],
      defaultStyle: "Classic Festive",
      recommendedFabrics: ["Pima Cotton", "Jacquard Silk", "Fine Linen"],
      footwear: ["Classic Loafers", "Embroidered Nagra"],
      culturalNote: "Fresh, clean pastel tones align with morning Eid prayers and family visits.",
      photoTip: "Soft pastels keep you looking crisp and fresh through warm daytime family gatherings.",
    },
    "University": {
      name: "University / Campus",
      defaultColors: ["Navy", "Olive", "Black", "Denim Blue", "White"],
      avoidColors: ["Heavy Gold"],
      defaultStyle: "Smart Casual",
      recommendedFabrics: ["100% Breathable Cotton", "Linen-Blend", "Denim"],
      footwear: ["Clean White Canvas Sneakers", "Minimal Suede Loafers"],
      culturalNote: "Balanced, durable silhouettes suit campus walking and lectures.",
      photoTip: "Clean sneakers paired with fitted trousers project a sharp, modern academic look.",
    },
    "Office / Corporate": {
      name: "Office / Corporate",
      defaultColors: ["Charcoal", "Navy", "Oxford Blue", "White", "Beige"],
      avoidColors: ["Neon", "Vibrant Yellow"],
      defaultStyle: "Business Formal / Smart Casual",
      recommendedFabrics: ["Wrinkle-Resistant Cotton", "Fine Wool Blend"],
      footwear: ["Leather Derby Shoes", "Monk Strap Shoes"],
      culturalNote: "Tailored cuts project executive confidence in corporate MNC environments.",
      photoTip: "Matching belt leather with footwear finish creates a cohesive executive presence.",
    },
  } as Record<string, OccasionRule>,

  colorHarmonies: [
    {
      combo: "Emerald + Cream",
      note: "Best for evening weddings under warm hall lights",
    },
    {
      combo: "Navy + White",
      note: "Classic and timeless for any formal ceremony",
    },
    {
      combo: "Burgundy + Beige",
      note: "Warm and festive for nighttime receptions",
    },
    {
      combo: "Mustard + Off-White",
      note: "Vibrant and authentic for Gaye Holud rituals",
    },
    {
      combo: "Charcoal + Sky Blue",
      note: "Sharp and commanding for executive presentations",
    },
  ],

  stylistTips: [
    "✔ Steam your kurta or blazer before leaving to eliminate fold creases.",
    "✔ Match your footwear leather finish with your watch strap.",
    "✔ Keep fits tailored—avoid overly baggy or tight silhouettes.",
    "✔ Wear a subtle, long-lasting woody fragrance suitable for humid weather.",
    "✔ Keep accessories understated: a clean watch and minimal cufflinks speak volumes.",
  ],

  thingsToAvoid: [
    "✖ Avoid clashing footwear: never wear casual sports running shoes with traditional Panjabis.",
    "✖ Avoid excessive heavy gold embroidery when attending as a casual guest.",
  ],
};

// ==========================================
// NEW STRICT DETERMINISTIC RULES FROM KB
// ==========================================

export const SHIRT_TO_PANT_RULES: Record<string, { recommendedPantColors: string[], typicalUse: string }> = {
  "White": {
    recommendedPantColors: ["Black", "Navy", "Grey", "Beige", "Khaki"],
    typicalUse: "Formal, office, smart-casual"
  },
  "Light Blue": {
    recommendedPantColors: ["Navy", "Grey", "Black", "Beige", "Khaki"],
    typicalUse: "Office, business-casual, smart-casual"
  },
  "Navy": {
    recommendedPantColors: ["Grey", "Beige", "Khaki", "White", "Off-white"],
    typicalUse: "Office, smart-casual, evening"
  },
  "Black": {
    recommendedPantColors: ["Grey", "Charcoal", "Beige", "Cream", "Off-white"],
    typicalUse: "Evening, smart-casual"
  },
  "Grey": {
    recommendedPantColors: ["Black", "Navy", "Charcoal"],
    typicalUse: "Office, formal, smart-casual"
  },
  "Beige": {
    recommendedPantColors: ["Navy", "Brown", "Olive", "Dark Grey"],
    typicalUse: "Smart-casual, daytime"
  },
  "Cream": {
    recommendedPantColors: ["Navy", "Brown", "Olive", "Dark Grey"],
    typicalUse: "Smart-casual, daytime"
  },
  "Olive": {
    recommendedPantColors: ["Beige", "Khaki", "Cream", "Black", "Navy"],
    typicalUse: "Casual, smart-casual"
  },
  "Maroon": {
    recommendedPantColors: ["Black", "Grey", "Charcoal", "Beige"],
    typicalUse: "Evening, smart-casual"
  },
  "Burgundy": {
    recommendedPantColors: ["Black", "Grey", "Charcoal", "Beige"],
    typicalUse: "Evening, smart-casual"
  }
};

export const SHOES_MATCHING_RULES = [
  { outfit: "White shirt + black trousers", primaryShoe: "Black leather formal shoes", alternative: "Black loafers for smart-casual" },
  { outfit: "White shirt + navy trousers", primaryShoe: "Brown leather shoes/loafers", alternative: "Black shoes for a more formal look" },
  { outfit: "Light blue shirt + grey trousers", primaryShoe: "Black or dark brown leather shoes", alternative: "Loafers for smart-casual" },
  { outfit: "Navy shirt + beige trousers", primaryShoe: "Brown/tan loafers or leather shoes", alternative: "Clean white sneakers for casual" },
  { outfit: "Black shirt + grey/charcoal trousers", primaryShoe: "Black shoes", alternative: "Minimal black sneakers for casual" },
  { outfit: "Casual shirt + chinos", primaryShoe: "Clean sneakers or loafers", alternative: "Casual leather shoes" }
];

export const WATCH_MATCHING_RULES = [
  { outfit: "Formal black/grey/navy outfit", watch: "Minimal silver/steel watch or black leather strap" },
  { outfit: "White shirt + black trousers + black shoes", watch: "Silver/steel or black leather watch" },
  { outfit: "White shirt + navy trousers + brown shoes", watch: "Brown leather strap with matching brown tone, or neutral steel" },
  { outfit: "Beige/khaki smart-casual outfit", watch: "Brown leather, steel, or understated neutral watch" },
  { outfit: "Casual sneakers outfit", watch: "Minimal steel, silicone, or clean sporty watch depending on style" }
];
