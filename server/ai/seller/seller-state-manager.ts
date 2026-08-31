/**
 * Seller Session State Manager
 * Persists seller session state and product context across follow-up requests.
 */

import type { SellerContext } from "./types.ts";

export class SellerStateManager {
  private sessions = new Map<string, SellerContext>();

  async getState(sessionId: string): Promise<SellerContext> {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        productName: "Wireless Bluetooth Headphones",
        category: "electronics",
        price: 4500,
        stock: 4,
        sessionId,
      });
    }
    return this.sessions.get(sessionId)!;
  }

  async updateState(sessionId: string, updates: Partial<SellerContext>): Promise<SellerContext> {
    const current = await this.getState(sessionId);
    const updated = {
      ...current,
      ...updates,
      // Retain non-null fields
      productName: updates.productName || current.productName,
      category: updates.category || current.category,
      price: updates.price !== undefined ? updates.price : current.price,
      stock: updates.stock !== undefined ? updates.stock : current.stock,
    };
    this.sessions.set(sessionId, updated);
    return updated;
  }

  async clearState(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

let instance: SellerStateManager | null = null;
export function getSellerStateManager(): SellerStateManager {
  if (!instance) instance = new SellerStateManager();
  return instance;
}
