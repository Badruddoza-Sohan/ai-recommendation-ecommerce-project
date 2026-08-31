import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wishlist, products, productImages, categories, sellers } from "@db/schema";
import { eq, and, desc } from "@db/mysql";

export const wishlistRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    return db
      .select({
        id: (wishlist as any).id,
        productId: (products as any).id,
        name: (products as any).name,
        slug: (products as any).slug,
        shortDescription: (products as any).shortDescription,
        price: (products as any).price,
        comparePrice: (products as any).comparePrice,
        imageUrl: (productImages as any).imageUrl,
        rating: (products as any).rating,
        reviewCount: (products as any).reviewCount,
        categoryName: (categories as any).name,
        sellerName: (sellers as any).businessName,
      })
      .from(wishlist)
      .leftJoin(products, eq(products.id, wishlist.productId))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
      )
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(sellers, eq(sellers.id, products.sellerId))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt));
  }),

  add: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      // Check if already in wishlist
      const existing = await db
        .select()
        .from(wishlist)
        .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, input.productId)))
        .limit(1);

      if (existing[0]) {
        return { success: true, message: "Already in wishlist" };
      }

      await db.insert(wishlist).values({
        userId,
        productId: input.productId,
      });

      return { success: true };
    }),

  remove: authedQuery
    .input(z.object({ wishlistId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      await db
        .delete(wishlist)
        .where(and(eq(wishlist.id, input.wishlistId), eq(wishlist.userId, userId)));

      return { success: true };
    }),

  removeByProduct: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      await db
        .delete(wishlist)
        .where(and(eq(wishlist.userId, userId), eq(wishlist.productId, input.productId)));

      return { success: true };
    }),
});
