/**
 * Session Service
 *
 * Handles CRUD operations for ChatSessions and ChatMessages.
 */

import { getDb } from "../../../api/queries/connection.ts";
import { chatSessions, chatMessages } from "../../../db/schema.ts";
import { eq, desc } from "../../../db/mysql.ts";
import type { MessageRole } from "../llm/types.ts";

export class SessionService {
  /**
   * Get an existing session or create a new one.
   */
  async getOrCreateSession(
    sessionId: string,
    userId?: number,
    sessionType: string = "support"
  ): Promise<string> {
    const db = getDb();

    const existing = await db
      .select({ id: (chatSessions as any).id })
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(chatSessions).values({
        id: sessionId,
        userId,
        sessionType,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      // Update timestamp to keep session active
      await db
        .update(chatSessions)
        .set({ updatedAt: Date.now() })
        .where(eq(chatSessions.id, sessionId));
    }

    return sessionId;
  }

  /**
   * Append a message to the session history.
   *
   * @returns The ID of the newly inserted message.
   */
  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<number> {
    const db = getDb();
    
    // Convert system/tool to assistant for the generic chat UI,
    // but keep internal metadata intact if needed.
    const displayRole = role === "user" ? "user" : "assistant";

    const result = await db.insert(chatMessages).values({
      sessionId,
      role: displayRole,
      content,
      type: metadata?.type as string || "general",
      data: metadata ? JSON.stringify(metadata) : null,
      createdAt: Date.now(),
    });

    const insertedId = (result as any)?.[0]?.insertId || (result as any)?.lastInsertRowid || Date.now();
    return Number(insertedId);
  }

  /**
   * Get recent messages for a session to use as history context.
   */
  async getSessionHistory(sessionId: string, limit = 10) {
    const db = getDb();
    const records = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(limit);

    // Reverse to get chronological order for the context window
    return records.reverse().map(r => ({
      role: r.role,
      message: r.content,
      createdAt: r.createdAt
    }));
  }

  /**
   * Get a user's recent sessions.
   */
  async getUserSessions(userId: number, limit = 10) {
    const db = getDb();
    return db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
      .limit(limit);
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _sessionService: SessionService | null = null;

export function getSessionService(): SessionService {
  if (!_sessionService) {
    _sessionService = new SessionService();
  }
  return _sessionService;
}
