import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    /** Live LLM calls are opt-in via npm run eval:llm — never in default npm test */
    exclude: ["**/node_modules/**", "**/dist/**", "tests/evals/live-llm/**"],
    globals: false,
    testTimeout: 30000,
  },
});
