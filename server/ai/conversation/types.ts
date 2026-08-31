/**
 * Conversation Types
 */

import type { Domain } from "../classification/types.ts";

export interface SessionContext {
  sessionId: string;
  userId?: number;
  domain: Domain;
  currentPage?: string;
  userRole?: string;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  userId?: number;
  domain?: Domain;
  context?: {
    currentPage?: string;
    userRole?: string;
    orderId?: string;
    productId?: number;
  };
}

export interface ChatResult {
  messageId: number;
  sessionId: string;
  content: string;
  intent: string;
  domain: Domain;
  structuredResponse?: any;
}
