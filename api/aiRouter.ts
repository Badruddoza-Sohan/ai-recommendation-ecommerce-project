/**
 * AI Router
 *
 * REST endpoints for the new local-first AI assistant.
 * Handles synchronous chats, session management, and feedback.
 */

import "dotenv/config";
import { Hono } from "hono";
import { getConversationManager } from "../server/ai/conversation/conversation-manager.ts";
import { getSessionService } from "../server/ai/conversation/session-service.ts";
import { getDb } from "./queries/connection.ts";
import { aiFeedback } from "../db/aiSchema.ts";
import { eq, desc } from "../db/mysql.ts";
import { chatMessages } from "../db/schema.ts"; // from old schema, assuming it still exists
import type { Domain } from "../server/ai/classification/types.ts";
import { getLLMGatewayProvider } from "../server/ai/providers/llm-gateway-provider.ts";

export const aiRouter = new Hono();

function cleanVoiceSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;

  let query = value
    .replace(/[?!.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  query = query
    .replace(/^(?:please|can you|could you|would you|will you|help me|find me|show me|give me|i need|i want|i would like|i am looking for)\s+/i, "")
    .replace(/\s+(?:can you|could you|would you|will you|please)\s+(?:find|show|get|give)\s+(?:me\s+)?(?:one|some|a|an)?\s*$/i, "")
    .replace(/\s+(?:for me|one|please)$/i, "")
    .trim();

  return query || null;
}

function fallbackVoiceDecision(message: string) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const targetPages: Array<[RegExp, string]> = [
    [/\b(cart|shopping bag|basket)\b/i, "/cart"],
    [/\b(order|orders|order history|track my order)\b/i, "/orders"],
    [/\b(checkout|pay|place my order)\b/i, "/voice-checkout"],
    [/\b(profile|account|settings)\b/i, "/profile"],
    [/\b(support|help center|customer service)\b/i, "/support"],
    [/\b(stylist|fashion advice)\b/i, "/fashion-stylist"],
    [/\b(home|homepage|main page)\b/i, "/"],
  ];

  const target = targetPages.find(([pattern]) => pattern.test(lower));
  if (target && /\b(open|go|take me|navigate|show|jao|dekhao)\b/i.test(lower)) {
    return {
      intent: "navigate",
      searchQuery: null,
      targetPage: target[1],
      selectedProduct: null,
      responseText: `Opening ${target[1] === "/" ? "home" : target[1].slice(1)}.`,
      confidence: 0.55,
      reason: "Local fallback after OpenAI request failure",
    };
  }

  const hasSearchMeaning = /\b(search|find|look for|show me|need|want|buy|khujo|khuje|dekhao|kinte chai)\b/i.test(lower);
  if (hasSearchMeaning) {
    const query = cleanVoiceSearchQuery(
      normalized
        .replace(/\b(?:can|could|would|will)\s+you\b.*$/i, "")
        .replace(/^(?:please\s+)?(?:can you\s+)?(?:find|search|look for|show me|give me|help me find)\s+/i, "")
        .replace(/^(?:i need|i want|i would like|i am looking for)\s+/i, "")
    );

    return {
      intent: "search",
      searchQuery: query,
      targetPage: null,
      selectedProduct: null,
      responseText: query ? `Searching for ${query}.` : "What product would you like me to find?",
      confidence: 0.5,
      reason: "Local fallback after OpenAI request failure",
    };
  }

  return {
    intent: "help",
    searchQuery: null,
    targetPage: null,
    selectedProduct: null,
    responseText: "Tell me what product you need, for example: find me a shirt.",
    confidence: 0.3,
    reason: "Local fallback after OpenAI request failure",
  };
}

