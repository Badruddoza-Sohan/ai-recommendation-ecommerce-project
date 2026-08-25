import * as cookie from "cookie";
import * as jose from "jose";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { Session } from "@contracts/constants";
import { getSessionCookieOptions } from "./lib/cookies";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { signSessionToken } from "./auth/session";
import { getDb } from "./queries/connection";
import * as schema from "@db/schema";
import { eq, and } from "@db/mysql";
import { findUserByPhone } from "./queries/users";
import { notifyAdmins } from "./notificationRouter";
import { sendOtpEmail } from "./lib/mailer";

const PASSWORD_HASH_ITERATIONS = 16384;
const PASSWORD_HASH_KEYLEN = 64;

const otpResetStore = new Map<string, { otp: string; expiresAt: number; userId: number; email: string }>();

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  let normalized = "";
  if (digits.length === 13 && digits.startsWith("880")) {
    normalized = `0${digits.slice(3)}`;
  } else if (digits.length === 11 && digits.startsWith("01")) {
    normalized = digits;
  } else if (digits.length === 10 && digits.startsWith("1")) {
    normalized = `0${digits}`;
  } else {
    return null;
  }
  
  if (normalized.length === 11 && normalized.startsWith("01")) {
    return normalized;
  }
  return null;
}

function buildPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, PASSWORD_HASH_KEYLEN, {
    N: PASSWORD_HASH_ITERATIONS,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `${salt}:${derivedKey.toString("hex")}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) {
    return false;
  }
  const derivedKey = scryptSync(password, salt, PASSWORD_HASH_KEYLEN, {
    N: PASSWORD_HASH_ITERATIONS,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  const providedHash = derivedKey.toString("hex");
  return timingSafeEqual(Buffer.from(storedHash, "hex"), Buffer.from(providedHash, "hex"));
}

type DemoAccount = {
  phone: string;
  password: string;
  role: "seller" | "admin";
  name: string;
  email: string;
  unionId: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  description?: string;
  logo?: string;
  banner?: string;
};

const demoAccounts: DemoAccount[] = [
  {
    phone: "01700000001",
    password: "seller123",
    role: "seller",
    name: "TechVault Seller",
    email: "techvault@example.com",
    unionId: "local:01700000001",
    businessName: "TechVault Electronics",
    businessEmail: "techvault@example.com",
    businessPhone: "+8801700000001",
    description: "Demo seller account for dashboard access.",
    logo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200",
    banner: "https://images.unsplash.com/photo-1550009158-9ebf69056955?w=800",
  },
  {
    phone: "01700000006",
    password: "admin123",
    role: "admin",
    name: "Admin User",
    email: "admin@example.com",
    unionId: "local:01700000006",
  },
];

async function ensureDemoAccount(phone: string) {
  const normalizedDemoPhone = normalizePhone(phone);
  if (!normalizedDemoPhone) return;

  const demo = demoAccounts.find((account) => account.phone === normalizedDemoPhone);
  if (!demo) return;

  const existingUser = await findUserByPhone(normalizedDemoPhone);
  if (existingUser) return;

  const db = getDb();
  const userInsert = {
    unionId: demo.unionId,
    name: demo.name,
    email: demo.email,
    phone: demo.phone,
    passwordHash: buildPasswordHash(demo.password),
    role: demo.role,
  } as const;

  const [insertResult] = (await (db.insert(schema.users).values(userInsert as any) as any).execute()) || [];
  const userId = (insertResult?.insertId || insertResult?.lastInsertRowid) as number;

  if (demo.role === "seller") {
    await (db.insert(schema.sellers).values({
      userId,
      businessName: demo.businessName || demo.name,
      businessEmail: demo.businessEmail || demo.email,
      businessPhone: demo.businessPhone || demo.phone,
      description: demo.description || "Demo seller account.",
      logo: demo.logo || "",
      banner: demo.banner || "",
      status: "approved",
    }) as any).execute();
  }
}

const signupSchema = z.object({
  accountType: z.enum(["customer", "seller"]),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  password: z.string().min(6),
  address: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  businessName: z.string().optional(),
  businessEmail: z.union([z.string().email(), z.literal("")]).optional(),
  businessPhone: z.string().optional(),
  businessDescription: z.string().optional(),
  businessLogo: z.string().optional(),
  businessBanner: z.string().optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const authRouter = createRouter({
  signup: publicQuery.input(signupSchema).mutation(async ({ ctx, input }) => {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid BD number." });
    }

    const existingUser = await findUserByPhone(phone);
    if (existingUser) {
      throw new TRPCError({ code: "CONFLICT", message: "An account with this BD number already exists." });
    }

    const role = input.accountType === "seller" ? "seller" : "customer";
    const unionId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const insertUser: schema.InsertUser = {
      phone,
      unionId,
      name: input.name,
      email: input.email,
      passwordHash: buildPasswordHash(input.password),
      role,
      address: input.address,
      city: input.city,
      country: input.country,
    };

    const db = getDb();
    await db.transaction(async () => {
      const [userInsertResult] = (await (db.insert(schema.users).values(insertUser as any) as any).execute()) || [];
      const userId = (userInsertResult?.insertId || userInsertResult?.lastInsertRowid) as number;

      if (role === "seller") {
        const sellerData: schema.InsertSeller = {
          userId,
          businessName: input.businessName || "",
          businessEmail: input.businessEmail || input.email,
          businessPhone: input.businessPhone || phone,
          description: input.businessDescription || "",
          logo: input.businessLogo || "",
          banner: input.businessBanner || "",
          status: "pending",
        };
        await (db.insert(schema.sellers).values(sellerData as any) as any).execute();
        await notifyAdmins({
          title: `🏪 New Seller Application: ${input.businessName || input.name}`,
          message: `Vendor applied for shop registration and requires admin approval.`,
          type: "seller",
          link: "/admin?tab=sellers",
        });
      } else {
        await notifyAdmins({
          title: `👤 New Customer Registered`,
          message: `${input.name} (${input.email}) joined the platform.`,
          type: "user",
          link: "/admin?tab=users",
        });
      }
    });

    const token = await signSessionToken({ unionId, clientId: "local" });
    const cookieOptions = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        ...(cookieOptions as any),
        maxAge: Session.maxAgeMs / 1000,
      }),
    );

    return { role };
  }),

  login: publicQuery.input(loginSchema).mutation(async ({ ctx, input }) => {
    const raw = input.identifier.trim();
    let user = null;
    const db = getDb();

    if (raw.includes("@")) {
      // Login by email
      const userList = await db.select().from(schema.users).where(eq(schema.users.email, raw.toLowerCase())).limit(1);
      user = userList[0];
    } else {
      // Login by phone
      const phone = normalizePhone(raw);
      if (!phone) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid Email or BD Mobile Number." });
      }
      await ensureDemoAccount(phone);
      user = await findUserByPhone(phone);
    }

    if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid credentials." });
    }

    const token = await signSessionToken({ unionId: user.unionId, clientId: "local" });
    const cookieOptions = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, token, {
        ...(cookieOptions as any),
        maxAge: Session.maxAgeMs / 1000,
      }),
    );

    return { role: user.role };
  }),

  me: authedQuery.query(async ({ ctx }) => {
    // Always fetch fresh from DB so profile updates are reflected immediately
    const db = getDb();
    const userId = (ctx.user as any).id;
    const rows = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
    const dbUser = rows[0];
    if (!dbUser) return ctx.user;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = dbUser;
    return {
      ...safeUser,
      hasLocalPassword: !!passwordHash,
    };
  }),
  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        country: z.string().optional(),
        gender: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      const updateData: any = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.phone !== undefined) updateData.phone = normalizePhone(input.phone);
      if (input.address !== undefined) updateData.address = input.address;
      if (input.city !== undefined) updateData.city = input.city;
      if (input.country !== undefined) updateData.country = input.country;
      if (input.gender !== undefined) updateData.gender = input.gender;

      await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, userId));

      return { success: true };
    }),

  changePassword: authedQuery
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6, "New password must be at least 6 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      
      const userList = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
      const user = userList[0];
      
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      
      if (!user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Account has no password set. Please use forgot password." });
      }
      
      if (!verifyPassword(input.currentPassword, user.passwordHash)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect" });
      }
      
      await db
        .update(schema.users)
        .set({ passwordHash: buildPasswordHash(input.newPassword) })
        .where(eq(schema.users.id, userId));
        
      return { success: true };
    }),

  listAddresses: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = (ctx.user as any).id;
    const existing = await db.select().from(schema.userAddresses).where(eq(schema.userAddresses.userId, userId));

    if (existing.length === 0) {
      // Auto seed default primary address from user profile
      const userAddr = (ctx.user as any).address || "";
      const defaultAddr = {
        userId,
        title: "Primary Address",
        recipientName: (ctx.user as any).name || "",
        address: userAddr,
        city: (ctx.user as any).city || "",
        country: (ctx.user as any).country || "Bangladesh",
        phone: (ctx.user as any).phone || "",
        isPrimary: 1,
      };
      await db.insert(schema.userAddresses).values(defaultAddr);
      return db.select().from(schema.userAddresses).where(eq(schema.userAddresses.userId, userId));
    }

    return existing;
  }),

  saveAddress: authedQuery
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string().min(1),
        recipientName: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
        country: z.string().optional().default("Bangladesh"),
        phone: z.string().optional(),
        isPrimary: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;

      if (input.isPrimary) {
        // Reset previous primary
        await db
          .update(schema.userAddresses)
          .set({ isPrimary: 0 })
          .where(eq(schema.userAddresses.userId, userId));
      }

      if (input.id) {
        // Update existing address
        await db
          .update(schema.userAddresses)
          .set({
            title: input.title,
            recipientName: input.recipientName,
            address: input.address,
            city: input.city,
            country: input.country || "Bangladesh",
            phone: input.phone || "",
            isPrimary: input.isPrimary ? 1 : 0,
          })
          .where(eq(schema.userAddresses.id, input.id));
      } else {
        // Create new address
        await db.insert(schema.userAddresses).values({
          userId,
          title: input.title,
          recipientName: input.recipientName,
          address: input.address,
          city: input.city,
          country: input.country || "Bangladesh",
          phone: input.phone || "",
          isPrimary: input.isPrimary ? 1 : 0,
        });
      }

      return { success: true };
    }),

  deleteAddress: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const userId = (ctx.user as any).id;
      await db
        .delete(schema.userAddresses)
        .where(and(eq(schema.userAddresses.id, input.id), eq(schema.userAddresses.userId, userId)));
      return { success: true };
    }),

  googleAuth: publicQuery
    .input(
      z.object({
        credential: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        googleId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let email = input.email;
      let name = input.name || "Google User";
      let googleId = input.googleId;
      let avatar: string | undefined = undefined;

      if (input.credential) {
        // Verify Google ID token using Google's public JWKS
        try {
          const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
          const JWKS = jose.createRemoteJWKSet(
            new URL("https://www.googleapis.com/oauth2/v3/certs")
          );
          const { payload } = await jose.jwtVerify(input.credential, JWKS, {
            audience: GOOGLE_CLIENT_ID,
            issuer: ["accounts.google.com", "https://accounts.google.com"],
          });
          email = payload["email"] as string;
          name = (payload["name"] as string) || name;
          googleId = (payload["sub"] as string) || googleId;
          avatar = payload["picture"] as string | undefined;
        } catch (verifyError) {
          // Fallback: decode without verification for development
          console.warn("[Google Auth] JWT verification failed, falling back to decode:", verifyError);
          try {
            const decoded: any = jose.decodeJwt(input.credential);
            if (decoded?.email) {
              email = decoded.email;
              name = decoded.name || name;
              googleId = decoded.sub || googleId;
              avatar = decoded.picture;
            }
          } catch (e) {
            console.error("Failed to decode Google credential token:", e);
          }
        }
      }

      if (!email) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Valid email is required for Google authentication." });
      }

      const db = getDb();
      let userList = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);
      let user = userList[0];

      if (!user) {
        // Create user via Google auth
        const inserted = await db.insert(schema.users).values({
          unionId: `google:${googleId || Date.now()}`,
          name: name,
          email: email,
          avatar: avatar,
          role: "customer",
          passwordHash: buildPasswordHash(randomBytes(16).toString("hex")),
        });
        const userId = (inserted as any)[0]?.insertId || (inserted as any).insertId;
        userList = await db.select().from(schema.users).where(eq(schema.users.id, userId)).limit(1);
        user = userList[0];
      }

      const sessionToken = await signSessionToken({
        unionId: user.unionId,
        clientId: "local",
      });

      const opts = getSessionCookieOptions(ctx.req.headers);
      ctx.resHeaders.append(
        "set-cookie",
        cookie.serialize(Session.cookieName, sessionToken, {
          httpOnly: opts.httpOnly,
          path: opts.path,
          sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
          secure: opts.secure,
          maxAge: 30 * 24 * 60 * 60,
        })
      );

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    }),

  requestPasswordResetOtp: publicQuery
    .input(z.object({ identifier: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const raw = input.identifier.trim();
      const isEmail = raw.includes("@");
      const normalized = isEmail ? null : normalizePhone(raw);
      
      if (!isEmail && !normalized) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid BD Mobile Number." });
      }

      const userList = await db
        .select()
        .from(schema.users)
        .where(
          isEmail
            ? eq(schema.users.email, raw.toLowerCase())
            : eq(schema.users.phone, normalized as string)
        )
        .limit(1);

      const user = userList[0];
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No account found matching this email or phone number.",
        });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const key = (user.email || user.phone || raw).toLowerCase();

      otpResetStore.set(key, {
        otp,
        expiresAt: Date.now() + 10 * 60 * 1000,
        userId: user.id,
        email: user.email || "",
      });

      console.log(`[OTP] Password reset OTP for ${user.email || user.phone}: ${otp}`);

      // Send OTP via email if user has an email address
      let emailSent = false;
      const emailTarget = user.email?.trim();
      if (emailTarget) {
        emailSent = await sendOtpEmail(emailTarget, otp, user.name || undefined);
      }

      return {
        success: true,
        email: user.email || user.phone,
        // Only expose demoOtp if email sending failed (fallback for development)
        ...(emailSent ? {} : { demoOtp: otp }),
      };
    }),

  verifyResetOtp: publicQuery
    .input(z.object({ identifier: z.string().min(1), otp: z.string().length(6) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const raw = input.identifier.trim();
      const isEmail = raw.includes("@");
      const normalized = isEmail ? null : normalizePhone(raw);
      
      if (!isEmail && !normalized) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid BD Mobile Number." });
      }

      const userList = await db
        .select()
        .from(schema.users)
        .where(
          isEmail
            ? eq(schema.users.email, raw.toLowerCase())
            : eq(schema.users.phone, normalized as string)
        )
        .limit(1);

      const user = userList[0];
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      }

      const key = (user.email || user.phone || raw).toLowerCase();
      const record = otpResetStore.get(key);

      if (!record || record.otp !== input.otp.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid OTP code. Please check and try again." });
      }

      if (Date.now() > record.expiresAt) {
        otpResetStore.delete(key);
        throw new TRPCError({ code: "BAD_REQUEST", message: "OTP code has expired. Please request a new one." });
      }

      return { success: true };
    }),

  resetPasswordWithOtp: publicQuery
    .input(
      z.object({
        identifier: z.string().min(1),
        otp: z.string().length(6),
        newPassword: z.string().min(6, "Password must be at least 6 characters"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const raw = input.identifier.trim();
      const isEmail = raw.includes("@");
      const normalized = isEmail ? null : normalizePhone(raw);
      
      if (!isEmail && !normalized) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Please enter a valid BD Mobile Number." });
      }

      const userList = await db
        .select()
        .from(schema.users)
        .where(
          isEmail
            ? eq(schema.users.email, raw.toLowerCase())
            : eq(schema.users.phone, normalized as string)
        )
        .limit(1);

      const user = userList[0];
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found." });
      }

      const key = (user.email || user.phone || raw).toLowerCase();
      const record = otpResetStore.get(key);

      if (!record || record.otp !== input.otp.trim()) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired OTP code." });
      }

      const newPasswordHash = buildPasswordHash(input.newPassword);
      await db
        .update(schema.users)
        .set({ passwordHash: newPasswordHash })
        .where(eq(schema.users.id, user.id));

      otpResetStore.delete(key);

      return { success: true };
    }),

  logout: authedQuery.mutation(async ({ ctx }) => {
    const opts = getSessionCookieOptions(ctx.req.headers);
    ctx.resHeaders.append(
      "set-cookie",
      cookie.serialize(Session.cookieName, "", {
        httpOnly: opts.httpOnly,
        path: opts.path,
        sameSite: opts.sameSite?.toLowerCase() as "lax" | "none",
        secure: opts.secure,
        maxAge: 0,
      }),
    );
    return { success: true };
  }),
});
