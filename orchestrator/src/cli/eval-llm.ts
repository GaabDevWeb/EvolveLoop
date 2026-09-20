#!/usr/bin/env node
/**
 * Opt-in live LLM eval CLI.
 * Usage:
 *   REASONING_MODE=live REASONING_PROVIDER=ollama OLLAMA_MODEL=bonsai-64k:latest npm run eval:llm -- --live
 *
 * Never prints secrets. Does not change default provider (UNDECIDED).
 */

import { resolve } from "node:path";
import {
  createReasoningProvider,
  probeOllamaAvailable,
  readReasoningConfigFromEnv,
} from "../agent/reasoning-config.js";
import { runLiveEvalSuite } from "../agent/evals/live-harness.js";
import { LIVE_EVAL_CASES, LIVE_EVAL_SUITE_VERSION } from "../agent/evals/live-cases.js";

function parseArgs(argv: string[]) {
  const live = argv.includes("--live");
  const outIdx = argv.indexOf("--out");
  const limitIdx = argv.indexOf("--limit");
  const casesIdx = argv.indexOf("--cases");
  const outDir =
    outIdx >= 0 && argv[outIdx + 1]
      ? argv[outIdx + 1]
      : resolve(process.cwd(), "eval-artifacts");
  const limit =
    limitIdx >= 0 && argv[limitIdx + 1] ? Number(argv[limitIdx + 1]) : undefined;
  const caseFilter =
    casesIdx >= 0 && argv[casesIdx + 1]
      ? new Set(argv[casesIdx + 1].split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;
  return { live, outDir, limit, caseFilter };
}

async function main(): Promise<void> {
  const { live, outDir, limit, caseFilter } = parseArgs(process.argv.slice(2));
  const config = readReasoningConfigFromEnv();

  console.log("EvolveLoop Live LLM Eval");
  console.log(`suite_version=${LIVE_EVAL_SUITE_VERSION}`);
  console.log(`default_provider=${config.default_provider}`);
  console.log(`reasoning_mode_env=${config.mode}`);

  if (!live) {
    console.log("Status: NOT_MEASURED");
    console.log("Pass --live and set REASONING_MODE=live REASONING_PROVIDER=... to run.");
    process.exitCode = 2;
    return;
  }

  // Force live for this opt-in command when --live is passed
  const liveConfig = {
    ...config,
    mode: "live" as const,
    provider_id: config.provider_id ?? process.env.REASONING_PROVIDER,
  };

  if (!liveConfig.provider_id) {
    console.log("LIVE_PROVIDER: UNAVAILABLE");
    console.log("LIVE_EVALS: NOT_MEASURED");
    console.log("Set REASONING_PROVIDER (e.g. ollama) and model env vars.");
    process.exitCode = 2;
    return;
  }

  if (liveConfig.provider_id === "ollama") {
    const probe = await probeOllamaAvailable(liveConfig.ollama_base_url ?? "http://127.0.0.1:11434");
    console.log(`endpoint=${liveConfig.ollama_base_url}`);
    console.log(`ollama_available=${probe.available}`);
    if (!probe.available) {
      console.log("LIVE_PROVIDER: UNAVAILABLE");
      console.log("LIVE_EVALS: NOT_MEASURED");
      process.exitCode = 2;
      return;
    }
    if (!liveConfig.ollama_model) {
      // Prefer env; else first non-embed model
      liveConfig.ollama_model =
        probe.models.find((m) => !/embed/i.test(m)) ?? probe.models[0];
    }
    console.log(`model=${liveConfig.ollama_model}`);
    console.log(`models_seen=${probe.models.length}`);
  }

  const created = createReasoningProvider(liveConfig);
  if (!created.ok) {
    console.log(`LIVE_PROVIDER: UNAVAILABLE (${created.code})`);
    console.log(`message=${created.message}`);
    console.log("LIVE_EVALS: NOT_MEASURED");
    process.exitCode = 2;
    return;
  }

  let cases = LIVE_EVAL_CASES;
  if (caseFilter?.size) {
    cases = cases.filter((c) => caseFilter.has(c.case_id));
  }
  if (limit != null && Number.isFinite(limit) && limit > 0) {
    cases = cases.slice(0, limit);
  }

  console.log(`provider=${created.provider.id}`);
  console.log(`cases=${cases.length}`);
  console.log(`run_id=starting`);

  const { eval_id, results, metrics, artifact_path } = await runLiveEvalSuite({
    provider: created.provider,
    model_id: liveConfig.ollama_model,
    outDir,
    cases,
    timeout_ms: liveConfig.timeout_ms ?? 180_000,
  });

  console.log(`eval_id=${eval_id}`);
  console.log(`artifact=${artifact_path ?? "(none)"}`);
  console.log("--- metrics ---");
  console.log(JSON.stringify(metrics, null, 2));
  console.log("--- by case ---");
  for (const r of results) {
    console.log(
      `${r.status}\t${r.case_id}\t${r.decision_type ?? "-"}\t${r.duration_ms ?? 0}ms\t${r.semantic_notes.join("; ") || "ok"}`,
    );
  }

  const measured = results.filter((r) => r.status !== "NOT_MEASURED");
  if (measured.length < 5) {
    console.log("confidence: sample too small / INCONCLUSIVE overall");
  }
  console.log("default_provider=UNDECIDED (unchanged)");
  process.exitCode = metrics.cases_fail > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
