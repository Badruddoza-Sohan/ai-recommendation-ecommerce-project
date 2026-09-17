/**
 * Production Clothing Compatibility Matrix
 *
 * Defines explicit rules for compatible vs incompatible garment pairs.
 * Prevents illegal combinations (e.g. Silk Panjabi + Cargo Pants, Polo + Formal Pajama).
 */

export interface CompatibilityRule {
  itemType: string;
  allowedBottoms: string[];
  prohibitedBottoms: string[];
  allowedFootwear: string[];
  prohibitedFootwear: string[];
}

export class ClothingMatrix {
  private rules = new Map<string, CompatibilityRule>();

  constructor() {
    this.initMatrix();
  }

  private initMatrix() {
    // 1. Silk Panjabi
    this.rules.set("silk_panjabi", {
      itemType: "Silk Panjabi",
      allowedBottoms: ["Tailored Pajama", "Aligadhi Pajama", "Churidar", "Cotton Silk Pajama"],
      prohibitedBottoms: ["Denim Jeans", "Cargo Pants", "Track Pants", "Shorts"],
      allowedFootwear: ["Handcrafted Leather Nagra", "Leather Tassel Loafers", "Formal Slide Sandals"],
      prohibitedFootwear: ["Sports Running Shoes", "Canvas Sneakers", "Flip Flops", "Combat Boots"],
    });

    // 2. Cotton / Handloom Panjabi
    this.rules.set("cotton_panjabi", {
      itemType: "Cotton Panjabi",
      allowedBottoms: ["White Cotton Pajama", "Slim Fit Chinos", "Traditional Pajama"],
      prohibitedBottoms: ["Formal Tuxedo Trousers", "Cargo Shorts"],
      allowedFootwear: ["Tan Nagra Sandals", "Slide Loafers", "Leather Sandals"],
      prohibitedFootwear: ["Formal Shiny Oxfords", "Running Shoes"],
    });

    // 3. Oxford Cotton Shirt
    this.rules.set("oxford_shirt", {
      itemType: "Oxford Cotton Shirt",
      allowedBottoms: ["Slim Chino Trousers", "Tailored Formal Trousers", "Dark Wash Jeans"],
      prohibitedBottoms: ["Traditional Silk Pajama", "Churidar"],
      allowedFootwear: ["Leather Derby Shoes", "Penny Loafers", "Monk Strap Shoes"],
      prohibitedFootwear: ["Traditional Nagra Sandals", "Flip Flops"],
    });

    // 4. Polo Shirt
    this.rules.set("polo_shirt", {
      itemType: "Polo Shirt",
      allowedBottoms: ["Chino Shorts", "Dark Wash Denim Jeans", "Slim Fit Chinos"],
      prohibitedBottoms: ["Traditional Pajama", "Formal Tuxedo Pants"],
      allowedFootwear: ["Minimal White Leather Sneakers", "Casual Loafers"],
      prohibitedFootwear: ["Embroidered Nagra Sandals", "Formal Patent Leather Oxfords"],
    });
  }

  /**
   * Check if a combination of top, bottom, and footwear is valid
   */
  isCompatible(top: string, bottom: string, footwear: string): { valid: boolean; reason?: string } {
    const key = top.toLowerCase().includes("silk") ? "silk_panjabi" : top.toLowerCase().includes("panjabi") ? "cotton_panjabi" : "oxford_shirt";
    const rule = this.rules.get(key);

    if (!rule) return { valid: true };

    if (rule.prohibitedBottoms.some((b) => bottom.toLowerCase().includes(b.toLowerCase()))) {
      return { valid: false, reason: `${top} is not compatible with ${bottom}.` };
    }

    if (rule.prohibitedFootwear.some((f) => footwear.toLowerCase().includes(f.toLowerCase()))) {
      return { valid: false, reason: `${top} is not compatible with ${footwear}.` };
    }

    return { valid: true };
  }

  getRecommendedBottoms(top: string): string[] {
    const key = top.toLowerCase().includes("silk") ? "silk_panjabi" : top.toLowerCase().includes("panjabi") ? "cotton_panjabi" : "oxford_shirt";
    return this.rules.get(key)?.allowedBottoms || ["Tailored Pajama"];
  }

  getRecommendedFootwear(top: string): string[] {
    const key = top.toLowerCase().includes("silk") ? "silk_panjabi" : top.toLowerCase().includes("panjabi") ? "cotton_panjabi" : "oxford_shirt";
    return this.rules.get(key)?.allowedFootwear || ["Handcrafted Leather Nagra"];
  }
}

let matrixInstance: ClothingMatrix | null = null;
export function getClothingMatrix(): ClothingMatrix {
  if (!matrixInstance) {
    matrixInstance = new ClothingMatrix();
  }
  return matrixInstance;
}
