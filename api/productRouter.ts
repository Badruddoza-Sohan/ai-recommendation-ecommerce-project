import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { products, productImages, categories, sellers, inventory } from "@db/schema";
import { eq, ne, like, and, desc, sql, or } from "@db/mysql";
import { scoreProductForSearch } from "../src/lib/semanticSearch";

export const productRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        search: z.string().optional(),
        categoryId: z.number().optional(),
        sellerId: z.number().optional(),
        featured: z.boolean().optional(),
        trending: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input?.search) {
        conditions.push(or(
          like(products.name, `%${input.search}%`),
          like(products.tags, `%${input.search}%`),
          like(products.shortDescription, `%${input.search}%`),
          like(products.description, `%${input.search}%`)
        ));
      }
      if (input?.categoryId) {
        conditions.push(eq(products.categoryId, input.categoryId));
      }
      if (input?.sellerId) {
        conditions.push(eq(products.sellerId, input.sellerId));
      }
      if (input?.featured) {
        conditions.push(eq(products.isFeatured, 1));
      }
      if (input?.trending) {
        conditions.push(eq(products.isTrending, 1));
      }

      // Filter out deleted products globally
      conditions.push(ne(products.status, "deleted"));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

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
          isFeatured: products.isFeatured,
          isTrending: products.isTrending,
          categoryId: products.categoryId,
          sellerId: products.sellerId,
          status: products.status,
          createdAt: products.createdAt,
          categoryName: categories.name,
          sellerName: sellers.businessName,
          description: products.description,
          tags: products.tags,
        })
        .from(products)
        .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(where)
        .orderBy(desc(products.createdAt))
        .limit(input?.limit || 20)
        .offset(input?.offset || 0);

      const rankedItems = input?.search
        ? [...items].sort((a, b) => scoreProductForSearch(b, input.search || "") - scoreProductForSearch(a, input.search || ""))
        : items;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
        .where(where);

      return {
        items: rankedItems,
        total: countResult[0]?.count || 0,
      };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const product = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          shortDescription: products.shortDescription,
          price: products.price,
          comparePrice: products.comparePrice,
          sku: products.sku,
          tags: products.tags,
          attributes: products.attributes,
          status: products.status,
          rating: products.rating,
          reviewCount: products.reviewCount,
          soldCount: products.soldCount,
          isFeatured: products.isFeatured,
          categoryId: products.categoryId,
          sellerId: products.sellerId,
          createdAt: products.createdAt,
          categoryName: categories.name,
          categorySlug: categories.slug,
          sellerName: sellers.businessName,
          sellerLogo: sellers.logo,
          sellerRating: sellers.rating,
          sellerTotalSales: sellers.totalSales,
          sellerStatus: sellers.status,
        })
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(eq(products.id, input.id))
        .limit(1);

      if (!product[0]) return null;

      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, input.id))
        .orderBy(productImages.sortOrder);

      const stock = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, input.id))
        .limit(1);

      return {
        ...product[0],
        images,
        inventory: stock[0] || null,
      };
    }),

  getBySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const product = await db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          description: products.description,
          shortDescription: products.shortDescription,
          price: products.price,
          comparePrice: products.comparePrice,
          sku: products.sku,
          tags: products.tags,
          attributes: products.attributes,
          status: products.status,
          rating: products.rating,
          reviewCount: products.reviewCount,
          soldCount: products.soldCount,
          isFeatured: products.isFeatured,
          categoryId: products.categoryId,
          sellerId: products.sellerId,
          createdAt: products.createdAt,
          categoryName: categories.name,
          categorySlug: categories.slug,
          sellerName: sellers.businessName,
          sellerLogo: sellers.logo,
          sellerRating: sellers.rating,
          sellerTotalSales: sellers.totalSales,
          sellerStatus: sellers.status,
        })
        .from(products)
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(eq(products.slug, input.slug))
        .limit(1);

      if (!product[0]) return null;

      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product[0].id))
        .orderBy(productImages.sortOrder);

      const stock = await db
        .select()
        .from(inventory)
        .where(eq(inventory.productId, product[0].id))
        .limit(1);

      return {
        ...product[0],
        images,
        inventory: stock[0] || null,
      };
    }),

  recommendations: publicQuery
    .input(z.object({ productId: z.number(), limit: z.number().default(6) }))
    .query(async ({ input }) => {
      const db = getDb();

      // Get current product's category and tags
      const currentProduct = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);

      if (!currentProduct[0]) return [];

      const categoryId = currentProduct[0].categoryId;

      // Find related products in same category
      const related = await db
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
          categoryId: products.categoryId,
          sellerId: products.sellerId,
          categoryName: categories.name,
          sellerName: sellers.businessName,
        })
        .from(products)
        .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(
          and(
            eq(products.categoryId, categoryId),
            sql`${products.id} != ${input.productId}`,
            eq(products.status, "active")
          )
        )
        .orderBy(desc(products.soldCount))
        .limit(input.limit);

      return related;
    }),

  getFeatured: publicQuery
    .input(z.object({ limit: z.number().default(8) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 8;

      let featured = await db
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
          sellerName: sellers.businessName,
        })
        .from(products)
        .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(and(eq(products.isFeatured, 1), eq(products.status, "active")))
        .orderBy(desc(products.createdAt))
        .limit(limit);

      // Fallback to latest active products if no explicit isFeatured flags are set
      if (featured.length === 0) {
        featured = await db
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
            sellerName: sellers.businessName,
          })
          .from(products)
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
          .leftJoin(categories, eq(categories.id, products.categoryId))
          .leftJoin(sellers, eq(sellers.id, products.sellerId))
          .where(eq(products.status, "active"))
          .orderBy(desc(products.createdAt))
          .limit(limit);
      }

      return featured;
    }),

  getTrending: publicQuery
    .input(z.object({ limit: z.number().default(8) }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 8;

      let trending = await db
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
          sellerName: sellers.businessName,
        })
        .from(products)
        .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .leftJoin(sellers, eq(sellers.id, products.sellerId))
        .where(and(eq(products.isTrending, 1), eq(products.status, "active")))
        .orderBy(desc(products.soldCount))
        .limit(limit);

      // Fallback to active products if no explicit isTrending flags are set
      if (trending.length === 0) {
        trending = await db
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
            sellerName: sellers.businessName,
          })
          .from(products)
          .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
          .leftJoin(categories, eq(categories.id, products.categoryId))
          .leftJoin(sellers, eq(sellers.id, products.sellerId))
          .where(eq(products.status, "active"))
          .orderBy(desc(products.soldCount), desc(products.createdAt))
          .limit(limit);
      }

      return trending;
    }),
});
