import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createDeterministicProvider } from "../../src/providers/deterministic/index.js";
import { filterRegistryByProfile, CAPABILITY_PROFILES } from "../../src/discovery/capability-profiles.js";
import { PathEscapeError, assertWithinWorkspace } from "../../src/providers/deterministic/paths.js";
import type { ExecuteRequest, GraphNode } from "../../src/types/index.js";

function makeRequest(capability: string, inputs: Record<string, unknown> = {}): ExecuteRequest {
  const node: GraphNode = {
    id: "n1",
    capability,
    type: "worker",
    status: "running",
    dependencies: [],
    definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
    constraints: inputs,
    metadata: {},
    retry_count: 0,
  };
  return {
    run_id: "run-1",
    node_id: "n1",
    capability,
    inputs: [],
    definition_of_done: node.definition_of_done,
    policy: { retries_remaining: 0 },
    memory_scope: "test",
    knowledge_hits: [],
    briefing: "test",
    node,
  };
}

function resultOf(res: { evidence?: { spec?: { payload?: unknown; normalized?: unknown } } }): unknown {
  const spec = res.evidence?.spec as { payload?: { result?: unknown }; normalized?: unknown } | undefined;
  return spec?.normalized ?? spec?.payload?.result;
}

describe("path confinement", () => {
  it("allows in-workspace paths", () => {
    expect(assertWithinWorkspace("/tmp/ws", "a/b")).toBe(path.resolve("/tmp/ws", "a/b"));
  });

  it("denies escape", () => {
    expect(() => assertWithinWorkspace("/tmp/ws", "../etc/passwd")).toThrow(PathEscapeError);
  });
});

describe("capability-profiles", () => {
  it("coding profile includes git.inspect", () => {
    expect(CAPABILITY_PROFILES.coding).toContain("git.inspect");
  });

  it("filters registry", () => {
    const reg = {
      apiVersion: "v2",
      kind: "CapabilityRegistry" as const,
      capabilities: {
        "git.inspect": { providers: [] },
        "browser.navigate": { providers: [] },
        "backend-implementation": { providers: [] },
      },
    };
    const filtered = filterRegistryByProfile(reg, "coding");
    expect(filtered.capabilities["git.inspect"]).toBeDefined();
    expect(filtered.capabilities["browser.navigate"]).toBeUndefined();
  });
});

describe("DeterministicProvider", () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), "orch-det-"));
    await fs.writeFile(path.join(tmp, "hello.txt"), "hello world\n");
    execFileSync("git", ["init"], { cwd: tmp });
    execFileSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: tmp });
    execFileSync("git", ["add", "."], { cwd: tmp });
    execFileSync("git", ["commit", "-m", "init"], { cwd: tmp });
  });

  afterEach(async () => {
    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("filesystem.read returns content", async () => {
    const p = createDeterministicProvider("filesystem", tmp);
    const res = await p.execute(makeRequest("filesystem.read", { path: "hello.txt" }));
    expect(res.success).toBe(true);
    const data = resultOf(res) as { content?: string };
    expect(data?.content).toContain("hello");
  });

  it("filesystem.write requires confirmation", async () => {
    const p = createDeterministicProvider("filesystem", tmp);
    const res = await p.execute(makeRequest("filesystem.write", { path: "x.txt", content: "x" }));
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("CONFIRMATION_REQUIRED");
  });

  it("filesystem.write works with allowWrite", async () => {
    const p = createDeterministicProvider("filesystem", tmp, { allowWrite: true });
    const res = await p.execute(makeRequest("filesystem.write", { path: "x.txt", content: "x" }));
    expect(res.success).toBe(true);
    expect(await fs.readFile(path.join(tmp, "x.txt"), "utf8")).toBe("x");
  });

  it("path escape is denied", async () => {
    const p = createDeterministicProvider("filesystem", tmp);
    const res = await p.execute(makeRequest("filesystem.read", { path: "../outside" }));
    expect(res.success).toBe(false);
    expect(["PATH_ESCAPE_DENIED", "AUTHORITY_DENIED", "PATH_ESCAPE"]).toContain(res.error?.code);
  });

  it("git.inspect returns repository state", async () => {
    const p = createDeterministicProvider("git", tmp);
    const res = await p.execute(makeRequest("git.inspect"));
    expect(res.success).toBe(true);
    const data = resultOf(res) as { branch?: string; clean?: boolean; kind?: string };
    expect(data?.branch || data?.kind).toBeTruthy();
  });

  it("shell.execute denied without allowShell", async () => {
    const p = createDeterministicProvider("shell", tmp);
    const res = await p.execute(makeRequest("shell.execute", { command: "echo hi" }));
    expect(res.success).toBe(false);
    expect(["CONFIRMATION_REQUIRED", "AUTHORITY_DENIED"]).toContain(res.error?.code);
  });

  it("shell.execute works with allowShell", async () => {
    const p = createDeterministicProvider("shell", tmp, { allowShell: true });
    const res = await p.execute(makeRequest("shell.execute", { command: "echo hi" }));
    expect(res.success).toBe(true);
    const data = resultOf(res) as { exit_code?: number; stdout_excerpt?: string; stdout?: string };
    expect(
      data?.exit_code === 0 ||
        String(data?.stdout_excerpt ?? data?.stdout ?? "").includes("hi"),
    ).toBe(true);
  });

  it("system.inspect returns metrics", async () => {
    const p = createDeterministicProvider("system", tmp);
    const res = await p.execute(makeRequest("system.inspect"));
    expect(res.success).toBe(true);
    expect(resultOf(res)).toBeTruthy();
  });

  it("project.inspect finds git", async () => {
    const p = createDeterministicProvider("project", tmp);
    const res = await p.execute(makeRequest("project.inspect"));
    expect(res.success).toBe(true);
    const data = resultOf(res) as { has_git?: boolean };
    expect(data?.has_git).toBe(true);
  });

  it("knowledge.search UNAVAILABLE is distinct from empty hits", async () => {
    const prevRag = process.env.RAG_REPO_ROOT;
    const prevWiki = process.env.WIKI_ROOT;
    const missing = path.join(tmp, "missing-rag-root");
    process.env.WIKI_ROOT = missing;
    process.env.RAG_REPO_ROOT = missing;
    try {
      const p = createDeterministicProvider("knowledge", tmp);
      const res = await p.execute(makeRequest("knowledge.search", { query: "anything" }));
      expect(res.success).toBe(true);
      const data = resultOf(res) as {
        hits?: unknown[];
        error_code?: string | null;
        retrieval_method?: string;
        degraded?: string | null;
      };
      expect(data?.hits).toEqual([]);
      expect(data?.error_code).toBe("RAG_REPO_MISSING");
      expect(data?.retrieval_method).toBe("unavailable");
      expect(data?.degraded).toBe("rag_repo_missing");
      // Empty successful retrieval would use null/absent error_code — not this code.
      expect(data?.error_code).not.toBeNull();
    } finally {
      if (prevRag === undefined) delete process.env.RAG_REPO_ROOT;
      else process.env.RAG_REPO_ROOT = prevRag;
      if (prevWiki === undefined) delete process.env.WIKI_ROOT;
      else process.env.WIKI_ROOT = prevWiki;
    }
  });
});
