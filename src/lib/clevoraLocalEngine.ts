import rules from "./fashion-rules.json";

export type LocalAssistantResult = {
  content: string;
  search?: string;
  category?: "watch" | "shoes" | "shirt" | "pant" | "laptop" | "smartphone" | "tablet" | "headphones" | "earbuds" | "smartwatch" | "camera" | "speaker" | "monitor" | "pc" | "electronics";
  quickActions?: string[];
  context?: Partial<ClevoraConversationContext>;
  searchColors?: string[];
  productQuery?: { sort: "trending" | "deals" | "newest" | "topRated"; minReviewCount?: number };
};

export type ClevoraConversationContext = {
  itemType?: "shirt" | "t-shirt" | "pant";
  sourceItemType?: "shirt" | "t-shirt" | "pant";
  targetCategory?: "shirt" | "pant";
  sourceColor?: string;
  targetColors?: string[];
  color?: string;
  need?: "pant" | "shoes" | "watch" | "accessories" | "outfit";
  occasion?: string;
  targetColor?: string;
  size?: string;
  gadgetType?: "laptop" | "smartphone" | "tablet" | "headphones" | "earbuds" | "smartwatch" | "camera" | "speaker" | "monitor" | "pc" | "electronics";
  useCase?: string;
  budget?: string;
  priceMin?: number;
  priceMax?: number;
};

export type CatalogProduct = {
  name?: string;
  categoryName?: string;
  quantity?: number | null;
  attributes?: unknown;
  variants?: Array<{ size?: string; color?: string; quantity?: number }>;
};

export type ColorMatch = {
  pants: string[];
  shoes: string[];
  watches: string[];
  belt: string[];
};

const colors = Object.keys(rules.shirtToPant);
const normalize = (value: string) => value.toLowerCase().replace(/grey/g, "gray");
const colorAliases: Record<string, string[]> = {
  "navy blue": ["navy blue", "navy"],
  "olive green": ["olive green", "olive"],
  khaki: ["khaki"],
  maroon: ["maroon", "burgundy"],
  pastel: ["pastel", "pink", "mint", "lavender"],
  bright: ["red", "yellow", "orange"],
  ...Object.fromEntries(colors.filter((color) => !["navy", "olive", "maroon", "pink"].includes(color)).map((color) => [color, [color]])),
};
const findColor = (value: string) => Object.entries(colorAliases)
  .sort(([, first], [, second]) => Math.max(...second.map((alias) => alias.length)) - Math.max(...first.map((alias) => alias.length)))
  .find(([, aliases]) => aliases.some((alias) => normalize(value).includes(alias)))?.[0];
