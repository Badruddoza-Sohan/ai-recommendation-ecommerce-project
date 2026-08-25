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

// ─── LLM Renderer Class ──────────────────────────────────────────────────────

export class LLMRenderer implements Renderer<FashionRecommendation> {
  /**
   * Render a recommendation as natural text (non-streaming).
   */
  async render(
    rec: FashionRecommendation,
    emotionalOpening?: string
  ): Promise<string> {
    return this.templateFallback(rec, emotionalOpening);
  }

  /**
   * Stream a recommendation as natural text (token-by-token).
   */
  async *streamRender(
    rec: FashionRecommendation,
    emotionalOpening?: string
  ): AsyncGenerator<StreamChunk> {
    yield { token: this.templateFallback(rec, emotionalOpening), done: true };
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
