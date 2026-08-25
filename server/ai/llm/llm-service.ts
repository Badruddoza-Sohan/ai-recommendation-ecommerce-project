/**
 * LLM Service
 *
 * Model abstraction layer with automatic fallback.
 * Primary: qwen2.5:7b-instruct → Fallback: qwen2.5:3b-instruct
 *
 * Centralizes all model parameters and enforces context window limits.
 */

import { getOllamaClient } from "./ollama-client.ts";
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  GenerationConfig,
  OllamaHealthStatus,
} from "./types.ts";
import { DEFAULT_GENERATION_CONFIG } from "./types.ts";

// ─── LLM Service ──────────────────────────────────────────────────────────────

export class LLMService {
  private readonly config: GenerationConfig;
  private usingFallback = false;

  constructor(config: Partial<GenerationConfig> = {}) {
    this.config = { ...DEFAULT_GENERATION_CONFIG, ...config };
  }

  // ── Public: Chat ──────────────────────────────────────────────────────────

  /**
   * Send a chat message and return the full response.
   * Automatically falls back to the smaller model if the primary fails.
   */
  async chat(
    messages: ChatMessage[],
    options: Partial<ChatOptions> = {}
  ): Promise<ChatResponse> {
    const merged = this.mergeOptions(options);
    const model = this.activeModel();

    console.log(`[RUNTIME-TRACE] [LLMService] Invoking model: ${model}`);
    console.log(`\n------------------ LLM COMPLETE PROMPT START ------------------`);
    for (const m of messages) {
      console.log(`[${m.role.toUpperCase()}]:\n${m.content}\n`);
    }
    console.log(`------------------ LLM COMPLETE PROMPT END ------------------\n`);

    try {
      const client = getOllamaClient();
      const response = await client.chat(model, messages, merged);
      console.log(`[RUNTIME-TRACE] [LLMService] LLM RESPONSE GENERATED:\n${response.message.content}\n`);
      // Reset fallback flag on success
      if (this.usingFallback) {
        this.usingFallback = false;
      }
      return response;
    } catch (err) {
      if (!this.usingFallback) {
        console.warn(
          `[LLMService] Primary model (${model}) failed, switching to fallback (${this.config.fallbackModel}). Error:`,
          err instanceof Error ? err.message : err
        );
        this.usingFallback = true;
        return this.chat(messages, options); // retry with fallback
      }
      throw err; // both models failed
    }
  }

  /**
   * Stream a chat response, yielding tokens as they arrive.
   * Automatically falls back to the smaller model if the primary fails.
   */
  async *chatStream(
    messages: ChatMessage[],
    options: Partial<ChatOptions> = {}
  ): AsyncGenerator<StreamChunk> {
    const merged = this.mergeOptions(options);
    const model = this.activeModel();
    const client = getOllamaClient();

    try {
      yield* client.chatStream(model, messages, merged);
    } catch (err) {
      if (!this.usingFallback) {
        console.warn(
          `[LLMService] Primary model stream failed, using fallback ${this.config.fallbackModel}.`
        );
        this.usingFallback = true;
        yield* this.chatStream(messages, options);
        return;
      }
      throw err;
    }
  }

  // ── Public: Embed ─────────────────────────────────────────────────────────

  /**
   * Generate a single text embedding using the configured embedding model.
   */
  async embed(text: string): Promise<number[]> {
    const client = getOllamaClient();
    const result = await client.embed(this.config.embeddingModel, this.sanitizeForEmbedding(text));
    return result.embedding;
  }

  /**
   * Generate embeddings for multiple texts.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    const client = getOllamaClient();
    const sanitized = texts.map((t) => this.sanitizeForEmbedding(t));
    const result = await client.embedBatch(this.config.embeddingModel, sanitized);
    return result.embeddings;
  }

  // ── Public: Health ────────────────────────────────────────────────────────

  async healthCheck(): Promise<OllamaHealthStatus> {
    const client = getOllamaClient();
    return client.healthCheck(
      this.config.primaryModel,
      this.config.fallbackModel,
      this.config.embeddingModel
    );
  }

  isUsingFallback(): boolean {
    return this.usingFallback;
  }

  activeModel(): string {
    return this.usingFallback ? this.config.fallbackModel : this.config.primaryModel;
  }

  getConfig(): Readonly<GenerationConfig> {
    return { ...this.config };
  }

  // ── Public: Utilities ─────────────────────────────────────────────────────

  /**
   * Truncate a message list to fit within the approximate token budget.
   * Keeps system prompt + recent messages; trims from the middle.
   *
   * Rough estimate: 1 token ≈ 4 characters
   */
  truncateToContextWindow(
    messages: ChatMessage[],
    maxTokens = 6000
  ): ChatMessage[] {
    const budget = maxTokens * 4; // chars

    // Always keep system messages (first in list typically)
    const system = messages.filter((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    let total = system.reduce((acc, m) => acc + m.content.length, 0);
    const kept: ChatMessage[] = [];

    // Walk backwards (keep most recent)
    for (let i = nonSystem.length - 1; i >= 0; i--) {
      const len = nonSystem[i].content.length;
      if (total + len > budget) break;
      total += len;
      kept.unshift(nonSystem[i]);
    }

    return [...system, ...kept];
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private mergeOptions(overrides: Partial<ChatOptions>): ChatOptions {
    return {
      temperature: overrides.temperature ?? this.config.temperature,
      topP: overrides.topP ?? this.config.topP,
      repeatPenalty: overrides.repeatPenalty ?? this.config.repeatPenalty,
      maxTokens: overrides.maxTokens ?? this.config.maxTokens,
      stop: overrides.stop,
      stream: overrides.stream ?? false,
      system: overrides.system,
    };
  }

  private sanitizeForEmbedding(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8192); // nomic-embed-text max input
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _llmService: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!_llmService) {
    _llmService = new LLMService();
  }
  return _llmService;
}