async function routeVoiceCommandWithAI(message: string, context: Record<string, any> = {}) {
  try {
    const prompt = `You are Dev, the MarketVerse voice shopping assistant. Use the user command and the page/product context to decide the next action precisely.

Return valid JSON only with keys:
- intent: one of [navigate, search, read_products, select_option, checkout, stop, repeat, page_description, help, conversational, greeting, capabilities, shopping_advice, order, confirm, cancel_action, resume]
- searchQuery: string or null
- targetPage: page path like /products, /cart, /orders, /support, /profile, /fashion-stylist, /ai-assistant, /voice-checkout or null
- selectedProduct: object with id, name, slug, price if a product is being selected; otherwise null
- responseText: short spoken response to the user
- confidence: number between 0 and 1
- reason: brief explanation

User command: ${message}
Page context: ${JSON.stringify(context.page || context.currentPage || "/")}
Product list: ${JSON.stringify(context.productList || [])}
Route hints: ${JSON.stringify(context.routeHints || {})}
Current transcript: ${JSON.stringify(context.currentTranscript || message)}

Rules:
- If the user asks to go somewhere, use intent "navigate" and targetPage.
- If the user asks for a product or search, use intent "search" and searchQuery.
- Extract only the product or category words for searchQuery. For example, "I need a shirt, can you find me one" must return searchQuery "shirt", not the full sentence.
- If they ask to buy or choose an option, use intent "select_option" and selectedProduct when possible.
- If they ask to open checkout or pay, use intent "checkout".
- If they ask to hear product items, use intent "read_products".
- Else use a conversational/help intent.
- Do not include markdown or explanation outside JSON.`;

    const provider = getLLMGatewayProvider();
    const parsed = await provider.generateJSON<any>(
      [{ role: "system", content: prompt }],
      { temperature: 0.2 }
    );

    if (parsed.offline || parsed.error) {
      return null;
    }

    return {
      intent: parsed.intent || "help",
      searchQuery: cleanVoiceSearchQuery(parsed.searchQuery),
      targetPage: parsed.targetPage || null,
      selectedProduct: parsed.selectedProduct || null,
      responseText: parsed.responseText || "I can help with that.",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.7,
      reason: parsed.reason || "AI Gateway voice routing",
    };
  } catch (error) {
    console.error("[VoiceAI] AI Gateway voice routing error:", error);
    return null;
  }
}

// We assume some auth middleware sets c.get('userId') if logged in
// const authMiddleware = ...

/**
 * POST /api/ai/chat
 * Send a message and get a synchronous JSON response.
 * (For streaming, use the WebSocket endpoint instead).
 */
aiRouter.post("/chat", async (c) => {
  const body = await c.req.json();
  const { message, sessionId, domain = "support", context = {} } = body;

  if (!message || typeof message !== "string") {
    return c.json({ error: "Message is required" }, 400);
  }

  // Get user from auth if available (dummy logic here)
  const authHeader = c.req.header("Authorization");
  const userId = authHeader ? 1 : undefined; // Replace with real auth

  const isVoiceCommand = (String(domain || "").toLowerCase() === "voice") || context?.userIntent === "voice-assistant-command" || !!context?.currentTranscript;

  if (isVoiceCommand) {
    const voiceDecision = await routeVoiceCommandWithAI(String(message), context || {});
    const decision = voiceDecision || fallbackVoiceDecision(String(message));
    return c.json({
      success: true,
      data: {
        content: decision.responseText,
        intent: decision.intent,
        domain: "voice",
        structuredResponse: decision,
      },
    });
  }

  const manager = getConversationManager();
  
  try {
    const result = await manager.chat({
      message,
      sessionId,
      userId,
      domain: domain as Domain,
      context,
    });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[AIRouter] Chat error:", error);
    return c.json({ error: "Failed to process chat request" }, 500);
  }
});

/**
 * GET /api/ai/sessions
 * List recent chat sessions for the logged-in user.
 */
aiRouter.get("/sessions", async (c) => {
  const userId = 1; // Replace with real auth (e.g. c.get("userId"))
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const sessions = getSessionService();
  try {
    const history = await sessions.getUserSessions(userId);
    return c.json({ success: true, data: history });
  } catch (error) {
    return c.json({ error: "Failed to load sessions" }, 500);
  }
});

/**
 * GET /api/ai/sessions/:id/messages
 * Get message history for a specific session.
 */
aiRouter.get("/sessions/:id/messages", async (c) => {
  const sessionId = c.req.param("id");
  const db = getDb();

  try {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);

    return c.json({ success: true, data: messages });
  } catch (error) {
    return c.json({ error: "Failed to load messages" }, 500);
  }
});

/**
 * POST /api/ai/feedback
 * Submit positive/negative feedback for an AI response.
 */
aiRouter.post("/feedback", async (c) => {
  const body = await c.req.json();
  const { sessionId, messageId, feedback, comment, intent } = body;

  if (!sessionId || !feedback) {
    return c.json({ error: "sessionId and feedback are required" }, 400);
  }

  const userId = 1; // Replace with auth
  const db = getDb();

  try {
    await db.insert(aiFeedback).values({
      sessionId,
      userId,
      messageId,
      feedback,
      comment,
      intent,
      createdAt: Date.now()
    });

    return c.json({ success: true });
  } catch (error) {
    console.error("[AIRouter] Feedback error:", error);
    return c.json({ error: "Failed to submit feedback" }, 500);
  }
});
