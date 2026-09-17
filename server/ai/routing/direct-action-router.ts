import { getDb } from "../../../api/queries/connection.ts";
import { products } from "../../../db/schema.ts";
import { eq } from "../../../db/mysql.ts";
import {
  getComplementaryColors,
  getColorMatch,
  productMatchesColor,
  type CatalogProduct,
} from "../../../src/lib/clevoraLocalEngine.ts";
import { getSessionService } from "../conversation/session-service.ts";
import { getWorkflowOrchestrator } from "../support/workflow-orchestrator.ts";
import { getSupportResponseComposer } from "../support/response-composer.ts";

export interface DirectActionResult {
  messageId: number;
  sessionId: string;
  content: string;
  intent: string;
  domain: "support" | "fashion";
  structuredResponse?: unknown;
}

const fashionColors = [
  "navy blue", "light blue", "royal blue", "dark blue", "forest green",
  "light pink", "dusty pink", "neon green", "navy", "white", "black",
  "grey", "gray", "red", "maroon", "burgundy", "emerald", "olive",
  "mint", "teal", "sage", "pink", "purple", "lavender", "yellow",
  "mustard", "gold", "orange", "brown", "cream", "beige", "charcoal",
  "khaki", "coral", "silver", "tan",
];

function findColor(query: string): string | undefined {
  return [...fashionColors]
    .sort((first, second) => second.length - first.length)
    .find((color) => query.includes(color));
}

function isFashionMatchQuery(message: string, domain?: string): boolean {
  const query = message.trim().toLowerCase();
  if (query === "fashion") return true;
  const hasClothing = /\b(shirt|t-?shirt|polo|pant|trouser|jean|chino)\b/.test(query);
  const hasMatchingSignal = /\b(match(?:ing)?|pair|go with|find|need|want|suggest|color|colour|price|budget|under|below|bdt|৳)\b/.test(query);
  const isExplicitColorOrPriceMatch = /\b(color|colour|price|budget|under|below|bdt|৳)\b/.test(query);
  return (hasClothing && hasMatchingSignal) || (domain === "fashion" && isExplicitColorOrPriceMatch && hasMatchingSignal);
}

function productCategoryMatches(product: CatalogProduct, category: "shirt" | "pant"): boolean {
  const text = `${product.name || ""} ${product.categoryName || ""}`.toLowerCase();
  return category === "shirt"
    ? /shirt|t-?shirt|top|polo|kurti|panjabi|dress/.test(text)
    : /pant|trouser|jean|chino|pajama/.test(text);
}

function parseMaxPrice(query: string): number | undefined {
  const match = query.replace(/,/g, "").match(/(?:under|below|less than|budget(?: of)?|upto|up to)\s*(?:bdt|৳)?\s*(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

async function directFashionResponse(message: string, context: any = {}): Promise<{ content: string; structuredResponse: unknown }> {
  const query = message.toLowerCase();
  if (query.trim() === "fashion") {
    return {
      content: "Fashion matching is ready. Tell me whether you have a shirt or pant, plus its color, and I will find matching products.",
      structuredResponse: { quickActions: ["I have a shirt, find matching pant", "I have a pant, find matching shirt", "Find shirts under 3000 BDT", "Find pants under 5000 BDT"] },
    };
  }

  const sourceCategory: "shirt" | "pant" | undefined = /\b(have|own|wearing|already have)\b.*\b(shirt|t-?shirt|polo)\b/.test(query)
    ? "shirt"
    : /\b(have|own|wearing|already have)\b.*\b(pant|trouser|jean|chino)\b/.test(query)
      ? "pant"
      : context.sourceItemType;
  const requestedShirt = /\b(find|need|want|suggest|matching)\s+(?:a\s+|some\s+)?(?:shirt|t-?shirt|polo)/.test(query);
  const requestedPant = /\b(find|need|want|suggest|matching)\s+(?:a\s+|some\s+)?(?:pant|trouser|jean|chino)/.test(query);
  const targetCategory: "shirt" | "pant" = requestedShirt
    ? "shirt"
    : requestedPant
      ? "pant"
      : sourceCategory === "shirt" ? "pant" : "shirt";
  const sourceColor = findColor(query) || context.sourceColor || context.color;
  const targetColor = findColor(query.replace(sourceColor || "", "")) || context.targetColor;
  const colors = sourceColor
    ? sourceCategory === "pant" ? getComplementaryColors("pant", sourceColor) : getColorMatch(sourceColor).pants
    : context.targetColors || [];
  const requestedColors = targetColor ? [targetColor] : colors;
  const maxPrice = parseMaxPrice(query) ?? context.priceMax;

  const db = getDb();
  const rows = await db.select().from(products).where(eq(products.status, "active")).limit(500);
  const catalogProducts = rows as unknown as CatalogProduct[];
  const matches = catalogProducts.filter((product) => {
    if (!productCategoryMatches(product, targetCategory)) return false;
    if (maxPrice !== undefined && Number((product as any).price || 0) > maxPrice) return false;
    return requestedColors.length === 0 || productMatchesColor(product, requestedColors);
  }).slice(0, 8);

  const matchingText = requestedColors.length > 0 ? ` in ${requestedColors.join(" or ")}` : "";
  const priceText = maxPrice !== undefined ? ` under BDT ${maxPrice.toLocaleString()}` : "";
  return {
    content: matches.length > 0
      ? `I found ${matches.length} matching ${targetCategory}${matchingText}${priceText}.`
      : `I could not find an in-stock ${targetCategory}${matchingText}${priceText} in the catalog. Try another color or budget.`,
    structuredResponse: {
      sourceColor,
      targetCategory,
      requestedColors,
      maxPrice,
      products: matches,
      ruleBased: true,
    },
  };
}

export async function handleDirectAction(input: {
  message: string;
  sessionId: string;
  userId?: number;
  domain?: string;
  context?: any;
}): Promise<DirectActionResult | null> {
  const query = input.message.trim();
  const isSupportAction = input.domain === "support" || /^(support|help center)$/i.test(query);
  const isFashionAction = isFashionMatchQuery(query, input.domain);
  if (!isSupportAction && !isFashionAction) return null;

  const sessions = getSessionService();
  await sessions.getOrCreateSession(input.sessionId, input.userId, isSupportAction ? "support" : "fashion");
  await sessions.addMessage(input.sessionId, "user", query);

  let content: string;
  let intent: string;
  let structuredResponse: unknown;
  if (isSupportAction) {
    const orchestration = await getWorkflowOrchestrator().orchestrate(input.sessionId, query, input.userId);
    const response = getSupportResponseComposer().compose(orchestration);
    content = response.rawFallbackText || response.summary;
    intent = orchestration.intent;
    structuredResponse = response;
  } else {
    const response = await directFashionResponse(query, input.context);
    content = response.content;
    intent = "fashion_rule_match";
    structuredResponse = response.structuredResponse;
  }

  const messageId = await sessions.addMessage(input.sessionId, "assistant", content);
  return {
    messageId,
    sessionId: input.sessionId,
    content,
    intent,
    domain: isSupportAction ? "support" : "fashion",
    structuredResponse,
  };
}