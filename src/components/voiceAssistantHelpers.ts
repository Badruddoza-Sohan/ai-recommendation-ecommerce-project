export function containsWakeWord(command: string): boolean {
  return /\b(hey\s*,?\s*(?:dev|maya)|dev|shuno\s+dev|ei\s+dev)\b/i.test(command.trim());
}

export function shouldActivateVoiceAssistant(command: string): boolean {
  return containsWakeWord(command);
}

export function extractVoiceCommand(command: string): string {
  const cleaned = command.trim();

  // Match patterns like "hey dev, do something", "hey maya, do something"
  const wakeWordMatch = cleaned.match(
    /^(?:hey\s*,?\s*(?:dev|maya)|dev)\s*[,:]?\s*(.+)$/i
  );
  const extracted = wakeWordMatch?.[1]?.trim();

  // If we got a command after the wake word, return it; otherwise return cleaned
  return extracted || cleaned;
}

export function isNavigationCommand(command: string): boolean {
  const lower = command.toLowerCase().trim();
  return (
    /\b(go to|open|navigate|take me|show|jao|cholo|dekhao)\b/i.test(lower) &&
    /\b(home|main|start|product|products|shop|cart|basket|order|orders|category|categories|profile|account|wishlist|saved|seller|dashboard|checkout|voice checkout)\b/i.test(
      lower
    )
  );
}

export function isSearchCommand(command: string): boolean {
  return /\b(search|find|look for|show me|discover|khujo|khuje dao|dekhao|kinte chai)\b/i.test(
    command.toLowerCase().trim()
  );
}

export function extractSearchQuery(command: string): string | null {
  const lower = command.toLowerCase().trim();
  const searchMatch = lower.match(
    /\b(search|find|look for|show me|discover|khujo|khuje dao|dekhao|kinte chai)\b(?:\s+(?:for|me|a|an|the|some|kichu))?\s*(.+)?/i
  );
  if (searchMatch?.[2]) {
    return searchMatch[2].trim();
  }
  return null;
}

export function extractOptionNumber(command: string): number | null {
  const lower = command.toLowerCase().trim();

  // 1. Check for Bengali numerals: ০ ১ ২ ৩ ৪ ৫ ৬ ৭ ৮ ৯
  const bengaliDigitMap: Record<string, number> = {
    "১": 1, "২": 2, "৩": 3, "৪": 4, "৫": 5,
    "৬": 6, "৭": 7, "৮": 8, "৯": 9,
  };
  for (const [char, val] of Object.entries(bengaliDigitMap)) {
    if (lower.includes(char)) {
      return val;
    }
  }

  // 2. Word number map (English + Bengali + Banglish)
  const wordMap: Record<string, number> = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9,
    one: 1, first: 1, "1st": 1, ek: 1, prothom: 1,
    two: 2, second: 2, "2nd": 2, dui: 2, ditio: 2,
    three: 3, third: 3, "3rd": 3, teen: 3, tritio: 3, tin: 3,
    four: 4, fourth: 4, "4th": 4, char: 4, chothurtho: 4,
    five: 5, fifth: 5, "5th": 5, paach: 5, pach: 5, ponchom: 5,
    six: 6, sixth: 6, "6th": 6, chhoy: 6, choy: 6,
    seven: 7, seventh: 7, "7th": 7, saat: 7, sat: 7,
    eight: 8, eighth: 8, "8th": 8, aat: 8, at: 8,
    nine: 9, ninth: 9, "9th": 9, noy: 9,
  };

  // Match "select 1", "option 1", "number 1", "item 1", "choose 1", "1 number", "1st option"
  const matchNum = lower.match(
    /\b(?:select|option|number|item|choose|cholo)?\s*([1-9]|one|two|three|four|five|six|seven|eight|nine|first|second|third|fourth|fifth|ek|dui|teen|tin|char|paach|pach|chhoy|saat|aat|noy)(?:\s*(?:number|no|option|item))?\b/i
  );

  if (matchNum?.[1]) {
    const raw = matchNum[1].toLowerCase();
    if (wordMap[raw] !== undefined) {
      return wordMap[raw];
    }
  }

  for (const [word, val] of Object.entries(wordMap)) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      return val;
    }
  }

  return null;
}

