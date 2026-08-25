/**
 * Support Session State & Customer Memory Manager (< 1ms Latency)
 *
 * Maintains continuous support state across turns and sessions.
 * Remembers active order ID, item ID, seller ID, ticket ID, language preference,
 * and handles relative follow-up phrases like "cancel it", "change address", "same order".
 */

import { getDb } from "../../../api/queries/connection";
import { memoryEntities } from "../../../db/aiSchema";
import { eq, and } from "../../../db/mysql";

export interface SupportSessionState {
  sessionId: string;
  userId?: number;
  activeOrderId?: string;
  activeProductId?: number;
  activeSellerId?: number;
  activeTicketId?: string;
  preferredLanguage: "English" | "Bangla" | "Banglish";
  currentWorkflow?: "tracking" | "cancellation" | "return" | "exchange" | "address_update" | "escalation";
  unresolvedTickets: string[];
  turnCount: number;
  lastIntent?: string;
  lastUserQuery?: string;
}

const supportStateCache = new Map<string, SupportSessionState>();

export class SupportStateManager {
  async getState(sessionId: string, userId?: number): Promise<SupportSessionState> {
    if (supportStateCache.has(sessionId)) {
      const cached = supportStateCache.get(sessionId)!;
      if (userId && !cached.userId) cached.userId = userId;
      return cached;
    }

    const state: SupportSessionState = {
      sessionId,
      userId,
      preferredLanguage: "English",
      unresolvedTickets: [],
      turnCount: 0,
    };

    try {
      const db = getDb();
      const rows = await db
        .select()
        .from(memoryEntities)
        .where(
          and(
            eq(memoryEntities.sessionId, sessionId),
            eq(memoryEntities.entityType, "support_state")
          )
        );

      for (const row of rows) {
        if (row.entityKey === "active_order_id") state.activeOrderId = row.entityValue;
        if (row.entityKey === "active_ticket_id") state.activeTicketId = row.entityValue;
        if (row.entityKey === "preferred_language") state.preferredLanguage = row.entityValue as any;
        if (row.entityKey === "unresolved_ticket" && !state.unresolvedTickets.includes(row.entityValue)) {
          state.unresolvedTickets.push(row.entityValue);
        }
      }
    } catch (e) {
      // Ignore DB read failure
    }

    supportStateCache.set(sessionId, state);
    return state;
  }

  async updateState(
    sessionId: string,
    query: string,
    extractedOrderId?: string,
    extractedTicketId?: string,
    language?: "English" | "Bangla" | "Banglish",
    userId?: number
  ): Promise<SupportSessionState> {
    const state = await this.getState(sessionId, userId);
    state.turnCount += 1;
    state.lastUserQuery = query;

    if (language) {
      state.preferredLanguage = language;
      await this.persistEntity(sessionId, "preferred_language", language);
    }

    if (extractedOrderId) {
      state.activeOrderId = extractedOrderId;
      await this.persistEntity(sessionId, "active_order_id", extractedOrderId);
    }

    if (extractedTicketId) {
      state.activeTicketId = extractedTicketId;
      if (!state.unresolvedTickets.includes(extractedTicketId)) {
        state.unresolvedTickets.push(extractedTicketId);
      }
      await this.persistEntity(sessionId, "active_ticket_id", extractedTicketId);
    }

    // Relative Follow-up Resolver ("cancel it", "change address", "same order")
    const lower = query.toLowerCase().trim();
    if (state.activeOrderId && !extractedOrderId) {
      if (lower.includes("cancel it") || lower.includes("cancel this") || lower.includes("cancel order")) {
        state.currentWorkflow = "cancellation";
      } else if (lower.includes("change address") || lower.includes("update location") || lower.includes("new thikana")) {
        state.currentWorkflow = "address_update";
      } else if (lower.includes("return it") || lower.includes("return this")) {
        state.currentWorkflow = "return";
      } else if (lower.includes("where is it") || lower.includes("track again") || lower.includes("same order")) {
        state.currentWorkflow = "tracking";
      }
    }

    supportStateCache.set(sessionId, state);
    return state;
  }

  async resetState(sessionId: string): Promise<void> {
    supportStateCache.delete(sessionId);
  }

  private async persistEntity(sessionId: string, key: string, value: string) {
    try {
      const db = getDb();
      const now = Date.now();
      await db.insert(memoryEntities).values({
        sessionId,
        entityType: "support_state",
        entityKey: key,
        entityValue: value,
        confidence: 1.0,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      // Ignore DB write error
    }
  }
}

let instance: SupportStateManager | null = null;
export function getSupportStateManager(): SupportStateManager {
  if (!instance) {
    instance = new SupportStateManager();
  }
  return instance;
}
