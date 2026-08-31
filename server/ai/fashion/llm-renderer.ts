/**
 * LLM Renderer
 *
 * Converts a structured FashionRecommendation JSON into natural,
 * human-friendly text using the lightweight 3B local model.
 *
 * The LLM ONLY paraphrases. It NEVER decides colors, fabrics, items, or scores.
 *
 * If the LLM is offline, falls back to a deterministic template renderer.
 *
 * Performance target: 500-1200ms (100-150 tokens)
 */

import type { FashionRecommendation } from "./deterministic-fashion-engine";
import type { StreamChunk } from "../llm/types";
import type { Renderer } from "../renderers/types";
import { LLMService } from "../llm/llm-service.ts";

// ─── LLM Renderer Class ──────────────────────────────────────────────────────

export class LLMRenderer implements Renderer<FashionRecommendation> {
  /**
   * Render a recommendation as natural text (non-streaming).
   */
  async render(
    rec: FashionRecommendation,
    userMessage?: string,
    emotionalOpening?: string
  ): Promise<string> {

    try {
      const msg = (userMessage || "").toLowerCase();
      const wantsTop = msg.match(/\b(top|shirt|panjabi|t-shirt|polo|kurta)\b/);
      const wantsBottom = msg.match(/\b(pant|pants|bottom|bottoms|trousers|jeans|pajama|churidar)\b/);
      const wantsFootwear = msg.match(/\b(shoes|footwear|sneakers|boots|sandals)\b/);

      const isSpecific = wantsTop || wantsBottom || wantsFootwear;

      const topText = (!isSpecific || wantsTop) ? `Top: ${rec.look.top.name} (${rec.look.top.reason})\n` : "";
      const bottomText = (!isSpecific || wantsBottom) ? `Bottom: ${rec.look.bottom.name} (${rec.look.bottom.reason})\n` : "";
      const footwearText = (!isSpecific || wantsFootwear) ? `Footwear: ${rec.look.footwear.name} (${rec.look.footwear.reason})\n` : "";

      const systemPrompt = `You are a Fashion Stylist AI. Present the following recommendation naturally. Use Markdown.

Recommendation:
Occasion: ${rec.occasion}
${topText}${bottomText}${footwearText}Match Score: ${rec.matchScore}/100
Tips: ${rec.tips.join(", ")}

User Request: "${userMessage || "Suggest an outfit."}"
${emotionalOpening ? `Start your response with: ${emotionalOpening}` : ""}`;

      const llm = new LLMService();
      const response = await llm.chat([{ role: "system", content: systemPrompt }], {
        temperature: 0.5,
      });

      if (response && response.message && response.message.content) {
        return response.message.content.trim();
      }
    } catch (e) {
      console.error("[LLMRenderer] LLM generation failed:", e);
    }

    // Fallback if OpenAI fails
    return this.templateFallback(rec, emotionalOpening);
  }

  /**
   * Stream a recommendation as natural text (token-by-token).
   */
  async *streamRender(
    rec: FashionRecommendation,
    userMessage?: string,
    emotionalOpening?: string
  ): AsyncGenerator<StreamChunk> {
    yield { token: await this.render(rec, userMessage, emotionalOpening), done: true };
  }

  // ── Private: Deterministic Template Fallback ────────────────────────────────

  private templateFallback(rec: FashionRecommendation, emotionalOpening?: string): string {
    const lines: string[] = [];

    if (emotionalOpening) {
      lines.push(emotionalOpening);
      lines.push("");
    }

    lines.push(`✨ Here's your look for ${rec.occasion}.\n`);
    lines.push(`👕 **${rec.look.top.name}**`);
    lines.push(`${rec.look.top.reason}\n`);
    lines.push(`👖 **${rec.look.bottom.name}**`);
    lines.push(`${rec.look.bottom.reason}\n`);
    lines.push(`👞 **${rec.look.footwear.name}**`);
    lines.push(`${rec.look.footwear.reason}\n`);
    lines.push(`⭐ Match Score: **${rec.matchScore}/100**\n`);

    if (rec.tips.length > 0) {
      lines.push(`💡 **Styling Tip**: ${rec.tips[0]}\n`);
    }

    if (rec.avoid.length > 0) {
      lines.push(`✖ **Avoid**: ${rec.avoid[0]}\n`);
    }

    lines.push("Would you like a different color palette or a more premium version?");

    return lines.join("\n");
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _renderer: LLMRenderer | null = null;

export function getLLMRenderer(): LLMRenderer {
  if (!_renderer) {
    _renderer = new LLMRenderer();
  }
  return _renderer;
}
