import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { createOAuthCallbackHandler } from "./auth/auth";
import { Paths } from "@contracts/constants";
import { setupWSServer } from "./wsServer";
import { getIntentClassifier } from "../server/ai/classification/intent-classifier";
import { aiRouter } from "./aiRouter";
import fs from "fs";
import path from "path";

const app = new Hono<{ Bindings: HttpBindings }>();

// ── Security headers ──────────────────────────────────────────
app.use("*", secureHeaders());

// ── CORS ──────────────────────────────────────────────────────
// In production, restrict to your actual domain.
// CORS_ORIGIN env var can be a comma-separated list of allowed origins.
// If unset, falls back to permissive for local testing convenience.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim())
  : ["*"];

app.use(
  "*",
  cors({
    origin: allowedOrigins.length === 1 && allowedOrigins[0] === "*"
      ? "*"
      : (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "Cookie"],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Body size limit ───────────────────────────────────────────
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

app.route("/api/ai", aiRouter);

// ── Health endpoint (used by Railway / Render / uptime monitors) ──
app.get("/health", async (c) => {
  try {
    // Quick DB connectivity check
    const { getDb } = await import("../db/mysql");
    const db = getDb();
    await (db as any).raw().query("SELECT 1");
    return c.json({ status: "ok", db: "connected", ts: new Date().toISOString() }, 200);
  } catch (_err) {
    return c.json({ status: "degraded", db: "unreachable", ts: new Date().toISOString() }, 503);
  }
});

// ── OAuth callback ────────────────────────────────────────────
app.get(Paths.oauthCallback, createOAuthCallbackHandler());

// ── SSLCommerz POST payment callback handler ───────────────────
app.post("/payment-callback", async (c) => {
  try {
    const body = await c.req.parseBody();
    const rawStatus = String(body["status"] || body["status_code"] || "success").toLowerCase();
    let status = "success";
    if (rawStatus.includes("cancel") || rawStatus.includes("unattempted")) {
      status = "cancel";
    } else if (rawStatus.includes("fail")) {
      status = "fail";
    }

    const tranId = String(body["tran_id"] || c.req.query("tran_id") || "");
    const valId = String(body["val_id"] || c.req.query("val_id") || "");

    const redirectUrl = `/payment-callback?status=${encodeURIComponent(status)}&tran_id=${encodeURIComponent(tranId)}${valId ? `&val_id=${encodeURIComponent(valId)}` : ""}`;
    return c.redirect(redirectUrl, 303);
  } catch (err) {
    console.error("[SSLCommerz Callback Error]:", err);
    return c.redirect("/payment-callback?status=fail", 303);
  }
});

// ── File Upload ───────────────────────────────────────────────
app.post("/api/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["image"];
    
    if (!file || typeof file === "string") {
      return c.json({ error: "No image file provided" }, 400);
    }
    
    // Ensure uploads directory exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const ext = path.extname(file.name) || ".jpg";
    const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    
    const buffer = await file.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));
    
    return c.json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

// Serve uploads in development and production
import { serveStatic } from "@hono/node-server/serve-static";
app.use("/uploads/*", serveStatic({
  root: path.join(process.cwd(), "public")
}));

// ── tRPC API ──────────────────────────────────────────────────
app.all("/api/trpc", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// ── AI streaming ──────────────────────────────────────────────
import { streamText } from "hono/streaming";
import { getConversationManager } from "../server/ai/conversation/conversation-manager";
import { getSessionService } from "../server/ai/conversation/session-service";

app.post("/api/ai/stream-text", async (c) => {
  const body = await c.req.json();
  const { message, sessionId, domain = "fashion", context = {}, userId } = body;

  const manager = getConversationManager();
  let fullResponse = "";

  return streamText(c, async (stream) => {
    try {
      const chatStream = manager.chatStream({
        message,
        sessionId,
        userId,
        domain,
        context,
      });
      for await (const chunk of chatStream) {
        fullResponse += chunk.token;
        await stream.write(chunk.token);
      }

      const sessions = getSessionService();
      await sessions.addMessage(sessionId || "default", "assistant", fullResponse);
    } catch (err) {
      console.error("[Stream] Error:", err);
    }
  });
});

export default app;

// ── AI System init ────────────────────────────────────────────
getIntentClassifier()
  .initialize()
  .then(() => {
    console.log("[Boot] 🧠 Local AI Assistant initialized.");
  })
  .catch((err) => {
    console.error("[Boot] AI Assistant startup error:", err);
  });

// ── Production server ─────────────────────────────────────────
if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  const host = process.env.HOST || "0.0.0.0";
  const server = serve({ fetch: app.fetch, port, hostname: host }, async () => {
    console.log(`[Boot] 🚀 Server running on http://localhost:${port}/ (0.0.0.0:${port})`);

    // Initialize WebSocket streaming server for AI
    setupWSServer(server as any);

    // Graceful shutdown
    process.on("SIGTERM", async () => {
      console.log("[Boot] SIGTERM received — shutting down gracefully...");
      process.exit(0);
    });

    process.on("SIGINT", async () => {
      console.log("[Boot] SIGINT received — shutting down gracefully...");
      process.exit(0);
    });
  });
}