export const getColorMatch = (color: string): ColorMatch => {
  const canonicalColor = findColor(color) || "white";
  return (rules.colorMatches as Record<string, ColorMatch>)[canonicalColor] || (rules.colorMatches as Record<string, ColorMatch>).pastel;
};
export function getComplementaryColors(sourceCategory: "shirt" | "pant", sourceColor: string): string[] {
  const canonicalColor = findColor(sourceColor) || "white";
  if (sourceCategory === "shirt") return getColorMatch(canonicalColor).pants;
  return Object.entries(rules.colorMatches as Record<string, ColorMatch>)
    .filter(([, match]) => match.pants.some((pantColor) => normalize(pantColor) === normalize(canonicalColor) || normalize(pantColor).includes(normalize(canonicalColor))))
    .map(([color]) => color === "navy blue" ? "Navy Blue" : color === "olive green" ? "Olive Green" : color[0].toUpperCase() + color.slice(1));
}
const bullets = (items: string[]) => items.map((item) => `• ${item}`).join("\n");
export type PriceRange = { label: string; min: number; max?: number };
export const BDT_PRICE_RANGES: PriceRange[] = [
  { label: "0 - 30,000 BDT", min: 0, max: 30000 },
  { label: "30,000 - 60,000 BDT", min: 30000, max: 60000 },
  { label: "60,000 - 90,000 BDT", min: 60000, max: 90000 },
  { label: "90,000+ BDT", min: 90000 },
];
const parsePriceRange = (value: string): PriceRange | undefined => {
  const normalized = value.toLowerCase().replace(/,/g, "").replace(/bdt|৳/g, "");
  const bounded = normalized.match(/(\d+)\s*-\s*(\d+)/);
  const explicit = bounded
    ? BDT_PRICE_RANGES.find((range) => range.min === Number(bounded[1]) && range.max === Number(bounded[2]))
    : BDT_PRICE_RANGES.find((range) => range.min > 0 && normalized.includes(String(range.min)) && normalized.includes("+"));
  if (explicit) return explicit;
  const around = normalized.match(/(?:around|about|under|below)\s*(\d{3,6})/);
  if (around) return { label: value.trim(), min: 0, max: Number(around[1]) };
  return undefined;
};
const parseAttributes = (product: CatalogProduct): Record<string, unknown> => {
  if (!product.attributes) return {};
  if (typeof product.attributes === "object") return product.attributes as Record<string, unknown>;
  try { return JSON.parse(String(product.attributes)) as Record<string, unknown>; } catch { return {}; }
};
const valuesFrom = (product: CatalogProduct, key: "size" | "color" | "ram" | "storageCapacity"): string[] => {
  const attributes = parseAttributes(product);
  const aliases: Record<string, string[]> = { size: ["size", "sizes"], color: ["color", "colors"], ram: ["ram", "memory"], storageCapacity: ["storageCapacity", "storage", "storageSize"] };
  const attribute = aliases[key].map((attributeKey) => attributes[attributeKey]).find((value) => value != null && value !== "");
  const values = Array.isArray(attribute) ? attribute : attribute == null ? [] : [attribute];
  const variantValues = (product.variants || []).map((variant) => variant[key as "size" | "color"]).filter(Boolean);
  return [...values, ...variantValues].flatMap((value) => String(value).split(",").map((item) => item.trim())).filter((value) => value.length > 0);
};
const categoryMatches = (product: CatalogProduct, category: string) => {
  const text = `${product.categoryName || ""} ${product.name || ""}`.toLowerCase();
  if (category === "shirt") return /shirt|t-shirt|top|polo|kurti|panjabi|dress/.test(text);
  if (category === "pant") return /pant|trouser|jean|chino|pajama/.test(text);
  if (category === "shoes") return /shoe|footwear|sneaker|loafer|sandal|boot/.test(text);
  if (category === "watch") return /watch|timepiece/.test(text);
  if (category === "laptop") return /laptop|notebook/.test(text);
  if (category === "smartphone") return /smartphone|mobile phone|phone/.test(text);
  if (category === "headphones" || category === "earbuds") return /headphone|earbud|earphone/.test(text);
  if (category === "smartwatch") return /smartwatch|smart watch/.test(text);
  if (category === "camera") return /camera|dslr|mirrorless/.test(text);
  if (category === "speaker") return /speaker|soundbar/.test(text);
  if (category === "monitor") return /monitor|display/.test(text);
  if (category === "tablet") return /tablet/.test(text);
  if (category === "pc") return /pc|computer|desktop/.test(text);
  return /laptop|computer|phone|tablet|headphone|monitor|keyboard|mouse|camera|speaker|smartwatch|gadget|electronics/.test(text);
};
export function productMatchesColor(product: CatalogProduct, colorsToMatch: string[]): boolean {
  const normalizedColors = colorsToMatch.map((color) => normalize(color));
  const storedColors = valuesFrom(product, "color").map((color) => normalize(color));
  const searchableText = normalize(`${product.name || ""} ${product.categoryName || ""}`);
  return normalizedColors.some((color) => storedColors.some((storedColor) => storedColor.includes(color) || color.includes(storedColor)) || searchableText.includes(color));
}
export function productIsInStock(product: CatalogProduct, category: "shirt" | "pant", color: string): boolean {
  if (!categoryMatches(product, category) || !productMatchesColor(product, [color])) return false;
  const variants = product.variants || [];
  if (variants.length > 0) {
    const coloredVariants = variants.filter((variant) => variant.color);
    return (coloredVariants.length > 0
      ? coloredVariants.filter((variant) => productMatchesColor({ ...product, attributes: { color: variant.color } }, [color]))
      : variants).some((variant) => Number(variant.quantity || 0) > 0);
  }
  return Number(product.quantity || 0) > 0;
}
export function getCatalogAttributeOptions(products: CatalogProduct[], category: string, key: "size" | "color" | "ram" | "storageCapacity" = "color", color?: string): string[] {
  const normalizedColor = color?.toLowerCase();
  return Array.from(new Set(products
    .filter((product) => categoryMatches(product, category))
    .filter((product) => !normalizedColor || valuesFrom(product, "color").some((value) => value.toLowerCase() === normalizedColor))
    .flatMap((product) => valuesFrom(product, key)))).filter(Boolean);
}

