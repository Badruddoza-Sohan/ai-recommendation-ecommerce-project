import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { reviews, users, products, orderItems } from "@db/schema";
import { eq, desc, sql } from "@db/mysql";

export const reviewRouter = createRouter({
  listRecent: publicQuery
    .input(z.object({ limit: z.number().optional().default(6) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          comment: reviews.comment,
          isVerified: reviews.isVerified,
          helpful: reviews.helpful,
          createdAt: reviews.createdAt,
          userName: users.name,
          userAvatar: users.avatar,
          productId: reviews.productId,
          productName: products.name,
          productSlug: products.slug,
        })
        .from(reviews)
        .leftJoin(users, eq(users.id, reviews.userId))
        .leftJoin(products, eq(products.id, reviews.productId))
        .orderBy(desc(reviews.createdAt))
        .limit(input.limit);
    }),

  listByProduct: publicQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select({
          id: reviews.id,
          rating: reviews.rating,
          title: reviews.title,
          comment: reviews.comment,
          isVerified: reviews.isVerified,
          helpful: reviews.helpful,
          createdAt: reviews.createdAt,
          userName: users.name,
          userAvatar: users.avatar,
        })
        .from(reviews)
        .leftJoin(users, eq(users.id, reviews.userId))
        .where(eq(reviews.productId, input.productId))
        .orderBy(desc(reviews.createdAt));
    }),

  create: authedQuery
    .input(
      z.object({
        productId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().min(1).max(255),
        comment: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      await db.insert(reviews).values({
        productId: input.productId,
        userId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        isVerified: true,
      });

      return { success: true };
    }),

  createOrderReview: authedQuery
    .input(
      z.object({
        productId: z.number(),
        orderId: z.number(),
        orderItemId: z.number(),
        rating: z.number().min(1).max(5),
        title: z.string().min(1).max(255),
        comment: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      await db.insert(reviews).values({
        productId: input.productId,
        orderId: input.orderId,
        userId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        isVerified: 1,
      });

      await db
        .update(orderItems)
        .set({ isReviewed: 1 })
        .where(eq(orderItems.id, input.orderItemId));

      return { success: true };
    }),

  statsByProduct: publicQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select({
          avgRating: sql<number>`avg(${reviews.rating})`,
          totalReviews: sql<number>`count(*)`,
          fiveStar: sql<number>`sum(case when ${reviews.rating} = 5 then 1 else 0 end)`,
          fourStar: sql<number>`sum(case when ${reviews.rating} = 4 then 1 else 0 end)`,
          threeStar: sql<number>`sum(case when ${reviews.rating} = 3 then 1 else 0 end)`,
          twoStar: sql<number>`sum(case when ${reviews.rating} = 2 then 1 else 0 end)`,
          oneStar: sql<number>`sum(case when ${reviews.rating} = 1 then 1 else 0 end)`,
        })
        .from(reviews)
        .where(eq(reviews.productId, input.productId));

      return result[0] || { avgRating: 0, totalReviews: 0, fiveStar: 0, fourStar: 0, threeStar: 0, twoStar: 0, oneStar: 0 };
    }),
});
