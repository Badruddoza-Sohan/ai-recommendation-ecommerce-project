import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  users,
  sellers,
  products,
  orders,
  orderItems,
  categories,
  chatMessages,
  notifications,
} from "@db/schema";
import { escalationTickets, ticketMessages } from "@db/aiSchema";
import { eq, ne, and, desc, asc, sql } from "@db/mysql";

export const adminRouter = createRouter({
  dashboard: adminQuery.query(async () => {
    const db = getDb();

    // Execute stats and list queries in parallel for high performance
    const [
      totalUsers,
      totalSellers,
      approvedSellers,
      pendingSellersCount,
      totalProducts,
      activeProducts,
      totalOrders,
      pendingOrders,
      paidOrders,
      revenue,
      recentOrders,
      recentUsers,
      topCategories,
      monthlyRevenue,
      pendingSellers,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(sellers),
      db.select({ count: sql<number>`count(*)` }).from(sellers).where(eq(sellers.status, "approved")),
      db.select({ count: sql<number>`count(*)` }).from(sellers).where(eq(sellers.status, "pending")),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(orders),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(sql`${orders.status} IN ('pending', 'processing')`),
      db.select({ count: sql<number>`count(*)` }).from(orders).where(eq(orders.paymentStatus, "paid")),
      db.select({ total: sql<number>`sum(${orders.totalAmount})` }).from(orders).where(eq(orders.paymentStatus, "paid")),
      db.select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        status: orders.status,
        createdAt: orders.createdAt,
      }).from(orders).orderBy(desc(orders.createdAt)).limit(10),
      db.select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      }).from(users).orderBy(desc(users.createdAt)).limit(5),
      db.select({
        name: categories.name,
        productCount: sql<number>`count(${products.id})`,
      }).from(products).leftJoin(categories, eq(categories.id, products.categoryId)).groupBy(categories.id, categories.name).orderBy(desc(sql`count(${products.id})`)).limit(5),
      db.select({
        month: sql<string>`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')`,
        revenue: sql<number>`sum(${orders.totalAmount})`,
        orders: sql<number>`count(*)`,
      }).from(orders).where(eq(orders.paymentStatus, "paid")).groupBy(sql`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')`).orderBy(desc(sql`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')`)).limit(12),
      db.select().from(sellers).where(eq(sellers.status, "pending")).orderBy(desc(sellers.createdAt)),
    ]);

    return {
      stats: {
        totalUsers: totalUsers[0]?.count || 0,
        totalSellers: totalSellers[0]?.count || 0,
        approvedSellers: approvedSellers[0]?.count || 0,
        pendingSellersCount: pendingSellersCount[0]?.count || 0,
        totalProducts: totalProducts[0]?.count || 0,
        activeProducts: activeProducts[0]?.count || 0,
        totalOrders: totalOrders[0]?.count || 0,
        pendingOrders: pendingOrders[0]?.count || 0,
        paidOrders: paidOrders[0]?.count || 0,
        totalRevenue: revenue[0]?.total || 0,
      },
      recentOrders,
      recentUsers,
      topCategories,
      monthlyRevenue,
      pendingSellers,
    };
  }),

  users: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(users).orderBy(desc(users.createdAt));
  }),

  updateUserRole: adminQuery
    .input(z.object({ userId: z.number(), role: z.enum(["customer", "seller"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const targetUser = await db.select().from(users).where(eq(users.id, input.userId)).get();
      if (targetUser && targetUser.role === "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "System default admin role cannot be changed." });
      }
      await db.update(users).set({ role: input.role }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  updateUserProfile: adminQuery
    .input(
      z.object({
        userId: z.number(),
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          city: input.city,
          country: input.country,
        })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  sellers: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(sellers).orderBy(desc(sellers.createdAt));
  }),

  updateSellerStatus: adminQuery
    .input(
      z.object({
        sellerId: z.number(),
        status: z.enum(["pending", "approved", "rejected", "suspended"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(sellers)
        .set({ status: input.status })
        .where(eq(sellers.id, input.sellerId));
      return { success: true };
    }),

  products: adminQuery.query(async () => {
    const db = getDb();
    return db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        description: products.description,
        price: products.price,
        deliveryFeeInsideDhaka: products.deliveryFeeInsideDhaka,
        deliveryFeeOutsideDhaka: products.deliveryFeeOutsideDhaka,
        sku: products.sku,
        status: products.status,
        soldCount: products.soldCount,
        rating: products.rating,
        createdAt: products.createdAt,
        categoryName: categories.name,
        sellerName: sellers.businessName,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(sellers, eq(sellers.id, products.sellerId))
      .where(ne(products.status, "deleted"))
      .orderBy(desc(products.createdAt));
  }),

  orders: adminQuery.query(async () => {
    const db = getDb();
    const allOrders = await db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        totalAmount: orders.totalAmount,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .orderBy(desc(orders.createdAt));

    const ordersWithItems = await Promise.all(
      allOrders.map(async (order: any) => {
        const items = await db
          .select({
            quantity: orderItems.quantity,
            totalPrice: orderItems.totalPrice,
            productName: products.name,
          })
          .from(orderItems)
          .leftJoin(products, eq(products.id, orderItems.productId))
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );

    return ordersWithItems;
  }),

  updateProductStatus: adminQuery
    .input(z.object({ productId: z.number(), status: z.enum(["active", "draft", "archived"]) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(products).set({ status: input.status }).where(eq(products.id, input.productId));
      return { success: true };
    }),

  updateProductDeliveryFees: adminQuery
    .input(
      z.object({
        productId: z.number(),
        deliveryFeeInsideDhaka: z.number().min(0),
        deliveryFeeOutsideDhaka: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(products).set({
        deliveryFeeInsideDhaka: input.deliveryFeeInsideDhaka,
        deliveryFeeOutsideDhaka: input.deliveryFeeOutsideDhaka,
      }).where(eq(products.id, input.productId));
      return { success: true };
    }),

  updateOrderStatus: adminQuery
    .input(z.object({ orderId: z.number(), status: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!orderRows[0]) throw new Error("Order not found");
      const order = orderRows[0];

      const isCancelling = input.status === "cancelled" || input.status === "refunded";
      const isPrepaid = order.paymentStatus === "paid" || (order.paymentMethod && order.paymentMethod !== "cod" && order.paymentStatus !== "pending");
      const refundRef = `REF-${Date.now().toString().slice(-6)}`;
      const newPaymentStatus = (isCancelling && isPrepaid) ? "refunded" : (input.status === "delivered" ? "paid" : order.paymentStatus);

      await db
        .update(orders)
        .set({
          status: input.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded",
          paymentStatus: newPaymentStatus,
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, input.orderId));

      // Notify customer of admin status update
      if (order.userId) {
        if (isCancelling && isPrepaid) {
          await db.insert(notifications).values({
            userId: order.userId,
            title: `💰 Order Cancelled & Refund Processed #${order.orderNumber}`,
            message: `Your order #${order.orderNumber} was cancelled and a full refund of BDT ${order.totalAmount.toLocaleString()} has been processed (Ref: ${refundRef}).`,
            type: "refund",
            isRead: 0,
            link: "/dashboard?tab=orders",
          });
        } else if (input.status === "delivered") {
          await db.insert(notifications).values({
            userId: order.userId,
            title: `Package Delivered! 📦 #${order.orderNumber}`,
            message: `Your order #${order.orderNumber} has arrived. Please leave a review for your items!`,
            type: "order",
            isRead: 0,
            link: "/dashboard?tab=orders",
          });
        } else {
          await db.insert(notifications).values({
            userId: order.userId,
            title: `Order Status Updated: ${input.status.toUpperCase()} #${order.orderNumber}`,
            message: `Your order #${order.orderNumber} status has been updated to "${input.status}".`,
            type: "order",
            isRead: 0,
            link: "/dashboard?tab=orders",
          });
        }
      }

      return { success: true, refundRef };
    }),

  updateOrderPaymentStatus: adminQuery
    .input(z.object({ orderId: z.number(), paymentStatus: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(orders)
        .set({ paymentStatus: input.paymentStatus as "pending" | "paid" | "failed" | "refunded", updatedAt: Date.now() })
        .where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  listTickets: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(escalationTickets).orderBy(desc(escalationTickets.createdAt));
  }),

  clearAllTickets: adminQuery.mutation(async () => {
    const db = getDb();
    await db.delete(ticketMessages);
    await db.delete(escalationTickets);
    return { success: true };
  }),

  updateTicketStatus: adminQuery
    .input(z.object({ ticketId: z.number(), status: z.string(), resolution: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(escalationTickets)
        .set({
          status: input.status as any,
          resolution: input.resolution || undefined,
          resolvedAt: input.status === "resolved" ? Date.now() : undefined,
        })
        .where(eq(escalationTickets.id, input.ticketId));
      return { success: true };
    }),

  listTicketMessages: adminQuery
    .input(z.object({ ticketId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tickets = await db
        .select()
        .from(escalationTickets)
        .where(eq(escalationTickets.id, input.ticketId))
        .limit(1);

      const ticket = tickets[0] || null;
      let historyMessages: any[] = [];

      if (ticket?.sessionId) {
        historyMessages = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.sessionId, ticket.sessionId))
          .orderBy(asc(chatMessages.createdAt));
      }

      const liveMessages = await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, input.ticketId))
        .orderBy(asc(ticketMessages.createdAt));

      return {
        ticket,
        historyMessages,
        liveMessages,
      };
    }),

  sendTicketMessage: adminQuery
    .input(
      z.object({
        ticketId: z.number(),
        message: z.string().min(1),
        senderName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const adminName = input.senderName || (ctx.user as any)?.name || "Admin Agent";
      await db.insert(ticketMessages).values({
        ticketId: input.ticketId,
        senderType: "admin",
        senderName: adminName,
        message: input.message,
      });
      await db
        .update(escalationTickets)
        .set({ status: "in_progress" })
        .where(eq(escalationTickets.id, input.ticketId));
      return { success: true };
    }),

  deleteCategory: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Check if active or drafted products exist in this category
      const productsInCategory = await db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.categoryId, input.id),
            ne(products.status, "deleted")
          )
        )
        .limit(1);

      if (productsInCategory.length > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Cannot delete category because it contains products. Move or delete the products first.",
        });
      }

      await db.delete(categories).where(eq(categories.id, input.id));
      return { success: true };
    }),

  deleteProduct: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      // Soft delete product so past orders don't break
      await db
        .update(products)
        .set({ status: "deleted" })
        .where(eq(products.id, input.id));
      return { success: true };
    }),
});
