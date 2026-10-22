/**
 * V22-GOAL-008 — Graphify experiment adapter (flag only; no KnowledgeBackendId).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { isGraphifyExperimentEnabled } from "./feature-flags.js";

export type GraphEdgeKind = "EXTRACTED" | "INFERRED" | "STUB";

export interface GraphifyQueryResult {
  enabled: boolean;
  cli_available: boolean;
  cli_version?: string;
  query: string;
  budget: number;
  edges: Array<{ from: string; to: string; kind: GraphEdgeKind; detail?: string }>;
  source: "cli" | "stub" | "disabled";
  out_dir: string;
}

export function graphifyOutDir(projectRoot: string): string {
  return join(projectRoot, "graphify-out");
}

export function detectGraphifyCli(): { available: boolean; version?: string } {
  try {
    const out = execFileSync("graphify", ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return { available: true, version: out || undefined };
  } catch {
    return { available: false };
  }
}

const STUB_EDGES: GraphifyQueryResult["edges"] = [
  {
    from: "orchestrator/src/engine/execution-engine.ts",
    to: "orchestrator/src/jobs/checkpoint.ts",
    kind: "STUB",
    detail: "fixture dependency (graphify CLI not required)",
  },
];

export function queryGraphifyCodeStructure(input: {
  projectRoot: string;
  query: string;
  budget?: number;
}): GraphifyQueryResult {
  const enabled = isGraphifyExperimentEnabled();
  const out_dir = graphifyOutDir(input.projectRoot);
  const budget = input.budget ?? 8;

  if (!enabled) {
    return {
      enabled: false,
      cli_available: false,
      query: input.query,
      budget,
      edges: [],
      source: "disabled",
      out_dir,
    };
  }

  const cli = detectGraphifyCli();
  if (cli.available) {
    try {
      execFileSync(
        "graphify",
        ["query", input.query, "--budget", String(budget), "--json"],
        {
          cwd: input.projectRoot,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "ignore"],
        },
      );
      if (existsSync(join(out_dir, "graph.json"))) {
        return {
          enabled: true,
          cli_available: true,
          cli_version: cli.version,
          query: input.query,
          budget,
          edges: [{ from: "graph.json", to: input.query, kind: "EXTRACTED" }],
          source: "cli",
          out_dir,
        };
      }
    } catch {
      /* fall through to stub */
    }
  }

  return {
    enabled: true,
    cli_available: cli.available,
    cli_version: cli.version,
    query: input.query,
    budget,
    edges: STUB_EDGES.map((e) => ({ ...e, kind: "INFERRED" as GraphEdgeKind })),
    source: "stub",
    out_dir,
  };
}

export function formatGraphifyContext(result: GraphifyQueryResult): string {
  if (!result.enabled || result.edges.length === 0) return "";
  const lines = result.edges.map(
    (e) => `- [${e.kind}] ${e.from} → ${e.to}${e.detail ? ` (${e.detail})` : ""}`,
  );
  return `## Graphify (experiment)\n\n${lines.join("\n")}\n`;
}
