/**
 * Local Deterministic NLP Classifier & Entity Extractor for MarketVerse
 *
 * Fast (<1ms), zero-dependency, private, deterministic intent classification
 * and entity extraction supporting English, Bengali, and Banglish.
 */

export type VoiceIntentLabel =
  | "wake_word"
  | "search"
  | "navigate"
  | "add_to_cart"
  | "checkout"
  | "help"
  | "greeting"
  | "conversational"
  | "shopping_advice"
  | "capabilities"
  | "order"
  | "stop"
  | "confirm"
  | "cancel_action"
  | "repeat"
  | "page_description"
  | "read_products"
  | "select_option"
  | "go_back"
  | "go_forward"
  | "resume"
  | "unknown";

export type SupportIntentLabel =
  | "order"
  | "shipping"
  | "returns"
  | "payment"
  | "account"
  | "product"
  | "unknown";

export interface IntentResult<TLabel extends string> {
  label: TLabel;
  confidence: number;
  reason: string;
}

export interface ExtractedEntities {
  productName?: string;
  orderId?: string;
  targetPage?: string;
  normalizedText: string;
}

export interface LocalAction {
  intent: VoiceIntentLabel | SupportIntentLabel;
  searchQuery?: string;
  orderId?: string;
  targetPage?: string;
  confidence: number;
}

