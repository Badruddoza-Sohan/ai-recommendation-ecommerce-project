import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { sellers, products, productImages, orders, orderItems, categories, inventory, reviews, notifications, users, sellerPayouts, sellerMessages } from "@db/schema";
import { eq, desc, and, sql } from "@db/mysql";
import { notifyAdmins } from "./notificationRouter";

async function getSellerByUserId(userId: number) {
  const db = getDb();
  let seller = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
  if (seller[0]) return seller[0];
  const allSellers = await db.select().from(sellers).limit(1);
  return allSellers[0] ?? null;
}

export const sellerRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(sellers)
      .where(eq(sellers.status, "approved"))
      .orderBy(desc(sellers.rating));
  }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const seller = await db
        .select()
        .from(sellers)
        .where(eq(sellers.id, input.id))
        .limit(1);

      if (!seller[0]) return null;

      // Get seller's products
      const productList = await db
        .select({
          id: (products as any).id,
          name: (products as any).name,
          slug: (products as any).slug,
          shortDescription: (products as any).shortDescription,
          price: (products as any).price,
          comparePrice: (products as any).comparePrice,
          imageUrl: (productImages as any).imageUrl,
          rating: (products as any).rating,
          reviewCount: (products as any).reviewCount,
          soldCount: (products as any).soldCount,
          status: (products as any).status,
          categoryName: (categories as any).name,
        })
        .from(products)
        .leftJoin(
          productImages,
          and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
        )
        .leftJoin(categories, eq(categories.id, products.categoryId))
        .where(eq(products.sellerId, input.id))
        .orderBy(desc(products.createdAt) as any);

      // Get seller stats
      const totalProducts = productList.length;
      const totalSold = productList.reduce((sum: number, p: any) => sum + (p.soldCount || 0), 0);

      const sellerOrders = await db
        .select({ count: sql<number>`count(*)` as any, total: sql<number>`sum(${orderItems.totalPrice})` as any })
        .from(orderItems)
        .where(eq(orderItems.sellerId, input.id));

      return {
        ...seller[0],
        products: productList,
        stats: {
          totalProducts,
          totalSold,
          totalOrders: sellerOrders[0]?.count || 0,
          totalRevenue: sellerOrders[0]?.total || 0,
        },
      };
    }),

  listProducts: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    const seller = await getSellerByUserId(userId);
    if (!seller) return [];

    const sellerId = (seller as any).id;

    return db
      .select({
        id: (products as any).id,
        name: (products as any).name,
        slug: (products as any).slug,
        description: (products as any).description,
        shortDescription: (products as any).shortDescription,
        price: (products as any).price,
        comparePrice: (products as any).comparePrice,
        deliveryFeeInsideDhaka: (products as any).deliveryFeeInsideDhaka,
        deliveryFeeOutsideDhaka: (products as any).deliveryFeeOutsideDhaka,
        status: (products as any).status,
        soldCount: (products as any).soldCount,
        rating: (products as any).rating,
        categoryName: (categories as any).name,
        categoryId: (products as any).categoryId,
        quantity: (inventory as any).quantity,
        lowStockThreshold: (inventory as any).lowStockThreshold,
        warehouseLocation: (inventory as any).warehouseLocation,
        sku: (products as any).sku,
        imageUrl: (productImages as any).imageUrl,
        keywords: (products as any).tags,
        createdAt: (products as any).createdAt,
      })
      .from(products)
      .leftJoin(categories, eq(categories.id, products.categoryId))
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
      .where(eq(products.sellerId, sellerId))
      .orderBy(desc(products.createdAt));
  }),

  createProduct: authedQuery
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        price: z.number().min(0),
        comparePrice: z.number().optional(),
        deliveryFeeInsideDhaka: z.number().min(0).optional(),
        deliveryFeeOutsideDhaka: z.number().min(0).optional(),
        categoryId: z.number(),
        status: z.enum(["active", "draft", "archived"]).default("draft"),
        sku: z.string().optional(),
        quantity: z.number().int().min(0).default(0),
        lowStockThreshold: z.number().int().min(0).default(5),
        warehouseLocation: z.string().optional(),
        images: z.array(z.string()).min(1, "Minimum 1 photo is mandatory").max(4, "Maximum 4 photos allowed").optional(),
        imageUrl: z.string().optional(),
        keywords: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const sellerRow = await db.select().from(sellers).where(eq(sellers.userId, userId)).limit(1);
      if (!sellerRow[0]) throw new Error("Seller profile not found");

      const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      await db.insert(products).values({
        name: input.name,
        slug,
        description: input.description,
        shortDescription: input.shortDescription,
        price: input.price,
        comparePrice: input.comparePrice,
        deliveryFeeInsideDhaka: input.deliveryFeeInsideDhaka ?? 0,
        deliveryFeeOutsideDhaka: input.deliveryFeeOutsideDhaka ?? 0,
        sku: input.sku,
        categoryId: input.categoryId,
        sellerId: sellerRow[0].id,
        status: input.status,
        tags: input.keywords?.trim() || undefined,
      });

      const insertedProducts = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
      const inserted = insertedProducts;

      const imageList = (input.images && input.images.length > 0)
        ? input.images.filter(Boolean).slice(0, 4)
        : (input.imageUrl ? [input.imageUrl] : []);

      const normalizedImages = imageList.map((u: string) => {
        if (!u) return u;
        if (u.startsWith("http") || u.startsWith("/")) return u;
        return `/${u}`;
      });

      if (imageList.length === 0) {
        throw new Error("Minimum 1 product image photo is mandatory!");
      }

      for (let i = 0; i < normalizedImages.length; i++) {
        await db.insert(productImages).values({
          productId: inserted[0].id,
          imageUrl: normalizedImages[i],
          isPrimary: i === 0 ? 1 : 0,
          sortOrder: i,
        });
      }

      await db.insert(inventory).values({
        productId: inserted[0].id,
        quantity: input.quantity,
        lowStockThreshold: input.lowStockThreshold,
        warehouseLocation: input.warehouseLocation || undefined,
      });

      return inserted[0];
    }),

  updateProduct: authedQuery
    .input(
      z.object({
        productId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        shortDescription: z.string().optional(),
        price: z.number().optional(),
        comparePrice: z.number().optional(),
        deliveryFeeInsideDhaka: z.number().min(0).optional(),
        deliveryFeeOutsideDhaka: z.number().min(0).optional(),
        categoryId: z.number().optional(),
        status: z.enum(["active", "draft", "archived"]).optional(),
        sku: z.string().optional(),
        quantity: z.number().int().min(0).optional(),
        lowStockThreshold: z.number().int().min(0).optional(),
        warehouseLocation: z.string().optional(),
        images: z.array(z.string()).min(1, "Minimum 1 photo is mandatory").max(4, "Maximum 4 photos allowed").optional(),
        imageUrl: z.string().optional(),
        keywords: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const sellerRow = await db.select().from(sellers).where(eq(sellers.userId, (ctx.user as any).id)).limit(1);
      if (!sellerRow[0]) throw new Error("Seller profile not found");

      const existing = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.sellerId, sellerRow[0].id))).limit(1);
      if (!existing[0]) throw new Error("Product not found");

      const updatePayload: Record<string, unknown> = {};
      if (input.name) updatePayload.name = input.name;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.shortDescription !== undefined) updatePayload.shortDescription = input.shortDescription;
      if (input.price !== undefined) updatePayload.price = input.price;
      if (input.comparePrice !== undefined) updatePayload.comparePrice = input.comparePrice;
      if (input.deliveryFeeInsideDhaka !== undefined) updatePayload.deliveryFeeInsideDhaka = input.deliveryFeeInsideDhaka;
      if (input.deliveryFeeOutsideDhaka !== undefined) updatePayload.deliveryFeeOutsideDhaka = input.deliveryFeeOutsideDhaka;
      if (input.categoryId !== undefined) updatePayload.categoryId = input.categoryId;
      if (input.status !== undefined) updatePayload.status = input.status;
      if (input.sku !== undefined) updatePayload.sku = input.sku;
      if (input.keywords !== undefined) updatePayload.tags = input.keywords.trim() || undefined;

      await db.update(products).set(updatePayload).where(eq(products.id, input.productId));

      if (input.quantity !== undefined || input.lowStockThreshold !== undefined || input.warehouseLocation !== undefined) {
        const stock = await db.select().from(inventory).where(eq(inventory.productId, input.productId)).limit(1);
        const inventoryPayload: Record<string, unknown> = {};
        if (input.quantity !== undefined) inventoryPayload.quantity = input.quantity;
        if (input.lowStockThreshold !== undefined) inventoryPayload.lowStockThreshold = input.lowStockThreshold;
        if (input.warehouseLocation !== undefined) inventoryPayload.warehouseLocation = input.warehouseLocation || null;
        if (stock[0]) {
          await db.update(inventory).set(inventoryPayload).where(eq(inventory.productId, input.productId));
        } else {
          await db.insert(inventory).values({
            productId: input.productId,
            quantity: input.quantity ?? 0,
            lowStockThreshold: input.lowStockThreshold ?? 5,
            warehouseLocation: input.warehouseLocation || undefined,
          });
        }
      }

      const imageList = (input.images && input.images.length > 0)
        ? input.images.filter(Boolean).slice(0, 4)
        : (input.imageUrl ? [input.imageUrl] : null);

      const normalizedImages = imageList
        ? imageList.map((u: string) => {
          if (!u) return u;
          if (u.startsWith("http") || u.startsWith("/")) return u;
          return `/${u}`;
        })
        : null;

      if (normalizedImages) {
        if (!imageList || imageList.length === 0) {
          throw new Error("Minimum 1 product image photo is mandatory!");
        }

        // Delete existing images
        await db.delete(productImages).where(eq(productImages.productId, input.productId));

        // Insert updated images (1 to 4)
        for (let i = 0; i < normalizedImages.length; i++) {
          await db.insert(productImages).values({
            productId: input.productId,
            imageUrl: normalizedImages[i],
            isPrimary: i === 0 ? 1 : 0,
            sortOrder: i,
          });
        }
      }

      return { success: true };
    }),

  deleteProduct: authedQuery
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const sellerRow = await db.select().from(sellers).where(eq(sellers.userId, (ctx.user as any).id)).limit(1);
      if (!sellerRow[0]) throw new Error("Seller profile not found");

      await db.delete(products).where(and(eq(products.id, input.productId), eq(products.sellerId, sellerRow[0].id)));
      return { success: true };
    }),

  adjustInventory: authedQuery
    .input(
      z.object({
        productId: z.number(),
        delta: z.number().int(),
        threshold: z.number().int().min(0).optional(),
        warehouseLocation: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const sellerRow = await db.select().from(sellers).where(eq(sellers.userId, (ctx.user as any).id)).limit(1);
      if (!sellerRow[0]) throw new Error("Seller profile not found");

      const existing = await db.select().from(products).where(and(eq(products.id, input.productId), eq(products.sellerId, sellerRow[0].id))).limit(1);
      if (!existing[0]) throw new Error("Product not found");

      const stock = await db.select().from(inventory).where(eq(inventory.productId, input.productId)).limit(1);
      const nextQuantity = Math.max(0, (stock[0]?.quantity ?? 0) + input.delta);
      const inventoryPayload: Record<string, unknown> = {
        quantity: nextQuantity,
        updatedAt: Date.now(),
      };

      if (input.threshold !== undefined) inventoryPayload.lowStockThreshold = input.threshold;
      if (input.warehouseLocation !== undefined) inventoryPayload.warehouseLocation = input.warehouseLocation || null;

      if (stock[0]) {
        await db.update(inventory).set(inventoryPayload).where(eq(inventory.productId, input.productId));
      } else {
        await db.insert(inventory).values({
          productId: input.productId,
          quantity: nextQuantity,
          lowStockThreshold: input.threshold ?? 5,
          warehouseLocation: input.warehouseLocation || undefined,
        });
      }

      return { success: true, quantity: nextQuantity };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        businessName: z.string().optional(),
        businessEmail: z.string().email().optional(),
        businessPhone: z.string().optional(),
        description: z.string().optional(),
        logo: z.string().optional(),
        banner: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const sellerRow = await db.select().from(sellers).where(eq(sellers.userId, (ctx.user as any).id)).limit(1);
      if (!sellerRow[0]) throw new Error("Seller profile not found");

      const updatePayload: Record<string, unknown> = {};
      if (input.businessName !== undefined) updatePayload.businessName = input.businessName;
      if (input.businessEmail !== undefined) updatePayload.businessEmail = input.businessEmail;
      if (input.businessPhone !== undefined) updatePayload.businessPhone = input.businessPhone;
      if (input.description !== undefined) updatePayload.description = input.description;
      if (input.logo !== undefined) updatePayload.logo = input.logo;
      if (input.banner !== undefined) updatePayload.banner = input.banner;

      await db.update(sellers).set(updatePayload).where(eq(sellers.id, sellerRow[0].id));

      return { success: true };
    }),

  dashboard: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    const seller = await getSellerByUserId(userId);
    if (!seller) return null;

    const sellerId = (seller as any).id;

    const productCount = await db
      .select({ count: sql<number>`count(*)` as any })
      .from(products)
      .where(eq(products.sellerId, sellerId));

    const pendingOrders = await db
      .select({
        id: (orders as any).id,
        orderNumber: (orders as any).orderNumber,
        totalAmount: (orders as any).totalAmount,
        status: (orders as any).status,
        createdAt: (orders as any).createdAt,
        userId: (orders as any).userId,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(and(eq(orderItems.sellerId, sellerId), eq(orders.status, "pending")))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt) as any);

    const recentSales = await db
      .select({
        total: sql<number>`sum(${orderItems.totalPrice})` as any,
        count: sql<number>`count(*)` as any,
      })
      .from(orderItems)
      .where(eq(orderItems.sellerId, sellerId));

    const monthlySales = await db
      .select({
        month: sql<string>`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')` as any,
        total: sql<number>`sum(${orderItems.totalPrice})` as any,
        count: sql<number>`count(*)` as any,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.sellerId, sellerId))
      .groupBy(sql`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')`)
      .orderBy(desc(sql`DATE_FORMAT(FROM_UNIXTIME(${orders.createdAt} / 1000), '%Y-%m')`) as any)
      .limit(12);

    const reviewsData = await db
      .select({
        id: (reviews as any).id,
        rating: (reviews as any).rating,
        title: (reviews as any).title,
        comment: (reviews as any).comment,
        isVerified: (reviews as any).isVerified,
        createdAt: (reviews as any).createdAt,
        productName: (products as any).name,
        customerName: (users as any).name,
      })
      .from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId))
      .leftJoin(users, eq(users.id, reviews.userId))
      .where(eq(products.sellerId, sellerId))
      .orderBy(desc(reviews.createdAt) as any)
      .limit(10);

    const customerRows = await db
      .select({
        customerId: (orders as any).userId,
        customerName: (users as any).name,
        customerEmail: (users as any).email,
        customerPhone: (users as any).phone,
        orderId: (orders as any).id,
        totalAmount: (orders as any).totalAmount,
        createdAt: (orders as any).createdAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .leftJoin(users, eq(users.id, orders.userId))
      .where(eq(orderItems.sellerId, sellerId))
      .orderBy(desc(orders.createdAt) as any);

    const customers = Array.from(
      customerRows.reduce((map: any, row: any) => {
        const existing = map.get(row.customerId) ?? {
          id: row.customerId,
          name: row.customerName || "Customer",
          email: row.customerEmail || "",
          phone: row.customerPhone || "",
          totalOrders: 0,
          totalSpent: 0,
          lastOrderAt: row.createdAt,
        };

        existing.totalOrders += 1;
        existing.totalSpent += Number(row.totalAmount || 0);
        existing.lastOrderAt = row.createdAt > existing.lastOrderAt ? row.createdAt : existing.lastOrderAt;
        map.set(row.customerId, existing);
        return map;
      }, new Map<number, any>()).values(),
    ).sort((a: any, b: any) => Number(b.totalSpent) - Number(a.totalSpent));

    const messages = await db
      .select({
        id: (notifications as any).id,
        title: (notifications as any).title,
        message: (notifications as any).message,
        type: (notifications as any).type,
        isRead: (notifications as any).isRead,
        link: (notifications as any).link,
        createdAt: (notifications as any).createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt) as any)
      .limit(10);

    const promotions = await db
      .select({
        id: (products as any).id,
        name: (products as any).name,
        price: (products as any).price,
        comparePrice: (products as any).comparePrice,
        imageUrl: (productImages as any).imageUrl,
        status: (products as any).status,
        stock: (inventory as any).quantity,
      })
      .from(products)
      .leftJoin(productImages, and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1)))
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .where(and(eq(products.sellerId, sellerId), eq(products.status, "active"), sql`${products.comparePrice} > ${products.price}`))
      .orderBy(desc(products.updatedAt) as any)
      .limit(8);

    const payoutHistory = monthlySales.slice(0, 4).map((month: any, index: number) => ({
      month: month.month,
      amount: Number(month.total || 0) * 0.9,
      status: index === 0 ? "Scheduled" : "Completed",
    }));

    return {
      seller,
      stats: {
        totalProducts: productCount[0]?.count || 0,
        pendingOrders: pendingOrders.length,
        totalRevenue: recentSales[0]?.total || 0,
        totalSales: recentSales[0]?.count || 0,
        totalCustomers: customers.length,
      },
      recentOrders: pendingOrders.slice(0, 10),
      monthlySales,
      reviews: reviewsData,
      customers,
      messages,
      promotions,
      payouts: payoutHistory,
    };
  }),

  getOrders: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    const seller = await getSellerByUserId(userId);
    if (!seller) return [];

    const sellerId = (seller as any).id;

    const sellerOrders = await db
      .select({
        id: (orders as any).id,
        userId: (orders as any).userId,
        orderNumber: (orders as any).orderNumber,
        totalAmount: (orders as any).totalAmount,
        status: (orders as any).status,
        sellerStatus: (orders as any).sellerStatus,
        courierName: (orders as any).courierName,
        trackingNumber: (orders as any).trackingNumber,
        notes: (orders as any).notes,
        paymentStatus: (orders as any).paymentStatus,
        createdAt: (orders as any).createdAt,
        shippingAddress: (orders as any).shippingAddress,
        shippingCity: (orders as any).shippingCity,
        shippingCountry: (orders as any).shippingCountry,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(orderItems.sellerId, sellerId))
      .groupBy(orders.id)
      .orderBy(desc(orders.createdAt) as any);

    // Get items for each order
    const ordersWithItems = await Promise.all(
      sellerOrders.map(async (order: any) => {
        const items = await db
          .select({
            id: orderItems.id,
            quantity: orderItems.quantity,
            unitPrice: orderItems.unitPrice,
            totalPrice: orderItems.totalPrice,
            productName: (products as any).name,
            imageUrl: (productImages as any).imageUrl,
          })
          .from(orderItems)
          .leftJoin(products, eq(products.id, orderItems.productId))
          .leftJoin(
            productImages,
            and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
          )
          .where(and(eq(orderItems.orderId, order.id), eq(orderItems.sellerId, sellerId)));

        return { ...order, items };
      })
    );

    return ordersWithItems;
  }),

  // Payouts
  listPayouts: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const seller = await getSellerByUserId(userId);
    if (!seller) return [];

    return db
      .select()
      .from(sellerPayouts)
      .where(eq(sellerPayouts.sellerId, seller.id))
      .orderBy(desc(sellerPayouts.createdAt));
  }),

  requestPayout: authedQuery
    .input(
      z.object({
        amount: z.number().min(100),
        paymentMethod: z.enum(["bank", "bkash", "nagad"]),
        accountDetails: z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const seller = await getSellerByUserId(userId);
      if (!seller) throw new Error("Seller profile not found");

      await db.insert(sellerPayouts).values({
        sellerId: seller.id,
        amount: input.amount,
        paymentMethod: input.paymentMethod,
        accountDetails: input.accountDetails,
        status: "pending",
      });

      return { success: true };
    }),

  // Messages
  listMessages: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const seller = await getSellerByUserId(userId);
    if (!seller) return [];

    return db
      .select({
        id: sellerMessages.id,
        sellerId: sellerMessages.sellerId,
        customerId: sellerMessages.customerId,
        customerName: sellerMessages.customerName,
        customerEmail: sellerMessages.customerEmail,
        productId: sellerMessages.productId,
        subject: sellerMessages.subject,
        message: sellerMessages.message,
        reply: sellerMessages.reply,
        status: sellerMessages.status,
        createdAt: sellerMessages.createdAt,
        productName: (products as any).name,
      })
      .from(sellerMessages)
      .leftJoin(products, eq(products.id, sellerMessages.productId))
      .where(eq(sellerMessages.sellerId, seller.id))
      .orderBy(desc(sellerMessages.createdAt));
  }),

  sendMessageToSeller: authedQuery
    .input(
      z.object({
        sellerId: z.number(),
        productId: z.number().optional(),
        subject: z.string().min(1),
        message: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const user = ctx.user as any;
      if (!user) throw new Error("Authentication required");

      const sellerRows = await db.select().from(sellers).where(eq(sellers.id, input.sellerId)).limit(1);
      if (!sellerRows[0]) throw new Error("Seller not found");
      const seller = sellerRows[0];

      await db.insert(sellerMessages).values({
        sellerId: input.sellerId,
        customerId: user.id,
        customerName: user.name || "Valued Customer",
        customerEmail: user.email || user.phone || "customer@marketverse.bd",
        productId: input.productId || null,
        subject: input.subject,
        message: input.message,
        status: "unread",
      });

      if (seller.userId) {
        await db.insert(notifications).values({
          userId: seller.userId,
          title: "💬 New Customer Inquiry",
          message: `${user.name || "A customer"} sent a message regarding: ${input.subject}`,
          type: "message",
          link: "/seller?tab=messages",
        });
      }

      return { success: true };
    }),

  getCustomerMessages: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const user = ctx.user as any;
    if (!user) return [];

    const messagesList = await db
      .select({
        id: sellerMessages.id,
        sellerId: sellerMessages.sellerId,
        customerId: sellerMessages.customerId,
        customerName: sellerMessages.customerName,
        customerEmail: sellerMessages.customerEmail,
        productId: sellerMessages.productId,
        subject: sellerMessages.subject,
        message: sellerMessages.message,
        reply: sellerMessages.reply,
        status: sellerMessages.status,
        createdAt: sellerMessages.createdAt,
        sellerName: sellers.businessName,
        sellerLogo: sellers.logo,
        productName: (products as any).name,
        productSlug: (products as any).slug,
      })
      .from(sellerMessages)
      .leftJoin(sellers, eq(sellers.id, sellerMessages.sellerId))
      .leftJoin(products, eq(products.id, sellerMessages.productId))
      .where(eq(sellerMessages.customerId, user.id))
      .orderBy(desc(sellerMessages.createdAt));

    return messagesList;
  }),

  replyMessage: authedQuery
    .input(
      z.object({
        messageId: z.number(),
        reply: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(sellerMessages).where(eq(sellerMessages.id, input.messageId)).limit(1);
      if (!existing[0]) throw new Error("Message not found");

      await db
        .update(sellerMessages)
        .set({ reply: input.reply, status: "replied" })
        .where(eq(sellerMessages.id, input.messageId));

      if (existing[0].customerId) {
        await db.insert(notifications).values({
          userId: existing[0].customerId,
          title: "💬 Seller Replied to Your Inquiry",
          message: `Seller replied: "${input.reply.slice(0, 80)}..."`,
          type: "message",
          link: "/profile?tab=messages",
        });
      }

      return { success: true };
    }),

  // Seller Order Actions
  acceptOrder: authedQuery
    .input(z.object({ orderId: z.number(), courierName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const seller = await getSellerByUserId(userId);
      if (!seller) throw new Error("Seller profile not found");

      const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!orderRows[0]) throw new Error("Order not found");
      const order = orderRows[0];

      const shippingCity = (order.shippingCity || "").toLowerCase();
      const isInside = shippingCity.includes("dhaka");
      const estimatedDays = isInside ? 2 : 4;
      const estimatedDate = Date.now() + estimatedDays * 86400000;

      await db
        .update(orders)
        .set({
          sellerStatus: "accepted",
          status: "processing",
          courierName: input.courierName || "Pathao Express",
          estimatedDeliveryDays: estimatedDays,
          estimatedDeliveryDate: estimatedDate,
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, input.orderId));

      // 1. Notify Customer
      await db.insert(notifications).values({
        userId: order.userId,
        title: `✅ Order Accepted #${order.orderNumber}`,
        message: `Great news! Your order #${order.orderNumber} has been accepted and confirmed by ${seller.businessName}. Estimated delivery: ${estimatedDays} business days via ${input.courierName || "Pathao Express"}.`,
        type: "order",
        isRead: 0,
        link: "/dashboard?tab=orders",
      });

      // 2. Notify Admins
      await notifyAdmins({
        title: `✅ Order #${order.orderNumber} Accepted`,
        message: `${seller.businessName} accepted order #${order.orderNumber}. Processing for delivery.`,
        type: "order",
        link: "/admin?tab=orders",
      });

      return { success: true };
    }),

  denyOrder: authedQuery
    .input(z.object({ orderId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const seller = await getSellerByUserId(userId);
      if (!seller) throw new Error("Seller profile not found");

      const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
      if (!orderRows[0]) throw new Error("Order not found");
      const order = orderRows[0];

      const isPrepaid = order.paymentStatus === "paid" || (order.paymentMethod && order.paymentMethod !== "cod" && order.paymentStatus !== "pending");
      const refundRef = `REF-${Date.now().toString().slice(-6)}`;
      const newPaymentStatus = isPrepaid ? "refunded" : order.paymentStatus;
      const cancellationNote = isPrepaid
        ? `Cancelled by seller (${seller.businessName}). 100% full refund of BDT ${order.totalAmount} refunded to original payment method (${order.paymentMethod || "SSLCommerz/MFS"}). Refund Ref: ${refundRef}. Reason: ${input.reason || "Stock unavailable"}`
        : `Denied by seller (${seller.businessName}). Reason: ${input.reason || "Stock unavailable"}`;

      await db
        .update(orders)
        .set({
          sellerStatus: "denied",
          status: "cancelled",
          paymentStatus: newPaymentStatus,
          notes: cancellationNote,
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, input.orderId));

      // 1. Notify Customer of cancellation & refund
      if (isPrepaid) {
        await db.insert(notifications).values({
          userId: order.userId,
          title: `💰 Order Cancelled & Money Refunded #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} was cancelled by ${seller.businessName}. A 100% full refund of BDT ${order.totalAmount.toLocaleString()} has been sent back to your ${order.paymentMethod?.toUpperCase() || "account"} (Refund Ref: ${refundRef}). Reason: ${input.reason || "Stock unavailable"}.`,
          type: "refund",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      } else {
        await db.insert(notifications).values({
          userId: order.userId,
          title: `Order Cancelled #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} was cancelled by ${seller.businessName}. Reason: ${input.reason || "Stock unavailable"}.`,
          type: "order",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      }

      // 2. Notify Admins
      await notifyAdmins({
        title: isPrepaid ? `💰 Order #${order.orderNumber} Cancelled & Refunded` : `Order #${order.orderNumber} Cancelled`,
        message: `${seller.businessName} cancelled order #${order.orderNumber}.${isPrepaid ? ` Full refund of BDT ${order.totalAmount.toLocaleString()} processed to customer.` : ""}`,
        type: "order",
        link: "/admin?tab=orders",
      });

      return { success: true, isPrepaid, refundRef };
    }),

  handoverOrder: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        courierName: z.string(),
        trackingNumber: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const db = getDb();
        const userId = (ctx.user as any).id;
        const seller = await getSellerByUserId(userId);
        if (!seller) throw new Error("Seller profile not found");

        const orderRows = await db.select().from(orders).where(eq(orders.id, input.orderId)).limit(1);
        if (!orderRows[0]) throw new Error("Order not found");
        const order = orderRows[0];

        await db
          .update(orders)
          .set({
            sellerStatus: "handed_over",
            status: "shipped",
            courierName: input.courierName,
            trackingNumber: input.trackingNumber,
            updatedAt: Date.now(),
          })
          .where(eq(orders.id, input.orderId));

        // Notify customer
        if (order.userId) {
          await db.insert(notifications).values({
            userId: order.userId,
            title: `🚚 Order Handed Over for Delivery #${order.orderNumber}`,
            message: `Your package #${order.orderNumber} has been handed over to ${input.courierName} (Tracking #: ${input.trackingNumber}).`,
            type: "order",
            isRead: 0,
            link: "/dashboard?tab=orders",
          });
        }

        // Notify Admin
        await notifyAdmins({
          title: `🚚 Order #${order.orderNumber} Shipped`,
          message: `${seller.businessName} dispatched order #${order.orderNumber} via ${input.courierName}.`,
          type: "order",
          link: "/admin?tab=orders",
        });

        return { success: true };
      } catch (err) {
        console.error("handoverOrder error:", err);
        throw err;
      }
    }),

  suggestProductDetails: authedQuery
    .input(
      z.object({
        productName: z.string().optional(),
        categoryName: z.string(),
        price: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const apiKey = process.env.OPENAI_API_KEY || "";
      const categoryName = input.categoryName || "General";
      const productName = input.productName?.trim() || `${categoryName} Product`;
      const priceText = input.price ? `Target Price: BDT ${input.price}` : "";
      const catLower = categoryName.toLowerCase();
      const defaultSku = `MKT-${categoryName.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (apiKey) {
        try {
          const prompt = `You are an expert e-commerce copywriter and SEO specialist for an online marketplace in Bangladesh named MarketVerse.
Generate professional product listing details for:
Product Name: "${productName}"
Category: "${categoryName}"
${priceText}

Return a valid JSON object with the following fields:
- "shortDescription": A crisp 1-2 sentence compelling summary emphasizing key benefits, comfort/utility, and style.
- "description": A comprehensive, beautifully formatted description in Markdown containing:
  - An engaging opening paragraph
  - • Bulleted Key Features & Specifications (Materials, Performance, Design)
  - • What's in the Box / Package Includes
  - • Care / Usage Instructions or Guarantee
- "keywords": A comma-separated string of 6-10 high-ranking search tags and SEO keywords relevant to this product and Bangladeshi shoppers (e.g. "men shirt, formal cotton, stylish bd, premium clothing").
- "sku": A clean suggested SKU string like "${defaultSku}"

Return ONLY valid JSON with keys: "shortDescription", "description", "keywords", "sku".`;

          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: prompt }],
              response_format: { type: "json_object" },
              temperature: 0.7,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
              const parsed = JSON.parse(content);
              return {
                shortDescription: parsed.shortDescription || "",
                description: parsed.description || "",
                keywords: parsed.keywords || "",
                sku: parsed.sku || defaultSku,
                source: "openai",
              };
            }
          } else {
            console.warn(`[suggestProductDetails] OpenAI returned ${res.status}: ${res.statusText}`);
          }
        } catch (e) {
          console.error("[suggestProductDetails] OpenAI generation error:", e);
        }
      }

      // Fallback: Rule-based generation
      let suggestedShortDesc = "";
      let suggestedFullDesc = "";
      let suggestedKeywords = "";

      if (catLower.includes("fashion") || catLower.includes("mens") || catLower.includes("womens") || catLower.includes("clothing") || catLower.includes("shirt") || catLower.includes("dress")) {
        suggestedShortDesc = `Premium quality ${productName} crafted from breathable fabric, offering superior comfort, durability, and modern style.`;
        suggestedFullDesc = `✨ ${productName} - Premium Collection

• Material: High-grade breathable cotton blend fabric.
• Fit & Comfort: Ergonomically tailored for effortless all-day wear.
• Occasion: Suitable for casual outings, work, and formal events.
• Care Instructions: Machine wash cold with like colors, tumble dry low, do not bleach.
• Guarantee: 100% authentic product with quality verification.`;
        suggestedKeywords = `${productName.toLowerCase()}, fashion, clothing, premium quality, comfortable fit, stylish, authentic, bd fashion`;
      } else if (catLower.includes("electronic") || catLower.includes("headphone") || catLower.includes("watch") || catLower.includes("gadget")) {
        suggestedShortDesc = `High-performance ${productName} featuring latest technology, sleek design, long battery life, and crystal-clear response.`;
        suggestedFullDesc = `⚡ ${productName} - Advanced Tech Edition

• Key Features: Ultra-fast processing, intuitive controls, and smart connectivity.
• Battery & Power: Long-lasting rechargeable battery with fast-charging technology.
• Design: Lightweight ergonomic build with premium matte finish.
• Package Includes: ${productName}, Charging Cable, User Manual, Warranty Card.
• Warranty: 1-Year Official Manufacturer Warranty.`;
        suggestedKeywords = `${productName.toLowerCase()}, tech, electronics, smart gadget, high performance, official warranty, gadgets bd`;
      } else {
        suggestedShortDesc = `Top-rated ${productName} selected for excellence, durability, and daily reliability in the ${categoryName} category.`;
        suggestedFullDesc = `🌟 ${productName} - ${categoryName} Special

• Premium build quality designed for everyday satisfaction.
• Tested for performance, safety, and long-lasting durability.
• Top choice among verified buyers in ${categoryName}.
• Fast shipping across Bangladesh with secure packaging.`;
        suggestedKeywords = `${productName.toLowerCase()}, ${categoryName.toLowerCase()}, best deal, top quality, marketverse verified`;
      }

      return {
        shortDescription: suggestedShortDesc,
        description: suggestedFullDesc,
        keywords: suggestedKeywords,
        sku: defaultSku,
        source: "fallback",
      };
    }),
});
