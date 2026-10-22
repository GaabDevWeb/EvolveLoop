/**
 * Token counting aligned with V22-BENCH harness (`bench_harness.load_tokenizer`).
 * Orchestrator does not bundle tiktoken; uses harness fallback proxy (documented).
 */

export const BENCH_TOKENIZER_PROXY = "PROXY:whitespace_split";
export const BENCH_TOKENIZER_VENDOR_NOTE =
  "tiktoken:cl100k_base used when Python harness has tiktoken; orchestrator measure uses proxy only";

/** Same as harness fallback: len([x for x in text.split() if x]) */
export function countBenchTokens(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export function benchTokenizerLabel(): string {
  return BENCH_TOKENIZER_PROXY;
}
