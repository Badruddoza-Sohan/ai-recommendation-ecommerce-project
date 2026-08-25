export type FashionIntent = 
  | "outfit" 
  | "color" 
  | "seasonal" 
  | "occasion" 
  | "style" 
  | "trends"
  | "greeting" 
  | "thanks" 
  | "goodbye"
  | "general";

export interface FashionNlpResult {
  intent: FashionIntent;
  confidence: number;
  occasion?: string;
  season?: string;
  colors?: string[];
  style?: string;
  originalText: string;
}

// Common typos and mappings
const TYPO_MAP: Record<string, string> = {
  "weeding": "wedding",
  "weding": "wedding",
  "drees": "dress",
  "shart": "shirt",
  "biye": "wedding",
  "biyete": "wedding",
  "rong": "color",
  "posak": "outfit",
  "outfitt": "outfit",
  "intervew": "job interview",
  "interview": "job interview",
  "traditionnal": "traditional",
  "panjabi": "traditional",
  "punjabi": "traditional",
  "saree": "traditional",
  "shari": "traditional",
  "sherwani": "traditional",
  "lehenga": "traditional",
  "kurti": "traditional",
};

// Intent keyword weights
const INTENT_KEYWORDS: Record<FashionIntent, Record<string, number>> = {
  outfit: {
    "outfit": 3, "wear": 2, "dress": 2, "clothes": 2, "cloth": 2, "recommend": 2, "suggest": 2, "porbo": 2, "ki porbo": 2, "posak": 2, "look": 2.5, "panjabi": 3, "punjabi": 3, "saree": 3, "shari": 3, "suit": 2.5, "kurti": 2.5
  },
  color: {
    "color": 2, "colour": 2, "match": 1.5, "goes with": 2, "palette": 1.5, "rong": 2, "shathe ki": 1.5
  },
  seasonal: {
    "season": 2, "spring": 2, "summer": 2, "autumn": 2, "winter": 2, "fall": 2, "gorom": 1.5, "shit": 1.5
  },
  occasion: {
    "occasion": 2, "event": 1.5, "party": 1.5, "wedding": 2, "date": 1.5, "interview": 2, "function": 1.5, "eid": 2, "puja": 2, "biye": 2
  },
  style: {
    "style": 2, "vibe": 1.5, "aesthetic": 1.5, "look": 1.5, "fashionable": 1
  },
  trends: {
    "trend": 2, "trending": 2, "popular": 1.5, "in style": 1.5, "nowadays": 1
  },
  greeting: {
    "hi": 2, "hello": 2, "hey": 2, "good morning": 2, "good evening": 2, "as-salamu alaykum": 2, "salam": 2
  },
  thanks: {
    "thanks": 2, "thank you": 2, "dhonnobad": 2, "appreciate it": 1.5, "awesome": 1
  },
  goodbye: {
    "bye": 2, "goodbye": 2, "see you": 1.5, "cya": 1
  },
  general: {} // Fallback
};

const SEASONS = ["spring", "summer", "autumn", "winter", "fall"];
const COLORS = ["navy", "black", "white", "beige", "gray", "grey", "brown", "cream", "olive", "burgundy", "emerald", "red", "blue", "green", "yellow", "pink", "purple", "orange", "teal", "coral", "gold", "silver"];
const OCCASIONS = ["job interview", "university presentation", "wedding", "date night", "casual brunch", "business casual", "cocktail party", "outdoor event", "travel", "gym workout", "traditional", "eid", "puja"];
const STYLE_TYPES = ["classic", "minimalist", "bohemian", "modern", "romantic", "edgy", "sporty", "preppy"];

/**
 * Normalizes text, handling typos and standardizing spaces.
 */
function normalizeText(text: string): string {
  let lower = text.toLowerCase().trim();
  
  // Replace typos
  for (const [typo, replacement] of Object.entries(TYPO_MAP)) {
    // Word boundary regex
    const regex = new RegExp(`\\b${typo}\\b`, 'g');
    lower = lower.replace(regex, replacement);
  }
  
  return lower;
}

/**
 * Extracts entities (season, colors, occasion, style) from text.
 */
