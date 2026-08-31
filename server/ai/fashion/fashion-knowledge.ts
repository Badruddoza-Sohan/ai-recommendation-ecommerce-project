/**
 * Fashion Knowledge Base
 *
 * Pure deterministic TypeScript knowledge graphs containing ALL fashion intelligence.
 * The LLM never touches this — it only reads the output.
 *
 * Contains:
 *  - Color Compatibility Matrix (20+ colors with pairs & avoids)
 *  - Occasion → Clothing Category Graph (15+ occasions)
 *  - Fabric Suitability Matrix (seasonal + occasion-based)
 *  - Style DNA Profiles (8+ aesthetic styles)
 *  - Alternative Palettes (for "show another option" follow-ups)
 *  - Budget Tier Definitions
 *  - Accessory Rules
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColorProfile {
  pairs: string[];
  avoidWith: string[];
  /** Best occasions for this color as a primary */
  bestFor?: string[];
}

export interface OccasionRules {
  top: string;
  bottom: string;
  footwear: string;
  accessories: string;
  formality: "Athletic" | "Casual" | "Smart Casual" | "Business Formal" | "Traditional" | "Luxury";
  defaultColors: string[];
  defaultFabrics: string[];
}

export interface FabricProfile {
  preferred: string[];
  avoid: string[];
}

export interface StyleProfile {
  colors: string[];
  patterns: string[];
  fit: string;
  accessories: string[];
}

// ─── Color Compatibility Matrix ───────────────────────────────────────────────

