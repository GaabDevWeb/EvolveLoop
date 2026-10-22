import { describe, it, expect } from "vitest";
import {
  applyContextBudget,
  prepareSpawnContext,
  sliceFromFile,
} from "../../src/context/index.js";

describe("V22-GOAL-006 — context budget per spawn", () => {
  const bundle = {
    parent_cycle_id: "feat-bench",
    spawn_depth: 1,
    max_spawn_depth: 3,
    role: "explore" as const,
    context_budget: { max_paths: 2, max_pages: 1, max_tokens: 500 },
  };

  it("AC cenário 10: orçamento limita paths sem perder verificador (critérios protegidos)", () => {
    const slices = [
      sliceFromFile("a.txt", "noise", "generic", 1),
      sliceFromFile("b.txt", "noise", "generic", 2),
      sliceFromFile("c.txt", "noise", "generic", 3),
      sliceFromFile(
        "verifier.md",
        "must contain ANSWER_OK",
        "acceptance_criteria",
        100,
      ),
    ];
    const { budget } = prepareSpawnContext({
      gate_bundle: bundle,
      retrieval_slices: slices,
    });
    expect(budget).toBeDefined();
    expect(budget!.paths_read).toContain("verifier.md");
    expect(budget!.paths_read.length).toBeLessThanOrEqual(2);
    expect(budget!.context_text).toContain("ANSWER_OK");
    expect(budget!.telemetry.tokenizer).toBeTruthy();
  });

  it("AC: dedup path já em evidência (redundância 0 re-read)", () => {
    const slices = [
      sliceFromFile("src/x.ts", "code", "generic"),
      sliceFromFile("src/x.ts", "duplicate", "generic"),
    ];
    const r = applyContextBudget(slices, {
      ownerId: "o1",
      limits: { max_paths: 10 },
      evidence_paths: ["src/x.ts"],
    });
    expect(r.telemetry.redundant_paths_skipped).toBeGreaterThanOrEqual(1);
    expect(r.paths_read).not.toContain("src/x.ts");
  });

  it("AC: não truncar segurança/evidência no meio — classes protegidas preservadas", () => {
    const big = "x".repeat(4000);
    const slices = [
      sliceFromFile("secret-policy.md", "never strip", "security_restriction", 50),
      sliceFromFile("evidence.json", '{"gate":"pass"}', "evidence", 50),
      sliceFromFile("filler.txt", big, "generic", 1),
    ];
    const r = applyContextBudget(slices, {
      ownerId: "o2",
      limits: { max_paths: 10, max_tokens: 100 },
    });
    expect(r.context_text).toContain("never strip");
    expect(r.context_text).toContain('"gate":"pass"');
    expect(r.telemetry.protected_slices_preserved).toBe(2);
  });

  it("AC: telemetria registra tokenizer e contagem após budget", () => {
    const slices = [
      sliceFromFile("keep.md", "short", "acceptance_criteria", 100),
      sliceFromFile("only.txt", "word ".repeat(4000), "generic", 1),
    ];
    const r = applyContextBudget(slices, {
      ownerId: "o3",
      limits: { max_tokens: 50 },
    });
    expect(r.paths_read).toContain("keep.md");
    expect(r.telemetry.slices_dropped).toBeGreaterThanOrEqual(1);
    expect(r.telemetry.tokenizer).toMatch(/tiktoken|PROXY/);
  });
});
