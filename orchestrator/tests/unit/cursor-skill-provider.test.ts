import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { CursorSkillProvider, CallbackSkillExecutor, JobFileExecutor, evidenceFromShellResult } from "../../src/plugins/cursor-skill-provider.js";
import { PluginLoader } from "../../src/plugins/plugin-loader.js";
import type { ProviderManifest, GraphNode } from "../../src/types/index.js";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const orchestratorRoot = resolve(import.meta.dirname, "../..");
const agentsRoot = resolve(orchestratorRoot, "..");

const testingManifest: ProviderManifest = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "Provider",
  metadata: { name: "testing", version: "1.1.0" },
  spec: {
    plugin: {
      type: "cursor-skill",
      entrypoint: ".cursor/skills/testing/SKILL.md",
    },
    capabilities: [{ id: "testing", type: "gate" }],
  },
};

const node: GraphNode = {
  id: "test-suite",
  capability: "testing",
  type: "gate",
  dependencies: [],
  definition_of_done: [{ id: "dod-t-1", check: "Suite verde", verification: "automated" }],
  status: "running",
  retry_count: 0,
};

describe("CursorSkillProvider", () => {
  it("loads SKILL.md and executes via callback", async () => {
    const provider = new CursorSkillProvider(
      testingManifest,
      new CallbackSkillExecutor(async (req) => ({
        run_id: req.run_id,
        success: true,
        evidence: evidenceFromShellResult(req, "testing", 0, "npm test").evidence,
        duration_ms: 10,
        provider_id: "testing",
      })),
      agentsRoot,
    );

    const result = await provider.execute({
      run_id: "run-1",
      node_id: "test-suite",
      capability: "testing",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 2 },
      memory_scope: "feat-1",
      knowledge_hits: [],
      briefing: "Run tests",
      node,
    });

    expect(result.success).toBe(true);
    expect(result.evidence?.spec.verdict).toBe("passed");
  });

  it("returns SKILL_NOT_FOUND for invalid path", async () => {
    const badManifest = {
      ...testingManifest,
      spec: { ...testingManifest.spec, plugin: { type: "cursor-skill", entrypoint: "missing/SKILL.md" } },
    };
    const provider = new CursorSkillProvider(
      badManifest,
      new CallbackSkillExecutor(async () => ({ run_id: "x", success: true, duration_ms: 0, provider_id: "t" })),
      agentsRoot,
    );

    const result = await provider.execute({
      run_id: "run-2",
      node_id: "test-suite",
      capability: "testing",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 1 },
      memory_scope: "f",
      knowledge_hits: [],
      briefing: "",
      node,
    });

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("SKILL_NOT_FOUND");
  });

  it("JobFileExecutor writes pending job", async () => {
    const dir = mkdtempSync(resolve(tmpdir(), "skill-jobs-"));
    const provider = new CursorSkillProvider(
      testingManifest,
      new JobFileExecutor(dir),
      agentsRoot,
    );

    const result = await provider.execute({
      run_id: "run-job-1",
      node_id: "test-suite",
      capability: "testing",
      inputs: [],
      definition_of_done: node.definition_of_done,
      policy: { retries_remaining: 1 },
      memory_scope: "f",
      knowledge_hits: [],
      briefing: "test job",
      node,
    });

    expect(result.error?.code).toBe("JOB_PENDING");
    const job = JSON.parse(readFileSync(resolve(dir, "run-job-1.json"), "utf-8"));
    expect(job.kind).toBe("SkillJob");
    expect(job.capability).toBe("testing");
  });
});

describe("PluginLoader", () => {
  it("loads cursor-skill with executor", () => {
    const loader = new PluginLoader(agentsRoot);
    const provider = loader.load(testingManifest, new CallbackSkillExecutor(async (r) => ({
      run_id: r.run_id,
      success: true,
      duration_ms: 1,
      provider_id: "testing",
    })));
    expect(provider.id).toBe("testing");
  });

  it("loads mock plugin", () => {
    const loader = new PluginLoader(agentsRoot);
    const mockManifest: ProviderManifest = {
      ...testingManifest,
      spec: { ...testingManifest.spec, plugin: { type: "mock", entrypoint: "" } },
    };
    const provider = loader.load(mockManifest);
    expect(provider.id).toBe("testing");
  });
});