export const COLOR_COMPATIBILITY: Record<string, ColorProfile> = {
  // Neutrals
  "White":      { pairs: ["Navy", "Black", "Charcoal", "Emerald", "Maroon", "Royal Blue", "Teal", "Burgundy"], avoidWith: [] },
  "Black":      { pairs: ["White", "Grey", "Red", "Gold", "Silver", "Cream", "Lavender", "Mint"], avoidWith: ["Navy", "Dark Brown"] },
  "Grey":       { pairs: ["White", "Black", "Navy", "Pink", "Burgundy", "Teal", "Lavender"], avoidWith: ["Brown", "Olive"] },
  "Charcoal":   { pairs: ["White", "Cream", "Light Blue", "Mint", "Pink", "Burgundy", "Silver"], avoidWith: ["Black", "Dark Navy"] },
  "Cream":      { pairs: ["Navy", "Emerald", "Maroon", "Brown", "Teal", "Burgundy", "Olive", "Royal Blue"], avoidWith: ["White", "Yellow"] },
  "Beige":      { pairs: ["Navy", "White", "Brown", "Olive", "Burgundy", "Teal", "Forest Green"], avoidWith: ["Yellow", "Cream"] },

  // Blues
  "Navy":       { pairs: ["White", "Cream", "Beige", "Light Blue", "Burgundy", "Gold", "Pink", "Khaki"], avoidWith: ["Black", "Dark Green"] },
  "Light Blue":  { pairs: ["White", "Navy", "Beige", "Khaki", "Grey", "Brown", "Charcoal"], avoidWith: ["Teal", "Mint"] },
  "Royal Blue": { pairs: ["White", "Cream", "Silver", "Grey", "Black", "Gold"], avoidWith: ["Navy", "Purple"] },
  "Teal":       { pairs: ["White", "Cream", "Beige", "Grey", "Brown", "Coral", "Gold"], avoidWith: ["Navy", "Green"] },

  // Greens
  "Emerald":    { pairs: ["Cream", "Gold", "White", "Beige", "Brown", "Black"], avoidWith: ["Red", "Purple", "Navy"] },
  "Olive":      { pairs: ["White", "Cream", "Beige", "Brown", "Navy", "Khaki", "Burgundy"], avoidWith: ["Black", "Green"] },
  "Forest Green": { pairs: ["Cream", "White", "Beige", "Brown", "Gold", "Khaki"], avoidWith: ["Black", "Navy"] },
  "Mint":       { pairs: ["White", "Navy", "Charcoal", "Beige", "Light Grey", "Brown", "Cream"], avoidWith: ["Red", "Orange", "Yellow"] },
  "Sage":       { pairs: ["White", "Cream", "Beige", "Brown", "Dusty Pink", "Light Grey"], avoidWith: ["Black", "Bright Green"] },

  // Reds & Warm
  "Red":        { pairs: ["White", "Black", "Grey", "Navy", "Cream", "Gold"], avoidWith: ["Orange", "Pink", "Maroon"] },
  "Maroon":     { pairs: ["White", "Cream", "Beige", "Gold", "Grey", "Navy", "Black"], avoidWith: ["Red", "Brown"] },
  "Burgundy":   { pairs: ["White", "Cream", "Beige", "Navy", "Grey", "Olive", "Charcoal"], avoidWith: ["Red", "Purple"] },
  "Coral":      { pairs: ["White", "Navy", "Beige", "Grey", "Teal", "Cream"], avoidWith: ["Red", "Orange", "Pink"] },

  // Pinks & Purples
  "Pink":       { pairs: ["White", "Grey", "Navy", "Charcoal", "Black", "Cream", "Light Blue"], avoidWith: ["Red", "Orange", "Maroon"] },
  "Light Pink": { pairs: ["White", "Navy", "Charcoal", "Grey", "Cream", "Beige", "Light Blue"], avoidWith: ["Red", "Hot Pink"] },
  "Lavender":   { pairs: ["White", "Grey", "Black", "Navy", "Cream", "Beige"], avoidWith: ["Purple", "Pink"] },
  "Purple":     { pairs: ["White", "Grey", "Silver", "Black", "Cream", "Gold"], avoidWith: ["Red", "Navy"] },

  // Earth Tones
  "Brown":      { pairs: ["White", "Cream", "Beige", "Light Blue", "Forest Green", "Olive", "Teal", "Gold"], avoidWith: ["Black", "Grey"] },
  "Khaki":      { pairs: ["White", "Navy", "Light Blue", "Olive", "Brown", "Burgundy", "Charcoal"], avoidWith: ["Beige", "Yellow"] },
  "Tan":        { pairs: ["White", "Navy", "Charcoal", "Olive", "Brown", "Burgundy"], avoidWith: ["Beige", "Cream"] },

  // Yellows & Golds
  "Yellow":     { pairs: ["Navy", "Charcoal", "White", "Grey", "Olive", "Brown", "Black"], avoidWith: ["Red", "Pink", "Orange", "Cream"] },
  "Mustard":    { pairs: ["Navy", "White", "Cream", "Brown", "Charcoal", "Olive", "Burgundy"], avoidWith: ["Yellow", "Orange"] },
  "Gold":       { pairs: ["White", "Cream", "Navy", "Emerald", "Maroon", "Black", "Brown", "Burgundy"], avoidWith: ["Yellow", "Silver"] },

  // Others
  "Orange":     { pairs: ["White", "Navy", "Charcoal", "Brown", "Cream", "Black"], avoidWith: ["Red", "Yellow", "Pink"] },
  "Silver":     { pairs: ["White", "Black", "Navy", "Charcoal", "Royal Blue", "Purple", "Grey"], avoidWith: ["Gold", "Brown"] },
};

// ─── Occasion → Clothing Category Graph ───────────────────────────────────────

