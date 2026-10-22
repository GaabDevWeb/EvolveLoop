import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "../../..");
const harness = join(
  repoRoot,
  "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness/graphify_b3_harness.py",
);

function graphifyOnPath(): boolean {
  try {
    execFileSync("graphify", ["--version"], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

describe("GOAL-008 B3 graphify harness (integration)", () => {
  it("runs single-task smoke when graphify CLI and monorepo graph exist", () => {
    if (!graphifyOnPath()) return;
    const graph = join(repoRoot, "graphify-out/graph.json");
    if (!existsSync(graph)) return;
    const out = execFileSync(
      "python3",
      [
        "-c",
        `
import json, sys
sys.path.insert(0, "${join(repoRoot, "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness")}")
from graphify_b3_harness import run_b3, load_tokenizer, repo_root, paths_from_graphify_output, run_graphify_query
from pathlib import Path
import json as j
tasks = j.loads(Path("${join(repoRoot, "docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/tasks-real-frozen.json")}").read_text())["tasks"]
tok, counter = load_tokenizer()
r = run_b3(repo_root(), tasks[0], counter)
print(json.dumps({"recall": r.recall, "paths": len(r.paths_read), "exit": r.graphify_exit}))
`,
      ],
      { cwd: repoRoot, encoding: "utf-8", env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` } },
    );
    const parsed = JSON.parse(out.trim()) as { recall: number; paths: number; exit: number };
    expect(parsed.exit).toBe(0);
    expect(parsed.paths).toBeGreaterThan(0);
  });

  it("harness module is present for CI bench script", () => {
    expect(existsSync(harness)).toBe(true);
  });
});
