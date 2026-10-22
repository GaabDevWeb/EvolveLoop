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
  paths_ranked: string[];
  edges: Array<{ from: string; to: string; kind: GraphEdgeKind; detail?: string }>;
  source: "cli" | "stub" | "disabled";
  out_dir: string;
  graph_path?: string;
  cli_exit_code?: number;
  raw_excerpt?: string;
}

export function graphifyOutDir(projectRoot: string): string {
  return join(projectRoot, "graphify-out");
}

export function graphifyGraphPath(projectRoot: string): string {
  const override = process.env.GRAPHIFY_GRAPH?.trim();
  if (override) return override;
  return join(graphifyOutDir(projectRoot), "graph.json");
}

export function detectGraphifyCli(): { available: boolean; version?: string } {
  const bin = process.env.GRAPHIFY_BIN?.trim() || "graphify";
  try {
    const out = execFileSync(bin, ["--version"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return { available: true, version: out || undefined };
  } catch {
    return { available: false };
  }
}

/** Parse `graphify query` text for monorepo-relative file paths (src=…). */
export function pathsFromGraphifyQueryOutput(text: string, projectRoot: string): string[] {
  const banned = ["docs/internal/historical/evals/", "fixtures/evolveloop-project-knowledge/"];
  const seen = new Set<string>();
  const ordered: string[] = [];
  const re = /\bsrc=([^\s\]]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    let rel = m[1].trim().replace(/\\/g, "/");
    if (!rel) continue;
    if (rel.startsWith("./")) rel = rel.slice(2);
    const candidates = [rel];
    if (!existsSync(join(projectRoot, rel)) && existsSync(join(projectRoot, "orchestrator", rel))) {
      candidates.push(`orchestrator/${rel}`);
    }
    for (const cand of candidates) {
      if (banned.some((p) => cand.startsWith(p))) break;
      if (!existsSync(join(projectRoot, cand))) continue;
      if (seen.has(cand)) break;
      seen.add(cand);
      ordered.push(cand);
      break;
    }
  }
  return ordered;
}

export function ensureGraphifyGraph(projectRoot: string): { ok: boolean; graphPath: string; detail?: string } {
  const graphPath = graphifyGraphPath(projectRoot);
  if (existsSync(graphPath)) {
    return { ok: true, graphPath };
  }
  if (process.env.EVOLVELOOP_GRAPHIFY_BUILD?.trim() !== "1") {
    return { ok: false, graphPath, detail: "graph.json missing (set EVOLVELOOP_GRAPHIFY_BUILD=1 to run graphify update)" };
  }
  const cli = process.env.GRAPHIFY_BIN?.trim() || "graphify";
  try {
    execFileSync(cli, ["update", projectRoot, "--no-cluster"], {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, GRAPHIFY_NO_TIPS: "1" },
    });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException & { status?: number }).status;
    return { ok: false, graphPath, detail: `graphify update failed (exit ${code ?? "?"})` };
  }
  return existsSync(graphPath)
    ? { ok: true, graphPath }
    : { ok: false, graphPath, detail: "graphify update finished without graph.json" };
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
      paths_ranked: [],
      edges: [],
      source: "disabled",
      out_dir,
    };
  }

  const cli = detectGraphifyCli();
  const graphBudget = Number(process.env.V22_B3_QUERY_TOKEN_BUDGET ?? "4000");
  if (cli.available) {
    const graph = ensureGraphifyGraph(input.projectRoot);
    if (graph.ok) {
      const bin = process.env.GRAPHIFY_BIN?.trim() || "graphify";
      try {
        const raw = execFileSync(
          bin,
          ["query", input.query, "--budget", String(graphBudget), "--graph", graph.graphPath],
          {
            cwd: input.projectRoot,
            encoding: "utf-8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        );
        const paths = pathsFromGraphifyQueryOutput(raw, input.projectRoot);
        const edges =
          paths.length > 0
            ? paths.slice(0, 12).map((p, i, arr) => ({
                from: arr[Math.max(0, i - 1)] ?? p,
                to: p,
                kind: "EXTRACTED" as GraphEdgeKind,
              }))
            : [{ from: "graph.json", to: input.query, kind: "EXTRACTED" as GraphEdgeKind }];
        return {
          enabled: true,
          cli_available: true,
          cli_version: cli.version,
          query: input.query,
          budget,
          paths_ranked: paths,
          edges,
          source: "cli",
          out_dir,
          graph_path: graph.graphPath,
          cli_exit_code: 0,
          raw_excerpt: raw.slice(0, 2000),
        };
      } catch (err) {
        const code = (err as NodeJS.ErrnoException & { status?: number }).status;
        /* fall through to stub */
        if (code !== undefined && code !== 0) {
          return {
            enabled: true,
            cli_available: true,
            cli_version: cli.version,
            query: input.query,
            budget,
            paths_ranked: [],
            edges: STUB_EDGES.map((e) => ({ ...e, kind: "INFERRED" as GraphEdgeKind })),
            source: "stub",
            out_dir,
            graph_path: graph.graphPath,
            cli_exit_code: code,
          };
        }
      }
    }
  }

  return {
    enabled: true,
    cli_available: cli.available,
    cli_version: cli.version,
    query: input.query,
    budget,
    paths_ranked: [],
    edges: STUB_EDGES.map((e) => ({ ...e, kind: "INFERRED" as GraphEdgeKind })),
    source: "stub",
    out_dir,
  };
}

export function formatGraphifyContext(result: GraphifyQueryResult): string {
  if (!result.enabled) return "";
  if (result.paths_ranked.length > 0) {
    const lines = result.paths_ranked.slice(0, 20).map((p) => `- \`${p}\``);
    return `## Graphify (experiment)\n\nRanked code paths:\n${lines.join("\n")}\n`;
  }
  if (result.edges.length === 0) return "";
  const lines = result.edges.map(
    (e) => `- [${e.kind}] ${e.from} → ${e.to}${e.detail ? ` (${e.detail})` : ""}`,
  );
  return `## Graphify (experiment)\n\n${lines.join("\n")}\n`;
}
