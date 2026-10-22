#!/usr/bin/env node
/**
 * JSON stdin → context budget (V22-BENCH / lab). Does not call LLM.
 * Usage: echo '{"ownerId":"x","limits":{"max_paths":15},"slices":[...]}' | node dist/cli/apply-context-budget.js
 */
import { readFileSync } from "node:fs";
import { applyContextBudget, type ContextSlice } from "../context/index.js";

function main() {
  const raw = readFileSync(0, "utf-8");
  const input = JSON.parse(raw) as {
    ownerId: string;
    limits?: { max_paths?: number; max_pages?: number; max_tokens?: number };
    evidence_paths?: string[];
    slices: ContextSlice[];
  };
  const result = applyContextBudget(input.slices, {
    ownerId: input.ownerId,
    limits: input.limits,
    evidence_paths: input.evidence_paths,
  });
  process.stdout.write(JSON.stringify(result, null, 2));
}

main();
