/**
 * WikiKnowledgeBackend — default KnowledgeBackend implementation.
 * Wraps the existing Wiki vault CLI bridge (EXTERNAL module name via WIKI_CLI_MODULE).
 * Does not reimplement RAG.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import type { EvidenceSet, KnowledgeHit } from "../../capabilities/results.js";
import { cleanOutput } from "../../capabilities/results.js";
import type {
  KnowledgeBackend,
  KnowledgeHealth,
  KnowledgeInspectResult,
} from "./types.js";

/**
 * Wiki corpus root — portable.
 * Canonical: WIKI_ROOT. Alias: RAG_REPO_ROOT (compat).
 * No hardcoded username path.
 */
export function resolveWikiRoot(): string {
  return process.env.WIKI_ROOT ?? process.env.RAG_REPO_ROOT ?? "";
}

/**
 * External Python package module inside the vault (unchanged this phase).
 */
export function resolveWikiCliModule(): string {
  return process.env.WIKI_CLI_MODULE ?? "gaabwiki";
}

function runWikiSearch(
  query: string,
  ragRoot: string,
  timeoutMs = 20_000,
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const mod = resolveWikiCliModule();
    const child = spawn("python", ["-m", mod, "search", query], {
      cwd: ragRoot,
      env: { ...process.env },
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.stdout?.on("data", (c: Buffer) => {
      if (stdout.length < 50_000) stdout += c.toString("utf-8");
    });
    child.stderr?.on("data", (c: Buffer) => {
      if (stderr.length < 20_000) stderr += c.toString("utf-8");
    });

    const finish = (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        ok: code === 0 && !timedOut,
        stdout,
        stderr,
        exitCode: code,
        timedOut,
      });
    };

    child.on("error", (err) => {
      stderr += err.message;
      finish(127);
    });
    child.on("close", (code) => finish(code));
  });
}

function parseHits(stdout: string, _query: string): KnowledgeHit[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((h) => {
        const hit = h as Record<string, unknown>;
        return {
          source: String(hit.source ?? hit.path ?? hit.file ?? "unknown"),
          section: hit.section ? String(hit.section) : undefined,
          score: typeof hit.score === "number" ? hit.score : undefined,
          retrieval_method: hit.retrieval_method ? String(hit.retrieval_method) : undefined,
          project: hit.project ? String(hit.project) : undefined,
          excerpt: hit.excerpt ? cleanOutput(String(hit.excerpt), 500) : undefined,
          chunk_id: hit.chunk_id ? String(hit.chunk_id) : undefined,
          degraded: hit.degraded ? String(hit.degraded) : undefined,
        };
      });
    }
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as { hits?: unknown }).hits)) {
      return parseHits(JSON.stringify((parsed as { hits: unknown[] }).hits), _query);
    }
  } catch {
    /* fall through */
  }

  return trimmed
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .slice(0, 20)
    .map((line) => {
      const parts = line.split("|").map((p) => p.trim());
      if (parts.length >= 2) {
        return {
          source: parts[0],
          score: Number.isFinite(Number(parts[1])) ? Number(parts[1]) : undefined,
          excerpt: parts.slice(2).join(" | ") || undefined,
        };
      }
      return { source: line.slice(0, 200), excerpt: undefined };
    });
}

export class WikiKnowledgeBackend implements KnowledgeBackend {
  readonly id = "wiki" as const;

  async search(query: string): Promise<EvidenceSet> {
    const ragRoot = resolveWikiRoot();

    if (!ragRoot || !existsSync(ragRoot)) {
      return {
        kind: "EvidenceSet",
        query,
        hits: [],
        retrieval_method: "unavailable",
        degraded: "rag_repo_missing",
        error_code: "RAG_REPO_MISSING",
      };
    }

    const result = await runWikiSearch(query, ragRoot);

    if (result.timedOut) {
      return {
        kind: "EvidenceSet",
        query,
        hits: [],
        retrieval_method: "unavailable",
        degraded: "wiki_timeout",
        error_code: "WIKI_TIMEOUT",
      };
    }

    if (result.exitCode === 127 || /No module named|not found/i.test(result.stderr)) {
      return {
        kind: "EvidenceSet",
        query,
        hits: [],
        retrieval_method: "unavailable",
        degraded: "wiki_cli_unavailable",
        error_code: "WIKI_UNAVAILABLE",
      };
    }

    if (!result.ok) {
      return {
        kind: "EvidenceSet",
        query,
        hits: [],
        retrieval_method: "unavailable",
        degraded: cleanOutput(result.stderr || `exit_${result.exitCode}`, 300),
        error_code: "WIKI_ERROR",
      };
    }

    const hits = parseHits(result.stdout, query);
    return {
      kind: "EvidenceSet",
      query,
      hits,
      retrieval_method: hits[0]?.retrieval_method ?? "wiki",
      degraded: hits.find((h) => h.degraded)?.degraded ?? null,
      error_code: null,
    };
  }

  async inspect(query = ""): Promise<KnowledgeInspectResult> {
    const ragRoot = resolveWikiRoot();
    const base = await this.search(query || "overview");
    return {
      ...base,
      cli_available: base.error_code !== "WIKI_UNAVAILABLE" && base.error_code !== "RAG_REPO_MISSING",
      rag_root: ragRoot,
      backend: this.id,
    };
  }

  async health(): Promise<KnowledgeHealth> {
    const root = resolveWikiRoot();
    if (!root || !existsSync(root)) {
      return {
        available: false,
        backend: this.id,
        root: root || undefined,
        error_code: "RAG_REPO_MISSING",
        degraded: "rag_repo_missing",
      };
    }
    const probe = await this.search("health");
    const available = probe.error_code === null || probe.error_code === undefined;
    return {
      available: available || (probe.error_code !== "WIKI_UNAVAILABLE" && probe.error_code !== "RAG_REPO_MISSING"),
      backend: this.id,
      root,
      error_code: probe.error_code ?? null,
      degraded: probe.degraded ?? null,
    };
  }
}
