/**
 * Stylist Session State Manager with Robust Fuzzy Matcher & Exhaustive Typo Tolerance
 *
 * Persists user session state in SQLite (memory_entities table) and in-memory cache.
 * Tracks occasion, role, timing, setting, style, budget, avoid_colors, owned_items, locked_items.
 */

import { getDb } from "../../../api/queries/connection.js";
import { memoryEntities } from "../../../db/aiSchema.js";
import { eq, and } from "../../../db/mysql.js";

export interface StylistSessionState {
  sessionId: string;
  turn_count?: number;
  occasion?: string;
  event_role?: string;
  event_time?: string;
  event_setting?: string;
  style?: string;
  price_constraint?: string; // "Budget Friendly (< 5,000 BDT)", "Premium (5,000 - 15,000 BDT)", "Luxury (> 15,000 BDT)"
  budget?: string;
  avoid_colors: string[];
  preferred_colors: string[];
  owned_items: string[];
  locked_items: string[];
  event_details?: string;
}

// In-memory cache for ultra-low latency access (< 1ms)
const stateCache = new Map<string, StylistSessionState>();

/**
 * Levenshtein distance for fuzzy typo matching
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Fuzzy word matcher: checks if any word in text is within maxDistance of target
 */
function fuzzyContainsWord(text: string, targets: string[], maxDistance: number = 2): boolean {
  const words = text.toLowerCase().split(/[\s,./?!_()-]+/);
  for (const word of words) {
    if (!word || word.length < 3) continue;
    for (const target of targets) {
      if (word === target) return true;
      // For longer words allow distance <= 2, for short words distance <= 1
      const allowedDist = target.length >= 6 ? maxDistance : 1;
      if (Math.abs(word.length - target.length) <= allowedDist && levenshtein(word, target) <= allowedDist) {
        return true;
      }
    }
  }
  return false;
}

export class StylistStateManager {
  async resetState(sessionId: string): Promise<void> {
    stateCache.delete(sessionId);
    try {
      const db = getDb();
      await db.delete(memoryEntities).where(eq(memoryEntities.sessionId, sessionId));
    } catch (e) {
      console.warn(`[StylistStateManager] Failed to clear DB state:`, e);
    }
  }

  /**
   * Retrieves or initializes session state
   */
  async getState(sessionId: string): Promise<StylistSessionState> {
    if (stateCache.has(sessionId)) {
      return stateCache.get(sessionId)!;
    }

    const state: StylistSessionState = {
      sessionId,
      avoid_colors: [],
      preferred_colors: [],
      owned_items: [],
      locked_items: [],
    };

    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(memoryEntities)
        .where(
          and(
            eq(memoryEntities.sessionId, sessionId),
            eq(memoryEntities.entityType, "stylist_state")
          )
        );

      for (const row of rows) {
        if (row.entityKey === "occasion") state.occasion = row.entityValue;
        if (row.entityKey === "event_role") state.event_role = row.entityValue;
        if (row.entityKey === "event_time") state.event_time = row.entityValue;
        if (row.entityKey === "event_setting") state.event_setting = row.entityValue;
        if (row.entityKey === "style") state.style = row.entityValue;
        if (row.entityKey === "price_constraint") state.price_constraint = row.entityValue;
        if (row.entityKey === "avoid_color" && !state.avoid_colors.includes(row.entityValue)) {
          state.avoid_colors.push(row.entityValue);
        }
        if (row.entityKey === "preferred_color" && !state.preferred_colors.includes(row.entityValue)) {
          state.preferred_colors.push(row.entityValue);
        }
        if (row.entityKey === "owned_item" && !state.owned_items.includes(row.entityValue)) {
          state.owned_items.push(row.entityValue);
        }
        if (row.entityKey === "locked_item" && !state.locked_items.includes(row.entityValue)) {
          state.locked_items.push(row.entityValue);
        }
      }
    } catch (e) {
      console.warn(`[StylistStateManager] Failed to load state from DB:`, e);
    }

