import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(), "server-only": path.resolve("src/tests/server-only.stub.ts") } },
  test: { environment: "jsdom", include: ["src/tests/**/*.test.ts"] },
});
