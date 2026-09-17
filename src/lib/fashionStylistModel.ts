export interface FashionFeatures {
  occasion: string;
  season: string;
  colors: string[];
  style: string;
  message: string;
}

export interface FashionProductLike {
  name?: string;
  tags?: string;
  price?: number;
  rating?: number;
  soldCount?: number;
}

export function extractFashionFeatures(message: string): FashionFeatures {
  const text = message.toLowerCase();

  const occasionText = text.replace("weeding", "wedding");
  
  const occasion = [
    "job interview",
    "university presentation",
    "wedding",
    "date night",
    "casual brunch",
    "business casual",
    "cocktail party",
    "outdoor event",
    "traditional",
    "eid",
    "puja",
    "travel",
    "gym workout",
  ].find((value) => occasionText.includes(value)) ?? "";

  const season = ["spring", "summer", "autumn", "winter"].find((value) => text.includes(value)) ?? "";

  const colorMatches = [
    "black",
    "white",
    "navy",
    "blue",
    "red",
    "green",
    "yellow",
    "pink",
    "purple",
    "orange",
    "beige",
    "brown",
    "gray",
    "grey",
    "cream",
    "olive",
    "rust",
    "teal",
    "coral",
    "burgundy",
    "emerald",
    "lavender",
    "mint",
    "peach",
    "mustard",
    "camel",
  ].filter((value) => text.includes(value));

  const style = ["classic", "minimalist", "bohemian", "modern", "romantic", "edgy", "sporty", "preppy", "traditional", "ethnic", "bengali"].find((value) => text.includes(value)) ?? "classic";

  const messageHint = text.includes("polished") || text.includes("smart") ? "elevated" : "balanced";

  return {
    occasion,
    season,
    colors: colorMatches.length > 0 ? colorMatches : ["neutral"],
    style,
    message: messageHint,
  };
}

export function scoreProductForFeatures(product: FashionProductLike, features: FashionFeatures): number {
  const tags = (product.tags || "").toLowerCase();
  const name = (product.name || "").toLowerCase();
  const haystack = `${tags} ${name}`;

  let score = 0;

  if (features.occasion && haystack.includes(features.occasion.toLowerCase())) {
    score += 25;
  }

  if (features.season && haystack.includes(features.season.toLowerCase())) {
    score += 15;
  }

  for (const color of features.colors) {
    if (haystack.includes(color.toLowerCase())) {
      score += 12;
    }
  }

  if (features.style && haystack.includes(features.style.toLowerCase())) {
    score += 18;
  }

  if (haystack.includes("blazer") || haystack.includes("shirt") || haystack.includes("dress") || haystack.includes("suit") || haystack.includes("trousers") || haystack.includes("loafers")) {
    score += 8;
  }

  if (typeof product.rating === "number") {
    score += product.rating * 4;
  }

  if (typeof product.soldCount === "number") {
    score += Math.min(product.soldCount, 20) * 0.5;
  }

  if (typeof product.price === "number") {
    score += product.price < 150 ? 4 : 2;
  }

  return score;
}