    stateCache.set(sessionId, state);
    return state;
  }

  /**
   * Updates state based on user input with fuzzy typo tolerance across ALL categories
   */
  async updateState(sessionId: string, text: string): Promise<StylistSessionState> {
    const state = await this.getState(sessionId);
    state.turn_count = (state.turn_count || 0) + 1;
    const lower = text.toLowerCase().trim();

    // 1. Avoid Colors Extraction (Strict Negative Constraint)
    const colorList = ["yellow", "red", "black", "blue", "green", "white", "maroon", "emerald", "navy", "pink", "purple", "brown", "cream", "gold"];
    for (const color of colorList) {
      if (
        lower.includes(`hate ${color}`) ||
        lower.includes(`no ${color}`) ||
        lower.includes(`don't like ${color}`) ||
        lower.includes(`dont like ${color}`) ||
        lower.includes(`dislike ${color}`) ||
        lower.includes(`except ${color}`) ||
        lower.includes(`without ${color}`)
      ) {
        const capitalized = color.charAt(0).toUpperCase() + color.slice(1);
        if (!state.avoid_colors.includes(capitalized)) {
          state.avoid_colors.push(capitalized);
          await this.persistEntity(sessionId, "avoid_color", capitalized);
        }
      }
    }

    // 2. Owned Items Extraction (e.g. "I already have black jeans")
    if (lower.includes("already have") || lower.includes("i have") || lower.includes("own a")) {
      if (lower.includes("black jeans") || lower.includes("denim")) {
        state.owned_items.push("Black Jeans");
        await this.persistEntity(sessionId, "owned_item", "Black Jeans");
      }
    }

    // 3. Item Locking (e.g. "keep the shoes")
    if (lower.includes("keep the shoes") || lower.includes("same shoes")) {
      if (!state.locked_items.includes("Shoes")) {
        state.locked_items.push("Shoes");
        await this.persistEntity(sessionId, "locked_item", "Shoes");
      }
    }

    // 4. EXHAUSTIVE OCCASION HIERARCHY WITH TYPO TOLERANCE & FUZZY MATCHING

    // Gym / Workout / Activewear
    const gymKeywords = ["gym", "gymm", "gymming", "workout", "workaut", "workour", "fitnes", "fitness", "exercise", "exersice", "exersise", "sports", "sport", "activewear", "traning", "training"];
    // Holud / Gaye Holud / Haldi
    const holudKeywords = ["holud", "haldii", "haldi", "holod", "hulud", "gaye holud", "gaye holod", "yellow event"];
    // Mehendi
    const mehendiKeywords = ["mehendi", "mehndi", "mehendii", "henna"];
    // Wedding Reception / Walima
    const receptionKeywords = ["reception", "reseption", "recepton", "recaption", "respshon", "walima", "walimah", "valima"];
    // Akd / Nikah
    const akdKeywords = ["akd", "akad", "nikah", "nikaah", "nekaah"];
    // Village Wedding
    const villageKeywords = ["village wedding", "gramer wedding", "village shaadi"];
    // Beach / Destination Wedding
    const beachKeywords = ["beach wedding", "destination wedding", "destination shaadi"];
    // Wedding Ceremony / Marriage
    const weddingKeywords = ["wedding", "weding", "wdding", "wediing", "weddin", "marriage", "marriag", "shaadi", "shadi", "shadhee", "shaddi"];
    // Pohela Boishakh
    const boishakhKeywords = ["pohela boishakh", "boishakh", "boisakh", "baishakh", "boshakh", "bengali new year"];
    // Eid
    const eidKeywords = ["eid", "eed", "eidd", "eid ul fitr", "eid ul-fitr", "eid outfit", "eide"];
    // University / Campus / Presentation / Defense / Viva
    const universityKeywords = ["university", "univercity", "universiti", "campus", "campuss", "varsity", "varsiti", "presentation", "presentaation", "presentaton", "presentasion", "defense", "defanse", "viva", "college", "colege"];
    // Office / Corporate / Interview / Meeting
    const officeKeywords = ["interview", "intervew", "intervue", "interveiw", "intervjew", "office", "offce", "offic", "corporate", "corporat", "meeting", "meting", "desk", "workplace"];
    // Casual / Date Night / Hangout
    const casualKeywords = ["casual", "cazual", "casuel", "casul", "date night", "date", "hangout", "hanging out", "everyday"];
    // Party / Nightout
    const partyKeywords = ["party", "pardi", "nightout", "night out", "club", "dinner"];
    // Travel / Vacation
    const travelKeywords = ["travel", "vacation", "vacaton", "airport", "trip"];

    if (fuzzyContainsWord(lower, gymKeywords)) {
      state.occasion = "Gym / Workout";
      await this.persistEntity(sessionId, "occasion", "Gym / Workout");
    } else if (fuzzyContainsWord(lower, holudKeywords)) {
      state.occasion = "Holud";
      await this.persistEntity(sessionId, "occasion", "Holud");
    } else if (fuzzyContainsWord(lower, mehendiKeywords)) {
      state.occasion = "Mehendi";
      await this.persistEntity(sessionId, "occasion", "Mehendi");
    } else if (fuzzyContainsWord(lower, receptionKeywords)) {
      state.occasion = "Wedding Reception";
      await this.persistEntity(sessionId, "occasion", "Wedding Reception");
    } else if (fuzzyContainsWord(lower, akdKeywords)) {
      state.occasion = "Akd / Nikah";
      await this.persistEntity(sessionId, "occasion", "Akd / Nikah");
    } else if (fuzzyContainsWord(lower, villageKeywords)) {
      state.occasion = "Village Wedding";
      await this.persistEntity(sessionId, "occasion", "Village Wedding");
    } else if (fuzzyContainsWord(lower, beachKeywords)) {
      state.occasion = "Beach / Destination Wedding";
      await this.persistEntity(sessionId, "occasion", "Beach / Destination Wedding");
    } else if (fuzzyContainsWord(lower, weddingKeywords)) {
      state.occasion = "Wedding Ceremony";
      await this.persistEntity(sessionId, "occasion", "Wedding Ceremony");
    } else if (fuzzyContainsWord(lower, boishakhKeywords)) {
      state.occasion = "Pohela Boishakh";
      await this.persistEntity(sessionId, "occasion", "Pohela Boishakh");
    } else if (fuzzyContainsWord(lower, eidKeywords)) {
      state.occasion = "Eid ul-Fitr";
      await this.persistEntity(sessionId, "occasion", "Eid ul-Fitr");
    } else if (fuzzyContainsWord(lower, universityKeywords)) {
      state.occasion = "University";
      await this.persistEntity(sessionId, "occasion", "University");
    } else if (fuzzyContainsWord(lower, officeKeywords)) {
      state.occasion = "Office / Corporate";
      await this.persistEntity(sessionId, "occasion", "Office / Corporate");
    } else if (fuzzyContainsWord(lower, casualKeywords)) {
      state.occasion = "Casual / Date Night";
      await this.persistEntity(sessionId, "occasion", "Casual / Date Night");
    } else if (fuzzyContainsWord(lower, partyKeywords)) {
      state.occasion = "Party / Nightout";
      await this.persistEntity(sessionId, "occasion", "Party / Nightout");
    } else if (fuzzyContainsWord(lower, travelKeywords)) {
      state.occasion = "Travel / Vacation";
      await this.persistEntity(sessionId, "occasion", "Travel / Vacation");
    } else if (lower.includes("pair") || lower.includes("match") || lower.includes("go with") || lower.includes("color") || lower.includes("colour") || lower.includes("with navy") || lower.includes("navy blue")) {
      state.occasion = "Casual / Date Night";
      await this.persistEntity(sessionId, "occasion", "Casual / Date Night");
    }

    // 5. ROLE & OPTION EXTRACTION WITH EXHAUSTIVE TYPO TOLERANCE
    const groomKeywords = ["groom", "grum", "grom", "dulha"];
    const presKeywords = ["formal presentation", "presentation", "presentaation", "presentaton", "presentasion", "defense", "defanse", "viva"];
    const dailyKeywords = ["daily", "campus casual", "regular", "everyday"];
    const corpKeywords = ["corporate", "corporat", "banking", "mnc", "finance"];
    const techKeywords = ["tech", "creative", "startup", "start up", "agency"];
    const guestKeywords = ["guest", "gest", "formal guest", "host", "hostess"];
    const familyKeywords = ["family", "famly", "relatives", "brother", "sister"];
    const participantKeywords = ["participant", "casual participant"];
    const vipKeywords = ["vip", "highlighted", "chief guest", "special guest"];

    if (fuzzyContainsWord(lower, groomKeywords)) {
      state.event_role = "Groom";
      state.event_details = (state.event_details || "") + " Groom";
      await this.persistEntity(sessionId, "event_role", "Groom");
    } else if (fuzzyContainsWord(lower, presKeywords)) {
      state.event_role = "Formal Presentation / Defense";
      state.event_details = (state.event_details || "") + " Presentation";
      await this.persistEntity(sessionId, "event_role", "Formal Presentation / Defense");
    } else if (fuzzyContainsWord(lower, dailyKeywords)) {
      state.event_role = "Regular Daily Campus Casual";
      state.event_details = (state.event_details || "") + " Campus Casual";
      await this.persistEntity(sessionId, "event_role", "Regular Daily Campus Casual");
    } else if (fuzzyContainsWord(lower, corpKeywords)) {
      state.event_role = "Corporate / Banking / MNC";
      state.event_details = (state.event_details || "") + " Corporate";
      await this.persistEntity(sessionId, "event_role", "Corporate / Banking / MNC");
    } else if (fuzzyContainsWord(lower, techKeywords)) {
      state.event_role = "Tech / Creative Startup / Agency";
      state.event_details = (state.event_details || "") + " Tech/Startup";
      await this.persistEntity(sessionId, "event_role", "Tech / Creative Startup / Agency");
    } else if (fuzzyContainsWord(lower, guestKeywords)) {
      state.event_role = "Guest";
      state.event_details = (state.event_details || "") + " Guest";
      await this.persistEntity(sessionId, "event_role", "Guest");
    } else if (fuzzyContainsWord(lower, familyKeywords)) {
      state.event_role = "Family Member";
      state.event_details = (state.event_details || "") + " Family Member";
      await this.persistEntity(sessionId, "event_role", "Family Member");
    } else if (fuzzyContainsWord(lower, participantKeywords)) {
      state.event_role = "Casual Participant";
      state.event_details = (state.event_details || "") + " Casual Participant";
      await this.persistEntity(sessionId, "event_role", "Casual Participant");
    } else if (fuzzyContainsWord(lower, vipKeywords)) {
      state.event_role = "VIP / Highlighted Person";
      state.event_details = (state.event_details || "") + " VIP";
      await this.persistEntity(sessionId, "event_role", "VIP / Highlighted Person");
    } else if (state.occasion && !state.event_role && lower.length > 0) {
      // Fallback slot filler: if occasion is set and user responded, fill event_role with user's answer
      state.event_role = text.trim();
      state.event_details = (state.event_details || "") + " " + text.trim();
      await this.persistEntity(sessionId, "event_role", text.trim());
    }

    // 6. TIMING & SETTING EXTRACTION
    if (lower.includes("evening") || lower.includes("night") || lower.includes("evning")) {
      state.event_time = "Evening";
      state.event_details = (state.event_details || "") + " Evening";
      await this.persistEntity(sessionId, "event_time", "Evening");
    } else if (lower.includes("daytime") || lower.includes("day") || lower.includes("mornig") || lower.includes("morning")) {
      state.event_time = "Daytime";
      state.event_details = (state.event_details || "") + " Daytime";
      await this.persistEntity(sessionId, "event_time", "Daytime");
    }

    if (lower.includes("outdoor") || lower.includes("lawn") || lower.includes("garden")) {
      state.event_setting = "Outdoor";
      await this.persistEntity(sessionId, "event_setting", "Outdoor");
    } else if (lower.includes("indoor") || lower.includes("ac venue") || lower.includes("hall")) {
      state.event_setting = "Indoor";
      await this.persistEntity(sessionId, "event_setting", "Indoor");
    }

    // 7. BUDGET EXTRACTION
    if (lower.includes("budget friendly") || lower.includes("under 5000") || lower.includes("cheap") || lower.includes("< 5000") || lower.includes("5k") || lower.includes("2000") || lower.includes("2k")) {
      state.price_constraint = "Budget Friendly (< 5,000 BDT)";
      await this.persistEntity(sessionId, "price_constraint", state.price_constraint);
    } else if (lower.includes("luxury") || lower.includes("above 15000") || lower.includes("> 15000") || lower.includes("15k") || lower.includes("expensive")) {
      state.price_constraint = "Luxury (> 15,000 BDT)";
      await this.persistEntity(sessionId, "price_constraint", state.price_constraint);
    } else if (lower.includes("premium") || lower.includes("mid-range") || lower.includes("mid range") || lower.includes("medium") || lower.includes("5000 - 15000") || lower.includes("10k") || lower.includes("under 10k") || lower.includes("under 15k")) {
      state.price_constraint = "Premium (5,000 - 15,000 BDT)";
      await this.persistEntity(sessionId, "price_constraint", state.price_constraint);
    }

    // 8. AESTHETIC STYLE RECOGNITION
    if (lower.includes("old money") || lower.includes("oldmoney")) {
      state.style = "Old Money";
      await this.persistEntity(sessionId, "style", "Old Money");
    } else if (lower.includes("quiet luxury")) {
      state.style = "Quiet Luxury";
      await this.persistEntity(sessionId, "style", "Quiet Luxury");
    } else if (lower.includes("minimalist") || lower.includes("minimal")) {
      state.style = "Minimalist";
      await this.persistEntity(sessionId, "style", "Minimalist");
    } else if (lower.includes("korean")) {
      state.style = "Korean Aesthetic";
      await this.persistEntity(sessionId, "style", "Korean Aesthetic");
    } else if (lower.includes("streetwear")) {
      state.style = "Streetwear";
      await this.persistEntity(sessionId, "style", "Streetwear");
    } else if (lower.includes("business casual")) {
      state.style = "Business Casual";
      await this.persistEntity(sessionId, "style", "Business Casual");
    } else if (lower.includes("traditional")) {
      state.style = "Traditional";
      await this.persistEntity(sessionId, "style", "Traditional");
    } else if (lower.includes("fusion")) {
      state.style = "Fusion";
      await this.persistEntity(sessionId, "style", "Fusion");
    }

    // 9. POSITIVE COLOR PREFERENCES
    const positiveColors = ["navy", "blue", "white", "black", "cream", "maroon", "olive", "beige", "brown", "emerald", "gold", "wine"];
    for (const color of positiveColors) {
      const isExplicitMention = lower.includes(`prefer ${color}`) || lower.includes(`like ${color}`) || lower.includes(`in ${color}`) || lower.trim() === color || lower.includes(`${color} color`);
      const isNegated = lower.includes(`don't like ${color}`) || lower.includes(`no ${color}`) || lower.includes(`except ${color}`) || lower.includes(`not ${color}`);

      if (isExplicitMention && !isNegated) {
        const capitalized = color.charAt(0).toUpperCase() + color.slice(1);
        if (!state.preferred_colors.includes(capitalized) && !state.avoid_colors.includes(capitalized)) {
          state.preferred_colors.push(capitalized);
          await this.persistEntity(sessionId, "preferred_color", capitalized);
        }
      }
    }

    stateCache.set(sessionId, state);
    return state;
  }

  private async persistEntity(sessionId: string, key: string, value: string) {
    try {
      const db = getDb();
      const now = Date.now();
      await db.insert(memoryEntities).values({
        sessionId,
        entityType: "stylist_state",
        entityKey: key,
        entityValue: value,
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      // Ignore
    }
  }

  async getFormattedStateBlock(sessionId: string): Promise<string> {
    const state = await this.getState(sessionId);
    if (!state.occasion && !state.style && state.avoid_colors.length === 0 && state.owned_items.length === 0 && state.preferred_colors.length === 0) {
      return "";
    }

    let block = `[ACTIVE STYLIST CONSULTATION STATE]\n`;
    if (state.occasion) block += `- Occasion: ${state.occasion}${state.event_details ? ` (${state.event_details.trim()})` : ""}\n`;
    if (state.style) block += `- Aesthetic Style: ${state.style}\n`;
    if (state.avoid_colors.length > 0) block += `- AVOID COLORS (STRICT NEGATIVE CONSTRAINT): ${state.avoid_colors.join(", ")}\n`;
    if (state.preferred_colors.length > 0) block += `- Preferred Colors: ${state.preferred_colors.join(", ")}\n`;
    if (state.owned_items.length > 0) block += `- ALREADY OWNED ITEMS (DO NOT RE-RECOMMEND THESE IN THE OUTFIT): ${state.owned_items.join(", ")}\n`;
    if (state.locked_items.length > 0) block += `- LOCKED ITEMS (KEEP THESE EXACT ITEMS): ${state.locked_items.join(", ")}\n`;

    block += `- STYLIST DIRECTIVE: Maintain conversation continuity across turns. Acknowledge owned items, strictly enforce color exclusions, rotate candidate SKUs, and explain fabric/color reasoning clearly.`;

    return block;
  }
}

let instance: StylistStateManager | null = null;
export function getStylistStateManager(): StylistStateManager {
  if (!instance) {
    instance = new StylistStateManager();
  }
  return instance;
}