export const OCCASION_CLOTHING: Record<string, OccasionRules> = {
  "Eid ul-Fitr": {
    top: "Panjabi",
    bottom: "Pajama",
    footwear: "Nagra Sandals",
    accessories: "Leather Watch, Attar Perfume",
    formality: "Traditional",
    defaultColors: ["White", "Emerald", "Cream", "Maroon", "Navy", "Teal"],
    defaultFabrics: ["Silk", "Cotton Silk Blend", "Muslin"],
  },
  "Wedding Ceremony": {
    top: "Silk Panjabi / Sherwani",
    bottom: "Churidar / Pajama",
    footwear: "Nagra / Mojari Shoes",
    accessories: "Pocket Square, Brooch, Cufflinks",
    formality: "Luxury",
    defaultColors: ["Emerald", "Maroon", "Navy", "Royal Blue", "Gold", "Burgundy"],
    defaultFabrics: ["Silk", "Brocade", "Raw Silk"],
  },
  "Wedding Reception": {
    top: "Embroidered Silk Panjabi",
    bottom: "Churidar / Silk Pajama",
    footwear: "Leather Nagra",
    accessories: "Pocket Square, Watch, Brooch",
    formality: "Luxury",
    defaultColors: ["Emerald", "Navy", "Burgundy", "Royal Blue", "Charcoal"],
    defaultFabrics: ["Silk", "Silk Blend", "Brocade"],
  },
  "Holud": {
    top: "Embroidered Panjabi",
    bottom: "Pajama / Dhoti",
    footwear: "Kolhapuri Sandals",
    accessories: "Flower Garland, Minimal Watch",
    formality: "Traditional",
    defaultColors: ["Yellow", "Mustard", "Gold", "Orange", "Cream"],
    defaultFabrics: ["Cotton", "Cotton Silk Blend"],
  },
  "Mehendi": {
    top: "Light Embroidered Kurta",
    bottom: "Pajama / Shalwar",
    footwear: "Kolhapuri / Nagra",
    accessories: "Bracelet, Casual Watch",
    formality: "Traditional",
    defaultColors: ["Green", "Emerald", "Teal", "White", "Cream"],
    defaultFabrics: ["Cotton", "Linen", "Cotton Blend"],
  },
  "Akd / Nikah": {
    top: "Premium Sherwani / Silk Panjabi",
    bottom: "Churidar",
    footwear: "Embroidered Mojari",
    accessories: "Turban/Pagri (if groom), Brooch, Pocket Square",
    formality: "Luxury",
    defaultColors: ["White", "Cream", "Gold", "Ivory", "Silver"],
    defaultFabrics: ["Silk", "Brocade", "Jacquard"],
  },
  "Pohela Boishakh": {
    top: "Panjabi / Fatua",
    bottom: "Pajama / Dhoti",
    footwear: "Kolhapuri / Leather Sandals",
    accessories: "Pola Bangle, Minimal Jewelry",
    formality: "Traditional",
    defaultColors: ["Red", "White", "Orange", "Maroon", "Gold"],
    defaultFabrics: ["Cotton", "Muslin", "Handloom"],
  },
  "Gym / Workout": {
    top: "Dri-Fit T-Shirt / Tank Top",
    bottom: "Athletic Shorts / Joggers",
    footwear: "Running Shoes / Training Shoes",
    accessories: "Sports Watch, Wristband",
    formality: "Athletic",
    defaultColors: ["Black", "Grey", "Navy", "White", "Neon Green"],
    defaultFabrics: ["Dri-Fit", "Polyester Blend", "Spandex"],
  },
  "University": {
    top: "Oxford Shirt / Polo T-Shirt",
    bottom: "Chinos / Slim Jeans",
    footwear: "Clean Sneakers / Loafers",
    accessories: "Minimal Watch, Backpack",
    formality: "Smart Casual",
    defaultColors: ["White", "Light Blue", "Navy", "Grey", "Beige", "Olive"],
    defaultFabrics: ["Cotton", "Cotton Blend", "Chambray"],
  },
  "Office / Corporate": {
    top: "Formal Shirt / Blazer",
    bottom: "Dress Pants / Formal Trousers",
    footwear: "Oxford Shoes / Derby Shoes",
    accessories: "Tie, Watch, Leather Belt",
    formality: "Business Formal",
    defaultColors: ["White", "Light Blue", "Navy", "Grey", "Charcoal"],
    defaultFabrics: ["Fine Cotton", "Wool Blend", "Poplin"],
  },
  "Casual / Date Night": {
    top: "Casual Shirt / Henley / Smart Polo",
    bottom: "Chinos / Dark Jeans",
    footwear: "Loafers / Clean Sneakers",
    accessories: "Minimal Watch, Sunglasses",
    formality: "Casual",
    defaultColors: ["Navy", "White", "Olive", "Burgundy", "Black", "Light Blue"],
    defaultFabrics: ["Cotton", "Linen", "Jersey"],
  },
  "Party / Nightout": {
    top: "Fitted Shirt / Black Shirt",
    bottom: "Dark Jeans / Slim Trousers",
    footwear: "Chelsea Boots / Loafers",
    accessories: "Watch, Bracelet, Cologne",
    formality: "Smart Casual",
    defaultColors: ["Black", "Navy", "Burgundy", "Charcoal", "White"],
    defaultFabrics: ["Satin", "Silk Blend", "Fine Cotton"],
  },
  "Travel / Vacation": {
    top: "Linen Shirt / Breathable T-Shirt",
    bottom: "Chinos / Shorts",
    footwear: "Comfortable Sneakers / Sandals",
    accessories: "Sunglasses, Cap, Crossbody Bag",
    formality: "Casual",
    defaultColors: ["White", "Beige", "Light Blue", "Olive", "Khaki"],
    defaultFabrics: ["Linen", "Cotton", "Quick-dry Blend"],
  },
  "Village Wedding": {
    top: "Cotton Panjabi",
    bottom: "Cotton Pajama / Lungi",
    footwear: "Leather Sandals",
    accessories: "Simple Watch",
    formality: "Traditional",
    defaultColors: ["White", "Cream", "Light Blue", "Olive", "Beige"],
    defaultFabrics: ["Cotton", "Handloom Cotton"],
  },
  "Beach / Destination Wedding": {
    top: "Linen Shirt / Light Kurta",
    bottom: "Linen Pants / Light Chinos",
    footwear: "Leather Sandals / Espadrilles",
    accessories: "Sunglasses, Minimal Watch",
    formality: "Smart Casual",
    defaultColors: ["White", "Cream", "Light Blue", "Beige", "Sage"],
    defaultFabrics: ["Linen", "Light Cotton", "Chambray"],
  },
};

