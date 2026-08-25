import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { carts, cartItems, products, productImages, inventory } from "@db/schema";
import { eq, and } from "@db/mysql";

export const cartRouter = createRouter({
  get: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    // Get or create cart for user
    let cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);

    if (!cart[0]) {
      await db.insert(carts).values({ userId });
      cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    }

    const cartId = cart[0].id;

    const items = await db
      .select({
        id: (cartItems as any).id,
        quantity: (cartItems as any).quantity,
        productId: (products as any).id,
        name: (products as any).name,
        slug: (products as any).slug,
        price: (products as any).price,
        imageUrl: (productImages as any).imageUrl,
        stock: (inventory as any).quantity,
        deliveryFeeInsideDhaka: (products as any).deliveryFeeInsideDhaka,
        deliveryFeeOutsideDhaka: (products as any).deliveryFeeOutsideDhaka,
      })
      .from(cartItems)
      .leftJoin(products, eq(products.id, cartItems.productId))
      .leftJoin(
        productImages,
        and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
      )
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(eq(cartItems.cartId, cartId));

    const total = items.reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0);
    const itemCount = items.reduce((sum: number, item: any) => sum + item.quantity, 0);

    return {
      id: cartId,
      items,
      total,
      itemCount,
    };
  }),

  add: authedQuery
    .input(z.object({ productId: z.number(), quantity: z.number().min(1).max(99).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const quantity = input.quantity ?? 1;

      let cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);

      if (!cart[0]) {
        await db.insert(carts).values({ userId });
        cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      }

      const cartId = cart[0].id;

      // Check if item already in cart
      const existing = await db
        .select()
        .from(cartItems)
        .where(and(eq(cartItems.cartId, cartId), eq(cartItems.productId, input.productId)))
        .limit(1);

      if (existing[0]) {
        await db
          .update(cartItems)
          .set({ quantity: existing[0].quantity + quantity })
          .where(eq(cartItems.id, existing[0].id));
      } else {
        await db.insert(cartItems).values({
          cartId,
          productId: input.productId,
          quantity,
        });
      }

      return { success: true };
    }),

  updateQuantity: authedQuery
    .input(z.object({ cartItemId: z.number(), quantity: z.number().min(1).max(99) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      const cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (!cart[0]) throw new Error("Cart not found");

      await db
        .update(cartItems)
        .set({ quantity: input.quantity })
        .where(and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cart[0].id)));

      return { success: true };
    }),

  remove: authedQuery
    .input(z.object({ cartItemId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      const cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (!cart[0]) throw new Error("Cart not found");

      await db
        .delete(cartItems)
        .where(and(eq(cartItems.id, input.cartItemId), eq(cartItems.cartId, cart[0].id)));

      return { success: true };
    }),

  clear: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    const cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
    if (!cart[0]) return { success: true };

    await db.delete(cartItems).where(eq(cartItems.cartId, cart[0].id));

    return { success: true };
  }),
});