const VOICE_RULES: Array<{
  label: VoiceIntentLabel;
  regex: RegExp;
  confidence: number;
  reason: string;
}> = [
  // 0. Standalone Wake Words ("Hey Dev", "Hi Dev", "Dev", "Shuno Dev", "MarketVerse")
  {
    label: "wake_word",
    regex: /^(?:hey\s+dev|hi\s+dev|hello\s+dev|ok\s+dev|okay\s+dev|listen\s+dev|yo\s+dev|shuno\s+dev|dev\s+shuno|ei\s+dev|dev\s+bhai|hey\s+assistant|hi\s+assistant|hello\s+assistant|marketverse|dev)[!?,.]?$/i,
    confidence: 0.99,
    reason: "Matched wake word invocation",
  },
  // 1. Immediate Stop / Silence / Barge-in commands (English + Bengali + Banglish)
  {
    label: "stop",
    regex: /\b(stop|quiet|stay quiet|be quiet|shut up|silence|pause|cancel speech|stop talking|hush|thamo|thamun|thamo dev|bondho koro|chup|chup koro|ar bolona|shant hou)\b/i,
    confidence: 0.99,
    reason: "Matched stop/silence command",
  },
  // 2. Affirmative Confirmation commands ("yes", "confirm", "ha", "thik ache", "place order")
  {
    label: "confirm",
    regex: /^(yes|yeah|yep|yup|sure|confirm|do it|ha|hae|thik ache|hobe|koro|confirm koro|place order|confirm order|place the order|submit)$/i,
    confidence: 0.98,
    reason: "Matched confirmation phrasing",
  },
  // 3. Continue / Resume commands ("continue", "resume", "proceed", "keep going")
  {
    label: "resume",
    regex: /\b(continue|resume|keep going|proceed|keep talking|cholo|shuru koro|chalu koro)\b/i,
    confidence: 0.97,
    reason: "Matched continue/resume phrasing",
  },
  // 4. Negative Cancellation commands ("no", "cancel", "na", "bad dao")
  {
    label: "cancel_action",
    regex: /^(no|nope|cancel|abort|don't|dont|stop|do not|never mind|na|lagbe na|bad dao|cancel koro)$/i,
    confidence: 0.98,
    reason: "Matched cancellation phrasing",
  },
  // 5. Repeat / Explain commands ("repeat", "say again", "abar bolo")
  {
    label: "repeat",
    regex: /\b(repeat|say again|what did you say|say that again|speak again|repeat that|abar bolo|abar bolun|bujhini|ki bolle)\b/i,
    confidence: 0.95,
    reason: "Matched repeat speech phrasing",
  },
  // 6. Page description / "where am I" commands
  {
    label: "page_description",
    regex: /\b(where am i|what page|which page|describe this page|what is this page|what can i do|what can i do here|ami kothai|ei page ta ki|page ta bolo)\b/i,
    confidence: 0.96,
    reason: "Matched page description phrasing",
  },
  // 7. Read products commands
  {
    label: "read_products",
    regex: /\b(read products|read the products|list products|tell me the products|read first product|read next product|read previous product|next product|previous product|product gulo bolo|product bolo|porar product)\b/i,
    confidence: 0.95,
    reason: "Matched product reading phrasing",
  },
  // 8. Go back command
  {
    label: "go_back",
    regex: /^(go back|back|previous page|pechone jao|pechone|age r page)$/i,
    confidence: 0.95,
    reason: "Matched go back phrasing",
  },
  // 9. Go forward command
  {
    label: "go_forward",
    regex: /^(go forward|forward|next page|shamne jao|shamne|porer page)$/i,
    confidence: 0.95,
    reason: "Matched go forward phrasing",
  },
  // 10. Capabilities & Features ("what can you do", "how do you work", "help")
  {
    label: "capabilities",
    regex: /\b(what can you do|what do you do|how do you work|how can you help|what are your features|your abilities|what can dev do|tumi ki korte paro|ki ki korte paro|tumar kaj ki)\b/i,
    confidence: 0.96,
    reason: "Matched capabilities inquiry",
  },
  // 11. Shopping Advice & Recommendations ("what should I buy", "gift ideas", "best deals")
  {
    label: "shopping_advice",
    regex: /\b(what should i buy|gift idea|gift ideas|gift suggestion|recommend a product|recommend something|best deals|popular items|top rated|what is trending|hot deals|bhalo product|offer ki|deal ki|kichu suggest koro)\b/i,
    confidence: 0.95,
    reason: "Matched shopping advice phrasing",
  },
  // 12. Conversational / Smalltalk queries (English + Bengali + Banglish)
  {
    label: "conversational",
    regex: /\b(can you hear|are you listening|are you there|hear me|who are you|what is your name|who created you|who made you|how are you|are you real|are you an ai|tell me a joke|tell a joke|say a joke|joke|thank you|thanks|good job|nice|cool|awesome|shunte paccho|kemon acho|tumi ke|dhonnobad)\b/i,
    confidence: 0.95,
    reason: "Matched conversational phrasing",
  },
  // 13. Order inquiries / tracking (English + Bengali + Banglish)
  {
    label: "order",
    regex: /\b(order|orders|my orders|see my orders|view my orders|view orders|show my orders|show orders|open my orders|open orders|check my orders|check orders|track my order|track order|order history|past orders|order status|order page|order dekhao|amar order|order kothay|order track koro)\b/i,
    confidence: 0.96,
    reason: "Matched order inquiry phrasing",
  },
  // 14. Add to Cart commands
  {
    label: "add_to_cart",
    regex: /\b(add|put|buy|purchase)(\s+to)?\s+(this|it|that)?(?:\s+item)?\s*(to)?\s*(my\s+)?cart\b|\badd\s+to\s+cart\b|\bcart e (rakho|dao|jog koro)\b/i,
    confidence: 0.95,
    reason: "Matched cart purchase phrasing",
  },
  // 15. Checkout commands
  {
    label: "checkout",
    regex: /\b(checkout|proceed to checkout|voice checkout|pay now|order place koro|kinte chai|buy now|buy this|purchase this|order this)\b/i,
    confidence: 0.95,
    reason: "Matched checkout phrasing",
  },
  // 16. Help commands
  {
    label: "help",
    regex: /\b(help|help me|sahajjo|sahajjo koro|what is this|guide me)\b/i,
    confidence: 0.9,
    reason: "Matched help phrasing",
  },
  // 17. Navigation commands (Specific pages across MarketVerse)
  {
    label: "navigate",
    regex: /\b(go to|open|navigate to|take me to|show me|visit|see|view|continue shopping|shop more|keep shopping|jao|cholo|open koro)\b(?:\s+(?:the|my|our|page))?\s*(home|main|products|catalog|catalogue|cart|shopping bag|basket|checkout|orders|my orders|profile|account|support|customer service|fashion stylist|stylist|ai assistant|ai chat|deals)?\b|\b(home page|products page|cart page|orders page|profile page|support page|fashion stylist)\b/i,
    confidence: 0.92,
    reason: "Matched page navigation phrasing",
  },
  // 18. Greetings
  {
    label: "greeting",
    regex: /^(hello|hi|hey|hey dev|hi dev|hello dev|good morning|good afternoon|good evening|salam|assalamu alaikum|nomoshkar)\b/i,
    confidence: 0.85,
    reason: "Matched greeting phrasing",
  },
  // 19. Product Option Selection commands ("select 1", "option 2", "select option 12", "first one", "1", "2", "ek number ta")
  {
    label: "select_option",
    regex: /^(?:select|choose|pick|buy|take)?\s*(?:option|number|item|no)?\s*([1-9]\d*|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|ek|dui|teen|tin|char|paach|pach|chhoy|saat|aat|noy)(?:\s*(?:number|no|option|item|ta|ti|one))?$|\b(?:select\s+(?:option\s+)?|choose\s+(?:option\s+)?|pick\s+(?:option\s+)?|option\s+|number\s+|item\s+|buy\s+option\s+|buy\s+item\s+|buy\s+number\s+)([1-9]\d*|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|ek|dui|teen|tin|char|paach|pach|chhoy|saat|aat|noy)\b|\b(first\s+one|second\s+one|third\s+one|1st\s+one|2nd\s+one|3rd\s+one|prothom\s+ta|ek\s+number\s+ta|dui\s+number\s+ta|tin\s+number\s+ta)\b/i,
    confidence: 0.98,
    reason: "Matched product option selection phrasing",
  },
  // 20. Search queries (negative lookahead avoids false positives for navigation pages and option numbers)
  {
    label: "search",
    regex: /\b(search|find|look for|looking for|show me|discover|browse|i need|i want|i would like|get me|buy|khujo|khuje dao|dekhao|kinte chai)\b(?!\s+(?:orders?|cart|checkout|profile|account|home|page|support|stylist|option\s+[0-9]|number\s+[0-9]|[0-9]\b))/i,
    confidence: 0.88,
    reason: "Matched search phrasing",
  },
];

const SUPPORT_RULES: Array<{
  label: SupportIntentLabel;
  regex: RegExp;
  confidence: number;
  reason: string;
}> = [
  {
    label: "order",
    regex: /\b(order|track|tracking|delivery|where is my order|my order|order number)\b/i,
    confidence: 0.95,
    reason: "Matched order tracking phrasing",
  },
  {
    label: "shipping",
    regex: /\b(shipping|delivery|arrive|arrives|ship|postage|dispatch)\b/i,
    confidence: 0.9,
    reason: "Matched shipping phrasing",
  },
  {
    label: "returns",
    regex: /\b(return|refund|exchange|cancel)\b/i,
    confidence: 0.9,
    reason: "Matched returns phrasing",
  },
  {
    label: "payment",
    regex: /\b(payment|pay|card|bkash|nagad|cod|cash on delivery|charge|invoice)\b/i,
    confidence: 0.9,
    reason: "Matched payment phrasing",
  },
  {
    label: "account",
    regex: /\b(account|login|password|signup|profile|email|address)\b/i,
    confidence: 0.85,
    reason: "Matched account phrasing",
  },
  {
    label: "product",
    regex: /\b(price|stock|available|size|color|warranty|authentic|quality)\b/i,
    confidence: 0.8,
    reason: "Matched product query phrasing",
  },
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s\u0980-\u09FF]/g, " ")
    .replace(/\s+/g, " ");
}

