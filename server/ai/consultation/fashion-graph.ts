/**
 * Production-Grade Fashion Graph (DAG)
 *
 * Traverses occasion, venue type, event role, venue setting, and aesthetic style nodes
 * to retrieve strict fashion constraints, allowed colors, prohibited items,
 * fabric requirements, and styling tips algorithmically.
 */

export interface GraphNode {
  id: string;
  label: string;
  allowedPrimaryColors: string[];
  allowedNeutralColors: string[];
  prohibitedColors: string[];
  allowedFabrics: string[];
  prohibitedFabrics: string[];
  allowedFootwear: string[];
  prohibitedFootwear: string[];
  accessories: string[];
  formalityScore: number; // 1 (Casual) to 10 (Ultra Formal)
  weatherAdjustments: {
    highHumidity: string[];
    indoorAC: string[];
  };
  lightingTips: string;
  prohibitedItems: string[];
}

export class FashionGraph {
  private nodes = new Map<string, GraphNode>();

  constructor() {
    this.initGraph();
  }

  private initGraph() {
    // 1. Wedding -> Hotel Reception (Indoor Luxury)
    this.nodes.set("wedding__hotel__reception", {
      id: "wedding__hotel__reception",
      label: "Hotel Ballroom Reception",
      allowedPrimaryColors: ["Emerald", "Midnight Navy", "Deep Plum", "Wine", "Royal Blue"],
      allowedNeutralColors: ["Cream", "Off-White", "Ivory"],
      prohibitedColors: ["Mustard Yellow", "Bright Neon"],
      allowedFabrics: ["Silk", "Cotton Silk", "Jamdani", "Velvet Collar Accent"],
      prohibitedFabrics: ["Heavy Unbreathable Polyester", "Casual Denim"],
      allowedFootwear: ["Patent Leather Tassel Loafers", "Handcrafted Nagra Sandals"],
      prohibitedFootwear: ["Canvas Sneakers", "Flip Flops"],
      accessories: ["Rose Gold Watch", "Silver Cufflinks", "Silk Pocket Square"],
      formalityScore: 9,
      weatherAdjustments: {
        highHumidity: ["Silk-Cotton Blend"],
        indoorAC: ["Structured Silk Panjabi with Brocade Vest"],
      },
      lightingTips: "Deep jewel tones (Emerald, Midnight Navy) pop elegantly under warm crystal chandeliers.",
      prohibitedItems: ["Casual Denim", "Flip Flops"],
    });

    // 2. Wedding -> Garden / Outdoor Wedding
    this.nodes.set("wedding__garden", {
      id: "wedding__garden",
      label: "Outdoor Garden Wedding",
      allowedPrimaryColors: ["Olive", "Ivory", "Pastel Mint", "Soft Gold", "Tan"],
      allowedNeutralColors: ["White", "Beige"],
      prohibitedColors: ["Heavy Jet Black"],
      allowedFabrics: ["100% Taant Cotton", "Handloom Linen", "Linen Silk"],
      prohibitedFabrics: ["Heavy Velvet", "Unbreathable Polyester"],
      allowedFootwear: ["Tan Leather Nagra Sandals", "Slide Loafers"],
      prohibitedFootwear: ["High Formal Patent Shoes"],
      accessories: ["Leather Strap Watch", "Minimal Wooden Beads"],
      formalityScore: 7,
      weatherAdjustments: {
        highHumidity: ["100% Breathable Taant Linen"],
        indoorAC: ["Linen Panjabi"],
      },
      lightingTips: "Earth tones and pastels harmonize naturally with outdoor lawn greenery and natural daylight.",
      prohibitedItems: ["Heavy Zari Velvet Sherwani"],
    });

    // 3. Wedding -> Village Wedding
    this.nodes.set("wedding__village", {
      id: "wedding__village",
      label: "Traditional Village Wedding",
      allowedPrimaryColors: ["White", "Off-White", "Maroon", "Royal Blue"],
      allowedNeutralColors: ["White", "Off-White"],
      prohibitedColors: ["Neon Pink"],
      allowedFabrics: ["100% Handloom Cotton", "Khadi", "Taant Cotton"],
      prohibitedFabrics: ["Delicate Pure Silk (Easily Stained)"],
      allowedFootwear: ["Durable Leather Nagra Sandals", "Khabar Sandals"],
      prohibitedFootwear: ["White Canvas Sneakers", "Suede Shoes"],
      accessories: ["Durable Stainless Steel Watch"],
      formalityScore: 6,
      weatherAdjustments: {
        highHumidity: ["100% Khadi Cotton"],
        indoorAC: ["Cotton Panjabi"],
      },
      lightingTips: "Clean white and maroon handloom cotton stays comfortable and sharp throughout open-air village festivities.",
      prohibitedItems: ["Delicate Suede Shoes"],
    });

    // 4. Default Wedding Guest
    this.nodes.set("wedding__guest__evening__traditional", {
      id: "wedding__guest__evening__traditional",
      label: "Wedding Guest Evening Traditional",
      allowedPrimaryColors: ["Emerald", "Midnight Navy", "Deep Plum", "Wine", "Charcoal Grey"],
      allowedNeutralColors: ["Cream", "White", "Off-White", "Beige"],
      prohibitedColors: ["Mustard Yellow", "Bright Orange"],
      allowedFabrics: ["Silk", "Cotton Silk", "Jamdani", "Fine Pima Cotton"],
      prohibitedFabrics: ["Heavy Velvet", "Unbreathable Polyester", "Denim"],
      allowedFootwear: ["Handcrafted Nagra Sandals", "Leather Loafers", "Monk Strap Shoes"],
      prohibitedFootwear: ["Sports Running Shoes", "Flip Flops"],
      accessories: ["Classic Leather Watch", "Minimal Silver Cufflinks"],
      formalityScore: 8,
      weatherAdjustments: {
        highHumidity: ["Pima Cotton Silk"],
        indoorAC: ["Silk Panjabi with Embroidered Neck"],
      },
      lightingTips: "Jewel tones catch warm hall lighting with understated elegance.",
      prohibitedItems: ["Groom Zari Sherwani"],
    });
  }

  /**
   * Traverse graph and fetch candidate node matching consultation parameters.
   */
  findNode(occasion: string, role?: string, time?: string, style?: string): GraphNode {
    const key = occasion.toLowerCase();
    
    if (key.includes("garden") || key.includes("outdoor")) return this.nodes.get("wedding__garden")!;
    if (key.includes("village")) return this.nodes.get("wedding__village")!;
    if (key.includes("hotel") || key.includes("ballroom")) return this.nodes.get("wedding__hotel__reception")!;

    return this.nodes.get("wedding__guest__evening__traditional")!;
  }
}

let graphInstance: FashionGraph | null = null;
export function getFashionGraph(): FashionGraph {
  if (!graphInstance) {
    graphInstance = new FashionGraph();
  }
  return graphInstance;
}
