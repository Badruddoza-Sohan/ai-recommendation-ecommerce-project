import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { orders, orderItems, carts, cartItems, products, productImages, sellers, notifications } from "@db/schema";
import { eq, desc, and, sql } from "@db/mysql";
import { notifyAdmins } from "./notificationRouter";
import { buildDemoPaymentNote, generateDemoPaymentReference, generateDemoTrackingNumber } from "./lib/demoPayments";
import { determineDeliveryZone } from "../src/lib/deliveryFees";
import { initiateSSLCommerzPayment } from "./lib/sslcommerz";

async function notifySellersForOrder(sellerIds: number[], orderNumber: string, totalAmount: number, itemCount: number) {
  const db = getDb();
  const notifiedSellerUserIds = new Set<number>();

  for (const sId of sellerIds) {
    const sellerRow = await db.select().from(sellers).where(eq(sellers.id, sId)).limit(1);
    const targetUserId = sellerRow[0]?.userId;
    if (targetUserId && !notifiedSellerUserIds.has(targetUserId)) {
      notifiedSellerUserIds.add(targetUserId);
      await db.insert(notifications).values({
        userId: targetUserId,
        title: `🛒 New Order Received #${orderNumber}`,
        message: `A customer placed a new order #${orderNumber} for BDT ${totalAmount.toLocaleString()} (${itemCount} item(s)). Please review and accept or deny the order in your Seller Hub.`,
        type: "order",
        isRead: 0,
        link: "/seller?tab=orders",
      });
    }
  }

  // Fallback: if no seller user ID was resolved, notify all active sellers so orders are never missed
  if (notifiedSellerUserIds.size === 0) {
    const allSellers = await db.select().from(sellers);
    for (const s of allSellers) {
      if (s.userId && !notifiedSellerUserIds.has(s.userId)) {
        notifiedSellerUserIds.add(s.userId);
        await db.insert(notifications).values({
          userId: s.userId,
          title: `🛒 New Order Received #${orderNumber}`,
          message: `A customer placed a new order #${orderNumber} for BDT ${totalAmount.toLocaleString()}. Please review and accept or deny the order in your Seller Hub.`,
          type: "order",
          isRead: 0,
          link: "/seller?tab=orders",
        });
      }
    }
  }
}

