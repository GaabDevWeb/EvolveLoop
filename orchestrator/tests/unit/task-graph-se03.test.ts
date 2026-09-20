/**
 * SE-03 Engineering Task Graph — deterministic offline suite (no Ollama).
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  extractAndBuildArchitecture,
  extractAndBuildTaskGraph,
  buildTaskGraphFromProposal,
  buildInvalidTaskGraphFixtures,
  validateTaskGraph,
  createTaskGraphBaseline,
  createNextTaskGraphVersion,
  diffTaskGraphVersions,
  assertTaskGraphMutable,
  TaskGraphImmutabilityError,
  TaskGraphArtifactStore,
  runTaskGraphFromSpecs,
  buildTaskGraphFromAgentDecision,
  validateAgentDecisionPayload,
  applyAgentDecisionToPlan,
  EventBus,
  DefaultAgentExecutor,
  TestReasoningProvider,
  assembleAgentExecutionRequest,
  taskGraphGateAllowsExecution,
  toIrMappingHints,
  replaceTask,
  type RequirementsSpec,
  type AgentDecision,
} from "../../src/index.js";

function simpleApiRequirements(): RequirementsSpec {
  return {
    kind: "RequirementsSpec",
    apiVersion: "evolveloop.io/se/v1",
    requirements_id: "API-REQ",
    version: 1,
    project: "API",
    requirements: [
      {
        id: "REQ-001",
        title: "Create accounts",
        description: "Users can create accounts",
        type: "API",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "PRD" },
        acceptance_criteria: ["POST /accounts returns 201"],
      },
      {
        id: "REQ-002",
        title: "Authenticate",
        description: "Users can authenticate",
        type: "SECURITY",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "PRD" },
      },
      {
        id: "REQ-003",
        title: "Update profile",
        description: "Users can update profile",
        type: "API",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "PRD" },
      },
      {
        id: "REQ-004",
        title: "REST API",
        description: "Expose a REST API",
        type: "TECHNICAL_CONSTRAINT",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "CONSTRAINT" },
      },
      {
        id: "REQ-005",
        title: "PostgreSQL",
        description: "Use PostgreSQL",
        type: "TECHNICAL_CONSTRAINT",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "CONSTRAINT" },
      },
      {
        id: "REQ-006",
        title: "Automated tests",
        description: "Automated tests required",
        type: "NON_FUNCTIONAL",
        priority: "MUST",
        status: "PROPOSED",
        source: { type: "PRD" },
      },
    ],
    constraints: [
      { constraint_id: "C-001", statement: "Must use PostgreSQL", source: { type: "CONSTRAINT" } },
      { constraint_id: "C-002", statement: "Expose a REST API", source: { type: "CONSTRAINT" } },
    ],
    assumptions: [],
    open_questions: [],
    out_of_scope: [],
    created_at: new Date().toISOString(),
  };
}

function crmRequirements(): RequirementsSpec {
  const base = simpleApiRequirements();
  return {
    ...base,
    requirements_id: "CRM-REQ",
    project: "CRM",
    requirements: [
      ...base.requirements,
      ...["Users", "Companies", "Contacts", "Pipeline", "Deals", "Tasks", "Dashboard", "Frontend"].map(
        (title, i) => ({
          id: `REQ-${String(10 + i).padStart(3, "0")}`,
          title,
          description: `${title} in CRM MVP`,
          type: "FUNCTIONAL" as const,
          priority: "MUST" as const,
          status: "PROPOSED" as const,
          source: { type: "PRD" as const },
        }),
      ),
      {
        id: "REQ-020",
        title: "Mobile out of scope",
        description: "Mobile application is out of scope",
        type: "CONSTRAINT",
        priority: "OUT_OF_SCOPE",
        status: "ACCEPTED",
        source: { type: "PRD" },
      },
    ],
    out_of_scope: [
      { id: "OOS-001", statement: "Mobile application is out of scope", source: { type: "PRD" } },
    ],
  };
}

function pair(reqs: RequirementsSpec, archId: string, existing?: string[]) {
  const { spec: architecture } = extractAndBuildArchitecture({
    requirements: reqs,
    architecture_id: archId,
    project: reqs.project,
    existing_paths: existing,
  });
  return { requirements: reqs, architecture };
}

describe("SE-03 golden — simple API e2e", () => {
  it("Requirements+Architecture → TaskGraph with coherent deps", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph, validation } = extractAndBuildTaskGraph({
      ...input,
      task_graph_id: "API-TG",
      project: "API",
    });
    expect(graph.kind).toBe("EngineeringTaskGraph");
    expect(graph.requirements_reference.requirements_id).toBe("API-REQ");
    expect(graph.architecture_reference.architecture_id).toBe("API-ARCH");
    const titles = graph.tasks.map((t) => t.title.toLowerCase());
    expect(titles.some((t) => t.includes("database") || t.includes("schema"))).toBe(true);
    expect(titles.some((t) => t.includes("auth"))).toBe(true);
    expect(titles.some((t) => t.includes("account"))).toBe(true);
    expect(titles.some((t) => t.includes("profile"))).toBe(true);
    expect(titles.some((t) => t.includes("integration") || t.includes("test"))).toBe(true);
    expect(validation.unmapped_must).toEqual([]);
    expect(taskGraphGateAllowsExecution(validation)).toBe(true);
    expect(graph.tasks.every((t) => t.definition_of_done.length > 0 || t.priority !== "MUST")).toBe(
      true,
    );
    expect(toIrMappingHints(graph).length).toBe(graph.tasks.length);
  });
});

describe("SE-03 golden — CRM", () => {
  it("covers CRM domains without executing or generating app code", () => {
    const input = pair(crmRequirements(), "CRM-ARCH");
    const { graph, validation } = extractAndBuildTaskGraph({
      ...input,
      task_graph_id: "CRM-TG",
      project: "CRM",
    });
    expect(validation.errors.filter((e) => e.code === "UNMAPPED_MUST_REQUIREMENT")).toHaveLength(0);
    const blob = JSON.stringify(graph).toLowerCase();
    for (const token of ["auth", "contact", "compan", "deal", "pipeline", "dashboard", "test"]) {
      expect(blob.includes(token)).toBe(true);
    }
    expect(graph.tasks.some((t) => /mobile/i.test(t.title))).toBe(false);
    expect(JSON.stringify(graph)).not.toMatch(/CREATE TABLE|export default function/i);
  });
});

describe("SE-03 validation matrix", () => {
  it("under-decomposition rejected", () => {
    const input = pair(crmRequirements(), "CRM-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.under_decomposed, input);
    expect(validation.errors.some((e) => e.code === "UNDER_DECOMPOSED")).toBe(true);
  });

  it("over-decomposition flagged", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.over_decomposed, input);
    expect(
      validation.errors.some((e) => e.code === "OVER_DECOMPOSED") ||
        validation.warnings.some((w) => w.code === "OVER_DECOMPOSED"),
    ).toBe(true);
  });

  it("orphan Redis task rejected", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.orphan, input);
    expect(validation.errors.some((e) => e.code === "ORPHAN_TASK")).toBe(true);
  });

  it("unmapped MUST → BLOCKED", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.unmapped_must, input);
    expect(validation.errors.some((e) => e.code === "UNMAPPED_MUST_REQUIREMENT")).toBe(true);
    expect(["BLOCKED", "INVALID"]).toContain(validation.health);
  });

  it("dependency cycle → INVALID", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.cycle, input);
    expect(validation.errors.some((e) => e.code === "DEPENDENCY_CYCLE")).toBe(true);
    expect(validation.health).toBe("INVALID");
  });

  it("scope conflict without serialization", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.scope_conflict, input);
    expect(validation.errors.some((e) => e.code === "TASK_SCOPE_CONFLICT")).toBe(true);
  });

  it("policy-hostile task rejected", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.policy_hostile, input);
    expect(validation.errors.some((e) => e.code === "POLICY_BOUNDARY")).toBe(true);
  });

  it("k8s injection without architecture support rejected", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const fixtures = buildInvalidTaskGraphFixtures(input);
    const { validation } = buildTaskGraphFromProposal(fixtures.k8s_injection, input);
    expect(validation.errors.some((e) => e.code === "ORPHAN_TASK")).toBe(true);
  });

  it("brownfield EXISTING components use MODIFY when changed", () => {
    const input = pair(simpleApiRequirements(), "BF-ARCH", ["src/api", "src/db"]);
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "BF-TG" });
    const existingIds = new Set(
      input.architecture.components.filter((c) => c.origin === "EXISTING").map((c) => c.id),
    );
    const touchingExisting = graph.tasks.filter((t) =>
      (t.architecture_component_ids ?? []).some((id) => existingIds.has(id)),
    );
    expect(touchingExisting.length).toBeGreaterThan(0);
    expect(touchingExisting.some((t) => t.action === "MODIFY")).toBe(true);
  });
});

describe("SE-03 versioning / baseline / replacement", () => {
  it("baseline immutable; v2 diff + replacement lineage", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "API-TG" });
    const v1 = createTaskGraphBaseline(graph);
    expect(() => assertTaskGraphMutable(v1)).toThrow(TaskGraphImmutabilityError);

    const replaced = replaceTask(v1.tasks[0]!, { ...v1.tasks[0]!, title: v1.tasks[0]!.title + " v2" }, "replan");
    const v2 = createNextTaskGraphVersion(v1, [
      replaced,
      ...v1.tasks.slice(1),
    ], { replan_reason: "strategy change", decision_id: "dec-1" });
    expect(v2.version).toBe(2);
    expect(v2.parent_version).toBe(1);
    expect(replaced.parent_task_id).toBe(v1.tasks[0]!.id);
    const diff = diffTaskGraphVersions(v1, v2);
    expect(diff.added.length + diff.modified.length + diff.removed.length).toBeGreaterThan(0);
  });

  it("store refuses overwrite", () => {
    const dir = mkdtempSync(join(tmpdir(), "se03-tg-"));
    try {
      const store = new TaskGraphArtifactStore(dir);
      const input = pair(simpleApiRequirements(), "API-ARCH");
      const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "STORE-TG" });
      store.save(graph);
      expect(() => store.save(graph)).toThrow(TaskGraphImmutabilityError);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("SE-03 AgentDecision TASK_GRAPH_PROPOSAL", () => {
  it("rejects baseline=true; does not produce IR", () => {
    const bad = validateAgentDecisionPayload({
      decision_type: "TASK_GRAPH_PROPOSAL",
      reason: "done",
      proposed_task_graph: { task_graph_id: "X", version: 1, baseline: true, tasks: [] },
    });
    expect(bad.ok).toBe(false);

    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "API-TG" });
    const good = validateAgentDecisionPayload({
      decision_type: "TASK_GRAPH_PROPOSAL",
      reason: "decomposed",
      proposed_task_graph: graph as unknown as Record<string, unknown>,
    });
    expect(good.ok).toBe(true);
    if (good.ok) {
      const built = buildTaskGraphFromAgentDecision(good.decision, input);
      expect(built.graph.baseline).toBeFalsy();
      const applied = applyAgentDecisionToPlan(
        {
          success: true,
          decision: good.decision,
          agent_id: "a",
          agent_version: "0.1.0",
          duration_ms: 1,
        },
        "exec-1",
      );
      expect(applied.ok).toBe(false);
      expect(applied.code).toBe("DECISION_NOT_EXECUTABLE_AS_PLAN");
    }
  });

  it("AgentExecutor returns TASK_GRAPH_PROPOSAL", async () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "API-TG" });
    const provider = new TestReasoningProvider({
      payloadFactory: () => ({
        decision_type: "TASK_GRAPH_PROPOSAL",
        reason: "from test",
        proposed_task_graph: graph,
      }),
    });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(
      assembleAgentExecutionRequest({
        execution_id: "e1",
        task_id: "t1",
        attempt: 0,
        agent_id: "tg-agent",
        agent_version: "0.1.0",
        role: "task-decomposer",
        objective: "decompose",
        decision_mode: "TASK_GRAPH",
        policy_summary: { policy_id: "rapid-prototype" },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.decision?.decision_type).toBe("TASK_GRAPH_PROPOSAL");
  });
});

describe("SE-03 pipeline / telemetry / adversarial", () => {
  it("deterministic e2e pipeline + telemetry", () => {
    const bus = new EventBus();
    const dir = mkdtempSync(join(tmpdir(), "se03-pipe-"));
    try {
      const store = new TaskGraphArtifactStore(dir);
      const input = pair(simpleApiRequirements(), "API-ARCH");
      const result = runTaskGraphFromSpecs(
        { ...input, task_graph_id: "PIPE-TG", project: "API" },
        { bus, store, create_baseline: true, run_id: "run-se03" },
      );
      const types = bus.getEvents().map((e) => e.type);
      expect(types).toContain("TaskGraphGenerationStarted");
      expect(types).toContain("TaskGraphProposalProduced");
      expect(result.evidence.metadata.capability).toBe("tasks.decompose");
      expect(result.gate_allows_execution_planning).toBe(true);
      const yaml = readFileSync(result.meta!.path, "utf-8");
      expect(yaml).toContain("EngineeringTaskGraph");
      expect(yaml).not.toContain("CapabilityGraph");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("duplicate task id rejected", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "API-TG" });
    graph.tasks.push({ ...graph.tasks[0]! });
    const v = validateTaskGraph(graph, input.requirements, input.architecture);
    expect(v.errors.some((e) => e.code === "ID_COLLISION")).toBe(true);
  });

  it("secret material rejected", () => {
    const input = pair(simpleApiRequirements(), "API-ARCH");
    const { graph } = extractAndBuildTaskGraph({ ...input, task_graph_id: "API-TG" });
    graph.title = "password=supersecret api_key=sk-abcdefghijklmnop";
    const v = validateTaskGraph(graph, input.requirements, input.architecture);
    expect(v.errors.some((e) => e.code === "SECRET_MATERIAL")).toBe(true);
  });
});
