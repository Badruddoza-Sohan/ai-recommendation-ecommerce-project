/**
 * LLM Type Definitions
 * Shared types for the Ollama-based AI system.
 */

// ─── Chat Types ────────────────────────────────────────────────────────────────

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: MessageRole;
  content: string;
  /** Optional name for tool messages */
  name?: string;
}

export interface ChatOptions {
  temperature?: number;
  topP?: number;
  repeatPenalty?: number;
  maxTokens?: number;
  stop?: string[];
  /** Whether to stream the response */
  stream?: boolean;
  /** System prompt override */
  system?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  model: string;
  doneReason: string;
  totalDurationMs: number;
  promptTokens: number;
  completionTokens: number;
  done: boolean;
}

export interface StreamChunk {
  token: string;
  done?: boolean;
  model?: string;
}

// ─── Embedding Types ──────────────────────────────────────────────────────────

export interface EmbeddingRequest {
  model: string;
  prompt: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
}

// ─── Model Info ───────────────────────────────────────────────────────────────

export interface ModelInfo {
  name: string;
  size: number;
  digest: string;
  details?: {
    parameterSize?: string;
    quantizationLevel?: string;
    family?: string;
  };
}

export interface OllamaHealthStatus {
  isAvailable: boolean;
  models: ModelInfo[];
  primaryModel?: string;
  fallbackModel?: string;
  embeddingModel?: string;
}

// ─── Generation Config ────────────────────────────────────────────────────────

export interface GenerationConfig {
  /** Primary LLM model */
  primaryModel: string;
  /** Fallback LLM model */
  fallbackModel: string;
  /** Embedding model */
  embeddingModel: string;
  /** Ollama base URL */
  baseUrl: string;
  /** LLM temperature: 0.0 = deterministic, 1.0 = creative */
  temperature: number;
  /** Top-p nucleus sampling */
  topP: number;
  /** Penalty for repetition */
  repeatPenalty: number;
  /** Maximum tokens to generate */
  maxTokens: number;
  /** Request timeout in milliseconds */
  timeoutMs: number;
}

export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  primaryModel: "qwen2.5:3b-instruct",
  fallbackModel: "qwen2.5:3b-instruct",
  embeddingModel: "nomic-embed-text",
  baseUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  temperature: 0.5,
  topP: 0.9,
  repeatPenalty: 1.1,
  maxTokens: 500,
  timeoutMs: 60_000,
};

