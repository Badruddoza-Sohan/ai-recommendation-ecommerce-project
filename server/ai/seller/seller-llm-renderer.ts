/**
 * Enterprise Seller LLM Renderer
 * Presentation layer connecting structured engine outputs with AI LLM Models (Ollama / Local AI / LLMService).
 * Strictly preserves numerical facts (stock, prices, SEO scores, revenue) without hallucination.
 */

import type { AIResponse, SellerContext } from "./types.ts";
import { getOllamaClient } from "../llm/ollama-client.ts";

export class SellerLLMRenderer {
  /**
   * Render structured response into conversational, intelligent AI guidance.
   * Primary: OpenAI (gpt-4o-mini) with FULL product context, engine analytics & conversation history.
   * Secondary: Local Ollama.
   * Tertiary: Dynamic semantic synthesis.
   */
  async render(
    response: AIResponse,
    userQuery?: string,
    context?: SellerContext,
    history?: { role: string; content: string }[]
  ): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY || "";

    // 1. Primary: OpenAI with Full Context
    if (apiKey) {
      try {
        const fullContextSystemPrompt = this.buildFullContextSystemPrompt(response, context);
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: fullContextSystemPrompt },
        ];

        // Append recent conversation history for deep contextual coherence
        if (history && history.length > 0) {
          for (const msg of history.slice(-6)) {
            messages.push({
              role: msg.role === "user" ? "user" : "assistant",
              content: msg.content,
            });
          }
        }

        messages.push({
          role: "user",
          content: userQuery || "Analyze my product and give me comprehensive seller guidance.",
        });

        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply && typeof reply === "string" && reply.trim().length > 20) {
            return reply.trim();
          }
        } else {
          console.warn(`[SellerLLMRenderer] OpenAI API returned ${res.status}: ${res.statusText}`);
        }
      } catch (err) {
        console.error("[SellerLLMRenderer] OpenAI generation error:", err);
      }
    }

    // 2. Secondary: Local Ollama (if available)
    const prompt = this.buildPrompt(response, userQuery);
    try {
      const ollama = getOllamaClient();
      const llmResult = await ollama.generate(
        "qwen2.5:0.5b",
        prompt,
        {
          system: "You are an expert Enterprise AI Seller Assistant. Answer the seller's specific query using the provided structured facts. Speak in a helpful, intelligent, natural tone. NEVER invent or alter numerical data, stock counts, prices, or SEO scores.",
          temperature: 0.3,
        }
      );

      if (llmResult && typeof llmResult === "string" && llmResult.trim().length > 25) {
        return llmResult.trim();
      }
    } catch {
      // Local LLM warming up or offline — fallback to dynamic synthesis
    }

    // 3. Fallback: Dynamic semantic synthesis
    return this.renderDynamicSynthesis(response, userQuery);
  }

  private buildFullContextSystemPrompt(response: AIResponse, context?: SellerContext): string {
    const productInfo = {
      productName: context?.productName || response.title || "Selected Product",
      category: context?.category || "General",
      currentPrice: context?.price ? `BDT ${context.price.toLocaleString()}` : "Not specified",
      currentStock: context?.stock !== undefined ? `${context.stock} units` : "Not specified",
      costPrice: context?.costPrice ? `BDT ${context.costPrice.toLocaleString()}` : undefined,
      businessName: context?.businessName || "Your Store",
      sellerId: context?.sellerId,
    };

    const sectionBreakdown = (response.sections || []).map((s) => ({
      sectionTitle: s.title,
      type: s.type,
      data: s.content,
    }));

    return `You are Enterprise AI Seller Copilot V2 for MarketVerse, a leading multi-vendor e-commerce platform in Bangladesh.
You act as an elite e-commerce growth strategist, senior SEO copywriter, inventory manager, and retail business advisor.

=== 1. FULL PRODUCT & SELLER CONTEXT ===
${JSON.stringify(productInfo, null, 2)}

=== 2. COMPUTED ENGINE METRICS & DETERMINISTIC FACTS ===
Overview Title: ${response.title}
Summary: ${response.summary}
Metadata: ${JSON.stringify(response.metadata || {}, null, 2)}
Analyzed Engine Sections:
${JSON.stringify(sectionBreakdown, null, 2)}

=== 3. OPERATING INSTRUCTIONS ===
1. ALWAYS maintain full awareness of the product name, category, price in BDT, and stock level.
2. Directly answer the seller's specific question or command with actionable, intelligent insights.
3. Preserve all numerical metrics (exact stock counts, prices, margins, SEO scores) accurately.
4. Structure your response using rich Markdown with clear headings (###), bold emphasis, bullet points, and clean spacing.
5. Provide high-impact e-commerce guidance tailored to Bangladeshi online shoppers and MarketVerse marketplace dynamics.
6. If the seller asks for copy (titles, descriptions, bullet points, tags), write high-converting, professional, ready-to-use copy.
7. Conclude with proactive next steps or strategic tips when appropriate.`;
  }

  private buildPrompt(response: AIResponse, userQuery?: string): string {
    return `[User Query]: ${userQuery || "Help me optimize my store"}
[Engine Facts & Analytics]: ${JSON.stringify({ title: response.title, summary: response.summary, sections: response.sections })}

Instructions:
1. Address the seller's specific request directly in a warm, professional, highly helpful tone.
2. If providing copy or titles, format them clearly.
3. Keep all numbers, prices, stock counts, and SEO scores EXACTLY as given.
4. Conclude with a helpful proactive suggestion.`;
  }

  /**
   * Dynamic semantic synthesis when LLM service is offline or warming up.
   * Crafts conversational AI replies tailored to the query intent and sections.
   */
  private renderDynamicSynthesis(response: AIResponse, _userQuery?: string): string {
    const intent = response.metadata?.intent || "general";

    let headerIntro = `I've analyzed your product listing for **${response.title}**. Here is the AI optimization breakdown:\n\n`;

    if (intent === "product_description") {
      headerIntro = `Here is the optimized product copy and listing title generated for your item:\n\n`;
    } else if (intent === "keywords_seo") {
      headerIntro = `Here is your target SEO keyword analysis and optimization score:\n\n`;
    } else if (intent === "inventory_alert") {
      headerIntro = `Here is the real-time inventory health and restock status for your store:\n\n`;
    } else if (intent === "pricing_analysis") {
      headerIntro = `Here is your pricing benchmark and profit margin recommendation:\n\n`;
    } else if (intent === "analytics_insights") {
      headerIntro = `Here is your store revenue and sales performance overview:\n\n`;
    } else if (intent === "product_quality") {
      headerIntro = `Here is your listing quality score audit and issue checklist:\n\n`;
    }

    let body = headerIntro;

    for (const sec of response.sections) {
      if (typeof sec.content === "string") {
        body += `**${sec.title}**\n${sec.content}\n\n`;
      } else if (Array.isArray(sec.content)) {
        body += `**${sec.title}**\n${sec.content.map((item) => `• ${item}`).join("\n")}\n\n`;
      } else if (typeof sec.content === "object" && sec.content !== null) {
        body += `**${sec.title}**\n`;
        for (const [key, val] of Object.entries(sec.content)) {
          if (val && typeof val !== "object") {
            body += `• **${this.formatKey(key)}**: ${val}\n`;
          }
        }
        body += `\n`;
      }
    }

    return body.trim();
  }

  private formatKey(key: string): string {
    return key.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
  }
}

let instance: SellerLLMRenderer | null = null;
export function getSellerLLMRenderer(): SellerLLMRenderer {
  if (!instance) instance = new SellerLLMRenderer();
  return instance;
}