function extractEntities(normalizedText: string) {
  let season: string | undefined;
  let occasion: string | undefined;
  let style: string | undefined;
  const colors: string[] = [];

  // Extract Season
  for (const s of SEASONS) {
    if (normalizedText.includes(s)) {
      season = s === "fall" ? "autumn" : s;
      break;
    }
  }

  // Extract Colors
  for (const c of COLORS) {
    if (new RegExp(`\\b${c}\\b`).test(normalizedText)) {
      if (!colors.includes(c)) {
        colors.push(c);
      }
    }
  }

  // Extract Occasion (fuzzy match)
  const foundOccasions: string[] = [];

  // Direct keyword check for short words like gym, eid, biye
  if (/\bgym\b|\bworkout\b|\bfitness\b|\bsports\b/.test(normalizedText)) {
    foundOccasions.push("gym workout");
  } else if (/\beid\b/.test(normalizedText)) {
    foundOccasions.push("eid");
  } else if (/\boffice\b|\bwork\b/.test(normalizedText)) {
    foundOccasions.push("office");
  } else if (/\bholud\b/.test(normalizedText)) {
    foundOccasions.push("holud");
  } else if (/\bmehendi\b/.test(normalizedText)) {
    foundOccasions.push("mehendi");
  } else if (/\bboishakh\b/.test(normalizedText)) {
    foundOccasions.push("pohela boishakh");
  }

  for (const occ of OCCASIONS) {
    // Check full phrase first
    if (normalizedText.includes(occ)) {
      foundOccasions.push(occ);
      continue;
    }
    
    // Check keywords in occasion (e.g., "interview", "wedding", "gym")
    const occKeywords = occ.split(" ").filter((w: string) => w.length >= 3);
    for (const kw of occKeywords) {
      if (new RegExp(`\\b${kw}\\b`).test(normalizedText)) {
        foundOccasions.push(occ); // Map back to full occasion name
        break;
      }
    }
  }

  if (foundOccasions.includes("traditional") && foundOccasions.includes("wedding")) {
    occasion = "traditional wedding";
  } else if (foundOccasions.length > 0) {
    occasion = foundOccasions[0];
  }

  // Extract Style
  for (const st of STYLE_TYPES) {
    if (normalizedText.includes(st)) {
      style = st;
      break;
    }
  }

  return { season, occasion, colors, style };
}

/**
 * Classifies the intent of a fashion-related user message using a scoring system.
 */
export function classifyFashionIntent(text: string): FashionNlpResult {
  const normalizedText = normalizeText(text);
  const entities = extractEntities(normalizedText);
  
  const scores: Record<FashionIntent, number> = {
    outfit: 0, color: 0, seasonal: 0, occasion: 0, style: 0, trends: 0, greeting: 0, thanks: 0, goodbye: 0, general: 0
  };

  // Score based on keywords
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const [kw, weight] of Object.entries(keywords)) {
      if (new RegExp(`\\b${kw}\\b`).test(normalizedText)) {
        scores[intent as FashionIntent] += weight;
      }
    }
  }

  // Score boosts based on extracted entities
  if (entities.occasion) {
    scores.outfit += 2.5;
    scores.occasion += 1.0;
  }
  if (entities.season) {
    scores.seasonal += 1.5;
  }
  if (entities.colors.length > 0) {
    scores.color += 1.5;
  }
  if (entities.style) {
    scores.style += 1.5;
  }

  // Question patterns
  if (normalizedText.startsWith("what should i wear") || normalizedText.includes("what to wear")) {
    scores.outfit += 3;
  }
  if (normalizedText.includes("what goes with") || normalizedText.includes("match with")) {
    scores.color += 3;
  }
  if (normalizedText.includes("what's trending") || normalizedText.includes("whats trending")) {
    scores.trends += 3;
  }
  
  // Find highest score
  let bestIntent: FashionIntent = "general";
  let maxScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestIntent = intent as FashionIntent;
    }
  }

  // Exact matches for short phrases
  if (normalizedText === "hi" || normalizedText === "hello" || normalizedText === "hey") {
    bestIntent = "greeting";
    maxScore = 5;
  } else if (normalizedText === "thanks" || normalizedText === "thank you") {
    bestIntent = "thanks";
    maxScore = 5;
  }

  // Confidence is a rough heuristic based on score
  // If score is 0, we're not confident at all. If it's >= 3, we're very confident.
  let confidence = 0;
  if (maxScore > 0) {
     confidence = Math.min(1.0, maxScore / 4.0);
  }

  // Special case: if we found an occasion but intent is still general, assume outfit recommendation
  if (bestIntent === "general" && entities.occasion) {
    bestIntent = "outfit";
    confidence = 0.6;
  }

  return {
    intent: bestIntent,
    confidence,
    ...entities,
    originalText: text
  };
}
