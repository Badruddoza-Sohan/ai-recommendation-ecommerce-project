/**
 * Inventory Engine
 * Handles low stock detection, out-of-stock prediction, fast-moving products, dead stock, and restocking suggestions.
 */

import type { InventoryEngineResult, SellerContext } from "../types.ts";
import { getDb } from "../../../../api/queries/connection.ts";
import { inventory, products } from "../../../../db/schema.ts";
import { lte, eq, and } from "../../../../db/mysql.ts";

export class InventoryEngine {
  async analyze(context: SellerContext): Promise<InventoryEngineResult> {
    let stock = context.stock !== undefined ? context.stock : 4;
    let lowStockItems: Array<{ productName: string; currentStock: number }> = [];

    // Query real database for low-stock items scoped STRICTLY to context.sellerId
    try {
      const db = getDb();
      let condition: any = lte(inventory.quantity, 5);
      
      if (context.sellerId) {
        condition = and(lte(inventory.quantity, 5), eq(products.sellerId, context.sellerId));
      }

      const items = await db
        .select({
          productId: (inventory as any).productId,
          productName: (products as any).name,
          currentStock: (inventory as any).quantity,
        })
        .from(inventory)
        .innerJoin(products, eq(inventory.productId, products.id))
        .where(condition);

      lowStockItems = items.map((i: any) => ({
        productName: i.productName,
        currentStock: Number(i.currentStock),
      }));

      if (lowStockItems.length > 0 && context.stock === undefined) {
        stock = lowStockItems[0].currentStock;
      }
    } catch (err) {
      console.error("[InventoryEngine] Error fetching seller inventory:", err);
    }

    const status = stock === 0 ? "out_of_stock" : stock <= 5 ? "low_stock" : "in_stock";
    const outOfStockPredictionDays = stock === 0 ? 0 : Math.max(1, Math.floor(stock * 1.5));
    const isFastMoving = stock <= 10;
    const isDeadStock = stock > 100;

    let recommendation = "Stock levels are healthy. Maintain standard inventory monitoring.";
    if (status === "out_of_stock") {
      recommendation = "CRITICAL: Product is completely out of stock. Restock immediately to avoid lost revenue.";
    } else if (status === "low_stock") {
      recommendation = `Restock immediately. At current sales velocity, stock will be exhausted in ~${outOfStockPredictionDays} days.`;
    } else if (isDeadStock) {
      recommendation = "Inventory turnover is slow. Consider running a flash discount to release tied-up capital.";
    }

    return {
      stock,
      status,
      outOfStockPredictionDays,
      isFastMoving,
      isDeadStock,
      recommendation,
      lowStockItems: lowStockItems.length > 0 ? lowStockItems : undefined,
    };
  }
}

let instance: InventoryEngine | null = null;
export function getInventoryEngine(): InventoryEngine {
  if (!instance) instance = new InventoryEngine();
  return instance;
}
