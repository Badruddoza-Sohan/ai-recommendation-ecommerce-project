/**
 * Entity Extractor
 *
 * Extracts structured data (entities) from unstructured user messages.
 * Uses a hybrid approach:
 *  1. Fast Regex (for well-defined patterns like order IDs, emails, phones)
 *  2. LLM-assisted (for complex/fuzzy entities like preferences, addresses)
 *
 * Extracted entities are persisted to the database to support cross-turn
 * and cross-session memory.
 */

import { getDb } from "../../../api/queries/connection.ts";
import { memoryEntities } from "../../../db/aiSchema.ts";
import { eq, and, desc } from "../../../db/mysql.ts";
import { getLLMService } from "../llm/llm-service.ts";
import type { ExtractedEntity, EntityType } from "./types.ts";

export class EntityExtractor {
  // ─── Extraction ─────────────────────────────────────────────────────────────

  /**
   * Extract entities from text using both regex and LLM (if needed).
   */
  async extract(text: string, useLlm = false): Promise<ExtractedEntity[]> {
    const entities: ExtractedEntity[] = [];

    // 1. Regex Extraction (Fast, deterministic)
    const regexEntities = this.extractRegex(text);
    entities.push(...regexEntities);

    // 2. LLM Extraction (Slower, fuzzy)
    // Only run if requested or if text implies complex entities but regex missed
    if (useLlm || (text.length > 20 && text.includes("address") || text.includes("deliver to"))) {
      try {
        const llmEntities = await this.extractLlm(text);
        entities.push(...llmEntities);
      } catch (err) {
        console.warn("[EntityExtractor] LLM extraction failed:", err);
      }
    }

    return this.deduplicate(entities);
  }

