import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.bench.test.ts"],
    globals: false,
    testTimeout: 600_000,
    setupFiles: ["tests/setup-checkpoint-key.ts"],
  },
});
