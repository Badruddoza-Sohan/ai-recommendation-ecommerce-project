/**
 * Ollama HTTP Client
 *
 * Direct HTTP client for the Ollama REST API.
 * Handles: chat completion, streaming, embeddings, model management.
 * No external dependencies — uses native fetch.
 *
 * Ollama API reference: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

import net from "node:net";
import type {
  ChatMessage,
  ChatOptions,
  ChatResponse,
  StreamChunk,
  EmbeddingResponse,
  BatchEmbeddingResponse,
  ModelInfo,
  OllamaHealthStatus,
} from "./types.ts";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_BASE_URL = process.env.OLLAMA_URL ?? "http://127.0.0.1:11434";
const DEFAULT_TIMEOUT_MS = 120_000; // 2 minutes for large models

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(baseUrl: string, timeoutMs = 60): Promise<boolean> {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname || "127.0.0.1";
    const port = parseInt(url.port || "11434", 10);

    return new Promise<boolean>((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);
      socket.on("connect", () => {
        socket.destroy();
        resolve(true);
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve(false);
      });
      socket.on("error", () => {
        socket.destroy();
        resolve(false);
      });
      try {
        socket.connect(port, host);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return Promise.resolve(false);
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ─── Client ───────────────────────────────────────────────────────────────────

export class OllamaClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor(
    baseUrl: string = DEFAULT_BASE_URL,
    timeoutMs: number = DEFAULT_TIMEOUT_MS
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, ""); // strip trailing slash
    this.timeoutMs = timeoutMs;
  }

  // ── Core: Non-streaming Chat ──────────────────────────────────────────────

  /**
   * Send a chat completion request and wait for the full response.
   */
  async chat(
    model: string,
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): Promise<ChatResponse> {
    const body = {
      model,
      messages,
      stream: false,
      options: this.buildOllamaOptions(options),
      ...(options.system ? { system: options.system } : {}),
    };

    const res = await this.post("/api/chat", body, this.timeoutMs);
    const data = await res.json() as any;

    return {
      message: data.message ?? { role: "assistant", content: "" },
      model: data.model ?? model,
      doneReason: data.done_reason ?? "stop",
      totalDurationMs: Math.round((data.total_duration ?? 0) / 1_000_000),
      promptTokens: data.prompt_eval_count ?? 0,
      completionTokens: data.eval_count ?? 0,
      done: data.done ?? true,
    };
  }

  // ── Core: Streaming Chat ──────────────────────────────────────────────────

  /**
   * Stream a chat completion response.
   * Yields chunks as they arrive, ending with `{ done: true }`.
   *
   * @example
   * for await (const chunk of client.chatStream(model, messages)) {
   *   if (chunk.done) break;
   *   process.stdout.write(chunk.token);
   * }
   */
  async *chatStream(
    model: string,
    messages: ChatMessage[],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk> {
    const body = {
      model,
      messages,
      stream: true,
      options: this.buildOllamaOptions(options),
      ...(options.system ? { system: options.system } : {}),
    };

    const res = await this.post("/api/chat", body, this.timeoutMs);

    if (!res.body) {
      throw new Error("[OllamaClient] No response body for streaming");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? ""; // keep incomplete last line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line) as any;
            const token = parsed.message?.content ?? "";

            yield { token, done: parsed.done ?? false, model: parsed.model };

            if (parsed.done) return;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { token: "", done: true };
  }

  // ── Core: Generate (raw text, no chat format) ─────────────────────────────

  /**
   * Low-level text generation (for embeddings prompts, etc.)
   */
  async generate(
    model: string,
    prompt: string,
    options: ChatOptions = {}
  ): Promise<string> {
    const body = {
      model,
      prompt,
      stream: false,
      options: this.buildOllamaOptions(options),
    };

    const res = await this.post("/api/generate", body, this.timeoutMs);
    const data = await res.json() as any;
    return data.response ?? "";
  }

  // ── Core: Embeddings ──────────────────────────────────────────────────────

  /**
   * Generate a single text embedding.
   */
  async embed(model: string, input: string): Promise<EmbeddingResponse> {
    const body = { model, prompt: input };
    const res = await this.post("/api/embeddings", body, 30_000);
    const data = await res.json() as any;

    if (!Array.isArray(data.embedding)) {
      throw new Error(
        `[OllamaClient] Invalid embedding response: ${JSON.stringify(data)}`
      );
    }

    return { embedding: data.embedding as number[], model };
  }

  /**
   * Generate embeddings for multiple texts (sequential — Ollama has no native batch).
   * Uses concurrency of 3 to avoid overwhelming the model.
   */
  async embedBatch(
    model: string,
    inputs: string[]
  ): Promise<BatchEmbeddingResponse> {
    const CONCURRENCY = 3;
    const results: number[][] = new Array(inputs.length);

    for (let i = 0; i < inputs.length; i += CONCURRENCY) {
      const slice = inputs.slice(i, i + CONCURRENCY);
      const resolved = await Promise.all(
        slice.map((text) => this.embed(model, text))
      );
      for (let j = 0; j < resolved.length; j++) {
        results[i + j] = resolved[j].embedding;
      }
    }

    return { embeddings: results, model };
  }

  // ── Model Management ──────────────────────────────────────────────────────

  private cachedHealth: { status: OllamaHealthStatus; timestamp: number } | null = null;

  /**
   * List all locally available models.
   */
  async listModels(): Promise<ModelInfo[]> {
    const portOpen = await isPortOpen(this.baseUrl, 50);
    if (!portOpen) return [];
    try {
      const res = await fetchWithTimeout(
        `${this.baseUrl}/api/tags`,
        { method: "GET" },
        200
      );
      if (!res.ok) return [];
      const data = await res.json() as any;
      return (data.models ?? []).map((m: any) => ({
        name: m.name,
        size: m.size ?? 0,
        digest: m.digest ?? "",
        details: {
          parameterSize: m.details?.parameter_size,
          quantizationLevel: m.details?.quantization_level,
          family: m.details?.family,
        },
      }));
    } catch {
      return [];
    }
  }

  /**
   * Check if a specific model is available locally.
   */
  async hasModel(modelName: string): Promise<boolean> {
    const models = await this.listModels();
    return models.some(
      (m) =>
        m.name === modelName ||
        m.name.startsWith(modelName.split(":")[0])
    );
  }

  /**
   * Full health check: is Ollama running and are required models available?
   */
  async healthCheck(
    primaryModel: string,
    fallbackModel: string,
    embeddingModel: string
  ): Promise<OllamaHealthStatus> {
    if (this.cachedHealth && Date.now() - this.cachedHealth.timestamp < 10000) {
      return this.cachedHealth.status;
    }
    try {
      const models = await this.listModels();
      const isAvailable = models.length > 0;
      const names = models.map((m) => m.name);

      const hasModel = (name: string) =>
        names.some(
          (n) =>
            n === name || n.startsWith(name.split(":")[0])
        );

      const status: OllamaHealthStatus = {
        isAvailable,
        models,
        primaryModel: hasModel(primaryModel) ? primaryModel : undefined,
        fallbackModel: hasModel(fallbackModel) ? fallbackModel : undefined,
        embeddingModel: hasModel(embeddingModel) ? embeddingModel : undefined,
      };
      this.cachedHealth = { status, timestamp: Date.now() };
      return status;
    } catch {
      const status: OllamaHealthStatus = {
        isAvailable: false,
        models: [],
      };
      this.cachedHealth = { status, timestamp: Date.now() };
      return status;
    }
  }

  // ── Private: HTTP Helpers ─────────────────────────────────────────────────

  private async post(
    path: string,
    body: object,
    timeoutMs: number,
    attempt = 1
  ): Promise<Response> {
    const portOpen = await isPortOpen(this.baseUrl, 50);
    if (!portOpen) {
      throw new Error(`[OllamaClient] Port 11434 unreachable for ${this.baseUrl}`);
    }
    const url = `${this.baseUrl}${path}`;
    const maxAttempts = 3;

    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        timeoutMs
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`[OllamaClient] HTTP ${res.status} ${path}: ${text}`);
      }

      return res;
    } catch (err) {
      const isConnectionRefused =
        err instanceof Error &&
        (err.message.includes("ECONNREFUSED") ||
          err.message.includes("fetch failed") ||
          err.name === "AbortError");

      const isRetryable =
        !isConnectionRefused &&
        attempt < maxAttempts &&
        !(err instanceof Error && err.message.includes("HTTP 4"));

      if (isRetryable) {
        await sleep(Math.pow(2, attempt) * 500); // exponential backoff: 1s, 2s
        return this.post(path, body, timeoutMs, attempt + 1);
      }

      throw err;
    }
  }

  private buildOllamaOptions(options: ChatOptions): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (options.temperature !== undefined) out.temperature = options.temperature;
    if (options.topP !== undefined) out.top_p = options.topP;
    if (options.repeatPenalty !== undefined) out.repeat_penalty = options.repeatPenalty;
    if (options.maxTokens !== undefined) out.num_predict = options.maxTokens;
    if (options.stop?.length) out.stop = options.stop;
    return out;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _client: OllamaClient | null = null;

export function getOllamaClient(): OllamaClient {
  if (!_client) {
    _client = new OllamaClient(
      process.env.OLLAMA_URL ?? "http://127.0.0.1:11434"
    );
  }
  return _client;
}
