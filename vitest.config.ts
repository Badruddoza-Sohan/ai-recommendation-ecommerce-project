import { defineConfig } from "vitest/config";
import path from "path";

const rootDir = process.cwd();

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
      "@contracts": path.resolve(rootDir, "contracts"),
      "@assets": path.resolve(rootDir, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "api/**/*.test.ts",
      "api/**/*.spec.ts",
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "src/**/*.test.ts",
      "src/**/*.spec.ts",
    ],
    // Vitest will discover and run tests via its default runner.
  },
});
