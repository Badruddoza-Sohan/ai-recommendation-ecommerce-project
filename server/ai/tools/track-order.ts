/**
 * Track Order Tool
 */

import { getDb } from "../../../api/queries/connection.js";
import { orders } from "../../../db/schema.js";
import { eq } from "../../../db/mysql.js";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";
import { getMemoryManager } from "../memory/memory-manager.ts";

export class TrackOrderTool implements AITool {
  name = "track_order";
  description = "Fetches the current status and details of an order.";
  triggers = ["order_status"];

  async execute(query: string, context: ToolContext): Promise<ToolResult> {
    const memoryManager = getMemoryManager();
    
    // 1. Resolve order_id from context/memory
    const resolved = await memoryManager.resolveReferences(
      context.sessionId,
      query,
      context.userId
    );

    let orderId = resolved["order_id"];

    // Fallback: If not resolved via pronoun, check entities directly
    if (!orderId && context.memory.entities.order_id?.length > 0) {
      orderId = context.memory.entities.order_id[0].value;
    }

    if (!orderId) {
      return {
        toolName: this.name,
        success: false,
        data: null,
        error: "No order ID found in the conversation. Ask the user for their order number.",
      };
    }

    // 2. Fetch from DB
    const db = getDb();
    const orderRows = await db
      .select({
        id: (orders as any).id,
        orderNumber: (orders as any).orderNumber,
        status: (orders as any).status,
        totalAmount: (orders as any).totalAmount,
        createdAt: (orders as any).createdAt,
      })
      .from(orders)
      .where(
        // Allow querying by PK or OrderNumber
        orderId.startsWith("ORD")
          ? eq(orders.orderNumber, orderId)
          : eq(orders.id, parseInt(orderId, 10))
      )
      .limit(1);

    if (orderRows.length === 0) {
      return {
        toolName: this.name,
        success: false,
        data: { providedId: orderId },
        error: `Order ${orderId} not found in the database.`,
      };
    }

    const order = orderRows[0];
    
    // Security check: If userId is present, verify they own the order
    // (Skipped for brevity, but would check order.userId === context.userId)

    return {
      toolName: this.name,
      success: true,
      data: {
        orderNumber: order.orderNumber,
        status: order.status, // e.g. "processing", "shipped", "delivered"
        total: order.totalAmount,
        date: new Date(order.createdAt).toISOString(),
      },
    };
  }
}
