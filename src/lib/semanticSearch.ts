import { TYPO_TO_CANONICAL_CATEGORY } from "./categoryTypos";

export interface SearchProductLike {
  name?: string;
  tags?: string;
  description?: string;
  shortDescription?: string;
  rating?: number;
  soldCount?: number;
  price?: number;
}

// Common typo & misspelling dictionary mapping to canonical terms
const typoDictionary: Record<string, string> = {
  ...TYPO_TO_CANONICAL_CATEGORY,
  catagory: "category",
  catgory: "category",
  kategori: "category",
  cetegory: "category",
  headfone: "headphone",
  hedfone: "headphone",
  headphon: "headphone",
  hedphone: "headphone",
  headfon: "headphone",
  earbud: "earbuds",
  erbud: "earbuds",
  earbudz: "earbuds",
  shose: "shoes",
  shoose: "shoes",
  shus: "shoes",
  panjabi: "panjabi",
  punjabi: "panjabi",
  ponjabi: "panjabi",
  fashoin: "fashion",
  fashon: "fashion",
  fasion: "fashion",
  saree: "saree",
  sari: "saree",
  shari: "saree",
  shirtt: "t-shirt",
  tshrt: "t-shirt",
  tshirtt: "t-shirt",
  watchh: "watch",
  wath: "watch",
  smartwac: "smartwatch",
  smartwatc: "smartwatch",
  notificattionn: "notification",
  notificattion: "notification",
  notifacation: "notification",
  chekouut: "checkout",
  chkout: "checkout",
  chekout: "checkout",
  elctronics: "electronics",
  elektronics: "electronics",
  invetory: "inventory",
  priceing: "pricing",
  analtics: "analytics",
  rakib: "rakib",
};

const intentWeights: Record<string, number> = {
  elegant: 9,
  dinner: 8,
  formal: 7,
  work: 6,
  office: 6,
  casual: 5,
  outdoor: 5,
  comfy: 4,
  party: 6,
  wedding: 7,
  travel: 5,
  gift: 4,
  comfortable: 4,
  stylish: 4,
  trendy: 3,
};

const synonymMap: Record<string, string[]> = {
  elegant: ["elegant", "polished", "refined"],
  dinner: ["dinner", "evening", "cocktail"],
  formal: ["formal", "smart", "dressy"],
  work: ["work", "office", "professional"],
  casual: ["casual", "everyday", "relaxed"],
  outdoor: ["outdoor", "outdoors", "travel", "weekend"],
};

const searchStopWords = new Set([
  "a", "an", "and", "are", "buy", "can", "could", "for", "find", "give", "i",
  "me", "my", "need", "of", "please", "search", "show", "some", "the",
  "to", "want", "would", "you",
]);

export function calculateLevenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function normalizeQueryWithTypoCorrection(text: string): string {
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const corrected = tokens.map((token) => {
    if (typoDictionary[token]) {
      return typoDictionary[token];
    }
    // Check fuzzy match against typo dictionary keys
    for (const [typo, canonical] of Object.entries(typoDictionary)) {
      if (Math.abs(token.length - typo.length) <= 2 && calculateLevenshteinDistance(token, typo) <= 1) {
        return canonical;
      }
    }
    return token;
  });
  return corrected.join(" ");
}

function tokenize(text: string): string[] {
  const normalized = normalizeQueryWithTypoCorrection(text);
  return normalized.split(/\s+/).filter(Boolean);
}

export function extractSearchTerms(text: string): string[] {
  const normalized = normalizeQueryWithTypoCorrection(text);
  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 1 && !searchStopWords.has(token));
}

export function scoreProductForSearch(product: SearchProductLike, query: string): number {
  const queryTokens = tokenize(query);
  const haystack = [
    product.name || "",
    product.tags || "",
    product.description || "",
    product.shortDescription || "",
  ].join(" ");
  const haystackTokens = haystack.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);

  let score = 0;

  for (const token of queryTokens) {
    if (haystackTokens.includes(token)) {
      score += 8;
      continue;
    }

    // Check fuzzy similarity to haystack tokens
    const fuzzyMatch = haystackTokens.some(
      (hToken) => Math.abs(hToken.length - token.length) <= 2 && calculateLevenshteinDistance(token, hToken) <= 2
    );
    if (fuzzyMatch) {
      score += 6;
      continue;
    }

    for (const [intent, variants] of Object.entries(synonymMap)) {
      if (token === intent) {
        if (variants.some((variant) => haystackTokens.includes(variant))) {
          score += intentWeights[intent] || 4;
        }
      }
    }
  }

  const explicitMatches = queryTokens.filter((token) => haystackTokens.includes(token));
  if (explicitMatches.length > 0) {
    score += explicitMatches.length * 2;
  }

  if (typeof product.rating === "number") score += product.rating * 3;
  if (typeof product.soldCount === "number") score += Math.min(product.soldCount, 20) * 0.3;
  if (typeof product.price === "number") score += product.price < 150 ? 2 : 1;

  return score;
}
