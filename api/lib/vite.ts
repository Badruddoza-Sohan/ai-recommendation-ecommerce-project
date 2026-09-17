import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "fs";
import path from "path";

type App = Hono<{ Bindings: HttpBindings }>;

export function serveStaticFiles(app: App) {
  // __dirname in the bundled boot.js is the "dist/" folder.
  // dist/public/ sits alongside boot.js inside that same dist/ folder.
  // So we resolve relative to __dirname (which the esbuild banner defines).
  const distPath = path.resolve(__dirname, "public");

  app.use("*", serveStatic({ root: "./dist/public" }));

  // Catch-all SPA fallback route for client navigation & page refresh
  app.get("*", (c) => {
    const pathName = c.req.path;
    if (pathName.startsWith("/api")) {
      return c.json({ error: "API route not found" }, 404);
    }
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, "utf-8");
      return c.html(content);
    }
    return c.text(
      "Frontend not built or index.html missing. Run `npm run build` first.",
      503
    );
  });
}