// ─── Fabric Suitability Matrix ────────────────────────────────────────────────

export const FABRIC_RULES: Record<string, FabricProfile> = {
  "Summer":    { preferred: ["Cotton", "Linen", "Muslin", "Chambray", "Dri-Fit", "Light Cotton"], avoid: ["Wool", "Velvet", "Heavy Silk", "Tweed"] },
  "Winter":    { preferred: ["Wool", "Tweed", "Silk", "Cashmere", "Wool Blend", "Flannel"], avoid: ["Linen", "Light Cotton", "Dri-Fit"] },
  "Monsoon":   { preferred: ["Quick-dry Cotton", "Synthetic Blend", "Polyester Blend"], avoid: ["Silk", "Suede", "Linen", "Muslin"] },
  "Autumn":    { preferred: ["Cotton", "Light Wool", "Corduroy", "Cotton Blend"], avoid: ["Heavy Wool", "Velvet"] },
  "Formal":    { preferred: ["Silk", "Fine Cotton", "Wool Blend", "Poplin", "Brocade"], avoid: ["Denim", "Jersey", "Polyester", "Spandex"] },
  "Athletic":  { preferred: ["Dri-Fit", "Polyester Blend", "Spandex", "Mesh"], avoid: ["Cotton", "Silk", "Wool", "Linen"] },
};

// ─── Style DNA Profiles ──────────────────────────────────────────────────────

