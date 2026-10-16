import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  resolve: { alias: { "@": path.resolve() } },
  test: { environment: "jsdom", include: ["src/tests/**/*.test.ts", "components/admin/**/*.test.ts"] },
});
