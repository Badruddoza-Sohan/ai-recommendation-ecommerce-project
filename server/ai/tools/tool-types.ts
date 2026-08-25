/**
 * Tool Types
 */

import type { MemoryContext } from "../memory/types.ts";

export interface ToolContext {
  sessionId: string;
  userId?: number;
  memory: MemoryContext;
}

export interface ToolResult {
  toolName: string;
  success: boolean;
  data: any;
  error?: string;
}

export interface AITool {
  name: string;
  description: string;
  /** Which intents trigger this tool? */
  triggers: string[];
  
  /** Execute the tool given the user's message and context */
  execute(query: string, context: ToolContext): Promise<ToolResult>;
}
