export interface BuildOutfitOptions {
  occasion?: string;
  season?: string;
  budget?: number;
  preferredColors?: string[];
}

export function resolveFashionPrompt(prompt: string): string {
  return prompt.trim();
}

export function buildFallbackOutfitRecommendation(options: BuildOutfitOptions | string) {
  const occasion = typeof options === "string" ? options : options.occasion || "wedding";
  const season = typeof options === "string" ? "spring" : options.season || "spring";
  const colors = (typeof options !== "string" && options.preferredColors?.length) ? options.preferredColors : ["Navy", "Emerald", "Cream", "Burgundy"];

  const outfitPresets: Record<string, any[]> = {
    holud: [
      {
        items: [
          { id: 951, name: "Mustard Yellow Silk Embroidered Panjabi", price: 4800, category: "Panjabi", matchScore: 98 },
          { id: 952, name: "Crisp White Cotton Pajama", price: 1800, category: "Pants", matchScore: 95 },
          { id: 953, name: "Handcrafted Brown Nagra Sandals", price: 2900, category: "Shoes", matchScore: 93 },
          { id: 954, name: "Natural Rose Attar Perfume", price: 1200, category: "Accessories", matchScore: 90 },
        ],
        totalPrice: 10700,
        styleNotes: "A vibrant traditional Gaye Holud ensemble featuring golden turmeric embroidery and comfortable cotton pajama.",
        occasion: "Gaye Holud",
        season: season,
      },
      {
        items: [
          { id: 955, name: "Navy Blue Silk Embroidered Panjabi", price: 5200, category: "Panjabi", matchScore: 96 },
          { id: 952, name: "Crisp White Cotton Pajama", price: 1800, category: "Pants", matchScore: 95 },
          { id: 953, name: "Handcrafted Brown Nagra Sandals", price: 2900, category: "Shoes", matchScore: 93 },
        ],
        totalPrice: 9900,
        styleNotes: "A refined navy silk traditional look providing elegant evening contrast for Holud celebrations.",
        occasion: "Gaye Holud (Evening)",
        season: season,
      }
    ],
    wedding: [
      {
        items: [
          { id: 501, name: "Royal Navy Embroidered Silk Panjabi", price: 6500, category: "Panjabi", matchScore: 98 },
          { id: 502, name: "Pristine White Silk Blend Pajama", price: 2500, category: "Pants", matchScore: 95 },
          { id: 503, name: "Handcrafted Brown Leather Nagra", price: 4000, category: "Shoes", matchScore: 92 },
        ],
        totalPrice: 13000,
        styleNotes: "An elegant traditional wedding ensemble featuring rich silk fabrics and handcrafted nagra sandals.",
        occasion: "Wedding",
        season: season,
      },
      {
        items: [
          { id: 101, name: "Tailored Italian Blazer", price: 18000, category: "Blazer", matchScore: 95 },
          { id: 102, name: "Slim Fit Formal Dress Shirt", price: 6500, category: "Shirt", matchScore: 92 },
          { id: 103, name: "Classic Pleated Trousers", price: 8500, category: "Pants", matchScore: 90 },
        ],
        totalPrice: 33000,
        styleNotes: "A modern western suit tailored for formal evening receptions.",
        occasion: "Wedding Reception",
        season: season,
      }
    ],
    "traditional wedding": [
      {
        items: [
          { id: 501, name: "Royal Navy Embroidered Silk Panjabi", price: 6500, category: "Panjabi", matchScore: 98 },
          { id: 502, name: "Pristine White Silk Blend Pajama", price: 2500, category: "Pants", matchScore: 95 },
          { id: 503, name: "Handcrafted Brown Leather Nagra", price: 4000, category: "Shoes", matchScore: 92 },
        ],
        totalPrice: 13000,
        styleNotes: "A classic traditional ensemble perfect for cultural ceremonies and weddings.",
        occasion: "Traditional Wedding",
        season: season,
      }
    ],
    eid: [
      {
        items: [
          { id: 701, name: "Embroidered Premium Cotton Panjabi", price: 5500, category: "Panjabi", matchScore: 98 },
          { id: 702, name: "Tailored Fitted Pajama Pants", price: 1800, category: "Pants", matchScore: 95 },
          { id: 703, name: "Handcrafted Leather Nagra Shoes", price: 3800, category: "Shoes", matchScore: 92 },
          { id: 704, name: "Natural Rose Attar Perfume", price: 1200, category: "Accessories", matchScore: 90 },
        ],
        totalPrice: 12300,
        styleNotes: "A festive traditional ensemble perfect for Eid morning prayers and family celebrations.",
        occasion: "Eid ul-Fitr",
        season: season,
      }
    ],
    office: [
      {
        items: [
          { id: 801, name: "Crisp Oxford Button-Down Formal Shirt", price: 3500, category: "Shirt", matchScore: 96 },
          { id: 802, name: "Slim Fit Tailored Chino Trousers", price: 3800, category: "Pants", matchScore: 94 },
          { id: 803, name: "Handcrafted Genuine Leather Loafers", price: 6500, category: "Shoes", matchScore: 92 },
        ],
        totalPrice: 13800,
        styleNotes: "Clean, professional business casual outfit designed for daily office wear.",
        occasion: "Office Wear",
        season: season,
      }
    ],
    casual: [
      {
        items: [
          { id: 901, name: "Relaxed Fit Premium Cotton T-Shirt", price: 1500, category: "Shirt", matchScore: 96 },
          { id: 902, name: "Slim Stretch Dark Denim Jeans", price: 3200, category: "Pants", matchScore: 94 },
          { id: 903, name: "Minimalist White Leather Canvas Sneakers", price: 3800, category: "Shoes", matchScore: 92 },
        ],
        totalPrice: 8500,
        styleNotes: "Effortlessly casual, comfortable, and modern for weekend hangouts.",
        occasion: "Casual Outing",
        season: season,
      }
    ]
  };

  const key = occasion.toLowerCase();
  let matchedOutfits = outfitPresets[key];

  if (!matchedOutfits) {
    if (key.includes("holud") || key.includes("haldi")) {
      matchedOutfits = outfitPresets.holud;
    } else if (key.includes("wedding") || key.includes("shaadi") || key.includes("reception")) {
      matchedOutfits = outfitPresets.wedding;
    } else if (key.includes("eid")) {
      matchedOutfits = outfitPresets.eid;
    } else {
      matchedOutfits = [
        {
          items: [
            { id: 401, name: "Navy Embroidered Silk Panjabi", price: 5800, category: "Panjabi", matchScore: 94 },
            { id: 402, name: "Crisp White Cotton Pajama", price: 2200, category: "Pants", matchScore: 91 },
            { id: 403, name: "Handcrafted Brown Nagra Shoes", price: 3900, category: "Shoes", matchScore: 89 },
          ],
          totalPrice: 11900,
          styleNotes: `Curated Bangladeshi traditional styling for ${occasion} during ${season} season.`,
          occasion: occasion,
          season: season,
        }
      ];
    }
  }

  return {
    occasion: occasion,
    season: season,
    outfits: matchedOutfits,
    styleGuidance: {
      formality: key.includes("wedding") ? 9 : key.includes("presentation") ? 7 : 8,
      recommendedColors: colors,
      avoid: ["Overly casual athletic wear", "Unmatched neon shades"],
    },
  };
}

export function buildFallbackColorMatching(baseColor: string, season?: string, occasion?: string) {
  const colorMap: Record<string, string[]> = {
    navy: ["Beige", "White", "Burgundy", "Gold", "Light Blue"],
    black: ["White", "Emerald Green", "Crimson", "Silver", "Camel"],
    white: ["Navy", "Olive", "Charcoal", "Pastel Pink", "Denim Blue"],
    red: ["Black", "Navy", "Cream", "Gold", "Charcoal"],
    green: ["Beige", "White", "Tan", "Mustard", "Brown"],
    blue: ["Grey", "White", "Tan", "Coral", "Navy"],
  };

  const matches = colorMap[baseColor.toLowerCase()] || ["White", "Black", "Navy", "Beige", "Charcoal"];

  return {
    baseColor,
    season: season || "spring",
    occasion: occasion || "general",
    perfectMatches: matches.slice(0, 3),
    seasonalMatches: matches.slice(2, 5),
    occasionMatches: matches,
    avoidColors: ["Clashing Neons", "Over-saturated Primary Colors"],
    colorTheory: `Base color ${baseColor} pairs harmoniously with high-contrast neutral tones and complementary accent shades.`,
  };
}
