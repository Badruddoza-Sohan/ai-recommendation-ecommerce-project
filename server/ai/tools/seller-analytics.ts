/**
 * Seller Analytics Tool
 */

import { getDb } from "../../../api/queries/connection.ts";
import { orderItems, products } from "../../../db/schema.ts";
import { eq, sql, desc, and, inArray } from "../../../db/mysql.ts";
import type { AITool, ToolContext, ToolResult } from "./tool-types.ts";

export class SellerAnalyticsTool implements AITool {
  name = "seller_analytics";
  description = "Fetches sales performance and analytics for a seller.";
  triggers = ["analytics_insights", "inventory_alert"];

  async execute(query: string, context: ToolContext): Promise<ToolResult> {
    // Determine seller ID from context
    // In a real app, this would come from the auth token/session user
    const sellerId = context.userId;

    if (!sellerId) {
      return {
        toolName: this.name,
        success: false,
        data: null,
        error: "User is not authenticated as a seller.",
      };
    }

    const lowerQuery = query.toLowerCase();

    // Route based on specific query intent
    if (lowerQuery.includes("inventory") || lowerQuery.includes("stock") || lowerQuery.includes("low")) {
      return this.getInventoryAlerts(sellerId);
    }

    return this.getSalesSummary(sellerId);
  }

  private async getInventoryAlerts(sellerId: number): Promise<ToolResult> {
    const db = getDb();
    
    // Find products belonging to this seller that have low stock (< 10)
    const lowStock = await db
      .select({
        id: (products as any).id,
        name: (products as any).name,
        stock: (products as any).stock,
      })
      .from(products)
      .where(
        and(
          eq(products.sellerId, sellerId),
          sql`${products.stock} < 10`
        )
      )
      .orderBy(products.stock as any)
      .limit(10);

    return {
      toolName: this.name,
      success: true,
      data: {
        type: "inventory_alerts",
        lowStockItems: lowStock,
        message: lowStock.length > 0 
          ? `Found ${lowStock.length} items running low on stock.`
          : "All inventory levels look good (stock >= 10).",
      },
    };
  }

  private async getSalesSummary(sellerId: number): Promise<ToolResult> {
    const db = getDb();

    // 1. Get all products for this seller
    const sellerProducts = await db
      .select({ id: (products as any).id })
      .from(products)
      .where(eq(products.sellerId, sellerId));
      
    const productIds = sellerProducts.map((p: any) => p.id);
    
    if (productIds.length === 0) {
      return {
        toolName: this.name,
        success: true,
        data: { type: "sales_summary", totalSales: 0, topProducts: [] }
      };
    }

    // 2. Aggregate sales data from orderItems
    const salesData = await db
      .select({
        productId: (orderItems as any).productId,
        totalSold: sql<number>`sum(${orderItems.quantity})`,
        revenue: sql<number>`sum(${orderItems.price} * ${orderItems.quantity})`,
      })
      .from(orderItems)
      .where(inArray(orderItems.productId, productIds))
      .groupBy(orderItems.productId)
      .orderBy(desc(sql`sum(${orderItems.quantity})`) as unknown as any)
      .limit(5);

    // 3. Attach product names
    const topProducts = [];
    let totalRevenue = 0;
    
    for (const item of salesData) {
      const prodRows = await db
        .select({ name: (products as any).name })
        .from(products)
        .where(eq(products.id, item.productId!))
        .limit(1);
        
      if (prodRows.length > 0) {
        topProducts.push({
          name: prodRows[0].name,
          unitsSold: item.totalSold,
          revenue: item.revenue
        });
        totalRevenue += item.revenue;
      }
    }

    return {
      toolName: this.name,
      success: true,
      data: {
        type: "sales_summary",
        totalRevenue,
        topProducts,
      },
    };
  }
}
