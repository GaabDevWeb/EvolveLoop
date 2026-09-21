/**
 * Autonomous provider.yaml import() residual remediation.
 * Path confinement + extension allowlist — NOT an OS sandbox.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  symlinkSync,
  readFileSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  resolveAutonomousModule,
  AUTONOMOUS_SANDBOX_STATUS,
  AutonomousSkillExecutor,
  canExecuteAutonomously,
} from "../../src/index.js";
import { loadYamlFile } from "../../src/registry/manifest-loader.js";
import type { ExecuteRequest, GraphNode, ProviderManifest } from "../../src/types/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function makeManifest(moduleSpec: string): ProviderManifest {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "Provider",
    metadata: { name: "fixture-auto", version: "1.0.0" },
    spec: {
      plugin: {
        type: "cursor-skill",
        entrypoint: "SKILL.md",
        autonomous: {
          type: "node-module",
          module: moduleSpec,
          export: "execute",
        },
      },
      capabilities: [{ id: "fixture.auto", contract: "c", type: "worker" }],
      runtime: { cost: "low" },
      availability: "active",
      priority: 1,
    },
  } as ProviderManifest;
}

describe("Autonomous module resolve — trust boundary", () => {
  let fixture: string;

  beforeEach(() => {
    fixture = join(tmpdir(), `auto-load-${randomUUID()}`);
    mkdirSync(fixture, { recursive: true });
    writeFileSync(
      join(fixture, "handler.mjs"),
      `export async function execute() { return { success: true }; }\n`,
    );
  });

  afterEach(() => {
    if (existsSync(fixture)) rmSync(fixture, { recursive: true, force: true });
  });

  it("SANDBOX_NOT_IMPLEMENTED is explicit", () => {
    expect(AUTONOMOUS_SANDBOX_STATUS).toBe("SANDBOX_NOT_IMPLEMENTED");
  });

  it("valid relative .mjs under provider → ok", () => {
    const r = resolveAutonomousModule(fixture, "./handler.mjs");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.absolutePath).toContain("handler.mjs");
  });

  it("path traversal ../../malicious.mjs → DENY", () => {
    const outside = join(dirname(fixture), `evil-${randomUUID()}.mjs`);
    writeFileSync(outside, `export async function execute() { return { success: true }; }\n`);
    try {
      const r = resolveAutonomousModule(fixture, "../../malicious.mjs");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toMatch(/TRAVERSAL|OUTSIDE/);
    } finally {
      rmSync(outside, { force: true });
    }
  });

  it("absolute path → DENY", () => {
    const r = resolveAutonomousModule(fixture, "/tmp/evil.mjs");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("MODULE_ABSOLUTE_DENIED");
  });

  it("unexpected extension → DENY", () => {
    writeFileSync(join(fixture, "handler.ts"), "export {}");
    writeFileSync(join(fixture, "handler.py"), "print(1)");
    expect(resolveAutonomousModule(fixture, "./handler.ts").ok).toBe(false);
    expect(resolveAutonomousModule(fixture, "./handler.py").ok).toBe(false);
  });

  it("module outside project via symlink → DENY", () => {
    const outside = join(dirname(fixture), `out-${randomUUID()}.mjs`);
    writeFileSync(outside, `export async function execute() { return { success: true }; }\n`);
    try {
      symlinkSync(outside, join(fixture, "link.mjs"));
      const r = resolveAutonomousModule(fixture, "./link.mjs");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe("MODULE_SYMLINK_ESCAPE");
    } finally {
      rmSync(outside, { force: true });
    }
  });

  it("nested symlink escape → DENY", () => {
    const outside = join(dirname(fixture), `nest-${randomUUID()}.mjs`);
    writeFileSync(outside, `export async function execute() { return { success: true }; }\n`);
    try {
      const mid = join(fixture, "mid.mjs");
      symlinkSync(outside, mid);
      symlinkSync(mid, join(fixture, "nested.mjs"));
      const r = resolveAutonomousModule(fixture, "./nested.mjs");
      expect(r.ok).toBe(false);
    } finally {
      rmSync(outside, { force: true });
    }
  });

  it("protocol / file: URL style → DENY", () => {
    const r = resolveAutonomousModule(fixture, "file:///tmp/x.mjs");
    expect(r.ok).toBe(false);
  });

  it("canExecuteAutonomously rejects traversal module", () => {
    const m = makeManifest("../../evil.mjs");
    const can = canExecuteAutonomously(m, fixture);
    expect(can.ok).toBe(false);
  });
});

describe("AutonomousSkillExecutor — confined load", () => {
  let fixture: string;
  let workspace: string;

  beforeEach(() => {
    fixture = join(tmpdir(), `auto-exec-${randomUUID()}`);
    workspace = join(tmpdir(), `auto-ws-${randomUUID()}`);
    mkdirSync(fixture, { recursive: true });
    mkdirSync(workspace, { recursive: true });
    writeFileSync(join(fixture, "SKILL.md"), "# fixture\n");
    writeFileSync(
      join(fixture, "handler.mjs"),
      `
import { writeFileSync } from "node:fs";
import { join } from "node:path";
export async function execute(ctx) {
  writeFileSync(join(ctx.authorized_workspace, "ok.txt"), "wrote");
  return {
    success: true,
    evidence: undefined,
    side_effects: {
      checkResults: [{ dod_id: "d1", result: "pass", details: "ok" }],
      status: "complete",
    },
  };
}
`,
    );
  });

  afterEach(() => {
    rmSync(fixture, { recursive: true, force: true });
    rmSync(workspace, { recursive: true, force: true });
  });

  function req(): { request: ExecuteRequest; node: GraphNode } {
    const node: GraphNode = {
      id: "n1",
      capability: "fixture.auto",
      type: "worker",
      status: "running",
      dependencies: [],
      definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
      retry_count: 0,
    };
    return {
      node,
      request: {
        run_id: "run-1",
        node_id: "n1",
        capability: "fixture.auto",
        inputs: [],
        definition_of_done: node.definition_of_done,
        policy: { retries_remaining: 0 },
        memory_scope: "t",
        knowledge_hits: [],
        briefing: "x",
        node,
      },
    };
  }

  it("valid handler under provider executes", async () => {
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: workspace,
      resolveProviderDir: () => fixture,
    });
    const { request } = req();
    const result = await exec.execute(request, join(fixture, "SKILL.md"), makeManifest("./handler.mjs"));
    expect(result.success).toBe(true);
    expect(existsSync(join(workspace, "ok.txt"))).toBe(true);
  });

  it("traversal module never imported — AUTONOMOUS_MODULE_DENIED", async () => {
    const marker = join(dirname(fixture), `marker-${randomUUID()}.txt`);
    const evil = join(dirname(fixture), `evil-${randomUUID()}.mjs`);
    writeFileSync(
      evil,
      `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(marker)}, "LOADED");
export async function execute() { return { success: true }; }
`,
    );
    try {
      const exec = new AutonomousSkillExecutor({
        workspaceRoot: workspace,
        resolveProviderDir: () => fixture,
      });
      const { request } = req();
      const result = await exec.execute(
        request,
        join(fixture, "SKILL.md"),
        makeManifest(`../${evil.split("/").pop()}`),
      );
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("AUTONOMOUS_MODULE_DENIED");
      expect(existsSync(marker)).toBe(false);
    } finally {
      rmSync(evil, { force: true });
      rmSync(marker, { force: true });
    }
  });

  it("absolute module denied before import", async () => {
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: workspace,
      resolveProviderDir: () => fixture,
    });
    const { request } = req();
    const result = await exec.execute(
      request,
      join(fixture, "SKILL.md"),
      makeManifest("/etc/passwd"),
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("AUTONOMOUS_MODULE_DENIED");
  });

  it("malicious in-provider module still runs in-process (honest non-sandbox)", async () => {
    // Documents residual: path confinement ≠ sandbox. Module inside provider can use process APIs.
    writeFileSync(
      join(fixture, "probe.mjs"),
      `
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
export async function execute(ctx) {
  const probe = {
    env_has_path: typeof process.env.PATH === "string",
    can_read_parent: false,
    wrote_outside: false,
  };
  try {
    readFileSync(join(ctx.authorized_workspace, "..", "nope"), "utf8");
    probe.can_read_parent = true;
  } catch { /* expected */ }
  try {
    const outside = join(ctx.authorized_workspace, "..", "escape-probe-" + Date.now());
    writeFileSync(outside, "escaped");
    probe.wrote_outside = existsSync(outside);
    if (probe.wrote_outside) {
      try { require("node:fs").unlinkSync(outside); } catch { /* best effort */ }
    }
  } catch { /* */ }
  writeFileSync(join(ctx.authorized_workspace, "probe.json"), JSON.stringify(probe));
  return {
    success: true,
    side_effects: {
      checkResults: [{ dod_id: "d1", result: "pass", details: "probe" }],
      status: "complete",
    },
  };
}
`,
    );
    const exec = new AutonomousSkillExecutor({
      workspaceRoot: workspace,
      resolveProviderDir: () => fixture,
    });
    const { request } = req();
    const result = await exec.execute(request, join(fixture, "SKILL.md"), makeManifest("./probe.mjs"));
    expect(result.success).toBe(true);
    const probe = JSON.parse(readFileSync(join(workspace, "probe.json"), "utf-8")) as {
      env_has_path: boolean;
      wrote_outside: boolean;
    };
    // Residual: in-process module sees env; may write outside authorized_workspace if handler ignores confine.
    expect(probe.env_has_path).toBe(true);
    expect(AUTONOMOUS_SANDBOX_STATUS).toBe("SANDBOX_NOT_IMPLEMENTED");
  });
});

describe("Regression — autonomous declaration cannot arbitrary-import", () => {
  it("property: unknown/forged module path never loads", () => {
    const dir = join(tmpdir(), `reg-auto-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    try {
      const cases = [
        "./../../etc/passwd",
        "/tmp/x.mjs",
        "node:fs",
        "./handler.exe",
        "https://evil.example/x.mjs",
      ];
      for (const spec of cases) {
        expect(resolveAutonomousModule(dir, spec).ok).toBe(false);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("MUTATION allow-arbitrary-import: absolute must stay denied", () => {
    const dir = join(tmpdir(), `mut-auto-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    try {
      expect(resolveAutonomousModule(dir, join(dir, "handler.mjs")).ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("MUTATION remove-skill-scope-boundary: traversal still denied", () => {
    const dir = join(tmpdir(), `mut-scope-${randomUUID()}`);
    mkdirSync(dir, { recursive: true });
    try {
      expect(resolveAutonomousModule(dir, "../outside.mjs").ok).toBe(false);
      expect(resolveAutonomousModule(dir, "./../../outside.mjs").ok).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("real test-autonomous-write provider still resolves", () => {
    const providersDir = join(__dirname, "../../providers/test-autonomous-write");
    const manifest = loadYamlFile(join(providersDir, "provider.yaml")) as ProviderManifest;
    const can = canExecuteAutonomously(manifest, providersDir);
    expect(can.ok).toBe(true);
    const auto = (manifest.spec.plugin as { autonomous?: { module: string } }).autonomous!;
    const r = resolveAutonomousModule(providersDir, auto.module);
    expect(r.ok).toBe(true);
  });
});
