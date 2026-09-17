import { authRouter } from "./auth-router";
import { createRouter, publicQuery } from "./middleware";
import { productRouter } from "./productRouter";
import { categoryRouter } from "./categoryRouter";
import { cartRouter } from "./cartRouter";
import { orderRouter } from "./orderRouter";
import { sellerRouter } from "./sellerRouter";
import { reviewRouter } from "./reviewRouter";
import { wishlistRouter } from "./wishlistRouter";
import { notificationRouter } from "./notificationRouter";
import { adminRouter } from "./adminRouter";
import { brainRouter } from "./brainRouter";
import { trpcAiRouter } from "./trpcAiRouter";
import { stylistProfileRouter } from "./stylistProfileRouter";
import { supportRouter } from "./supportRouter";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  product: productRouter,
  category: categoryRouter,
  cart: cartRouter,
  order: orderRouter,
  seller: sellerRouter,
  review: reviewRouter,
  wishlist: wishlistRouter,
  notification: notificationRouter,
  stylistProfile: stylistProfileRouter,
  admin: adminRouter,
  brain: brainRouter,
  ai: trpcAiRouter,
  support: supportRouter,
});

export type AppRouter = typeof appRouter;