  /**
   * Extract, persist to DB, and return the entities for a specific session.
   */
  async extractAndPersist(
    sessionId: string,
    text: string,
    userId?: number
  ): Promise<ExtractedEntity[]> {
    const entities = await this.extract(text);
    if (entities.length === 0) return [];

    const db = getDb();
    const now = Date.now();

    for (const entity of entities) {
      // Check if exact same entity already exists for this session
      const existing = await db
        .select({ id: (memoryEntities as any).id })
        .from(memoryEntities)
        .where(
          and(
            eq(memoryEntities.sessionId, sessionId),
            eq(memoryEntities.entityType, entity.type),
            eq(memoryEntities.entityKey, entity.key),
            eq(memoryEntities.entityValue, entity.value)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(memoryEntities).values({
          sessionId,
          userId,
          entityType: entity.type,
          entityKey: entity.key,
          entityValue: entity.value,
          confidence: entity.confidence,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        // Update timestamp to keep it "fresh"
        await db
          .update(memoryEntities)
          .set({ updatedAt: now })
          .where(eq(memoryEntities.id, existing[0].id));
      }
    }

    return entities;
  }

  // ─── Resolution ─────────────────────────────────────────────────────────────

  /**
   * Resolve anaphoric references (e.g. "cancel IT", "where is THAT ORDER")
   * by looking up the most recently mentioned entity of the required type.
   */
  async resolveReference(
    sessionId: string,
    text: string,
    userId?: number
  ): Promise<Record<string, string>> {
    const lower = text.toLowerCase();
    const resolutions: Record<string, string> = {};
    const db = getDb();

    // Does the text have a pronoun referring to an order?
    if (/\b(it|that|this|the order|my order)\b/.test(lower)) {
      // Find the most recent order_id for this session (or user)
      const recentOrders = await db
        .select({ value: (memoryEntities as any).entityValue })
        .from(memoryEntities)
        .where(
          and(
            eq(memoryEntities.entityType, "order_id"),
            userId
              ? undefined // If user exists, we might look across their sessions later
              : eq(memoryEntities.sessionId, sessionId)
          )
        )
        .orderBy(desc(memoryEntities.updatedAt))
        .limit(1);

      if (recentOrders.length > 0) {
        resolutions["order_id"] = recentOrders[0].value;
      }
    }

    return resolutions;
  }

  /**
   * Retrieve all known entities for a session/user, formatted for context.
   */
  async getEntitiesForContext(
    sessionId: string,
    userId?: number
  ): Promise<Record<EntityType, Array<{ key: string; value: string }>>> {
    const db = getDb();
    
    // Get entities for this session (and user, if provided)
    // We get the most recent ones first
    const rows = await db
      .select()
      .from(memoryEntities)
      .where(
        userId 
          ? eq(memoryEntities.userId, userId) // Cross-session memory for logged in users
          : eq(memoryEntities.sessionId, sessionId) // Single session for guests
      )
      .orderBy(desc(memoryEntities.updatedAt))
      .limit(50); // don't overload context

    const result = {} as Record<EntityType, Array<{ key: string; value: string }>>;

    // Group by type and deduplicate values
    for (const row of rows) {
      const type = row.entityType as EntityType;
      if (!result[type]) result[type] = [];
      
      const exists = result[type].some((e) => e.value === row.entityValue);
      if (!exists) {
        result[type].push({ key: row.entityKey, value: row.entityValue });
      }
    }

    return result;
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private extractRegex(text: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];

    // Order ID (e.g. ORD-2024-1234 or #12345)
    const orderIdMatches = text.match(/\b(ORD-\d{4}-\d+|\#\d{5,})\b/gi);
    if (orderIdMatches) {
      for (const match of orderIdMatches) {
        entities.push({
          type: "order_id",
          key: "order_number",
          value: match.toUpperCase().replace("#", ""),
          confidence: 1.0,
        });
      }
    }

    // Email
    const emailMatches = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g);
    if (emailMatches) {
      for (const match of emailMatches) {
        entities.push({
          type: "email",
          key: "email_address",
          value: match.toLowerCase(),
          confidence: 1.0,
        });
      }
    }

    // Phone (Bangladeshi formats e.g. +88017... or 017...)
    const phoneMatches = text.match(/\b(\+?88)?01[3-9]\d{8}\b/g);
    if (phoneMatches) {
      for (const match of phoneMatches) {
        entities.push({
          type: "phone",
          key: "phone_number",
          value: match,
          confidence: 1.0,
        });
      }
    }

    // Price / Budget (e.g. "under 4000", "500 tk", "BDT 1000")
    const priceMatches = text.match(/\b(under|below|max|around)?\s*(bdt|tk|taka|\$)?\s*(\d+[,.]?\d*)\s*(bdt|tk|taka)?\b/i);
    if (priceMatches && (priceMatches[1] || priceMatches[2] || priceMatches[4])) {
      const amount = priceMatches[3].replace(/,/g, "");
      entities.push({
        type: "price_budget",
        key: priceMatches[1] ? "max_budget" : "exact_price",
        value: amount,
        confidence: 0.8,
      });
    }

    return entities;
  }

  private async extractLlm(text: string): Promise<ExtractedEntity[]> {
    const llm = getLLMService();
    const prompt = `Extract entities from this message. Look for: product_name, address, name, size, color, brand.
Return ONLY valid JSON in this exact format: [{"type": "product_name", "key": "mentioned_product", "value": "extracted string", "confidence": 0.9}]
If none found, return [].

Message: "${text}"`;

    const response = await llm.chat([
      { role: "system", content: "You are an entity extraction system. Output only valid JSON." },
      { role: "user", content: prompt }
    ], { temperature: 0.1 });

    try {
      const content = response.message.content;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const jsonString = jsonMatch ? jsonMatch[0] : content;
      
      const parsed = JSON.parse(jsonString) as ExtractedEntity[];
      
      // Filter out invalid types
      const validTypes = ["order_id", "product_name", "email", "phone", "address", "name", "preference", "size", "color", "brand", "category", "price_budget"];
      return parsed.filter(e => e.type && e.key && e.value && validTypes.includes(e.type));
    } catch {
      return [];
    }
  }

  private deduplicate(entities: ExtractedEntity[]): ExtractedEntity[] {
    const seen = new Set<string>();
    return entities.filter((e) => {
      const key = `${e.type}:${e.value.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _entityExtractor: EntityExtractor | null = null;

export function getEntityExtractor(): EntityExtractor {
  if (!_entityExtractor) {
    _entityExtractor = new EntityExtractor();
  }
  return _entityExtractor;
}
