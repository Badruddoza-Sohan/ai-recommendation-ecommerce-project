/**
 * WebSocket Server for AI Streaming
 *
 * Implements real-time streaming of LLM responses using the new ConversationManager.
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { getConversationManager } from "../server/ai/conversation/conversation-manager.ts";
import { getSessionService } from "../server/ai/conversation/session-service.ts";
import type { Domain } from "../server/ai/classification/types.ts";

export function setupWSServer(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ai/stream" });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[WSServer] New client connected for AI streaming");

    ws.on("message", async (data: string) => {
      try {
        const payload = JSON.parse(data);
        const { message, sessionId, domain = "support", context = {}, userId } = payload;

        if (!message) {
          ws.send(JSON.stringify({ type: "error", error: "Message is required" }));
          return;
        }

        const manager = getConversationManager();
        let fullResponse = "";

        // Send start event
        ws.send(JSON.stringify({ type: "start", sessionId }));

        // Stream the response
        try {
          const stream = manager.chatStream({
            message,
            sessionId,
            userId,
            domain: domain as Domain,
            context,
          });

          for await (const chunk of stream) {
            fullResponse += chunk.token;
            ws.send(JSON.stringify({
              type: "chunk",
              token: chunk.token,
            }));
          }

          // Generate a fake message ID for the UI since we don't save the stream intermediate state yet
          // In a full implementation, you'd save `fullResponse` to `chatMessages` here.
          const sessions = getSessionService();
          const msgId = await sessions.addMessage(sessionId, "assistant", fullResponse);

          ws.send(JSON.stringify({
            type: "done",
            messageId: msgId,
            fullText: fullResponse
          }));

        } catch (streamError) {
          console.error("[WSServer] Stream generation error:", streamError);
          ws.send(JSON.stringify({ type: "error", error: "Failed to generate response" }));
        }

      } catch (err) {
        console.error("[WSServer] Message parsing error:", err);
        ws.send(JSON.stringify({ type: "error", error: "Invalid JSON payload" }));
      }
    });

    ws.on("close", () => {
      console.log("[WSServer] Client disconnected");
    });
  });

  console.log("[WSServer] WebSocket streaming server initialized on /api/ai/stream");
  return wss;
}
