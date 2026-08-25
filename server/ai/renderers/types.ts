/**
 * Universal AI Renderer & Response Interface
 *
 * Standardized response schema and renderer interface used universally across:
 * - Support AI
 * - Fashion AI (StyleMate)
 * - Seller AI
 * - Future AI Domain Agents
 */

export interface AIResponseAction {
  label: string;
  actionQuery: string;
  icon?: string;
}

export interface AIResponseSection {
  heading?: string;
  content: string;
  type?: "text" | "bullet_list" | "table" | "kv_pairs";
}

export interface AIResponseMetadata {
  confidence: number; // 0.0 to 1.0 score
  source: "database" | "policy" | "knowledge_base" | "tool";
  explainabilityReason: string;
  latencyMs: number;
  intent: string;
  language: "English" | "Bangla" | "Banglish";
}

export interface UnifiedAIResponse {
  title: string;
  summary: string;
  sections: AIResponseSection[];
  actions: AIResponseAction[];
  metadata: AIResponseMetadata;
  rawFallbackText: string;
}

/**
 * Generic Renderer Interface for swappable LLM presentation layers
 */
export interface Renderer<T> {
  render(data: T): Promise<string>;
  streamRender(data: T): AsyncGenerator<{ token: string; done?: boolean }>;
}
