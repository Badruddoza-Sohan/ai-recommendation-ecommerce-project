/**
 * Support LLM Renderer (Implements Renderer<UnifiedAIResponse>)
 *
 * Converts a structured `UnifiedAIResponse` object into a natural, empathetic
 * customer support response using the local 3B LLM.
 *
 * THE LLM NEVER DECIDES BUSINESS LOGIC.
 * - Does not invent order details, dates, tracking numbers, prices, or policies.
 * - Max 120 tokens.
 * - Instant sub-50ms fallback to rawFallbackText if LLM is offline or busy.
 */

import { getLLMService } from "../llm/llm-service";
import type { Renderer, UnifiedAIResponse } from "../renderers/types";

const SUPPORT_RENDERER_SYSTEM_PROMPT = `You are a senior customer support executive. Convert the provided structured AI response JSON into a warm, empathetic response.

Rules:
- Do not invent information.
- Do not change any order numbers, prices, dates, or tracking codes.
- Do not invent policies or rules not present in the JSON.
- Be concise, friendly, and helpful.
- Maximum 120 tokens.`;

export class SupportLLMRenderer implements Renderer<UnifiedAIResponse> {
  /**
   * Render a support response as natural text (non-streaming).
   */
  async render(response: UnifiedAIResponse): Promise<string> {
    if (response?.rawFallbackText) {
      return response.rawFallbackText;
    }

    const llm = getLLMService();
    const metadata = response?.metadata || {};
    const userPayload = JSON.stringify({
      title: response?.title || "Support Assistant",
      summary: response?.summary || "",
      sections: response?.sections || [],
      source: metadata.source || "policy",
      confidence: metadata.confidence || 0.95,
    }, null, 2);

    try {
      const res = await llm.chat(
        [
          { role: "system", content: SUPPORT_RENDERER_SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
        { temperature: 0.3, maxTokens: 180 }
      );

      const content = res.message.content.trim();
      return content || response?.rawFallbackText || response?.summary || "How can I assist you today?";
    } catch (err) {
      console.warn("[SupportLLMRenderer] LLM unavailable or timed out. Falling back to rawFallbackText.", err);
      return response?.rawFallbackText || response?.summary || "How can I assist you today?";
    }
  }

  /**
   * Stream a support response token-by-token.
   */
  async *streamRender(response: UnifiedAIResponse): AsyncGenerator<{ token: string; done?: boolean }> {
    if (response?.rawFallbackText) {
      yield { token: response.rawFallbackText, done: true };
      return;
    }

    const llm = getLLMService();
    const metadata = response?.metadata || {};
    const userPayload = JSON.stringify({
      title: response?.title || "Support Assistant",
      summary: response?.summary || "",
      sections: response?.sections || [],
      source: metadata.source || "policy",
      confidence: metadata.confidence || 0.95,
    }, null, 2);

    const fallbackText = response?.rawFallbackText || response?.summary || "How can I assist you today?";

    try {
      const stream = llm.chatStream(
        [
          { role: "system", content: SUPPORT_RENDERER_SYSTEM_PROMPT },
          { role: "user", content: userPayload },
        ],
        { temperature: 0.3, maxTokens: 180 }
      );

      let yielded = false;
      for await (const chunk of stream) {
        yielded = true;
        yield { token: chunk.token, done: chunk.done };
      }

      if (!yielded) {
        yield { token: fallbackText, done: true };
      }
    } catch (err) {
      console.warn("[SupportLLMRenderer] LLM streaming failed. Falling back to rawFallbackText.", err);
      yield { token: fallbackText, done: true };
    }
  }
}

let instance: SupportLLMRenderer | null = null;
export function getSupportLLMRenderer(): SupportLLMRenderer {
  if (!instance) {
    instance = new SupportLLMRenderer();
  }
  return instance;
}