export function classifyVoiceIntent(transcript: string): IntentResult<VoiceIntentLabel> {
  const normalized = normalizeText(transcript);

  for (const rule of VOICE_RULES) {
    if (rule.regex.test(normalized) || rule.regex.test(transcript)) {
      return {
        label: rule.label,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  return {
    label: "unknown",
    confidence: 0.2,
    reason: "No local voice intent pattern matched",
  };
}

export function classifySupportIntent(message: string): IntentResult<SupportIntentLabel> {
  const normalized = normalizeText(message);

  for (const rule of SUPPORT_RULES) {
    if (rule.regex.test(normalized)) {
      return {
        label: rule.label,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  return {
    label: "unknown",
    confidence: 0.15,
    reason: "No local support intent pattern matched",
  };
}

export function extractTargetPage(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/\b(home|main|start|home page|main page)\b/i.test(lower)) return "/";
  if (/\b(products?|catalog|catalogue|shop|store|browse|all products)\b/i.test(lower)) return "/products";
  if (/\b(cart|shopping cart|shopping bag|basket|bag)\b/i.test(lower)) return "/cart";
  if (/\b(checkout|voice checkout|pay)\b/i.test(lower)) return "/voice-checkout";
  if (/\b(orders?|my orders?|order history|past orders|track orders?)\b/i.test(lower)) return "/orders";
  if (/\b(profile|account|my account|my profile|settings|user profile)\b/i.test(lower)) return "/profile";
  if (/\b(support|customer support|help center|helpdesk|customer service|contact)\b/i.test(lower)) return "/support";
  if (/\b(fashion stylist|stylist|fashion advice|ai stylist)\b/i.test(lower)) return "/fashion-stylist";
  if (/\b(ai assistant|assistant|seller ai|chat assistant)\b/i.test(lower)) return "/ai-assistant";
  return undefined;
}

export function extractEntities(text: string): ExtractedEntities {
  const normalized = normalizeText(text);

  const productMatch = normalized.match(
    /(?:search|find|look for|looking for|show me|discover|browse|i need|i want|i would like|get me|buy|khujo|khuje dao|dekhao|kinte chai)\s+(.+)/i
  );
  let productName = productMatch?.[1]?.trim();

  // Strip leading filler words
  if (productName) {
    productName = productName
      .replace(/^(for|a|an|the|some|me|to see|to view|to check|akta|ekta|kichu)\s+/i, "")
      .trim();
    // Do not capture navigation targets, control commands, or pure digits as product names
    if (
      /\b(orders?|my orders?|see my orders?|view my orders?|cart|checkout|profile|account|home|page|support|stylist|continue|resume|stop|back|forward|help|yes|no|select|option)\b/i.test(
        productName
      ) ||
      /^\d+$/.test(productName.replace(/\s+/g, ""))
    ) {
      productName = undefined;
    }
  }

  // Extract Order ID directly from original text or normalized to preserve hyphens
  const orderIdMatch = text.match(
    /\b(?:order|order number|tracking number|order id|ord)\b(?:\s*(?:number|no|nr|id))?\s*[:#-]?\s*([a-zA-Z0-9-]+)\b/i
  );
  const orderId = orderIdMatch?.[1]?.trim().toUpperCase();

  const targetPage = extractTargetPage(text);

  return {
    productName: productName && productName.length > 0 ? productName : undefined,
    orderId,
    targetPage,
    normalizedText: normalized,
  };
}

export function deriveLocalAction(text: string, mode: "voice" | "support"): LocalAction {
  const entities = extractEntities(text);
  const intent =
    mode === "voice" ? classifyVoiceIntent(text) : classifySupportIntent(text);

  if (mode === "voice") {
    return {
      intent: intent.label,
      searchQuery: intent.label === "search" ? entities.productName || undefined : undefined,
      orderId: intent.label === "order" ? entities.orderId : undefined,
      targetPage: entities.targetPage,
      confidence: intent.confidence,
    };
  }

  return {
    intent: intent.label,
    orderId: entities.orderId,
    confidence: intent.confidence,
  };
}

export interface WakeWordResult {
  hasWakeWord: boolean;
  wakeWord?: string;
  commandAfterWakeWord: string;
}

const WAKE_NAMES = "(?:dev|dave|deb|deve|deff|def|deaf|div|dib|dab|dip|daev|devv|maya|marketverse|assistant)";
const WAKE_NAMES_LIST = [
  "dev",
  "dave",
  "deb",
  "deve",
  "deff",
  "def",
  "deaf",
  "div",
  "dib",
  "dab",
  "dip",
  "daev",
  "devv",
  "maya",
  "marketverse",
  "assistant",
];

// Simple Levenshtein distance for small-token fuzzy matching
function levenshtein(a: string, b: string): number {
  const al = a.length;
  const bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;
  const dp: number[] = [];
  for (let i = 0; i <= bl; i++) dp[i] = i;
  for (let i = 1; i <= al; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= bl; j++) {
      const tmp = dp[j];
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[bl];
}

function isCloseWakeName(token: string): boolean {
  const t = token.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!t) return false;
  for (const name of WAKE_NAMES_LIST) {
    const d = levenshtein(t, name);
    // allow small edits; for short names (<=4) allow distance 1, else allow up to 2
    const limit = name.length <= 4 ? 1 : 2;
    if (d <= limit) return true;
  }
  return false;
}

export function getWakeMatchScores(text: string) {
  const tokens = (text || "").split(/\s+/).map((t) => t.replace(/[,:]?$/g, ""));
  return tokens.map((tok) => {
    const lc = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
    let bestName = "";
    let bestDistance = Number.MAX_SAFE_INTEGER;
    for (const name of WAKE_NAMES_LIST) {
      const d = levenshtein(lc, name);
      if (d < bestDistance) {
        bestDistance = d;
        bestName = name;
      }
    }
    return { token: tok, bestName, distance: bestDistance };
  });
}
const WAKE_PREFIXES = "(?:hey|hi|hello|ok|okay|listen|yo|shuno|shono|suno|ei|ohe|sunun|shunun|hey\\s+there|hi\\s+there|wake\\s+up|turn\\s+on|start|activate|open)";

// Leading pattern: e.g. "hey dev search shoes", "turn on voice assistant open cart", "shuno dev", "dev"
const LEADING_WAKE_REGEX = new RegExp(
  `^(?:${WAKE_PREFIXES}\\s+${WAKE_NAMES}|${WAKE_PREFIXES}\\s*,\\s*${WAKE_NAMES}|wake\\s+up|turn\\s+on\\s+(?:voice|assistant|dev|voice\\s+assistant)|start\\s+(?:voice|assistant|dev|voice\\s+assistant)|open\\s+voice|${WAKE_NAMES}\\s+bhai|${WAKE_NAMES}\\s+shuno|${WAKE_NAMES}\\s+wake\\s+up|${WAKE_NAMES}\\s+turn\\s+on|${WAKE_NAMES})\\b\\s*[,:]?\\s*`,
  "i"
);

// Mid pattern: e.g. "can you please hey dev search watch"
const MID_WAKE_REGEX = new RegExp(
  `\\b(?:${WAKE_PREFIXES}\\s+${WAKE_NAMES}|wake\\s+up\\s+${WAKE_NAMES}|turn\\s+on\\s+(?:voice|assistant|dev)|${WAKE_NAMES}\\s+bhai|${WAKE_NAMES}\\s+shuno)\\b\\s*[,:]?\\s*`,
  "i"
);

export function extractWakeWord(text: string): WakeWordResult {
  if (!text || !text.trim()) {
    return { hasWakeWord: false, commandAfterWakeWord: "" };
  }

  const raw = text.trim();
  const lower = raw.toLowerCase();

  const match = lower.match(LEADING_WAKE_REGEX);
  if (match) {
    const wakeWord = match[0].trim().replace(/[,:]$/, "");
    const command = raw.slice(match[0].length).trim();
    return {
      hasWakeWord: true,
      wakeWord,
      commandAfterWakeWord: command,
    };
  }

  const midMatch = lower.match(MID_WAKE_REGEX);
  if (midMatch && midMatch.index !== undefined) {
    const indexAfterWake = midMatch.index + midMatch[0].length;
    const command = raw.slice(indexAfterWake).trim();
    return {
      hasWakeWord: true,
      wakeWord: midMatch[0].trim().replace(/[,:]$/, ""),
      commandAfterWakeWord: command,
    };
  }

  // Fallback: fuzzy token match — handle mis-transcriptions like "deaf", "dave", "devv", etc.
  const tokens = raw.split(/\s+/);
  let cumulativeIndex = 0;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].replace(/[,:]?$/g, "");
    const lc = tok.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!lc) {
      cumulativeIndex += tokens[i].length + 1;
      continue;
    }
    if (isCloseWakeName(lc)) {
      // find position of this token in original string to extract remainder
      const foundAt = raw.toLowerCase().indexOf(tokens[i].toLowerCase(), cumulativeIndex);
      const after = raw.slice(foundAt + tokens[i].length).trim();
      return { hasWakeWord: true, wakeWord: tokens[i], commandAfterWakeWord: after };
    }
    cumulativeIndex += tokens[i].length + 1;
  }

  return { hasWakeWord: false, commandAfterWakeWord: "" };
}