export function getWakeWordTriggerPhrases(): string[] {
  return [
    "hey dev",
    "Hey Dev",
    "hey Dev",
    "Hey dev",
    "hey, dev",
    "Hey, Dev",
    "dev",
    "Dev",
  ];
}

export function cleanTranscript(text: string): string {
  let cleaned = text.trim();
  // Remove common filler words that might confuse the NLP
  cleaned = cleaned
    .replace(/\b(um|uh|ah|like|you know|so|basically|mane|ar ki)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned;
}

export interface VoiceActionDecision {
  intent: string;
  searchQuery?: string;
  targetPage?: string;
  selectedProduct?: { id: number; name: string; slug: string; price?: string };
  responseText?: string;
  confidence?: number;
  reason?: string;
}

export function normalizeVoiceActionDecision(input: Partial<VoiceActionDecision> | null | undefined): VoiceActionDecision {
  const source = input || {};
  const intent = String(source.intent || "help").toLowerCase();
  return {
    intent,
    searchQuery: source.searchQuery?.trim() || undefined,
    targetPage: source.targetPage?.trim() || undefined,
    selectedProduct: source.selectedProduct,
    responseText: source.responseText?.trim() || undefined,
    confidence: typeof source.confidence === "number" ? source.confidence : 0.5,
    reason: source.reason?.trim() || undefined,
  };
}

export function convertBengaliDigitsToStandard(text: string): string {
  const bnToEn: Record<string, string> = {
    "০": "0", "১": "1", "২": "2", "৩": "3", "৪": "4",
    "৫": "5", "৬": "6", "৭": "7", "৮": "8", "৯": "9",
  };
  return text.replace(/[০-৯]/g, (char) => bnToEn[char] || char);
}

export function spokenWordsToDigits(text: string): string {
  const wordMap: Record<string, string> = {
    // English words
    zero: "0", oh: "0", o: "0",
    one: "1", won: "1",
    two: "2", to: "2", too: "2",
    three: "3",
    four: "4", for: "4",
    five: "5",
    six: "6",
    seven: "7",
    eight: "8", ate: "8",
    nine: "9",
    // Bengali/Banglish words
    shunno: "0", shunya: "0",
    ek: "1", ak: "1",
    dui: "2", do: "2",
    teen: "3", tin: "3",
    char: "4",
    paach: "5", pach: "5",
    chhoy: "6", choy: "6",
    saat: "7", sat: "7",
    aat: "8", at: "8",
    noy: "9", noi: "9",
    // Quantifiers
    double: "",
    triple: "",
  };

  const standardized = convertBengaliDigitsToStandard(text);
  const words = standardized
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/);

  let result = "";
  let repeatNext = 1;

  for (const word of words) {
    if (word === "double") {
      repeatNext = 2;
      continue;
    }
    if (word === "triple") {
      repeatNext = 3;
      continue;
    }
    if (/^\d$/.test(word)) {
      result += word.repeat(repeatNext);
      repeatNext = 1;
    } else if (wordMap[word] !== undefined && wordMap[word] !== "") {
      result += wordMap[word].repeat(repeatNext);
      repeatNext = 1;
    } else if (/^\d+$/.test(word)) {
      result += word;
      repeatNext = 1;
    }
  }

  return result;
}

