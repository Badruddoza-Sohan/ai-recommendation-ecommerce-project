/**
 * Escalation Domain Engine
 *
 * Handles human admin ticket escalation and priority queue routing.
 */

import { getDb } from "../../../../api/queries/connection.ts";
import { escalationTickets, ticketMessages } from "../../../../db/aiSchema.ts";

export interface EscalationEngineResult {
  success: boolean;
  source: "tool";
  confidence: number;
  explainabilityReason: string;
  data: {
    ticketNumber: string;
    status: string;
    priority: string;
    message: string;
  };
}

export class EscalationEngine {
  async process(query: string, userId?: number, sessionId?: string): Promise<EscalationEngineResult> {
    const db = getDb();
    const ticketNumber = `TICK-${Math.floor(10000 + Math.random() * 90000)}`;

    try {
      if (sessionId) {
        const [res]: any = await db.insert(escalationTickets).values({
          ticketNumber,
          sessionId,
          userId: userId || null,
          userMessage: query,
          aiResponse: "I am transferring your request to a live Admin Support Agent.",
          aiConfidence: 1.0,
          escalationReason: "Customer requested human support chat",
          sentimentScore: -0.5,
          status: "open",
          priority: "high",
        });

        const ticketId = res.insertId;
        await db.insert(ticketMessages).values([
          {
            ticketId,
            senderType: "system",
            senderName: "System",
            message: `Ticket #${ticketNumber} created. An Admin Support Agent will join shortly.`,
          },
        ]);
      }
    } catch (err) {
      console.warn("[EscalationEngine] DB ticket creation warning:", err);
    }

    return {
      success: true,
      source: "tool",
      confidence: 1.0,
      explainabilityReason: "Human escalation triggered. Active support ticket generated.",
      data: {
        ticketNumber,
        status: "open",
        priority: "high",
        message: `I have transferred your request to a human Admin Support Agent. Ticket #${ticketNumber} is active.`,
      },
    };
  }
}