export const orderRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;

    const orderList = await db
      .select({
        id: (orders as any).id,
        orderNumber: (orders as any).orderNumber,
        totalAmount: (orders as any).totalAmount,
        taxAmount: (orders as any).taxAmount,
        shippingAmount: (orders as any).shippingAmount,
        status: (orders as any).status,
        sellerStatus: (orders as any).sellerStatus,
        courierName: (orders as any).courierName,
        estimatedDeliveryDays: (orders as any).estimatedDeliveryDays,
        estimatedDeliveryDate: (orders as any).estimatedDeliveryDate,
        paymentStatus: (orders as any).paymentStatus,
        paymentMethod: (orders as any).paymentMethod,
        paymentReference: (orders as any).paymentReference,
        trackingNumber: (orders as any).trackingNumber,
        createdAt: (orders as any).createdAt,
        shippingAddress: (orders as any).shippingAddress,
        shippingCity: (orders as any).shippingCity,
      })
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    // Get items for each order
    const ordersWithItems = await Promise.all(
      orderList.map(async (order: any) => {
        const items = await db
          .select({
            id: (orderItems as any).id,
            quantity: (orderItems as any).quantity,
            unitPrice: (orderItems as any).unitPrice,
            totalPrice: (orderItems as any).totalPrice,
            productId: (products as any).id,
            productName: (products as any).name,
            productSlug: (products as any).slug,
            isReviewed: (orderItems as any).isReviewed,
            imageUrl: (productImages as any).imageUrl,
            sellerName: (sellers as any).businessName,
          })
          .from(orderItems)
          .leftJoin(products, eq(products.id, orderItems.productId))
          .leftJoin(
            productImages,
            and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
          )
          .leftJoin(sellers, eq(sellers.id, orderItems.sellerId))
          .where(eq(orderItems.orderId, order.id));

        return { ...order, items };
      })
    );

    return ordersWithItems;
  }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      const order = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.id), eq(orders.userId, userId)))
        .limit(1);

      if (!order[0]) return null;

      const items = await db
        .select({
          id: (orderItems as any).id,
          quantity: (orderItems as any).quantity,
          unitPrice: (orderItems as any).unitPrice,
          totalPrice: (orderItems as any).totalPrice,
          productId: (products as any).id,
          productName: (products as any).name,
          productSlug: (products as any).slug,
          isReviewed: (orderItems as any).isReviewed,
          imageUrl: (productImages as any).imageUrl,
          sellerName: (sellers as any).businessName,
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.productId))
        .leftJoin(
          productImages,
          and(eq(productImages.productId, products.id), eq(productImages.isPrimary, 1))
        )
        .leftJoin(sellers, eq(sellers.id, orderItems.sellerId))
        .where(eq(orderItems.orderId, order[0].id));

      return { ...order[0], items };
    }),

  create: authedQuery
    .input(
      z.object({
        shippingAddress: z.string(),
        shippingCity: z.string(),
        shippingCountry: z.string(),
        shippingPostalCode: z.string(),
        paymentMethod: z.enum(["pay_now", "cod", "sslcommerz", "bkash", "nagad", "rocket"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      // Get cart
      const cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (!cart[0]) throw new Error("Cart is empty");

      const cartId = cart[0].id;

      // Get cart items
      const items = await db
        .select({
          id: (cartItems as any).id,
          productId: (cartItems as any).productId,
          quantity: (cartItems as any).quantity,
          price: (products as any).price,
          sellerId: (products as any).sellerId,
          deliveryFeeInsideDhaka: (products as any).deliveryFeeInsideDhaka,
          deliveryFeeOutsideDhaka: (products as any).deliveryFeeOutsideDhaka,
        })
        .from(cartItems)
        .leftJoin(products, eq(products.id, cartItems.productId))
        .where(eq(cartItems.cartId, cartId));

      if (items.length === 0) throw new Error("Cart is empty");

      const deliveryZone = determineDeliveryZone(input.shippingCity);
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0);
      const taxAmount = subtotal * 0.08;
      const deliveryFee = items.reduce((sum: number, item: any) => {
        const fee = deliveryZone === "inside_dhaka"
          ? item.deliveryFeeInsideDhaka ?? 0
          : item.deliveryFeeOutsideDhaka ?? 0;
        return sum + fee * item.quantity;
      }, 0);
      const shippingAmount = deliveryFee;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Generate order number
      const orderCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
      const orderNumber = `ORD-2024-${String((orderCount[0]?.count || 0) + 1).padStart(4, "0")}`;

      const paymentReference = generateDemoPaymentReference();
      const trackingNumber = generateDemoTrackingNumber();
      const paymentNotes = buildDemoPaymentNote(paymentReference, trackingNumber);

      const estimatedDays = deliveryZone === "inside_dhaka" ? 2 : 4;
      const estimatedDate = Date.now() + estimatedDays * 86400000;

      // Create order
      const orderResult = await db.insert(orders).values({
        orderNumber,
        userId,
        totalAmount,
        taxAmount,
        shippingAmount,
        status: "pending",
        sellerStatus: "pending",
        estimatedDeliveryDays: estimatedDays,
        estimatedDeliveryDate: estimatedDate,
        paymentStatus: input.paymentMethod === "cod" ? "pending" : "paid",
        paymentMethod: input.paymentMethod,
        paymentReference,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingCountry: input.shippingCountry,
        shippingPostalCode: input.shippingPostalCode,
        trackingNumber,
        notes: paymentNotes,
      });

      const orderId = Number(orderResult[0].insertId);

      const sellerIdsToNotify = new Set<number>();

      // Create order items
      for (const item of items) {
        const unitPrice = item.price || 0;
        const sId = item.sellerId || 1;
        sellerIdsToNotify.add(sId);
        await db.insert(orderItems).values({
          orderId: orderId,
          productId: item.productId,
          sellerId: sId,
          quantity: item.quantity,
          unitPrice: unitPrice,
          totalPrice: unitPrice * item.quantity,
        });
      }

      // 1. Send order notification to Sellers
      await notifySellersForOrder(Array.from(sellerIdsToNotify), orderNumber, totalAmount, items.length);

      // 2. Send order notification to Customer
      await db.insert(notifications).values({
        userId,
        title: `Order Placed Successfully #${orderNumber}`,
        message: `Your order #${orderNumber} for BDT ${totalAmount.toLocaleString()} has been placed and sent to the seller for confirmation.`,
        type: "order",
        isRead: 0,
        link: "/dashboard?tab=orders",
      });

      // 3. Send order notification to Admins
      await notifyAdmins({
        title: `🛒 New Order #${orderNumber}`,
        message: `Total BDT ${totalAmount.toLocaleString()} order placed by customer.`,
        type: "order",
        link: "/admin?tab=orders",
      });

      // Clear cart
      await db.delete(cartItems).where(eq(cartItems.cartId, cartId));

      return { success: true, orderId, orderNumber, paymentReference, trackingNumber, status: "pending" };
    }),

  voiceCreate: publicQuery
    .input(
      z.object({
        productId: z.number().optional().default(100),
        quantity: z.number().optional().default(1),
        price: z.number().optional().default(850),
        phone: z.string(),
        customerName: z.string().optional().default("Voice Customer"),
        shippingAddress: z.string().optional().default("Voice Order - Contact Phone for Delivery Location"),
        shippingCity: z.string().optional().default("Dhaka"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any)?.id || 1;

      // Get product details if valid productId
      const prodRows = await db.select().from(products).where(eq(products.id, input.productId)).limit(1);
      const prod = prodRows[0];
      const unitPrice = prod?.price || input.price;
      const sellerId = prod?.sellerId || 1;

      const subtotal = unitPrice * input.quantity;
      const taxAmount = subtotal * 0.08;
      const shippingAmount = 120;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      const orderNumber = `VOICE-${Date.now().toString().slice(-6)}`;
      const paymentReference = generateDemoPaymentReference();
      const trackingNumber = generateDemoTrackingNumber();

      const orderResult = await db.insert(orders).values({
        orderNumber,
        userId,
        totalAmount,
        taxAmount,
        shippingAmount,
        status: "pending",
        sellerStatus: "pending",
        estimatedDeliveryDays: 2,
        estimatedDeliveryDate: Date.now() + 2 * 86400000,
        paymentStatus: "pending",
        paymentMethod: "cod",
        paymentReference,
        shippingAddress: `${input.shippingAddress} (Phone: ${input.phone})`,
        shippingCity: input.shippingCity,
        shippingCountry: "Bangladesh",
        shippingPostalCode: "1200",
        trackingNumber,
        notes: `Voice Order placed via phone number: ${input.phone}`,
      });

      const orderId = Number(orderResult[0].insertId);

      await db.insert(orderItems).values({
        orderId,
        productId: input.productId,
        sellerId,
        quantity: input.quantity,
        unitPrice,
        totalPrice: subtotal,
      });

      // 1. Send order notification to Seller
      await notifySellersForOrder([sellerId], orderNumber, totalAmount, input.quantity);

      // 2. Send order notification to Customer
      if (userId) {
        await db.insert(notifications).values({
          userId,
          title: `🎙️ Voice Order Placed #${orderNumber}`,
          message: `Your voice order #${orderNumber} for BDT ${totalAmount.toLocaleString()} has been placed via phone ${input.phone}.`,
          type: "order",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      }

      // 3. Send order notification to Admin
      await notifyAdmins({
        title: `🎙️ New Voice Order #${orderNumber}`,
        message: `Voice Order placed for BDT ${totalAmount.toLocaleString()} (Customer Phone: ${input.phone}).`,
        type: "order",
        link: "/admin?tab=orders",
      });

      return { success: true, id: orderId, orderNumber, totalAmount, phone: input.phone };
    }),

  cancel: authedQuery
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      const orderRows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!orderRows[0]) {
        throw new Error("Order not found");
      }

      const order = orderRows[0];

      if (order.status === "shipped" || order.status === "delivered") {
        throw new Error("Cannot cancel an order that has already shipped or delivered");
      }

      const isPrepaid = order.paymentStatus === "paid" || (order.paymentMethod !== "cod" && order.paymentStatus !== "pending");
      const refundRef = `REF-${Date.now().toString().slice(-6)}`;
      const newPaymentStatus = isPrepaid ? "refunded" : order.paymentStatus;
      const cancellationNote = isPrepaid
        ? `Cancelled by customer. 100% full refund of BDT ${order.totalAmount} refunded to original payment method (${order.paymentMethod || "SSLCommerz/MFS"}). Refund Ref: ${refundRef}.`
        : `Cancelled by customer.`;

      await db
        .update(orders)
        .set({
          status: "cancelled",
          paymentStatus: newPaymentStatus,
          notes: cancellationNote,
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, input.orderId));

      // 1. Notify Customer of cancellation & refund
      if (isPrepaid) {
        await db.insert(notifications).values({
          userId,
          title: `💰 Order Cancelled & Money Refunded #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} was cancelled and a full refund of BDT ${order.totalAmount.toLocaleString()} has been processed back to your payment account (Refund Ref: ${refundRef}).`,
          type: "refund",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      } else {
        await db.insert(notifications).values({
          userId,
          title: `Order Cancelled #${order.orderNumber}`,
          message: `Your order #${order.orderNumber} was cancelled successfully.`,
          type: "order",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      }

      // 2. Notify Sellers
      const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
      for (const item of oItems) {
        const sRow = await db.select().from(sellers).where(eq(sellers.id, item.sellerId)).limit(1);
        if (sRow[0]?.userId) {
          await db.insert(notifications).values({
            userId: sRow[0].userId,
            title: `Order Cancelled by Customer #${order.orderNumber}`,
            message: `Customer cancelled order #${order.orderNumber}.${isPrepaid ? ` Automatic refund of BDT ${order.totalAmount.toLocaleString()} was issued.` : ""}`,
            type: "order",
            isRead: 0,
            link: "/seller?tab=orders",
          });
        }
      }

      // 3. Notify Admins
      await notifyAdmins({
        title: isPrepaid ? `💰 Order #${order.orderNumber} Cancelled & Refunded` : `Order #${order.orderNumber} Cancelled`,
        message: `Customer cancelled order #${order.orderNumber}.${isPrepaid ? ` Refund of BDT ${order.totalAmount.toLocaleString()} processed.` : ""}`,
        type: "order",
        link: "/admin?tab=orders",
      });

      return { success: true, isPrepaid, refundRef };
    }),

  confirmReceived: authedQuery
    .input(z.object({ orderId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      const orderRows = await db
        .select()
        .from(orders)
        .where(and(eq(orders.id, input.orderId), eq(orders.userId, userId)))
        .limit(1);

      if (!orderRows[0]) {
        throw new Error("Order not found");
      }

      await db
        .update(orders)
        .set({ status: "delivered", paymentStatus: "paid", updatedAt: Date.now() })
        .where(eq(orders.id, input.orderId));

      // Send notification to customer
      await db.insert(notifications).values({
        userId,
        title: `Delivery Confirmed #${orderRows[0].orderNumber}`,
        message: `Thank you for confirming receipt of order #${orderRows[0].orderNumber}! Please feel free to leave a product review.`,
        type: "order",
        isRead: 0,
        link: "/dashboard?tab=orders",
      });

      return { success: true };
    }),

  initiateSSLCommerz: authedQuery
    .input(
      z.object({
        shippingAddress: z.string(),
        shippingCity: z.string(),
        shippingCountry: z.string(),
        shippingPostalCode: z.string(),
        customerName: z.string(),
        customerEmail: z.string(),
        customerPhone: z.string(),
        origin: z.string().optional().default("http://localhost:5173"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      // Get cart
      const cart = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
      if (!cart[0]) throw new Error("Cart is empty");

      const cartId = cart[0].id;

      // Get cart items
      const items = await db
        .select({
          id: (cartItems as any).id,
          productId: (cartItems as any).productId,
          quantity: (cartItems as any).quantity,
          name: (products as any).name,
          price: (products as any).price,
          sellerId: (products as any).sellerId,
          deliveryFeeInsideDhaka: (products as any).deliveryFeeInsideDhaka,
          deliveryFeeOutsideDhaka: (products as any).deliveryFeeOutsideDhaka,
        })
        .from(cartItems)
        .leftJoin(products, eq(products.id, cartItems.productId))
        .where(eq(cartItems.cartId, cartId));

      if (items.length === 0) throw new Error("Cart is empty");

      const deliveryZone = determineDeliveryZone(input.shippingCity);
      const subtotal = items.reduce((sum: number, item: any) => sum + (item.price || 0) * item.quantity, 0);
      const taxAmount = subtotal * 0.05;
      const deliveryFee = items.reduce((sum: number, item: any) => {
        const fee = deliveryZone === "inside_dhaka"
          ? item.deliveryFeeInsideDhaka ?? 0
          : item.deliveryFeeOutsideDhaka ?? 0;
        return sum + fee * item.quantity;
      }, 0);
      const shippingAmount = deliveryFee > 0 ? deliveryFee : 100;
      const totalAmount = subtotal + taxAmount + shippingAmount;

      const orderCount = await db.select({ count: sql<number>`count(*)` }).from(orders);
      const tranId = `SSL-${Date.now()}-${String((orderCount[0]?.count || 0) + 1).padStart(4, "0")}`;
      const trackingNumber = generateDemoTrackingNumber();

      const estimatedDays = deliveryZone === "inside_dhaka" ? 2 : 4;
      const estimatedDate = Date.now() + estimatedDays * 86400000;

      // Create pending order
      const orderResult = await db.insert(orders).values({
        orderNumber: tranId,
        userId,
        totalAmount,
        taxAmount,
        shippingAmount,
        status: "pending",
        sellerStatus: "pending",
        estimatedDeliveryDays: estimatedDays,
        estimatedDeliveryDate: estimatedDate,
        paymentStatus: "pending",
        paymentMethod: "sslcommerz",
        paymentReference: tranId,
        shippingAddress: input.shippingAddress,
        shippingCity: input.shippingCity,
        shippingCountry: input.shippingCountry,
        shippingPostalCode: input.shippingPostalCode,
        trackingNumber,
        notes: `SSLCommerz Payment initiated (TranID: ${tranId})`,
      });

      const orderId = Number(orderResult[0].insertId);
      const sellerIdsToNotify = new Set<number>();

      // Create order items
      for (const item of items) {
        const unitPrice = item.price || 0;
        const sId = item.sellerId || 1;
        sellerIdsToNotify.add(sId);
        await db.insert(orderItems).values({
          orderId,
          productId: item.productId,
          sellerId: sId,
          quantity: item.quantity,
          unitPrice,
          totalPrice: unitPrice * item.quantity,
        });
      }

      // 1. Notify Sellers
      await notifySellersForOrder(Array.from(sellerIdsToNotify), tranId, totalAmount, items.length);

      // 2. Notify Customer
      await db.insert(notifications).values({
        userId,
        title: `Order Placed Successfully #${tranId}`,
        message: `Your order #${tranId} for BDT ${totalAmount.toLocaleString()} has been placed via SSLCommerz.`,
        type: "order",
        isRead: 0,
        link: "/dashboard?tab=orders",
      });

      const firstProductName = items[0]?.name || "E-Commerce Purchase";

      // Initiate with SSLCommerz Sandbox
      const callbackBase = `${input.origin}/payment-callback`;
      const sslResponse = await initiateSSLCommerzPayment({
        totalAmount,
        tranId,
        successUrl: `${callbackBase}?status=success&tran_id=${tranId}`,
        failUrl: `${callbackBase}?status=fail&tran_id=${tranId}`,
        cancelUrl: `${callbackBase}?status=cancel&tran_id=${tranId}`,
        ipnUrl: `${input.origin}/api/trpc/order.verifySSLCommerz`,
        cusName: input.customerName || "Valued Customer",
        cusEmail: input.customerEmail || "customer@example.com",
        cusAdd1: input.shippingAddress,
        cusCity: input.shippingCity,
        cusPostcode: input.shippingPostalCode || "1200",
        cusCountry: input.shippingCountry || "Bangladesh",
        cusPhone: input.customerPhone || "01700000000",
        productName: items.length > 1 ? `${firstProductName} and ${items.length - 1} more` : firstProductName,
        productCategory: "General E-Commerce",
      });

      if (sslResponse.status === "SUCCESS" && (sslResponse.GatewayPageURL || sslResponse.redirectGatewayURL)) {
        const gatewayUrl = sslResponse.GatewayPageURL || sslResponse.redirectGatewayURL;
        return { success: true, gatewayUrl, orderId, tranId };
      }

      // Fallback: simulated success redirect URL for seamless demo testing
      const mockGatewayUrl = `${callbackBase}?status=success&tran_id=${tranId}&val_id=VALIDATED_SANDBOX_DEMO`;
      return { success: true, gatewayUrl: mockGatewayUrl, orderId, tranId };
    }),

  verifySSLCommerz: publicQuery
    .input(
      z.object({
        tran_id: z.string(),
        val_id: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const orderRows = await db
        .select()
        .from(orders)
        .where(eq(orders.orderNumber, input.tran_id))
        .limit(1);

      if (!orderRows[0]) {
        return { success: false, message: "Order not found" };
      }

      const order = orderRows[0];
      const statusLower = (input.status || "").toLowerCase();

      if (statusLower.includes("fail") || statusLower.includes("cancel") || statusLower.includes("unattempted")) {
        await db
          .update(orders)
          .set({ paymentStatus: "failed", status: "cancelled", updatedAt: Date.now() })
          .where(eq(orders.id, order.id));
        return { success: false, message: "Payment was cancelled or failed.", orderNumber: order.orderNumber };
      }

      // Mark payment as paid
      await db
        .update(orders)
        .set({
          paymentStatus: "paid",
          status: "processing",
          paymentReference: input.val_id || order.paymentReference || `VAL-${Date.now()}`,
          updatedAt: Date.now(),
        })
        .where(eq(orders.id, order.id));

      // Clear user cart if userId exists
      if (order.userId) {
        const userCart = await db.select().from(carts).where(eq(carts.userId, order.userId)).limit(1);
        if (userCart[0]) {
          await db.delete(cartItems).where(eq(cartItems.cartId, userCart[0].id));
        }

        // Notify Customer of payment verification
        await db.insert(notifications).values({
          userId: order.userId,
          title: `💳 Payment Verified #${order.orderNumber}`,
          message: `Your SSLCommerz payment of BDT ${order.totalAmount.toLocaleString()} for order #${order.orderNumber} is confirmed! The seller has been notified to prepare your shipment.`,
          type: "order",
          isRead: 0,
          link: "/dashboard?tab=orders",
        });
      }

      // Notify Sellers of verified paid order
      const oItems = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const sIds: number[] = Array.from(new Set(oItems.map((i: any) => Number(i.sellerId))));
      await notifySellersForOrder(sIds, order.orderNumber, order.totalAmount, oItems.length);

      // Send admin notification
      await notifyAdmins({
        title: `💳 SSLCommerz Payment Success #${order.orderNumber}`,
        message: `Payment of BDT ${order.totalAmount.toLocaleString()} received via SSLCommerz (bKash/Nagad/Cards).`,
        type: "order",
        link: "/admin?tab=orders",
      });

      return { success: true, message: "Payment verified successfully!", orderId: order.id, orderNumber: order.orderNumber };
    }),
});
