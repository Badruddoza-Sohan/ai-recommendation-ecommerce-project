import { ErrorMessages } from "@contracts/constants";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getDb } from "./queries/connection";
import { sellers } from "@db/schema";
import { eq } from "@db/mysql";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const createRouter = t.router;
export const publicQuery = t.procedure;
export const publicMutation = t.procedure;
export const publicProcedure = t.procedure;

const requireAuth = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user! } });
});

function requireRole(role: string) {
  return t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user as any).role !== role) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: ErrorMessages.insufficientRole,
      });
    }

    return next({ ctx: { ...ctx, user: ctx.user! } });
  });
}

export const authedQuery = t.procedure.use(requireAuth);
export const authedMutation = t.procedure.use(requireAuth);
export const adminQuery = authedQuery.use(requireRole("admin"));
export const adminMutation = authedMutation.use(requireRole("admin"));

const requireApprovedSeller = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: ErrorMessages.unauthenticated,
    });
  }

  if ((ctx.user as any).role !== "seller") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: ErrorMessages.insufficientRole,
    });
  }

  const db = getDb();
  const seller = await db
    .select({ id: sellers.id, status: sellers.status })
    .from(sellers)
    .where(eq(sellers.userId, (ctx.user as any).id))
    .limit(1);

  if (!seller[0]) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Seller profile not found." });
  }

  if (seller[0].status !== "approved") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seller account approval is required before using seller features.",
    });
  }

  return next({ ctx: { ...ctx, seller: seller[0] } });
});

export const approvedSellerQuery = t.procedure.use(requireApprovedSeller);
export const approvedSellerMutation = t.procedure.use(requireApprovedSeller);
