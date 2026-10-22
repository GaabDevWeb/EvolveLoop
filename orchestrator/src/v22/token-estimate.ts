import { countBenchTokens } from "./bench-tokenizer.js";

/** @deprecated Prefer countBenchTokens (V22-BENCH harness-aligned). */
export function estimateWhitespaceTokens(text: string): number {
  return countBenchTokens(text);
}
