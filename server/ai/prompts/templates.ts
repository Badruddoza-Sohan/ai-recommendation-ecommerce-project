/**
 * Prompt Templates
 *
 * Reusable templates for various LLM sub-tasks (summarization, 
 * tool decision making, etc.)
 */

export const TEMPLATES = {
  /**
   * Template for summarizing a conversation chunk.
   */
  SUMMARIZE_CONVERSATION: (previousSummary: string, newMessagesText: string) => `
You are an expert conversation summarizer for an e-commerce assistant.
Summarize the following conversation segment.

RULES:
1. Preserve important facts: user preferences, order numbers mentioned, problems described.
2. If there is a previous summary, merge it smoothly with the new information.
3. Keep it concise (under 150 words if possible).
4. Do not output anything except the summary.

PREVIOUS SUMMARY:
${previousSummary || "None"}

NEW MESSAGES:
${newMessagesText}

Provide the merged summary now:`,

  /**
   * Template for determining if a tool should be called based on intent.
   * (We mostly use code logic for this, but this is a fallback).
   */
  SHOULD_CALL_TOOL: (intent: string, query: string, tools: any[]) => `
Given the user's intent: "${intent}" and query: "${query}",
determine if any of the following tools should be executed BEFORE responding.

Available Tools:
${JSON.stringify(tools, null, 2)}

Return ONLY a JSON array of tool names to call, e.g. ["track_order"].
If no tools are needed, return [].`
};
