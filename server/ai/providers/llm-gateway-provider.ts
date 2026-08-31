import { env } from "../../../api/lib/env.ts";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerationOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" | "text" };
}

export class LLMGatewayProvider {
  private baseUrl: string;
  private apiKey: string;
  private defaultModel: string;

  constructor() {
    this.baseUrl = process.env.LLM_API_BASE || "https://api.moonshot.cn/v1";
    this.apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
    this.defaultModel = process.env.LLM_MODEL || "moonshot-v1-8k";
  }

  async generate(messages: ChatMessage[], options?: GenerationOptions): Promise<string> {
    let retries = 0;
    const maxRetries = 2;
    let delay = 1000;

    // 1. Primary Model (DeepSeek / Configured API)
    if (this.apiKey) {
      while (retries <= maxRetries) {
        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${this.apiKey}`,
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

          const data = await response.json();
          return data.choices[0].message.content;
        } catch (error) {
          if (retries >= maxRetries || !(error instanceof Error && error.message.includes("429"))) {
            console.error("[LLMGatewayProvider] Primary API failed:", error);
            break; // Break loop to try OpenAI fallback
          }
        }
      }
    } else {
      console.warn("[LLMGatewayProvider] No Primary API key found. Trying OpenAI fallback.");
    }

    // 2. Fallback: OpenAI
    const openAiKey = process.env.OPENAI_API_KEY;
    if (openAiKey && openAiKey !== this.apiKey) {
      try {
        console.log("[LLMGatewayProvider] Attempting OpenAI fallback...");
        const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openAiKey}`,
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
        
        const data = await openaiResponse.json();
        return data.choices[0].message.content;
      } catch (fallbackError) {
        console.error("[LLMGatewayProvider] OpenAI fallback failed:", fallbackError);
      }
    } else {
      console.warn("[LLMGatewayProvider] Skipping OpenAI (Key missing or same as primary).");
    }

    // 3. Fallback: Local Ollama Model
    try {
      console.log("[LLMGatewayProvider] Attempting Ollama local fallback...");
      const ollamaResponse = await fetch("http://127.0.0.1:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama3", // Default local model
          messages,
          stream: false,
          options: {
            temperature: options?.temperature ?? 0.7
          }
        })
      });

      if (!ollamaResponse.ok) {
        const err = await ollamaResponse.text();
        throw new Error(`Ollama Error: ${ollamaResponse.status} ${err}`);
      }

      const data = await ollamaResponse.json();
      
      // If we requested JSON format, Ollama doesn't strictly follow `response_format`, 
      // but typically we can assume the LLM output is parsed outside.
      // If we must strictly force JSON for Ollama, one could append instructions, but we'll return raw for now.
      return data.message.content;
    } catch (ollamaError) {
      console.error("[LLMGatewayProvider] Ollama fallback failed:", ollamaError);
    }

    // 4. Fallback: Offline / Default Message
    console.warn("[LLMGatewayProvider] All AI providers failed. Returning offline message.");
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

  async generateJSON<T>(messages: ChatMessage[], options?: GenerationOptions): Promise<T> {
    const content = await this.generate(messages, {
      ...options,
      response_format: { type: "json_object" }
    });

    try {
      return JSON.parse(content) as T;
    } catch (e) {
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
