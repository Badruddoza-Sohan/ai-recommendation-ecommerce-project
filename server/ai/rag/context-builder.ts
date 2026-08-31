/**
 * Context Builder
 *
 * Assembles the final LLM prompt from various sources:
 * - System prompts
 * - Conversation memory (short term & long term)
 * - RAG retrieved contexts (KB, products)
 * - Tool execution results
 *
 * Manages token budget (truncation) to prevent context window overflow.
 */

import type { ChatMessage } from "../llm/types.ts";
import type { RetrievedContext } from "./types.ts";
import type { MemoryContext } from "../memory/types.ts";

export interface BuildContextParams {
  systemPrompt: string;
  memory: MemoryContext;
  currentMessage: string;
  stylistStateBlock?: string;
  retrievedDocs?: RetrievedContext[];
  toolResults?: any[];
  maxTokens?: number; // approximate budget in tokens (1 token ≈ 4 chars)
}

export class ContextBuilder {
  /**
   * Build the final message array for the LLM.
   */
  build(params: BuildContextParams): ChatMessage[] {
    const {
      systemPrompt,
      memory,
      currentMessage,
      stylistStateBlock = "",
      retrievedDocs = [],
      toolResults = [],
      maxTokens = 6000,
    } = params;

    const messages: ChatMessage[] = [];

    // 1. System Prompt (always first)
    messages.push({ role: "system", content: systemPrompt });

    // 2. Inject RAG Context & Memory into a dynamic system message
    const dynamicContext = this.buildDynamicContext(memory, retrievedDocs, toolResults, stylistStateBlock);
    if (dynamicContext) {
      messages.push({ role: "system", content: dynamicContext });
    }

    // 3. Chat History (Short Term Memory)
    // We append these preserving the role (user/assistant)
    const lastMsg = memory.shortTerm[memory.shortTerm.length - 1];
    const isCurrentInShortTerm = lastMsg && lastMsg.role === "user" && lastMsg.content === currentMessage;

    for (const msg of memory.shortTerm) {
      if (isCurrentInShortTerm && msg === lastMsg) continue;
      messages.push(msg);
    }

    // 4. Current User Message (always last)
    messages.push({ role: "user", content: currentMessage });

    // 5. Truncate if over budget (removes from the middle of chat history)
    return this.truncate(messages, maxTokens);
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private buildDynamicContext(
    memory: MemoryContext,
    docs: RetrievedContext[],
    tools: any[],
    stylistStateBlock = ""
  ): string {
    const sections: string[] = [];

    // Stylist Session State Block (High Priority Context)
    if (stylistStateBlock) {
      sections.push(stylistStateBlock);
    }

    // Long Term Memory
    if (memory.longTermSummary) {
      sections.push(`[CONVERSATION SUMMARY]\n${memory.longTermSummary}`);
    }

    // Entities
    const entityTypes = Object.keys(memory.entities) as (keyof typeof memory.entities)[];
    const hasEntities = entityTypes.some((t) => memory.entities[t].length > 0);
    
    if (hasEntities) {
      const entLines: string[] = [];
      for (const type of entityTypes) {
        for (const ent of memory.entities[type]) {
          entLines.push(`- ${type}: ${ent.value}`);
        }
      }
      sections.push(`[USER ENTITIES (Memory)]\n${entLines.join("\n")}`);
    }

    // RAG Context
    if (docs.length > 0) {
      const docLines = docs.map((d, i) => `[Document ${i + 1} - ${d.source}]\n${d.content}`);
      sections.push(`[RETRIEVED KNOWLEDGE]\n${docLines.join("\n\n")}`);
    }

    // Tool Results
    if (tools.length > 0) {
      const toolLines = tools.map((t, i) => `[Tool Result ${i + 1}]\n${JSON.stringify(t, null, 2)}`);
      sections.push(`[TOOL RESULTS]\n${toolLines.join("\n\n")}`);
    }

    if (sections.length === 0) return "";
    
    return `--- RELEVANT CONTEXT ---\nUse the following information to answer the user if applicable. Do not invent information.\n\n${sections.join("\n\n")}\n--- END CONTEXT ---`;
  }

  private truncate(messages: ChatMessage[], maxTokens: number): ChatMessage[] {
    const budgetChars = maxTokens * 4;
    let totalChars = 0;
    
    // System messages (index 0, 1) and the final user message (last) are protected
    const protectedMsgs: ChatMessage[] = [];
    const historyMsgs: ChatMessage[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "system" || i === messages.length - 1) {
        protectedMsgs.push(msg);
        totalChars += msg.content.length;
      } else {
        historyMsgs.push(msg);
      }
    }

    if (totalChars >= budgetChars) {
      // Even protected messages are too large! Just return them and let the LLM truncate.
      console.warn("[ContextBuilder] Protected context exceeds token budget!");
      return protectedMsgs;
    }

    // Add history from newest to oldest until budget is hit
    const keptHistory: ChatMessage[] = [];
    for (let i = historyMsgs.length - 1; i >= 0; i--) {
      const msg = historyMsgs[i];
      if (totalChars + msg.content.length > budgetChars) break;
      totalChars += msg.content.length;
      keptHistory.unshift(msg);
    }

    // Reassemble: System -> Kept History -> User
    return [
      ...protectedMsgs.filter(m => m.role === "system"),
      ...keptHistory,
      protectedMsgs[protectedMsgs.length - 1] // The current user message
    ];
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _contextBuilder: ContextBuilder | null = null;

export function getContextBuilder(): ContextBuilder {
  if (!_contextBuilder) {
    _contextBuilder = new ContextBuilder();
  }
  return _contextBuilder;
}
