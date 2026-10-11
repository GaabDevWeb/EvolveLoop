import { describe, it, expect } from "vitest";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { authorize } from "../../src/authority/capability-authority.js";
import { buildSuccessEvidence, validateEvidence } from "../../src/evidence/validator.js";
import { evidenceFromShellResult } from "../../src/plugins/cursor-skill-provider.js";
import { createDeterministicProvider } from "../../src/providers/deterministic/index.js";
import { FilesystemMemoryStore, MemoryFormatError } from "../../src/memory/filesystem-memory-store.js";
import type { ExecuteRequest, GraphNode } from "../../src/types/index.js";

function workerNode(): GraphNode {
  return {
    id: "n1",
    capability: "backend-implementation",
    type: "worker",
    dependencies: [],
    definition_of_done: [{ id: "dod-1", check: "Endpoints", verification: "automated" }],
    status: "running",
    retry_count: 0,
  };
}

function requestFor(node: GraphNode): ExecuteRequest {
  return {
    run_id: "run-1",
    node_id: node.id,
    capability: node.capability,
    inputs: [],
    definition_of_done: node.definition_of_done,
    policy: { retries_remaining: 0 },
    memory_scope: "feat",
    knowledge_hits: [],
    briefing: "test",
    node,
  };
}

describe("execution contract", () => {
  it("does not treat handler success as observed DoD", () => {
    const node = workerNode();
    const evidence = buildSuccessEvidence(node, "run-1", "backend", 10);
    expect(evidence.spec.checks[0]?.result).not.toBe("pass");
    expect(evidence.spec.status).toBe("partial");
    expect(validateEvidence(evidence, node.definition_of_done, node).valid).toBe(false);
  });

  it("rejects simulated evidence in real validation", () => {
    const node = workerNode();
    const evidence = buildSuccessEvidence(node, "run-1", "mock", 10);
    evidence.spec.status = "complete";
    evidence.spec.checks = [
      { dod_id: "dod-1", result: "pass", verification: "automated" },
    ];
    evidence.spec.assumptions = ["SIMULATED_EXECUTION"];
    const result = validateEvidence(evidence, node.definition_of_done, node, 0, {
      allowSimulated: false,
    });
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("simulated_evidence");
  });

  it("accepts simulated evidence only when the engine mode opts in", () => {
    const node = workerNode();
    const evidence = buildSuccessEvidence(node, "run-1", "mock", 10);
    evidence.spec.assumptions = ["SIMULATED_EXECUTION"];
    const denied = validateEvidence(evidence, node.definition_of_done, node, 0, {
      lineage: { run_id: "run-1", node_id: "n1" },
    });
    const allowed = validateEvidence(evidence, node.definition_of_done, node, 0, {
      allowSimulated: true,
      lineage: { run_id: "run-1", node_id: "n1" },
    });
    expect(denied.valid).toBe(false);
    expect(allowed.valid).toBe(true);
  });

  it("rejects evidence whose lineage is missing or belongs to another run or node", () => {
    const node = workerNode();
    const evidence = buildSuccessEvidence(node, "run-1", "backend", 10);
    evidence.spec.status = "complete";
    evidence.spec.checks = [{ dod_id: "dod-1", result: "pass", verification: "automated" }];

    expect(
      validateEvidence(evidence, node.definition_of_done, node, 0, {
        lineage: { run_id: "other-run", node_id: "n1" },
      }).reason,
    ).toBe("lineage_run_id_mismatch");

    expect(
      validateEvidence(evidence, node.definition_of_done, node, 0, {
        lineage: { run_id: "run-1", node_id: "other-node" },
      }).reason,
    ).toBe("lineage_node_id_mismatch");

    const missing = structuredClone(evidence);
    missing.metadata.run_id = "";
    expect(
      validateEvidence(missing, node.definition_of_done, node, 0, {
        lineage: { run_id: "run-1", node_id: "n1" },
      }).valid,
    ).toBe(false);
  });

  it("fails closed on shell exit codes and missing results", () => {
    const node = workerNode();
    node.capability = "shell.execute";
    const request = requestFor(node);

    const zero = evidenceFromShellResult(request, "shell", 0, "echo hi");
    expect(zero.evidence?.spec.checks[0]?.result).not.toBe("pass");
    expect(zero.evidence?.spec.checks[0]?.exit_code).toBe(0);

    const nonzero = evidenceFromShellResult(request, "shell", 2, "false");
    expect(nonzero.success).toBe(false);
    expect(nonzero.error?.code).toBe("NONZERO_EXIT");
    expect(nonzero.evidence?.spec.checks[0]?.exit_code).toBe(2);

    const timeout = evidenceFromShellResult(request, "shell", {
      exit_code: null,
      timed_out: true,
      command: "sleep 5",
    });
    expect(timeout.success).toBe(false);
    expect(timeout.error?.code).toBe("EXECUTOR_TIMEOUT");
    expect(timeout.evidence?.spec.status).toBe("failed");

    const missing = evidenceFromShellResult(request, "shell", undefined, "");
    expect(missing.success).toBe(false);
    expect(missing.error?.code).toBe("MALFORMED_SHELL_RESULT");

    const malformed = evidenceFromShellResult(request, "shell", { exit_code: "0" });
    expect(malformed.success).toBe(false);
    expect(malformed.error?.code).toBe("MALFORMED_SHELL_RESULT");
  });

  it("does not let confirmed or the request grant shell, write, network, or host inspect", () => {
    expect(
      authorize({
        capability: "shell.execute",
        permissions: { shell: true },
        context: { confirmed: true, allowShell: false },
      }).decision,
    ).toBe("deny");

    expect(
      authorize({
        capability: "filesystem.write",
        permissions: { filesystem: "write" },
        context: { confirmed: true },
      }).decision,
    ).toBe("deny");

    expect(
      authorize({
        capability: "browser.open",
        permissions: { network: true },
        context: { confirmed: true, allowNetwork: false },
      }).decision,
    ).toBe("deny");

    expect(
      authorize({
        capability: "system.inspect",
        context: { confirmed: true },
      }).decision,
    ).toBe("deny");

    expect(
      authorize({
        capability: "shell.execute",
        permissions: { shell: true },
        context: { allowShell: true },
      }).decision,
    ).toBe("allow");

    expect(
      authorize({
        capability: "system.inspect",
        context: { allowHostInspect: true },
      }).decision,
    ).toBe("allow");
  });

  it("rejects malformed preference files instead of returning an empty list", () => {
    const validDir = mkdtempSync(join(tmpdir(), "mem-ok-"));
    const mem = new FilesystemMemoryStore(validDir);
    mem.initFeature("feat", { ir_id: "feat", policy: "p" });
    mem.append("feat", {
      timestamp: "t",
      source: "user",
      type: "preference",
      content: "blue",
    });
    expect(new FilesystemMemoryStore(validDir).getPreferences("feat")).toHaveLength(1);

    const broken = mkdtempSync(join(tmpdir(), "mem-bad-"));
    const featDir = join(broken, "feat");
    mkdirSync(featDir);
    writeFileSync(join(featDir, "preferences.yaml"), "foo: 1\n");
    expect(() => new FilesystemMemoryStore(broken)).toThrow(MemoryFormatError);

    writeFileSync(join(featDir, "preferences.yaml"), "entries: nope\n");
    expect(() => new FilesystemMemoryStore(broken)).toThrow(MemoryFormatError);

    writeFileSync(join(featDir, "preferences.yaml"), ":\n  -");
    expect(() => new FilesystemMemoryStore(broken)).toThrow(MemoryFormatError);

    writeFileSync(join(featDir, "preferences.yaml"), "");
    expect(() => new FilesystemMemoryStore(broken)).toThrow(MemoryFormatError);

    writeFileSync(join(featDir, "preferences.yaml"), "entries:\n  - content: 1\n");
    expect(() => new FilesystemMemoryStore(broken)).toThrow(MemoryFormatError);

    const emptyDir = mkdtempSync(join(tmpdir(), "mem-empty-"));
    const emptyFeat = join(emptyDir, "feat");
    mkdirSync(emptyFeat);
    writeFileSync(join(emptyFeat, "preferences.yaml"), "entries: []\n");
    expect(new FilesystemMemoryStore(emptyDir).getPreferences("feat")).toHaveLength(0);
  });

  it("does not let the request grant shell and fails a nonzero shell command", async () => {
    const dir = mkdtempSync(join(tmpdir(), "shell-auth-"));
    const node = workerNode();
    node.capability = "shell.execute";
    node.constraints = { command: "echo hi" };
    const request = requestFor(node);
    request.authority_context = { allowShell: true, confirmed: true };
    const elevated = await createDeterministicProvider("shell", dir).execute(request);
    expect(elevated.success).toBe(false);
    expect(elevated.error?.code).toBe("AUTHORITY_DENIED");

    node.constraints = { command: "false" };
    const failed = await createDeterministicProvider("shell", dir, { allowShell: true }).execute(requestFor(node));
    expect(failed.success).toBe(false);
    expect(failed.error?.code).toBe("NONZERO_EXIT");
    expect(failed.evidence?.spec.checks[0]?.exit_code).toBe(1);
  });
});
