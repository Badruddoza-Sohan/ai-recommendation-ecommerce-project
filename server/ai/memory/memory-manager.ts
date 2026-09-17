/**
 * Memory Manager
 *
 * Unifies Short-Term Memory (STM), Long-Term Memory (LTM), and Entity Memory.
 * Provides the context builder with a single structured view of the user's state.
 */

import { getEntityExtractor } from "./entity-extractor.ts";
import { getSummarizer } from "./summarizer.ts";
import { getDb } from "../../../api/queries/connection.ts";
import { chatMessages } from "../../../db/schema.ts";
import { eq, desc } from "../../../db/mysql.ts";
import type { MemoryContext } from "./types.ts";
import type { ChatMessage } from "../llm/types.ts";

export class MemoryManager {
  /**
   * Assemble the complete memory context for a session.
   *
   * @param sessionId - The chat session ID
   * @param userId - Optional user ID (enables cross-session memory)
   * @param maxShortTermMessages - How many recent messages to include as literal text
   */
  async getContext(
    sessionId: string,
    userId?: number,
    maxShortTermMessages = 10
  ): Promise<MemoryContext> {
    const db = getDb();

    // 1. Short Term Memory (Literal recent messages)
    const recentDbMessages = await db
      .select({
        role: (chatMessages as any).role,
        content: (chatMessages as any).content,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(maxShortTermMessages);

    // Revers to chronological order
    const shortTerm: ChatMessage[] = recentDbMessages.reverse().map((m: any) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    }));

    // 2. Long Term Memory (Summary of older messages)
    // We check the new aiSchema table via the schema mapping, assuming it's available in getDb()
    // Wait, the aiSchema is in db/aiSchema.ts. We should import it.
    const { conversationSummaries: newSummaries } = await import("../../../db/aiSchema.ts");
    
    const summaryRows = await db
      .select({ summary: (newSummaries as any).summary })
      .from(newSummaries)
      .where(eq(newSummaries.sessionId, sessionId))
      .orderBy(desc(newSummaries.createdAt))
      .limit(1);

    const longTermSummary = summaryRows.length > 0 ? summaryRows[0].summary : undefined;

    // 3. Entity Memory
    const extractor = getEntityExtractor();
    const entities = await extractor.getEntitiesForContext(sessionId, userId);

    return {
      shortTerm,
      longTermSummary,
      entities,
    };
  }

  /**
   * Process a new user message: extract entities and trigger summarization if needed.
   * Note: The actual saving of the message to the DB is handled by SessionService.
   */
  async processUserMessage(
    sessionId: string,
    text: string,
    userId?: number
  ): Promise<void> {
    const extractor = getEntityExtractor();
    
    // 1. Extract and persist entities
    await extractor.extractAndPersist(sessionId, text, userId);
    
    // 2. Check if we need to summarize
    const summarizer = getSummarizer();
    await summarizer.summarizeIfThresholdMet(sessionId, userId);
  }

  /**
   * Resolve pronouns/references (e.g. "where is IT") to specific entity values.
   */
  async resolveReferences(
    sessionId: string,
    text: string,
    userId?: number
  ): Promise<Record<string, string>> {
    const extractor = getEntityExtractor();
    return extractor.resolveReference(sessionId, text, userId);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _memoryManager: MemoryManager | null = null;

export function getMemoryManager(): MemoryManager {
  if (!_memoryManager) {
    _memoryManager = new MemoryManager();
  }
  return _memoryManager;
}