export const STYLE_DNA: Record<string, StyleProfile> = {
  "Traditional": {
    colors: ["Emerald", "Maroon", "Gold", "Royal Blue", "White", "Cream"],
    patterns: ["Embroidered", "Woven", "Paisley"],
    fit: "Classic",
    accessories: ["Nagra Shoes", "Pocket Square", "Attar"],
  },
  "Modern": {
    colors: ["Navy", "Charcoal", "White", "Olive", "Burgundy", "Teal"],
    patterns: ["Solid", "Subtle Print"],
    fit: "Slim/Tailored",
    accessories: ["Minimal Watch", "Leather Belt", "Loafers"],
  },
  "Old Money": {
    colors: ["Navy", "Cream", "Burgundy", "Forest Green", "White", "Beige"],
    patterns: ["Solid", "Subtle Stripe", "Cable Knit"],
    fit: "Tailored",
    accessories: ["Leather Watch", "Leather Belt", "Oxford Shoes"],
  },
  "Minimalist": {
    colors: ["White", "Black", "Grey", "Beige", "Cream", "Navy"],
    patterns: ["Solid"],
    fit: "Clean/Slim",
    accessories: ["Minimal Watch", "Simple Belt"],
  },
  "Korean Aesthetic": {
    colors: ["Pastel Blue", "White", "Beige", "Sage", "Lavender", "Cream"],
    patterns: ["Solid", "Oversized"],
    fit: "Relaxed/Oversized",
    accessories: ["Minimal Ring", "Tote Bag", "Clean Sneakers"],
  },
  "Streetwear": {
    colors: ["Black", "White", "Grey", "Olive", "Earth Tones", "Neon"],
    patterns: ["Logo", "Graphic", "Camo"],
    fit: "Oversized/Baggy",
    accessories: ["Sneakers", "Cap", "Chain"],
  },
  "Business Casual": {
    colors: ["Navy", "Grey", "White", "Light Blue", "Charcoal", "Beige"],
    patterns: ["Solid", "Fine Check", "Micro Pattern"],
    fit: "Fitted",
    accessories: ["Leather Watch", "Tie", "Belt", "Oxford Shoes"],
  },
  "Fusion": {
    colors: ["Teal", "Mustard", "Navy", "Olive", "Burgundy", "Black"],
    patterns: ["Block Print", "Abstract", "Geometric"],
    fit: "Semi-Fitted",
    accessories: ["Statement Watch", "Leather Bracelet", "Loafers"],
  },
  "Quiet Luxury": {
    colors: ["Cream", "Beige", "Tan", "Navy", "Charcoal", "White"],
    patterns: ["Solid", "Subtle Texture"],
    fit: "Relaxed Tailored",
    accessories: ["Leather Watch", "Silk Pocket Square", "Suede Loafers"],
  },
};

// ─── Alternative Palettes (for "show another option") ─────────────────────────

export const ALTERNATIVE_PALETTES: Record<string, string[][]> = {
  "Eid ul-Fitr":          [["White", "Gold"], ["Emerald", "Cream"], ["Maroon", "Beige"], ["Teal", "White"], ["Navy", "Silver"], ["Cream", "Gold"]],
  "Wedding Ceremony":     [["Emerald", "Cream"], ["Navy", "Gold"], ["Burgundy", "Beige"], ["Royal Blue", "White"], ["Charcoal", "Silver"], ["Maroon", "Cream"]],
  "Wedding Reception":    [["Emerald", "Cream"], ["Navy", "Gold"], ["Burgundy", "Beige"], ["Royal Blue", "White"], ["Charcoal", "Silver"]],
  "Holud":                [["Yellow", "White"], ["Mustard", "Cream"], ["Gold", "Ivory"], ["Orange", "White"], ["Lime", "Cream"]],
  "Mehendi":              [["Green", "White"], ["Emerald", "Cream"], ["Teal", "Beige"], ["Sage", "White"]],
  "Pohela Boishakh":      [["Red", "White"], ["Maroon", "Cream"], ["Orange", "White"], ["Gold", "Red"]],
  "Gym / Workout":        [["Black", "Grey"], ["Navy", "White"], ["Grey", "Neon Green"], ["Black", "Red"]],
  "University":           [["White", "Navy"], ["Light Blue", "Beige"], ["Grey", "Olive"], ["Navy", "Khaki"]],
  "Office / Corporate":   [["White", "Navy"], ["Light Blue", "Charcoal"], ["White", "Grey"], ["Cream", "Navy"]],
  "Casual / Date Night":  [["Navy", "White"], ["Olive", "Cream"], ["Burgundy", "Beige"], ["Black", "Grey"]],
  "Party / Nightout":     [["Black", "White"], ["Navy", "Silver"], ["Burgundy", "Black"], ["Charcoal", "Gold"]],
  "Travel / Vacation":    [["White", "Beige"], ["Light Blue", "Khaki"], ["Olive", "Cream"], ["Sage", "White"]],
  "Akd / Nikah":          [["White", "Gold"], ["Cream", "Silver"], ["Ivory", "Gold"]],
  "Village Wedding":      [["White", "Cream"], ["Light Blue", "White"], ["Olive", "Beige"]],
  "Beach / Destination Wedding": [["White", "Beige"], ["Light Blue", "Cream"], ["Sage", "White"]],
};