export function extractPhoneFromSpeech(text: string): string | null {
  if (!text) return null;

  const standardized = convertBengaliDigitsToStandard(text);
  const lower = standardized.toLowerCase();

  // 1. Direct regex match for embedded 11-digit BD mobile number in the string (e.g., "call 01712345678 now", "my phone 01811223344")
  const compactDigits = lower.replace(/[-\s]/g, "");
  const embeddedMatch = compactDigits.match(/(?:(?:\+?88)?0)(1[3-9]\d{8})/);
  if (embeddedMatch && embeddedMatch[1]) {
    return "0" + embeddedMatch[1];
  }

  // 2. Direct digits
  const directDigits = lower.replace(/[^0-9]/g, "");
  const trimmed = directDigits.startsWith("880") && directDigits.length === 13
    ? directDigits.slice(2)
    : directDigits;

  if (trimmed.length === 11 && isValidBdMobilePrefix(trimmed)) {
    return trimmed;
  }
  if (trimmed.length >= 11 && isValidBdMobilePrefix(trimmed.slice(0, 11))) {
    return trimmed.slice(0, 11);
  }

  // 3. Spoken words conversion (e.g., "zero one seven...")
  const converted = spokenWordsToDigits(lower);
  const convertedTrimmed = converted.startsWith("880") && converted.length === 13
    ? converted.slice(2)
    : converted;

  if (convertedTrimmed.length === 11 && isValidBdMobilePrefix(convertedTrimmed)) {
    return convertedTrimmed;
  }
  if (convertedTrimmed.length >= 11 && isValidBdMobilePrefix(convertedTrimmed.slice(0, 11))) {
    return convertedTrimmed.slice(0, 11);
  }

  // 4. Return partial digits if at least 3 digits were detected (useful on voice checkout for progressive input)
  if (trimmed.length >= 3) {
    return trimmed.slice(0, 11);
  }
  if (convertedTrimmed.length >= 3) {
    return convertedTrimmed.slice(0, 11);
  }

  return null;
}

export function isValidBdMobilePrefix(phone: string): boolean {
  return /^(?:013|014|015|016|017|018|019)\d{8}$/.test(phone);
}

export interface VoiceProductItem {
  id?: number;
  name: string;
  slug: string;
  price?: string | number;
  image?: string;
  index?: number;
}

export function resolveVoiceProductSelection(
  command: string,
  productItems: VoiceProductItem[]
): { selectedProduct: VoiceProductItem; selectedIndex: number } | null {
  if (!productItems || productItems.length === 0) {
    return null;
  }

  const lower = command.toLowerCase().trim();

  const indexMap: Record<string, number> = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10,
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
    "1st": 1, "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
    ek: 1, dui: 2, teen: 3, tin: 3, char: 4, paach: 5, pach: 5, chhoy: 6, saat: 7, aat: 8, noy: 9,
    prothom: 1, ditio: 2, tritio: 3,
  };

  // 1. Direct ordinal / number patterns (e.g. "select 1", "option 2", "1st one", "item 3", "1")
  const match =
    lower.match(/\b(?:select|choose|pick|buy|take)?\s*(?:option|number|item|no)?\s*([1-9]|10|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|ek|dui|teen|tin|char|paach|pach|chhoy|saat|aat|noy|prothom|ditio|tritio)(?:\s*(?:number|no|option|item|ta|ti|one))?\b/i) ||
    lower.match(/^(?:option|number|item|select)?\s*([1-9]|10|one|two|three|four|five|six|seven|eight|nine|ten|first|second|third|fourth|fifth|1st|2nd|3rd|4th|5th|ek|dui|teen|tin|char|paach|pach|chhoy|saat|aat|noy|prothom|ditio|tritio)$/i);

  if (match && match[1]) {
    const raw = match[1].toLowerCase();
    const selectedIndex = indexMap[raw] !== undefined ? indexMap[raw] - 1 : Number(raw) - 1;
    if (selectedIndex >= 0 && selectedIndex < productItems.length) {
      const selectedProduct = productItems[selectedIndex];
      if (selectedProduct) {
        return { selectedProduct, selectedIndex };
      }
    }
  }

  // 2. Direct product title keyword matching (e.g. "select Nike shoes" or "choose Silk Panjabi")
  const cleanCmd = lower.replace(/\b(select|choose|pick|buy|take|option|item|number|ta|ti)\b/gi, "").trim();
  if (cleanCmd.length >= 3) {
    const foundIdx = productItems.findIndex((p) =>
      p.name.toLowerCase().includes(cleanCmd) || cleanCmd.includes(p.name.toLowerCase())
    );
    if (foundIdx !== -1 && productItems[foundIdx]) {
      return {
        selectedProduct: productItems[foundIdx],
        selectedIndex: foundIdx,
      };
    }
  }

  return null;
}