export function getClevoraWelcome(): LocalAssistantResult {
  return {
    content: "👋 Welcome to Clevora AI.\n\nWhat would you like help with today?",
    quickActions: ["Fashion", "Gadgets", "Shopping", "Support", "Ask Anything"],
  };
}

const electronicsCategories: Array<{ category: NonNullable<LocalAssistantResult["category"]>; pattern: RegExp; label: string }> = [
  { category: "laptop", pattern: /laptop|notebook/, label: "laptops" },
  { category: "smartphone", pattern: /smartphone|mobile phone|phone/, label: "smartphones" },
  { category: "earbuds", pattern: /earbud|earphone/, label: "earbuds" },
  { category: "headphones", pattern: /headphone/, label: "headphones" },
  { category: "smartwatch", pattern: /smartwatch|smart watch/, label: "smartwatches" },
  { category: "camera", pattern: /camera|dslr|mirrorless/, label: "cameras" },
  { category: "speaker", pattern: /speaker|soundbar/, label: "speakers" },
  { category: "monitor", pattern: /monitor|display/, label: "monitors" },
  { category: "tablet", pattern: /tablet/, label: "tablets" },
  { category: "pc", pattern: /\bpc\b|computer|desktop/, label: "PCs" },
];
const findElectronicsCategory = (value: string) => electronicsCategories.find((entry) => entry.pattern.test(value));
export function productIsInStockForCategory(product: CatalogProduct, category: string): boolean {
  if (!categoryMatches(product, category)) return false;
  const variants = product.variants || [];
  return variants.length > 0 ? variants.some((variant) => Number(variant.quantity || 0) > 0) : Number(product.quantity || 0) > 0;
}

