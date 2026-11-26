import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    environmentMatchGlobs: [["apps/extension/**/*.test.ts", "jsdom"]],
    coverage: { reporter: ["text", "html"] }
  }
});
