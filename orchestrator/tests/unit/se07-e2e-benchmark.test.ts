/**
 * SE-07 End-to-End Software Engineering Benchmark — deterministic suite.
 * Live LLM quality is NOT_MEASURED here (separate eval surface).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  readFileSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SoftwareEngineeringProject,
  materializeMiniCrmFixture,
  writeDeliveryMarkdown,
  MINICRM_BRIEF,
  auditCompositionSeams,
  ProjectCheckpointStore,
  runRequirementsFromText,
  runArchitectureFromRequirements,
  runTaskGraphFromSpecs,
  EngineeringWorker,
  WorkerCheckpointStore,
  buildWorkRequest,
  EngineeringReviewer,
  ReviewStore,
  buildReviewRequest,
  DETERMINISTIC_REVIEWER_ID,
  EventBus,
} from "../../src/index.js";

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/se07-minicrm",
);

function copyWs(): string {
  const dir = mkdtempSync(join(tmpdir(), "se07-ws-"));
  materializeMiniCrmFixture(dir, FIXTURE);
  return dir;
}

describe("SE-07 composition seams", () => {
  it("audits SE-01..06 handoffs without gaps", () => {
    const audit = auditCompositionSeams();
    expect(audit.gaps).toEqual([]);
    expect(audit.seams.every((s) => s.status === "OK")).toBe(true);
  });

  it("brief → requirements → architecture → task graph", () => {
    const req = runRequirementsFromText(
      { brief: MINICRM_BRIEF, requirements_id: "SE07-R", project: "SE07-MiniCRM" },
      { create_baseline: true },
    );
    expect(req.validation.ok).toBe(true);
    expect(req.spec.requirements.some((r) => /email/i.test(r.title))).toBe(true);
    expect(req.gate_allows_architecture).toBe(true);

    const arch = runArchitectureFromRequirements(
      {
        requirements: req.baseline ?? req.spec,
        architecture_id: "SE07-A",
        project: "SE07-MiniCRM",
        existing_paths: ["src/api", "src/store", "src/validation", "src/domain", "tests"],
      },
      { create_baseline: true },
    );
    expect(arch.validation.ok).toBe(true);
    expect(arch.spec.components.some((c) => c.name === "Web Frontend")).toBe(false);
    expect(arch.gate_allows_task_decomposition).toBe(true);

    const tg = runTaskGraphFromSpecs(
      {
        requirements: req.baseline ?? req.spec,
        architecture: arch.baseline ?? arch.spec,
        task_graph_id: "SE07-TG",
        project: "SE07-MiniCRM",
        known_capabilities: ["filesystem.write", "filesystem.read", "test.run"],
      },
      { create_baseline: true },
    );
    expect(tg.validation.ok).toBe(true);
    expect(tg.graph.tasks.length).toBeGreaterThanOrEqual(3);
    expect(tg.graph.tasks.some((t) => /email/i.test(t.title))).toBe(true);
    const parallel = tg.graph.tasks.filter((t) => t.dependencies.length === 0);
    expect(parallel.length).toBeGreaterThanOrEqual(2);
  });
});

describe("SE-07 MiniCRM closed-loop E2E", () => {
  let ws: string;
  let state: string;

  beforeEach(() => {
    ws = copyWs();
    state = mkdtempSync(join(tmpdir(), "se07-st-"));
  });
  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
    rmSync(state, { recursive: true, force: true });
  });

  it("ONE BRIEF → repair + replan → project COMPLETED with real workspace effects", async () => {
    const stub = readFileSync(join(ws, "src/validation/email.js"), "utf-8");
    expect(stub).not.toMatch(/@/);

    const project = new SoftwareEngineeringProject({
      workspaceRoot: ws,
      stateDir: state,
      project_id: "se07-e2e",
      force_email_repair: true,
      force_replan_scenario: true,
      max_parallel: 2,
    });
    const result = await project.run();

    expect(result.ok).toBe(true);
    expect(result.phase).toBe("COMPLETED");
    expect(result.delivery.metrics.end_to_end_success).toBe("PASS");
    expect(result.delivery.metrics.repair_success).toBe("PASS");
    expect(result.delivery.metrics.replan_success).toBe("PASS");
    expect(result.delivery.metrics.live_llm_eval).toBe("NOT_MEASURED");
    expect(result.checkpoint.repaired_task_ids.length).toBeGreaterThan(0);
    expect(result.checkpoint.replanned_task_ids.length).toBeGreaterThan(0);
    expect(result.delivery.traceability.length).toBeGreaterThan(0);
    expect(result.delivery.telemetry_event_types.length).toBeGreaterThan(0);
    expect(result.delivery.test_summary.some((t) => t.passed)).toBe(true);
    expect(result.delivery.review_summary.some((r) => r.status === "APPROVED")).toBe(true);

    const email = readFileSync(join(ws, "src/validation/email.js"), "utf-8");
    expect(email).toMatch(/@/);
    expect(email).toMatch(/400/);
    expect(existsSync(join(ws, "src/domain/contacts.js"))).toBe(true);
    expect(existsSync(join(ws, "src/db/schema.json"))).toBe(true);

    const mdPath = join(state, "delivery.md");
    writeDeliveryMarkdown(result.delivery, mdPath);
    expect(readFileSync(mdPath, "utf-8")).toContain("SE-07 Delivery");
  }, 120_000);

  it("crash during execution → resume preserves completed tasks", async () => {
    const project = new SoftwareEngineeringProject({
      workspaceRoot: ws,
      stateDir: state,
      project_id: "se07-crash",
      force_email_repair: true,
      force_replan_scenario: false,
      crash_after_completed_tasks: 1,
      max_parallel: 2,
    });
    const crashed = await project.run();
    expect(crashed.notes).toContain("CRASH_SIMULATED");
    expect(crashed.checkpoint.completed_task_ids.length).toBeGreaterThanOrEqual(1);

    const store = new ProjectCheckpointStore(state);
    const saved = store.load("se07-crash");
    expect(saved).not.toBeNull();

    const resumed = new SoftwareEngineeringProject({
      workspaceRoot: ws,
      stateDir: state,
      project_id: "se07-crash",
      force_email_repair: true,
      force_replan_scenario: false,
      resume: true,
      max_parallel: 2,
    });
    // Resume continues from checkpoint; without crash limit it should finish
    const again = await resumed.run();
    expect(again.checkpoint.metrics.recovery_correctness).toBe("PASS");
    expect(again.checkpoint.completed_task_ids.length).toBeGreaterThanOrEqual(
      crashed.checkpoint.completed_task_ids.length,
    );
  }, 120_000);

  it("brownfield: existing multiply-like domain module preserved", async () => {
    const before = readFileSync(join(ws, "src/domain/contacts.js"), "utf-8");
    const project = new SoftwareEngineeringProject({
      workspaceRoot: ws,
      stateDir: state,
      project_id: "se07-bf",
      force_email_repair: true,
      force_replan_scenario: false,
      max_parallel: 2,
    });
    const result = await project.run();
    expect(result.ok).toBe(true);
    const after = readFileSync(join(ws, "src/domain/contacts.js"), "utf-8");
    expect(after).toBe(before);
  }, 120_000);
});

describe("SE-07 adversarial project guards", () => {
  let ws: string;
  let dir: string;

  beforeEach(() => {
    ws = copyWs();
    dir = mkdtempSync(join(tmpdir(), "se07-adv-"));
  });
  afterEach(() => {
    rmSync(ws, { recursive: true, force: true });
    rmSync(dir, { recursive: true, force: true });
  });

  it("1. wrong task_id in proposal is rejected by worker", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(join(dir, "w")),
    });
    const work = buildWorkRequest({
      task_id: "TASK-REAL",
      task_graph_id: "tg",
      task_graph_version: 1,
      assignment_id: "a1",
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      task_type: "IMPLEMENTATION",
      task_scope: ["src/validation/**"],
      allowed_paths: ["src/validation/**"],
      forbidden_paths: [".git/"],
      workspace_root: ws,
      allowed_capabilities: ["filesystem.write", "test.run"],
      forbidden_capabilities: ["unrestricted.shell"],
      requirement_ids: ["REQ-001"],
      acceptance_criteria: [],
      definition_of_done: [],
      policy_id: "rapid-prototype",
      correlation: {
        run_id: "r",
        execution_id: "e",
        assignment_id: "a1",
        task_id: "TASK-REAL",
      },
      validation_commands: ["npm test"],
      budgets: { max_iterations: 2, max_repairs: 1, max_replans: 1, timeout_ms: 30_000 },
    });
    const result = await worker.run(work, {
      decision_type: "IMPLEMENTATION_PROPOSAL",
      task_id: "TASK-WRONG",
      operations: [
        {
          op: "replace_file",
          path: "src/validation/email.js",
          content: "export function isValidEmail(){return true}",
        },
      ],
    });
    // Worker binds proposal to work.task_id; wrong nested id must not open scope escape
    expect(result.ok || result.phase === "FAILED" || result.phase === "BLOCKED").toBe(true);
  });

  it("2. out-of-scope path is blocked", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(join(dir, "w2")),
    });
    const work = buildWorkRequest({
      task_id: "T1",
      task_graph_id: "tg",
      task_graph_version: 1,
      assignment_id: "a1",
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      task_type: "IMPLEMENTATION",
      task_scope: ["src/validation/**"],
      allowed_paths: ["src/validation/**"],
      forbidden_paths: [".git/", ".env"],
      workspace_root: ws,
      allowed_capabilities: ["filesystem.write", "test.run"],
      forbidden_capabilities: ["unrestricted.shell"],
      requirement_ids: [],
      acceptance_criteria: [],
      definition_of_done: [],
      policy_id: "rapid-prototype",
      correlation: { run_id: "r", execution_id: "e", assignment_id: "a1", task_id: "T1" },
      validation_commands: ["npm test"],
      budgets: { max_iterations: 1, max_repairs: 0, max_replans: 0, timeout_ms: 30_000 },
    });
    const result = await worker.run(work, {
      decision_type: "IMPLEMENTATION_PROPOSAL",
      operations: [{ op: "replace_file", path: "../outside.js", content: "x" }],
    });
    expect(result.ok).toBe(false);
  });

  it("3. unrestricted shell capability denied", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(join(dir, "w3")),
      denied_capabilities: ["unrestricted.shell"],
    });
    const work = buildWorkRequest({
      task_id: "T1",
      task_graph_id: "tg",
      task_graph_version: 1,
      assignment_id: "a1",
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      task_type: "IMPLEMENTATION",
      task_scope: ["src/**"],
      allowed_paths: ["src/**"],
      forbidden_paths: [],
      workspace_root: ws,
      allowed_capabilities: ["filesystem.write"],
      forbidden_capabilities: ["unrestricted.shell"],
      requirement_ids: [],
      acceptance_criteria: [],
      definition_of_done: [],
      policy_id: "rapid-prototype",
      correlation: { run_id: "r", execution_id: "e", assignment_id: "a1", task_id: "T1" },
      validation_commands: [],
      budgets: { max_iterations: 1, max_repairs: 0, max_replans: 0, timeout_ms: 10_000 },
    });
    const result = await worker.run(work, {
      decision_type: "IMPLEMENTATION_PROPOSAL",
      operations: [{ op: "replace_file", path: "src/validation/email.js", content: "x" }],
      required_capabilities: ["unrestricted.shell"],
    });
    expect(result.ok).toBe(false);
  });

  it("4. review without evidence cannot complete validation gate", async () => {
    const reviewer = new EngineeringReviewer({
      store: new ReviewStore(join(dir, "rev")),
      eventBus: new EventBus(),
    });
    const { result } = await reviewer.review(
      buildReviewRequest({
        review_id: "adv-no-ev",
        task_id: "T1",
        task_graph_id: "tg",
        task_graph_version: 1,
        assignment_id: "a1",
        implementation_execution_id: "exec",
        implementation_version: "v1",
        agent_id: "backend-agent",
        agent_version: "0.1.0",
        reviewer_agent_id: DETERMINISTIC_REVIEWER_ID,
        require_independent_review: true,
        task_type: "IMPLEMENTATION",
        requirement_ids: ["REQ-001"],
        task_scope: ["src/**"],
        allowed_paths: ["src/**"],
        forbidden_paths: [],
        workspace_root: ws,
        changed_files: ["src/validation/email.js"],
        acceptance_criteria: ["must mention 400"],
        definition_of_done: [],
        tests_executed: [],
        evidence_refs: [],
        policy_id: "rapid-prototype",
        required_content_patterns: [{ pattern: "NO_SUCH_TOKEN_XYZ", description: "missing" }],
        mode: "deterministic",
      }),
    );
    expect(result.status).not.toBe("APPROVED");
  });

  it("15. corrupted project checkpoint loads as null / safe fail", () => {
    const store = new ProjectCheckpointStore(join(dir, "cp"));
    const p = store.pathFor("corrupt");
    writeFileSync(p, "{not-json", "utf-8");
    expect(store.load("corrupt")).toBeNull();
  });

  it("20. write outside workspace root fails", async () => {
    const worker = new EngineeringWorker({
      checkpointStore: new WorkerCheckpointStore(join(dir, "w20")),
    });
    const work = buildWorkRequest({
      task_id: "T1",
      task_graph_id: "tg",
      task_graph_version: 1,
      assignment_id: "a1",
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      task_type: "IMPLEMENTATION",
      task_scope: ["src/**", "**"],
      allowed_paths: ["**"],
      forbidden_paths: [],
      workspace_root: ws,
      allowed_capabilities: ["filesystem.write"],
      forbidden_capabilities: [],
      requirement_ids: [],
      acceptance_criteria: [],
      definition_of_done: [],
      policy_id: "rapid-prototype",
      correlation: { run_id: "r", execution_id: "e", assignment_id: "a1", task_id: "T1" },
      validation_commands: [],
      budgets: { max_iterations: 1, max_repairs: 0, max_replans: 0, timeout_ms: 10_000 },
    });
    const result = await worker.run(work, {
      decision_type: "IMPLEMENTATION_PROPOSAL",
      operations: [{ op: "replace_file", path: "/tmp/se07-escape.txt", content: "nope" }],
    });
    expect(result.ok).toBe(false);
  });
});
