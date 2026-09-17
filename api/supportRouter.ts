import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { escalationTickets, ticketMessages } from "@db/aiSchema";
import { orders, orderItems, products, productImages, sellers } from "@db/schema";
import { eq, desc, asc, and, or } from "@db/mysql";
import { notifyAdmins } from "./notificationRouter";

export const supportRouter = createRouter({
  latestOrder: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const rows = await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(1);
    return rows[0] ? getCustomerOrder(db, userId, rows[0].id) : null;
  }),

  trackOrder: authedQuery
    .input(z.object({ orderId: z.string().trim().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const numericId = Number(input.orderId);
      const order = await db.select().from(orders)
        .where(and(
          eq(orders.userId, userId),
          Number.isInteger(numericId) && numericId > 0
            ? or(eq(orders.id, numericId), eq(orders.orderNumber, input.orderId))
            : eq(orders.orderNumber, input.orderId),
        ))
        .limit(1);
      return order[0] ? getCustomerOrder(db, userId, order[0].id) : null;
    }),

  getTicketBySession: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tickets = await db
        .select()
        .from(escalationTickets)
        .where(eq(escalationTickets.sessionId, input.sessionId))
        .orderBy(desc(escalationTickets.createdAt))
        .limit(1);

      if (!tickets.length) return null;

      const ticket = tickets[0];
      const messages = await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, ticket.id))
        .orderBy(asc(ticketMessages.createdAt));

      return { ticket, messages };
    }),

  sendCustomerMessage: publicQuery
    .input(
      z.object({
        ticketId: z.number(),
        message: z.string().min(1),
        senderName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const customerName = input.senderName || (ctx.user as any)?.name || "Customer";
      
      await db.insert(ticketMessages).values({
        ticketId: input.ticketId,
        senderType: "user",
        senderName: customerName,
        message: input.message,
      });

      // Automatically re-open ticket if it was resolved or closed
      await db
        .update(escalationTickets)
        .set({ status: "open" })
        .where(eq(escalationTickets.id, input.ticketId));

      return { success: true };
    }),

  escalateToLiveAgent: publicQuery
    .input(
      z.object({
        sessionId: z.string(),
        userMessage: z.string(),
        escalationReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Check if a ticket already exists for this session
      const existingTickets = await db
        .select()
        .from(escalationTickets)
        .where(eq(escalationTickets.sessionId, input.sessionId))
        .orderBy(desc(escalationTickets.createdAt))
        .limit(1);

      if (existingTickets.length > 0) {
        const existing = existingTickets[0];
        
        // Re-open existing ticket and append new customer message
        await db
          .update(escalationTickets)
          .set({ status: "open", userMessage: input.userMessage })
          .where(eq(escalationTickets.id, existing.id));

        await db.insert(ticketMessages).values([
          {
            ticketId: existing.id,
            senderType: "system",
            senderName: "System",
            message: `Customer re-opened Ticket #${existing.ticketNumber}.`,
          },
          {
            ticketId: existing.id,
            senderType: "user",
            senderName: (ctx.user as any)?.name || "Customer",
            message: input.userMessage,
          },
        ]);

        return { success: true, ticketId: existing.id, ticketNumber: existing.ticketNumber };
      }

      const ticketNumber = `TICK-${Math.floor(10000 + Math.random() * 90000)}`;
      const reason = input.escalationReason || "Customer requested live human admin support chat";

      const [res]: any = await db.insert(escalationTickets).values({
        ticketNumber,
        sessionId: input.sessionId,
        userId: (ctx.user as any)?.id || null,
        userMessage: input.userMessage,
        aiResponse: "I am connecting you to an Admin Support Agent now.",
        aiConfidence: 1.0,
        escalationReason: reason,
        sentimentScore: 0,
        status: "open",
        priority: "medium",
      });

      const ticketId = res.insertId;

      await notifyAdmins({
        title: `🚨 Support Ticket Escalated #${ticketNumber}`,
        message: reason,
        type: "ticket",
        link: "/admin?tab=tickets",
      });

      await db.insert(ticketMessages).values([
        {
          ticketId,
          senderType: "system",
          senderName: "System",
          message: `Ticket #${ticketNumber} created. An Admin Support Agent will join shortly.`,
        },
        {
          ticketId,
          senderType: "user",
          senderName: (ctx.user as any)?.name || "Customer",
          message: input.userMessage,
        },
      ]);

      return { success: true, ticketId, ticketNumber };
    }),

  persistChatMessage: publicQuery
    .input(
      z.object({
        sessionId: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        message: z.string().min(1),
        senderName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      let ticketId: number;

      // Find or create session ticket
      const existingTickets = await db
        .select()
        .from(escalationTickets)
        .where(eq(escalationTickets.sessionId, input.sessionId))
        .orderBy(desc(escalationTickets.createdAt))
        .limit(1);

      if (existingTickets.length > 0) {
        ticketId = existingTickets[0].id;
      } else {
        const ticketNumber = `CHAT-${Math.floor(10000 + Math.random() * 90000)}`;
        const [res]: any = await db.insert(escalationTickets).values({
          ticketNumber,
          sessionId: input.sessionId,
          userId: (ctx.user as any)?.id || null,
          userMessage: input.message,
          aiResponse: "Chat session active",
          aiConfidence: 1.0,
          escalationReason: "24/7 Persistent AI Support Chat",
          status: "open",
          priority: "low",
        });
        ticketId = res.insertId;
      }

      const senderType = input.role === "assistant" ? "system" : input.role === "user" ? "user" : "system";
      const name = input.senderName || (input.role === "assistant" ? "Maya (AI Assistant)" : (ctx.user as any)?.name || "Customer");

      await db.insert(ticketMessages).values({
        ticketId,
        senderType,
        senderName: name,
        message: input.message,
      });

      return { success: true, ticketId };
    }),

  getPersistentHistory: publicQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tickets = await db
        .select()
        .from(escalationTickets)
        .where(eq(escalationTickets.sessionId, input.sessionId))
        .orderBy(desc(escalationTickets.createdAt))
        .limit(1);

      if (!tickets.length) return [];

      const messages = await db
        .select()
        .from(ticketMessages)
        .where(eq(ticketMessages.ticketId, tickets[0].id))
        .orderBy(asc(ticketMessages.createdAt));

      return messages.map((m: any) => ({
        id: `msg_${m.id}`,
        role: m.senderType === "user" ? "user" : "assistant",
        content: m.message,
        timestamp: Number(m.createdAt) || Date.now(),
        senderName: m.senderName,
      }));
    }),
});

async function getCustomerOrder(db: ReturnType<typeof getDb>, userId: number, orderId: number) {
  const rows = await db.select().from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, userId)))
    .limit(1);
  if (!rows[0]) return null;

  const items = await db.select({
    id: orderItems.id,
    productName: products.name,
    imageUrl: productImages.imageUrl,
    quantity: orderItems.quantity,
    unitPrice: orderItems.unitPrice,
    totalPrice: orderItems.totalPrice,
    sellerName: sellers.businessName,
  })
    .from(orderItems)
    .leftJoin(products, eq(products.id, orderItems.productId))
    .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
    .leftJoin(sellers, eq(sellers.id, orderItems.sellerId))
    .where(eq(orderItems.orderId, orderId));

  const status = rows[0].status || "pending";
  const timeline = ["pending", "processing", "shipped", "delivered"].map((step) => ({
    step,
    complete: step === "pending"
      ? true
      : ["processing", "shipped", "delivered"].indexOf(step) <= ["processing", "shipped", "delivered"].indexOf(status),
    current: step === status,
  }));

  return {
    ...rows[0],
    items,
    sellerName: items.find((item) => item.sellerName)?.sellerName || "Marketplace Seller",
    shippingStatus: status,
    timeline,
  };
}
