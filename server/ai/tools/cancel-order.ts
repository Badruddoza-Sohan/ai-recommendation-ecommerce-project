/**
 * Cancel Order Tool
 */

import { getDb } from "../../../api/queries/connection.js";
import { orders } from "../../../db/schema.js";
import { eq } from "../../../db/mysql.js";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";
import { getMemoryManager } from "../memory/memory-manager.ts";

export class CancelOrderTool implements AITool {
  name = "cancel_order";
  description = "Attempts to cancel an order if it hasn't shipped yet.";
  triggers = ["order_cancel"];

  async execute(query: string, context: ToolContext): Promise<ToolResult> {
    const memoryManager = getMemoryManager();
    
    const resolved = await memoryManager.resolveReferences(
      context.sessionId,
      query,
      context.userId
    );

    let orderId = resolved["order_id"];
    if (!orderId && context.memory.entities.order_id?.length > 0) {
      orderId = context.memory.entities.order_id[0].value;
    }

    if (!orderId) {
      return {
        toolName: this.name,
        success: false,
        data: null,
        error: "No order ID found. Ask the user which order they want to cancel.",
      };
    }

    const db = getDb();
    const orderRows = await db
      .select({
        id: (orders as any).id,
        orderNumber: (orders as any).orderNumber,
        status: (orders as any).status,
      })
      .from(orders)
      .where(
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
        error: `Order ${orderId} not found.`,
      };
    }

    const order = orderRows[0];

    // Business Logic: Can only cancel if pending or processing
    if (["shipped", "delivered", "cancelled"].includes(order.status)) {
      return {
        toolName: this.name,
        success: false,
        data: { orderNumber: order.orderNumber, status: order.status },
        error: `Order cannot be cancelled because its status is '${order.status}'.`,
      };
    }

    // Execute Cancellation
    await db
      .update(orders)
      .set({ status: "cancelled", updatedAt: Date.now() })
      .where(eq(orders.id, order.id));

    return {
      toolName: this.name,
      success: true,
      data: {
        orderNumber: order.orderNumber,
        previousStatus: order.status,
        newStatus: "cancelled",
        message: "Order successfully cancelled.",
      },
    };
  }
}
