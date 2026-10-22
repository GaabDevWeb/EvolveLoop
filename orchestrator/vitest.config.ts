import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.bench.test.ts"],
    globals: false,
    testTimeout: 30000,
    setupFiles: ["tests/setup-checkpoint-key.ts"],
  },
});
