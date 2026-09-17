import { getOllamaClient } from "../llm/ollama-client.ts";
import type { ChatMessage as OllamaChatMessage } from "../llm/types.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

export class LLMGatewayProvider {
  private baseUrl: string;
  private primaryApiKey: string;
  private openAiApiKey: string;
  private defaultModel: string;
  private ollamaModel: string;
  private ollamaFallbackModel: string;
  private ollamaMaxTokens: number;
  private preferOllama: boolean;

  constructor() {
    this.baseUrl = process.env.LLM_API_BASE || "https://api.moonshot.cn/v1";
    this.primaryApiKey = process.env.LLM_API_KEY || "";
    this.openAiApiKey = process.env.OPENAI_API_KEY || "";
    this.defaultModel = process.env.LLM_MODEL || "moonshot-v1-8k";
    this.ollamaModel = process.env.OLLAMA_MODEL || "qwen2.5:3b-instruct";
    this.ollamaFallbackModel = process.env.OLLAMA_FALLBACK_MODEL || "qwen2.5:7b-instruct";
    this.ollamaMaxTokens = Number(process.env.OLLAMA_MAX_TOKENS || 600);
    this.preferOllama = process.env.PREFER_OLLAMA !== "false";
  }

  async generate(messages: ChatMessage[], options?: GenerationOptions): Promise<string> {
    let retries = 0;
    const maxRetries = 2;
    let delay = 1000;

    const hasImage = messages.some((message) => Array.isArray(message.content));
    if (this.preferOllama && !hasImage) {
      const localResponse = await this.generateWithOllama(messages, options);
      if (localResponse !== null) return localResponse;
      console.warn("[LLMGatewayProvider] Preferred Ollama path failed; trying paid providers.");
    }

    // 1. Primary Model (DeepSeek / Configured API)
    if (this.primaryApiKey) {
      console.log(`[LLMGatewayProvider] Trying configured primary API ${this.baseUrl} with model ${options?.model || this.defaultModel}.`);
      while (retries <= maxRetries) {
        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.primaryApiKey}`,
            },
            body: JSON.stringify({
              model: options?.model || this.defaultModel,
              messages,
              temperature: options?.temperature ?? 0.7,
              max_tokens: options?.max_tokens,
              response_format: options?.response_format,
            }),
          });

          if (!response.ok) {
            if (response.status === 429 && retries < maxRetries) {
              console.warn(`[LLMGatewayProvider] Rate limited (429). Retrying in ${delay}ms...`);
              await new Promise((resolve) => setTimeout(resolve, delay));
              retries++;
              delay *= 2;
              continue;
            }
            const err = await response.text();
            throw new Error(`Primary API Error: ${response.status} ${err}`);
          }

          const data = await response.json() as any;
          return data.choices[0].message.content;
        } catch (error) {
          if (retries >= maxRetries || !(error instanceof Error && error.message.includes("429"))) {
            console.error("[LLMGatewayProvider] Primary API failed:", error);
            break; // Break loop to try OpenAI fallback
          }
        }
      }
    } else {
      console.warn("[LLMGatewayProvider] LLM_API_KEY is not set; skipping configured primary API.");
    }

    // 2. Fallback: OpenAI
    if (this.openAiApiKey) {
      try {
        console.log("[LLMGatewayProvider] Attempting OpenAI fallback at https://api.openai.com/v1 with model gpt-4o-mini.");
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini", // Cost effective fast model
            messages,
            temperature: options?.temperature ?? 0.7,
            response_format: options?.response_format,
          }),
        });
        
        if (!openaiResponse.ok) {
          const err = await openaiResponse.text();
          throw new Error(`OpenAI Error: ${openaiResponse.status} ${err}`);
        }
        
        const data = await openaiResponse.json() as any;
        return data.choices[0].message.content;
      } catch (fallbackError) {
        console.error("[LLMGatewayProvider] OpenAI fallback failed:", fallbackError);
      }
    } else {
      console.warn("[LLMGatewayProvider] OPENAI_API_KEY is not set; skipping OpenAI fallback.");
    }

    // 3. Fallback: Local Ollama Model
    if (!this.preferOllama) {
      const localResponse = await this.generateWithOllama(messages, options);
      if (localResponse !== null) return localResponse;
    }

    // 4. Fallback: Offline / Default Message
    console.error("[LLMGatewayProvider] All AI providers failed. Returning offline message.", {
      primaryBaseUrl: this.baseUrl,
      primaryModel: options?.model || this.defaultModel,
      ollamaModels: [this.ollamaModel, this.ollamaFallbackModel],
      ollamaMaxTokens: this.ollamaMaxTokens,
      configuredProviders: {
        primary: Boolean(this.primaryApiKey),
        openai: Boolean(this.openAiApiKey),
        ollama: true,
      },
    });
    if (options?.response_format?.type === "json_object") {
      // Return a basic valid JSON string indicating offline state
      return JSON.stringify({
        error: true,
        offline: true,
        message: "AI is offline",
        shortDescription: "AI is currently offline.",
        description: "AI is currently offline.",
        keywords: "offline",
      });
    }
    
    return "I'm sorry, my AI brain is currently offline and no local fallback model is available.";
  }

  private async generateWithOllama(messages: ChatMessage[], options?: GenerationOptions): Promise<string | null> {
    const ollamaClient = getOllamaClient();
    const ollamaMessages = messages as OllamaChatMessage[];
    for (const model of [this.ollamaModel, this.ollamaFallbackModel]) {
      try {
        console.log(`[LLMGatewayProvider] Attempting Ollama ${this.preferOllama ? "preferred" : "fallback"} model ${model}.`);
        const ollamaResponse = await ollamaClient.chat(model, ollamaMessages, {
          temperature: options?.temperature ?? 0.7,
          maxTokens: options?.max_tokens ?? this.ollamaMaxTokens,
        });
        return ollamaResponse.message.content;
      } catch (ollamaError) {
        console.error(`[LLMGatewayProvider] Ollama model ${model} failed:`, ollamaError);
      }
    }
    return null;
  }

  async generateJSON<T>(messages: ChatMessage[], options?: GenerationOptions): Promise<T> {
    const content = await this.generate(messages, {
      ...options,
      response_format: { type: "json_object" }
    });

    try {
      return JSON.parse(content) as T;
    } catch {
      console.error("[LLMGatewayProvider] Failed to parse JSON:", content);
      throw new Error("Invalid JSON response from LLM Gateway");
    }
  }
}

let instance: LLMGatewayProvider;
export function getLLMGatewayProvider() {
  if (!instance) {
    instance = new LLMGatewayProvider();
  }
  return instance;
}
