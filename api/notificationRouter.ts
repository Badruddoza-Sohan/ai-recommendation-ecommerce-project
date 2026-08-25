import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { notifications, users } from "@db/schema";
import { eq, desc, and } from "@db/mysql";

export async function notifyAdmins(data: {
  title: string;
  message: string;
  type?: string;
  link?: string;
}) {
  try {
    const db = getDb();
    const adminUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"));

    if (adminUsers.length === 0) return;

    const now = Date.now();
    for (const admin of adminUsers) {
      await db.insert(notifications).values({
        userId: admin.id,
        title: data.title,
        message: data.message,
        type: data.type || "system",
        link: data.link || "/admin",
        isRead: 0,
        createdAt: now,
      });
    }
  } catch (err) {
    console.error("[notifyAdmins] Failed to dispatch notification to admins:", err);
  }
}

export const notificationRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }),

  unreadCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const result = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, 0)));
    return result.length;
  }),

  markRead: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(eq(notifications.id, input.id), eq(notifications.userId, userId)));
      return { success: true };
    }),

  markAllRead: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
    return { success: true };
  }),
});
