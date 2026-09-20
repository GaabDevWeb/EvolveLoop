/**
 * SE-05 Engineering Worker — real workspace E2E + adversarial suite.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  cpSync,
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import {
  EngineeringWorker,
  WorkerCheckpointStore,
  buildWorkRequest,
  fixtureCorrectAddOps,
  parseImplementationProposal,
  assertWorkspaceOpScope,
  isForbiddenPath,
  isAllowedTestCommand,
  classifyEngineeringFailure,
  buildValidationResult,
  applyWorkspaceOps,
  EventBus,
  Supervisor,
  AssignmentStore,
  SimulatedRuntimeBridge,
  DefaultAgentExecutor,
  TestReasoningProvider,
  defaultAgentCatalog,
  type EngineeringTaskGraph,
  type EngineeringTask,
} from "../../src/index.js";

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/se05-brownfield",
);

function copyFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), "se05-ws-"));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}

function baseWork(workspace_root: string, overrides: Record<string, unknown> = {}) {
  return buildWorkRequest({
    task_id: "TASK-IMPL-001",
    task_graph_id: "tg-se05",
    task_graph_version: 1,
    assignment_id: "asgn-se05-1",
    agent_id: "backend-agent",
    agent_version: "0.1.0",
    task_type: "IMPLEMENTATION",
    task_scope: ["src/**", "tests/**"],
    allowed_paths: ["src/**", "tests/**"],
    forbidden_paths: [".git/", ".env", "secrets/"],
    workspace_root,
    allowed_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
    forbidden_capabilities: ["unrestricted.shell", "shell.execute"],
    requirement_ids: ["REQ-ADD"],
    acceptance_criteria: ["add(2,3)===5", "existing multiply still works"],
    definition_of_done: ["files written", "npm test pass"],
    policy_id: "rapid-prototype",
    correlation: {
      run_id: "run-se05",
      execution_id: "exec-se05",
      assignment_id: "asgn-se05-1",
      task_id: "TASK-IMPL-001",
    },
    validation_commands: ["npm test"],
    budgets: {
      max_iterations: 4,
      max_repairs: 2,
      max_replans: 1,
      timeout_ms: 60_000,
    },
    expected_outputs: [{ ref: "math", path: "src/math.js" }],
    ...overrides,
  });
}

const goodProposal = {
  decision_type: "IMPLEMENTATION_PROPOSAL",
  proposal_id: "prop-good",
  operations: fixtureCorrectAddOps(),
  validation_commands: ["npm test"],
  expected_outputs: ["src/math.js", "tests/math.test.js"],
  rationale: "implement add + tests",
};

describe("SE-05 contracts / scope", () => {
  it("WorkRequest / proposal schema versioning", () => {
    const work = baseWork("/tmp/x");
    expect(work.kind).toBe("EngineeringWorkRequest");
    expect(work.apiVersion).toBe("evolveloop.io/se/v1");
    expect(work.sandbox).toBe("NOT_IMPLEMENTED");
  });

  it("rejects path traversal and forbidden paths", () => {
    expect(assertWorkspaceOpScope("../etc/passwd", {
      workspace_root: "/tmp/ws",
      allowed_paths: ["src/**"],
    }).ok).toBe(false);
    expect(isForbiddenPath(".git/config")).toBe(true);
    expect(isForbiddenPath("src/math.js")).toBe(false);
  });

  it("proposal outside scope → INVALID", () => {
    const work = baseWork("/tmp/ws");
    const parsed = parseImplementationProposal(
      {
        operations: [{ op: "replace_file", path: "/etc/passwd", content: "x" }],
      },
      work,
    );
    expect(parsed.ok).toBe(false);
  });

  it("test command allowlist", () => {
    expect(isAllowedTestCommand("npm test")).toBe(true);
    expect(isAllowedTestCommand("rm -rf /")).toBe(false);
  });

  it("classifyEngineeringFailure distinguishes repair vs replan vs block", () => {
    expect(classifyEngineeringFailure({ error_code: "POLICY_BLOCKED" }).action).toBe("block");
    expect(classifyEngineeringFailure({ error_code: "REQUIRES_REPLAN" }).action).toBe("replan");
    expect(
      classifyEngineeringFailure({
        validation: {
          kind: "EngineeringValidationResult",
          apiVersion: "evolveloop.io/se/v1",
          work_id: "w",
          task_id: "t",
          assignment_id: "a",
          implementation_valid: true,
          tests_valid: false,
          acceptance_criteria_valid: false,
          dod_valid: false,
          evidence_complete: true,
          policy_status: "ALLOW",
          outstanding_failures: ["test failed"],
          warnings: [],
          completion_decision: "REPAIR",
          files_changed: [],
          test_results: [],
          produced_at: new Date().toISOString(),
        },
      }).action,
    ).toBe("repair");
  });
});

describe("SE-05 real workspace E2E", () => {
  let ws: string;
  let cpDir: string;

  beforeEach(() => {
    ws = copyFixture();
    cpDir = mkdtempSync(join(tmpdir(), "se05-cp-"));
  });
  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
    rmSync(cpDir, { recursive: true, force: true });
  });

  it("brownfield: apply implementation → real npm test PASS → COMPLETE", async () => {
    const bus = new EventBus();
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(cpDir),
      eventBus: bus,
    });
    const work = baseWork(ws);
    const result = await worker.run(work, goodProposal);
    expect(result.ok).toBe(true);
    expect(result.phase).toBe("SUCCEEDED");
    expect(result.validation?.tests_valid).toBe(true);
    expect(result.validation?.completion_decision).toBe("COMPLETE");
    expect(result.evidence).toBeDefined();

    const math = readFileSync(join(ws, "src/math.js"), "utf-8");
    expect(math).toContain("return a + b");
    expect(math).toContain("multiply");

    const types = bus.getEvents().map((e) => e.type);
    expect(types).toContain("WorkspaceChangeCompleted");
    expect(types).toContain("TestExecutionCompleted");
    expect(types).toContain("EngineeringTaskCompleted");
  }, 90_000);

  it("negative: bad impl → TEST_FAIL → repair → PASS (failure preserved in evidence trail)", async () => {
    const bus = new EventBus();
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(cpDir),
      eventBus: bus,
      repairProposer: ({ attempt }) => {
        if (attempt >= 1) {
          return {
            kind: "ImplementationProposal",
            apiVersion: "evolveloop.io/se/v1",
            proposal_id: `repair-${attempt}`,
            task_id: "TASK-IMPL-001",
            assignment_id: "asgn-se05-1",
            operations: fixtureCorrectAddOps(),
            validation_commands: ["npm test"],
            expected_outputs: ["src/math.js"],
          };
        }
        return null;
      },
    });
    const work = baseWork(ws);
    const bad = {
      decision_type: "IMPLEMENTATION_PROPOSAL",
      operations: [
        {
          op: "replace_file",
          path: "src/math.js",
          content: `export function multiply(a, b) { return a * b; }\nexport function add(a, b) { return a - b; }\n`,
        },
        {
          op: "replace_file",
          path: "tests/math.test.js",
          content: `import { test } from "node:test";\nimport assert from "node:assert/strict";\nimport { add, multiply } from "../src/math.js";\ntest("multiply", () => assert.equal(multiply(3,4), 12));\ntest("add", () => assert.equal(add(2,3), 5));\n`,
        },
      ],
      validation_commands: ["npm test"],
      expected_outputs: ["src/math.js"],
    };
    const result = await worker.run(work, bad);
    expect(result.ok).toBe(true);
    expect(result.repair_attempted).toBe(true);
    expect(result.phase).toBe("SUCCEEDED");
    expect(bus.getEvents().some((e) => e.type === "RepairStarted")).toBe(true);
    expect(bus.getEvents().some((e) => e.type === "TestExecutionCompleted" && e.payload.passed === false)).toBe(true);
  }, 120_000);

  it("idempotent re-apply does not duplicate content", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(cpDir),
    });
    const work = baseWork(ws);
    const r1 = await worker.run(work, goodProposal);
    expect(r1.ok).toBe(true);
    const content1 = readFileSync(join(ws, "src/math.js"), "utf-8");
    const r2 = await worker.run(work, goodProposal);
    expect(r2.ok).toBe(true);
    expect(readFileSync(join(ws, "src/math.js"), "utf-8")).toBe(content1);
  }, 120_000);

  it("crash recovery: checkpoint mid-apply → recover → continue", async () => {
    const store = new WorkerCheckpointStore(cpDir);
    const work = baseWork(ws);
    store.save({
      kind: "EngineeringWorkerCheckpoint",
      apiVersion: "evolveloop.io/se/v1",
      work_id: work.work_id,
      phase: "APPLYING",
      assignment_id: work.assignment_id,
      task_id: work.task_id,
      iteration: 0,
      repair_attempt: 0,
      replan_attempt: 0,
      applied_effects: [],
      updated_at: new Date().toISOString(),
    });
    const worker = new EngineeringWorker({ checkpointStore: store });
    const recovered = worker.recover(work.work_id);
    expect(recovered?.phase).toBe("RECOVERING");
    const result = await worker.run(work, goodProposal);
    expect(result.ok).toBe(true);
  }, 90_000);

  it("policy deny blocks workspace write", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(cpDir),
      denied_capabilities: ["filesystem.write"],
    });
    const result = await worker.run(baseWork(ws), goodProposal);
    expect(result.ok).toBe(false);
    expect(result.phase).toBe("BLOCKED");
  }, 30_000);

  it("Agent fake TEST_PASS without runtime is rejected by validation contract", () => {
    const v = buildValidationResult({
      work: baseWork(ws),
      files_changed: ["src/math.js"],
      test_results: [],
      policy_status: "ALLOW",
      implementation_ok: true,
    });
    expect(v.tests_valid).toBe(false);
    expect(v.completion_decision).not.toBe("COMPLETE");
  });
});

describe("SE-05 adversarial authority", () => {
  let ws: string;
  let cpDir: string;
  beforeEach(() => {
    ws = copyFixture();
    cpDir = mkdtempSync(join(tmpdir(), "se05-adv-"));
  });
  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
    rmSync(cpDir, { recursive: true, force: true });
  });

  const cases = [
    { path: "../secret.txt", label: "traversal" },
    { path: ".git/config", label: "git config" },
    { path: ".env", label: "secret env" },
    { path: "secrets/token", label: "secrets dir" },
  ];

  for (const c of cases) {
    it(`rejects write to ${c.label}`, async () => {
      const work = baseWork(ws);
      const parsed = parseImplementationProposal(
        {
          operations: [{ op: "replace_file", path: c.path, content: "hacked" }],
        },
        work,
      );
      expect(parsed.ok).toBe(false);
    });
  }

  it("rejects disallowed shell-like test command", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(cpDir),
    });
    const work = baseWork(ws, { validation_commands: ["curl http://evil"] });
    // proposal with only validation that isn't allowlisted → select falls back or empty filtered
    const result = await worker.run(work, {
      ...goodProposal,
      validation_commands: ["curl http://evil"],
    });
    // either fails validation (no tests) or blocked — never COMPLETE with fake pass
    expect(result.validation?.completion_decision === "COMPLETE" && result.ok).toBeFalsy();
  }, 90_000);

  it("applyWorkspaceOps refuses capability not on WorkRequest", async () => {
    const work = baseWork(ws, {
      allowed_capabilities: ["filesystem.read"],
    });
    const r = await applyWorkspaceOps(work, [
      { op: "replace_file", path: "src/math.js", content: "x" },
    ]);
    expect(r.ok).toBe(false);
    expect(r.error_code).toBe("CAPABILITY_NOT_ALLOWED");
  });
});

describe("SE-05 Supervisor multi-task readiness + roles", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se05-sup-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function task(partial: Partial<EngineeringTask> & Pick<EngineeringTask, "id" | "title">): EngineeringTask {
    return {
      description: partial.title,
      type: "IMPLEMENTATION",
      priority: "MUST",
      status: "READY",
      requirement_ids: ["REQ-1"],
      dependencies: [],
      required_capabilities: ["filesystem.write"],
      preferred_agent_role: "backend",
      definition_of_done: ["done"],
      scope: ["src/**"],
      ...partial,
    };
  }

  it("A→B→C: B/C not ready until predecessors complete", () => {
    const graph: EngineeringTaskGraph = {
      kind: "EngineeringTaskGraph",
      apiVersion: "evolveloop.io/se/v1",
      task_graph_id: "tg-chain",
      version: 1,
      requirements_reference: { requirements_id: "R", requirements_version: 1 },
      architecture_reference: { architecture_id: "A", architecture_version: 1 },
      created_at: new Date().toISOString(),
      tasks: [
        task({ id: "TASK-A", title: "impl", preferred_agent_role: "backend" }),
        task({
          id: "TASK-B",
          title: "tests",
          type: "TEST",
          preferred_agent_role: "testing",
          required_capabilities: ["test.run"],
          dependencies: [{ task_id: "TASK-A" }],
        }),
        task({
          id: "TASK-C",
          title: "validate",
          type: "VALIDATION",
          preferred_agent_role: "testing",
          required_capabilities: ["test.run"],
          dependencies: [{ task_id: "TASK-B" }],
        }),
      ],
    };
    const store = new AssignmentStore(dir);
    const supervisor = new Supervisor({
      supervisor_id: "sup-se05",
      store,
      agentExecutor: new DefaultAgentExecutor({
        provider: new TestReasoningProvider({ scenario: "valid_action" }),
      }),
      runtimeBridge: new SimulatedRuntimeBridge(),
      agents: defaultAgentCatalog(),
    });
    supervisor.bindTaskGraph(graph);
    expect(supervisor.listReady(graph).map((t) => t.id)).toEqual(["TASK-A"]);
    supervisor.getState().tasks["TASK-A"]!.status = "COMPLETED";
    expect(supervisor.listReady(graph).map((t) => t.id)).toEqual(["TASK-B"]);
  });
});
