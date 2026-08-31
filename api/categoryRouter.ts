import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { categories, products, productImages } from "@db/schema";
import { eq, desc, sql, and } from "@db/mysql";

export const categoryRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    const cats = await db.select().from(categories).orderBy(categories.name);

    // Get product count for each category
    const result = await Promise.all(
      cats.map(async (cat: any) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(eq(products.categoryId, cat.id));

        return {
          ...cat,
          productCount: countResult[0]?.count || 0,
        };
      })
    );

    return result;
  }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const cat = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, input.slug))
        .limit(1);

      if (!cat[0]) return null;

      const productCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.categoryId, cat[0].id));

      return {
        ...cat[0],
        productCount: productCount[0]?.count || 0,
      };
    }),

  getProducts: publicQuery
    .input(
      z.object({
        slug: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const cat = await db
        .select()
        .from(categories)
        .where(eq(categories.slug, input.slug))
        .limit(1);

      if (!cat[0]) return { items: [], total: 0 };

      const items = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          shortDescription: products.shortDescription,
          price: products.price,
          comparePrice: products.comparePrice,
          imageUrl: productImages.imageUrl,
          rating: products.rating,
          reviewCount: products.reviewCount,
          soldCount: products.soldCount,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(
          productImages,
          and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
        )
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(eq(products.categoryId, cat[0].id))
        .orderBy(desc(products.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.categoryId, cat[0].id));

      return {
        items,
        total: countResult[0]?.count || 0,
      };
    }),

  createCategory: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        icon: z.string().optional(),
        image: z.string().optional(),
        imageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const maxIdResult = await db.select({ maxId: sql<number>`MAX(id)` }).from(categories);
      const newId = (maxIdResult[0]?.maxId || 0) + 1;

      await db.insert(categories).values({
        id: newId,
        name: input.name,
        slug,
        description: input.description,
        image: input.image || input.imageUrl || null,
        isActive: 1,
      });

      return { success: true, id: newId, slug };
    }),

  updateCategory: publicQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1),
        description: z.string().optional(),
        image: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      await db
        .update(categories)
        .set({
          name: input.name,
          slug,
          description: input.description,
          image: input.image || null,
        })
        .where(eq(categories.id, input.id));

      return { success: true };
    }),
});