// ─── Budget Tiers ─────────────────────────────────────────────────────────────

export interface BudgetTier {
  label: string;
  min: number;
  max: number;
  fabricQuality: "Standard" | "Premium" | "Luxury";
}

export const BUDGET_TIERS: Record<string, BudgetTier> = {
  "Budget Friendly (< 5,000 BDT)":    { label: "Budget", min: 0, max: 5000, fabricQuality: "Standard" },
  "Premium (5,000 - 15,000 BDT)":     { label: "Mid-Range", min: 5000, max: 15000, fabricQuality: "Premium" },
  "Luxury (> 15,000 BDT)":            { label: "Luxury", min: 15000, max: 999999, fabricQuality: "Luxury" },
};

// ─── Weather Detection ────────────────────────────────────────────────────────

export function getCurrentSeason(): string {
  const month = new Date().getMonth(); // 0-indexed
  // Bangladesh climate:
  // Nov-Feb: Winter, Mar-May: Summer, Jun-Sep: Monsoon, Oct: Autumn
  if (month >= 10 || month <= 1) return "Winter";
  if (month >= 2 && month <= 4) return "Summer";
  if (month >= 5 && month <= 8) return "Monsoon";
  return "Autumn";
}

// ─── Accessory Rules by Formality ─────────────────────────────────────────────

export const ACCESSORY_RULES: Record<string, string[]> = {
  "Athletic":        ["Sports Watch", "Wristband", "Headband"],
  "Casual":          ["Minimal Watch", "Sunglasses"],
  "Smart Casual":    ["Leather Watch", "Minimal Bracelet"],
  "Business Formal": ["Classic Watch", "Tie", "Leather Belt", "Cufflinks"],
  "Traditional":     ["Leather Watch", "Attar Perfume", "Pocket Square"],
  "Luxury":          ["Premium Watch", "Pocket Square", "Brooch", "Cufflinks"],
};

// ─── Utility: Pick a Color Not In Avoid List ──────────────────────────────────

export function pickBestColor(
  candidates: string[],
  preferred: string[],
  avoid: string[]
): string {
  // 1. Try preferred first
  for (const c of preferred) {
    if (candidates.includes(c) && !avoid.includes(c)) return c;
  }
  // 2. Fallback to first non-avoided candidate
  for (const c of candidates) {
    if (!avoid.includes(c)) return c;
  }
  // 3. Absolute fallback
  return candidates[0] || "White";
}

export function pickComplementaryColor(
  primaryColor: string,
  avoid: string[]
): string {
  const profile = COLOR_COMPATIBILITY[primaryColor];
  if (!profile) return "White";
  for (const pair of profile.pairs) {
    if (!avoid.includes(pair)) return pair;
  }
  return "White";
}