export function resolveClevoraLocally(prompt: string, currentContext: ClevoraConversationContext = {}, catalogProducts: CatalogProduct[] = []): LocalAssistantResult | null {
  const query = normalize(prompt);
  const color = findColor(query);
  const hasShirt = query.includes("shirt") || query.includes("t-shirt") || query.includes("tshirt") || query.includes("polo");
  const hasPant = query.includes("pant") || query.includes("trouser") || query.includes("jeans");
  const targetShirt = /(?:find|need|want|looking for|suggest|matching)\s+(?:a\s+|some\s+)?(?:shirt|t-shirt|polo)/.test(query);
  const targetPant = /(?:find|need|want|looking for|suggest|matching)\s+(?:a\s+|some\s+)?(?:pant|trouser|jeans)/.test(query);
  const mergedContext: ClevoraConversationContext = { ...currentContext };
  const occasion = ["casual", "formal", "business", "wedding", "party", "date night"].find((value) => query.includes(value));
  const electronicsRequest = findElectronicsCategory(query);
  const pantColors = getCatalogAttributeOptions(catalogProducts, "pant", "color");
  const pantSizes = getCatalogAttributeOptions(catalogProducts, "pant", "size", currentContext.targetColor);
  const shirtColors = getCatalogAttributeOptions(catalogProducts, "shirt", "color");
  const colorMatch = currentContext.color ? getColorMatch(currentContext.color) : undefined;

  if (!currentContext.gadgetType && electronicsRequest) {
    if (electronicsRequest.category === "laptop") {
      return { content: "What will you use the laptop for?", category: "laptop", context: { ...mergedContext, gadgetType: "laptop" }, quickActions: ["Programming", "Gaming", "Student", "Office Work", "Video Editing", "AI/ML"] };
    }
    return { content: `What is your budget for ${electronicsRequest.label} in BDT?`, category: electronicsRequest.category, context: { ...mergedContext, gadgetType: electronicsRequest.category }, quickActions: BDT_PRICE_RANGES.map((range) => range.label) };
  }

  if (!currentContext.sourceItemType && hasPant && targetShirt) {
    const sourceContext = { ...mergedContext, sourceItemType: "pant" as const, targetCategory: "shirt" as const, itemType: "pant" as const };
    if (!color) return { content: "What color are your pants? I’ll find matching shirt colors and products.", context: sourceContext, quickActions: getCatalogAttributeOptions(catalogProducts, "pant", "color") };
    const targetColors = getComplementaryColors("pant", color);
    return { content: `A ${color} pant pairs well with these shirt colors:\n\n${bullets(targetColors)}\n\nChoose a color and I’ll show matching shirt products in that color.`, context: { ...sourceContext, color, sourceColor: color, targetColors }, quickActions: targetColors };
  }
  if (!currentContext.sourceItemType && hasShirt && targetPant) {
    const sourceContext = { ...mergedContext, sourceItemType: "shirt" as const, targetCategory: "pant" as const, itemType: "shirt" as const };
    if (!color) return { content: "What color is your shirt? I’ll find matching pant colors and products.", context: sourceContext, quickActions: getCatalogAttributeOptions(catalogProducts, "shirt", "color") };
    const targetColors = getColorMatch(color).pants;
    return { content: `A ${color} shirt pairs well with these pant colors:\n\n${bullets(targetColors)}\n\nChoose a color and I’ll show matching pant products in that color.`, context: { ...sourceContext, color, sourceColor: color, targetColors }, quickActions: targetColors };
  }

  if (currentContext.sourceItemType && !currentContext.sourceColor && color) {
    const targetColors = getComplementaryColors(currentContext.sourceItemType === "t-shirt" ? "shirt" : currentContext.sourceItemType, color);
    const targetCategory = currentContext.targetCategory || (currentContext.sourceItemType === "pant" ? "shirt" : "pant");
    mergedContext.sourceColor = color;
    mergedContext.color = color;
    mergedContext.targetColors = targetColors;
    mergedContext.targetCategory = targetCategory;
    return {
      content: `A ${color} ${currentContext.sourceItemType} pairs well with these ${targetCategory} colors:\n\n${bullets(targetColors)}\n\nChoose a color and I’ll show matching ${targetCategory} products in that color.`,
      context: mergedContext,
      quickActions: targetColors,
    };
  }

  if (currentContext.sourceColor && currentContext.targetCategory && currentContext.targetColors && /\b(change|another|different)\b.*\bcolor\b|\bcolor\b.*\b(change|another|different)\b/.test(query)) {
    return {
      content: `Which ${currentContext.targetCategory} color would you prefer instead?`,
      context: { ...currentContext, targetColor: undefined },
      quickActions: currentContext.targetColors,
    };
  }

  if (currentContext.sourceColor && currentContext.targetCategory && currentContext.targetColors && !currentContext.targetColor) {
    const selectedTargetColor = currentContext.targetColors.find((targetColor) => query === normalize(targetColor) || query.includes(normalize(targetColor)));
    if (!selectedTargetColor) {
      return null;
    }
    const matchingProducts = catalogProducts.filter((product) => productIsInStock(product, currentContext.targetCategory!, selectedTargetColor));
    if (matchingProducts.length === 0) {
      const alternatives = currentContext.targetColors.filter((alternative) => alternative !== selectedTargetColor && catalogProducts.some((product) => productIsInStock(product, currentContext.targetCategory!, alternative)));
      return {
        content: alternatives.length > 0
          ? `Sorry, ${selectedTargetColor} ${currentContext.targetCategory} products are currently out of stock. These available colors also complement your ${currentContext.sourceColor} ${currentContext.sourceItemType || "item"}:`
          : `Sorry, ${selectedTargetColor} ${currentContext.targetCategory} products are currently out of stock, and I couldn’t find another matching color in stock.`,
        context: { ...currentContext, targetColor: undefined },
        quickActions: alternatives,
      };
    }
    const targetSizes = getCatalogAttributeOptions(matchingProducts, currentContext.targetCategory, "size", selectedTargetColor);
    const nextContext = { ...currentContext, targetColor: selectedTargetColor };
    return {
      content: targetSizes.length > 0
        ? `Here are ${currentContext.targetCategory} products in ${selectedTargetColor} that complement your ${currentContext.sourceColor} ${currentContext.sourceItemType || "item"}. What size do you need?`
        : `Here are ${currentContext.targetCategory} products in ${selectedTargetColor} that complement your ${currentContext.sourceColor} ${currentContext.sourceItemType || "item"}.`,
      search: currentContext.targetCategory,
      category: currentContext.targetCategory,
      searchColors: [selectedTargetColor],
      context: nextContext,
      quickActions: targetSizes,
    };
  }

  if (currentContext.targetCategory && currentContext.targetColor && !currentContext.size) {
    const targetSizes = getCatalogAttributeOptions(catalogProducts, currentContext.targetCategory, "size", currentContext.targetColor);
    const selectedSize = targetSizes.find((size) => query === size.toLowerCase() || query.includes(`size ${size.toLowerCase()}`));
    if (selectedSize) {
      mergedContext.size = selectedSize.toUpperCase();
      return {
        content: `Thanks. I’ll find ${currentContext.targetCategory} products in ${currentContext.targetColor}, size ${mergedContext.size}.`,
        search: currentContext.targetCategory,
        category: currentContext.targetCategory,
        searchColors: [currentContext.targetColor],
        context: mergedContext,
        quickActions: ["Add to Cart", "Buy Now"],
      };
    }
  }

  if (currentContext.itemType && !currentContext.color && color) {
    mergedContext.color = color;
    return {
      content: `Great choice. A ${color} ${currentContext.itemType} is easy to style. What would you like to match with your ${color} ${currentContext.itemType}?`,
      context: mergedContext,
      quickActions: ["Pant", "Shoes", "Watch", "Full Outfit", "Accessories"],
    };
  }

  if (currentContext.itemType && currentContext.color && !currentContext.need && (query === "pant" || query.includes("pant"))) {
    mergedContext.need = "pant";
    return {
      content: pantColors.length > 0
        ? `A ${currentContext.color} shirt is very versatile. These pant colors are available in the catalog: ${pantColors.join(", ")}. May I know where you plan to wear it?`
        : `A ${currentContext.color} shirt is very versatile. I’ll use the available pant inventory to find a match. May I know where you plan to wear it?`,
      context: mergedContext,
      quickActions: ["Casual", "Formal", "Business", "Wedding", "Party", "Date Night"],
    };
  }

  if (currentContext.need === "pant" && currentContext.color && !currentContext.occasion && occasion) {
    mergedContext.occasion = occasion;
    const recommendations = colorMatch?.pants || pantColors;
    return {
      content: recommendations.length > 0
        ? `For a ${occasion} look, these pant colors are available for your ${currentContext.color} shirt:\n\n${bullets(recommendations)}\n\nChoose a color and I’ll check its stored sizes and stock. Which color do you prefer?`
        : "I don’t have stored pant color options for this catalog yet. Tell me a pant color and I’ll search the available inventory.",
      context: mergedContext,
      quickActions: recommendations,
    };
  }

  if (currentContext.need === "pant" && currentContext.occasion && !currentContext.targetColor && (color || pantColors.some((option) => query.includes(option.toLowerCase())))) {
    const selectedColor = color || (colorMatch?.pants || pantColors).find((option) => query.includes(option.toLowerCase())) || "";
    mergedContext.targetColor = selectedColor;
    const selectedPantSizes = getCatalogAttributeOptions(catalogProducts, "pant", "size", selectedColor);
    if (selectedPantSizes.length === 0) {
      return { content: `Excellent. ${selectedColor} pants will work beautifully with your ${currentContext.color} shirt. I’ll show the available products now.`, context: mergedContext, search: `${selectedColor} pant`, category: "pant", quickActions: ["Show Shoes", "Show Watches", "Complete Outfit"] };
    }
    return { content: `Excellent. ${selectedColor} pants will work beautifully with your ${currentContext.color} shirt. What size are you looking for?`, context: mergedContext, quickActions: selectedPantSizes };
  }

  if (currentContext.need === "pant" && currentContext.occasion && !currentContext.targetColor && query.includes("show all")) {
    return { content: "Here are all the available pant colors for your occasion. Which color do you prefer?", context: mergedContext, quickActions: pantColors };
  }

  if (currentContext.need === "pant" && currentContext.targetColor && !currentContext.size) {
    const selectedSize = pantSizes.find((size) => query === size.toLowerCase() || query.includes(`size ${size.toLowerCase()}`));
    if (selectedSize) {
      mergedContext.size = selectedSize.toUpperCase();
      return { content: `Thanks. I’ll find ${mergedContext.targetColor} pants in size ${mergedContext.size} that pair well with your ${currentContext.color} shirt.`, search: `${mergedContext.targetColor} pant`, category: "pant", context: mergedContext, quickActions: ["Show Shoes", "Show Watches", "Complete Outfit"] };
    }
    if (pantSizes.length === 0) {
      return { content: `I’ll find the available ${mergedContext.targetColor} pants that pair well with your ${currentContext.color} shirt.`, search: `${mergedContext.targetColor} pant`, category: "pant", context: mergedContext, quickActions: ["Show Shoes", "Show Watches", "Complete Outfit"] };
    }
  }

  if (hasShirt && !color) return { content: "Great! What color is your shirt?", context: { ...mergedContext, itemType: query.includes("t-shirt") || query.includes("tshirt") || query.includes("polo") ? "t-shirt" : "shirt" }, quickActions: shirtColors };
  if (hasShirt && color && !currentContext.itemType) return { content: `Great choice. A ${color} shirt will give us a strong starting point. Where will you wear it?`, context: { ...mergedContext, itemType: query.includes("t-shirt") || query.includes("tshirt") || query.includes("polo") ? "t-shirt" : "shirt", color }, quickActions: ["Casual", "Office", "Business", "Wedding", "Party", "Date Night"] };
  if (hasPant && !color) return { content: "What color are your pants? I’ll suggest shirts, shoes, and accessories that work with them.", context: { ...mergedContext, itemType: "pant" }, quickActions: colors.slice(0, 8).map((item) => `${item} pants`) };

  if (query.includes("complete outfit") || query.includes("outfit")) return { content: "I can build a complete outfit. Tell me the occasion, preferred style, or a color you want to start with.", quickActions: ["Black shirt outfit", "Office outfit", "Wedding outfit", "Casual outfit"] };
  if (query.includes("shoe") || query.includes("sneaker") || query.includes("loafer")) return { content: `For a ${currentContext.color || "versatile"} shirt, these shoes work well:\n\n${bullets(colorMatch?.shoes || ["White Sneakers", "Brown Shoes", "Black Shoes"])}\n\nMatch your belt to the same color family as your shoes.`, search: "shoes", category: "shoes", quickActions: colorMatch?.shoes || ["White Sneakers", "Brown Shoes", "Black Shoes"] };
  if (query.includes("watch") || query.includes("timepiece") || query.includes("smartwatch")) return { content: `For a ${currentContext.color || "versatile"} shirt, these watch styles work well:\n\n${bullets(colorMatch?.watches || ["Silver Metal Watch", "Black Watch"])}\n\nA belt in the same family as your shoes keeps the outfit cohesive.`, search: "watch", category: "watch", quickActions: colorMatch?.watches || ["Silver Metal Watch", "Black Watch"] };

  if (hasShirt && color) {
    const matches = getColorMatch(color);
    return {
      content: `A ${color} shirt gives a clean and balanced look.\n\nRecommended Pants:\n${bullets(matches.pants)}\n\nRecommended Shoes:\n${bullets(matches.shoes)}\n\nRecommended Watches:\n${bullets(matches.watches)}\n\nBelt pairing:\n${bullets(matches.belt)}\n\nThese choices prioritize neutral colors, balanced contrast, and compatible color families.`,
      search: `${color} shirt`,
      quickActions: ["Show Matching Products", "Suggest Shoes", "Suggest Watch", "Complete Outfit"],
    };
  }

  if (hasPant && color) {
    const shirts = rules.pantToShirt[color as keyof typeof rules.pantToShirt] || [];
    return {
      content: `Your ${color} pants are easy to style.\n\nRecommended Shirts:\n${bullets(shirts.slice(0, 6))}\n\nI can also find matching shirts, shoes, watches, and accessories from the marketplace.`,
      search: `${color} shirt`,
      quickActions: ["Show Matching Products", "Suggest Shoes", "Suggest Watch"],
    };
  }

  if (currentContext.gadgetType === "laptop" && !currentContext.useCase) return { content: `Great. What is your budget for a ${prompt} laptop?`, context: { ...mergedContext, useCase: prompt.trim() }, quickActions: BDT_PRICE_RANGES.map((range) => range.label) };
  if (currentContext.gadgetType === "laptop" && currentContext.useCase && currentContext.priceMin === undefined) {
    const priceRange = parsePriceRange(prompt);
    if (priceRange) return { content: `I’ll show ${currentContext.useCase} laptops priced ${priceRange.label}.`, context: { ...mergedContext, budget: priceRange.label, priceMin: priceRange.min, priceMax: priceRange.max }, search: "laptop", category: "laptop", quickActions: ["Choose another budget"] };
  }

  if (currentContext.gadgetType && currentContext.priceMin === undefined) {
    const priceRange = parsePriceRange(prompt);
    if (priceRange) {
      const label = electronicsCategories.find((entry) => entry.category === currentContext.gadgetType)?.label || currentContext.gadgetType;
      const hasAvailableProduct = catalogProducts.some((product) => productIsInStockForCategory(product, currentContext.gadgetType!) && Number(product.price ?? 0) >= priceRange.min && (priceRange.max === undefined || Number(product.price ?? 0) <= priceRange.max));
      if (catalogProducts.length > 0 && !hasAvailableProduct) {
        return { content: `Sorry, I couldn’t find an in-stock ${label} in the ${priceRange.label} range. Please choose another BDT range.`, context: { ...mergedContext, budget: priceRange.label, priceMin: priceRange.min, priceMax: priceRange.max }, quickActions: BDT_PRICE_RANGES.filter((range) => range.label !== priceRange.label).map((range) => range.label) };
      }
      return { content: `I’ll show ${label} priced ${priceRange.label}.`, context: { ...mergedContext, budget: priceRange.label, priceMin: priceRange.min, priceMax: priceRange.max }, search: currentContext.gadgetType, category: currentContext.gadgetType, quickActions: ["Choose another budget"] };
    }
  }

  if (query.includes("tablet")) return { content: "Here are tablet options to explore. Tell me your budget or primary use for a tighter match.", search: "tablet" };
  if (query.includes("headphone") || query.includes("earbud")) return { content: "I can find headphones and earbuds by comfort, sound, gaming, or budget.", search: "headphones" };
  if (query.includes("pc") || query.includes("computer") || query.includes("build")) {
    return { content: "Let’s build a compatible PC. What is your budget and use case?\n\n• Gaming\n• Programming\n• Office\n• Video Editing\n• AI Training", search: "pc", quickActions: ["Gaming PC", "Programming PC", "Office PC", "AI / ML PC"] };
  }

  if (query.includes("trending")) return { content: "Here are the most-trending products available now.", productQuery: { sort: "trending" } };
  if (query.includes("deal") || query.includes("discount")) return { content: "I’ll show products with genuine current discounts.", productQuery: { sort: "deals" } };
  if (query.includes("new arrival") || query.includes("new product")) return { content: "Here are the latest products added to the marketplace.", productQuery: { sort: "newest" } };
  if (query.includes("top rated") || query.includes("rating")) return { content: "Here are highly rated products with established customer feedback.", productQuery: { sort: "topRated", minReviewCount: 10 } };

  return null;
}
