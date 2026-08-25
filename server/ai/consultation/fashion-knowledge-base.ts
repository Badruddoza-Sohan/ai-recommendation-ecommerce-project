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
    "✖ Avoid heavy, unbreathable synthetic polyester fabrics during Bangladeshi summer/monsoon.",
    "✖ Avoid clashing footwear: never wear casual sports running shoes with traditional Panjabis.",
    "✖ Avoid excessive heavy gold embroidery when attending as a casual guest.",
  ],
};
