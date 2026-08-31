import { serve } from "@hono/node-server";
import app from "../api/boot.ts";
import { setupWSServer } from "../api/wsServer.ts";

const port = 8080;
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Test server running on port ${port}`);
  setupWSServer(server as any);
});
