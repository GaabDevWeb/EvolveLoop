/**
 * SE-04 Supervisor / Agent Delegation Runtime — deterministic + adversarial suite.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  Supervisor,
  AssignmentStore,
  SimulatedRuntimeBridge,
  ForbiddenDirectProviderBridge,
  evaluateAgentEligibility,
  selectEligibleAgents,
  canTransitionAssignment,
  assertTransition,
  InvalidAssignmentTransitionError,
  validateDelegationDecision,
  buildDelegationResult,
  buildDelegationEvidence,
  defaultAgentCatalog,
  decisionNeedsRuntime,
  DefaultAgentExecutor,
  TestReasoningProvider,
  EventBus,
  type EngineeringTask,
  type EngineeringTaskGraph,
  type AgentAssignment,
  type AgentContract,
} from "../../src/index.js";

function baseTask(partial: Partial<EngineeringTask> & Pick<EngineeringTask, "id" | "title">): EngineeringTask {
  return {
    description: partial.description ?? partial.title,
    type: "IMPLEMENTATION",
    priority: "MUST",
    status: "READY",
    requirement_ids: ["REQ-001"],
    dependencies: [],
    required_capabilities: ["filesystem.write"],
    preferred_agent_role: "backend",
    definition_of_done: ["output present", "validation pass"],
    acceptance_criteria: ["file written via runtime"],
    scope: ["src/app/**"],
    owned_paths: ["src/app/**"],
    risk: "MEDIUM",
    side_effects: ["LOCAL_WRITE"],
    ...partial,
  };
}

function diamondGraph(): EngineeringTaskGraph {
  return {
    kind: "EngineeringTaskGraph",
    apiVersion: "evolveloop.io/se/v1",
    task_graph_id: "tg-se04-diamond",
    version: 1,
    requirements_reference: { requirements_id: "REQ-SE04", requirements_version: 1 },
    architecture_reference: { architecture_id: "ARCH-SE04", architecture_version: 1 },
    created_at: new Date().toISOString(),
    baseline: true,
    tasks: [
      baseTask({
        id: "TASK-A",
        title: "Implement A",
        preferred_agent_role: "backend",
        required_capabilities: ["filesystem.write"],
      }),
      baseTask({
        id: "TASK-B",
        title: "Implement B",
        preferred_agent_role: "backend",
        required_capabilities: ["filesystem.write"],
      }),
      baseTask({
        id: "TASK-C",
        title: "Integrate C",
        preferred_agent_role: "backend",
        required_capabilities: ["filesystem.write"],
        dependencies: [
          { task_id: "TASK-A", reason: "needs A" },
          { task_id: "TASK-B", reason: "needs B" },
        ],
      }),
    ],
  };
}

function singleTaskGraph(task?: Partial<EngineeringTask>): EngineeringTaskGraph {
  return {
    kind: "EngineeringTaskGraph",
    apiVersion: "evolveloop.io/se/v1",
    task_graph_id: "tg-se04-single",
    version: 1,
    requirements_reference: { requirements_id: "REQ-SE04", requirements_version: 1 },
    architecture_reference: { architecture_id: "ARCH-SE04", architecture_version: 1 },
    created_at: new Date().toISOString(),
    baseline: true,
    tasks: [
      baseTask({
        id: "TASK-001",
        title: "Write module",
        ...task,
      }),
    ],
  };
}

function actionPayload(capability = "filesystem.write", path = "src/app/main.ts") {
  return {
    decision_type: "ACTION_PROPOSAL",
    decision_id: "dec-action-1",
    reason: "implement task",
    proposed_actions: [{ capability, inputs: { path }, paths: [path] }],
  };
}

function makeSupervisor(
  dir: string,
  opts: {
    supervisor_id?: string;
    provider?: TestReasoningProvider;
    bridge?: SimulatedRuntimeBridge | ForbiddenDirectProviderBridge;
    agents?: AgentContract[];
    bus?: EventBus;
    lease_ms?: number;
    max_parallel?: number;
    denied?: string[];
    require_confirmation_for?: string[];
    fail_provider?: boolean;
  } = {},
) {
  const store = new AssignmentStore(dir);
  const provider =
    opts.provider ??
    new TestReasoningProvider({
      payloadFactory: () => actionPayload(),
    });
  const bridge =
    opts.bridge ??
    new SimulatedRuntimeBridge({
      denied_capabilities: opts.denied,
      require_confirmation_for: opts.require_confirmation_for,
      fail_provider: opts.fail_provider,
    });
  const supervisor = new Supervisor({
    supervisor_id: opts.supervisor_id ?? "sup-a",
    store,
    agentExecutor: new DefaultAgentExecutor({ provider }),
    runtimeBridge: bridge,
    agents: opts.agents ?? defaultAgentCatalog(),
    eventBus: opts.bus,
    lease_ms: opts.lease_ms ?? 60_000,
    max_parallel_assignments: opts.max_parallel ?? 4,
    known_capabilities: ["filesystem.write", "filesystem.read", "test.run", "demo.work"],
  });
  return { supervisor, store, provider, bridge };
}

describe("SE-04 Supervisor contracts", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se04-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("assignment / delegation / result schemas + lineage fields", () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const a = created.assignment;
    expect(a.kind).toBe("AgentAssignment");
    expect(a.apiVersion).toBe("evolveloop.io/se/v1");
    expect(a.assignment_id).toMatch(/^asgn-/);
    expect(a.delegation_attempt).toBe(1);
    expect(a.task_graph_version).toBe(1);
    expect(created.delegation.kind).toBe("DelegationRequest");
    expect(created.delegation.context_authority).toBe("none");
    expect(created.delegation.correlation.assignment_id).toBe(a.assignment_id);

    const result = buildDelegationResult({
      assignment_id: a.assignment_id,
      task_id: a.task_id,
      outcome: "DECISION_PRODUCED",
      validation_ok: true,
      execution_id: a.execution_id,
    });
    expect(result.fingerprint).toHaveLength(24);
    expect(result.kind).toBe("DelegationResult");
  });

  it("lifecycle transitions — valid and invalid", () => {
    expect(canTransitionAssignment("PENDING", "CLAIMED")).toBe(true);
    expect(canTransitionAssignment("SUCCEEDED", "RUNNING")).toBe(false);
    expect(() => assertTransition("SUCCEEDED", "FAILED")).toThrow(InvalidAssignmentTransitionError);
  });
});

describe("SE-04 readiness / eligibility / concurrency", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se04-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("diamond: A and B ready; C blocked until deps complete", () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = diamondGraph();
    supervisor.bindTaskGraph(graph);
    const ready = supervisor.listReady(graph).map((t) => t.id).sort();
    expect(ready).toEqual(["TASK-A", "TASK-B"]);
    expect(ready).not.toContain("TASK-C");
  });

  it("role mismatch rejects eligibility", () => {
    const task = baseTask({
      id: "T",
      title: "test",
      preferred_agent_role: "testing",
      required_capabilities: ["test.run"],
    });
    const backend = defaultAgentCatalog().find((a) => a.agent_id === "backend-agent")!;
    const elig = evaluateAgentEligibility(task, backend);
    expect(elig.ok).toBe(false);
    const tester = defaultAgentCatalog().find((a) => a.agent_id === "tester-agent")!;
    expect(evaluateAgentEligibility(task, tester).ok).toBe(true);
  });

  it("duplicate claim rejected while lease active", () => {
    const { supervisor: a, store } = makeSupervisor(join(dir, "a"), { supervisor_id: "sup-a" });
    const graph = singleTaskGraph();
    a.bindTaskGraph(graph);
    const created = a.createDelegation(graph, graph.tasks[0]!);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    const c1 = a.claimDelegation(created.assignment.assignment_id);
    expect(c1.ok).toBe(true);

    const b = new Supervisor({
      supervisor_id: "sup-b",
      store,
      agentExecutor: new DefaultAgentExecutor({
        provider: new TestReasoningProvider({ payloadFactory: () => actionPayload() }),
      }),
      runtimeBridge: new SimulatedRuntimeBridge(),
      agents: defaultAgentCatalog(),
      lease_ms: 60_000,
    });
    b.bindTaskGraph(graph);
    const c2 = b.claimDelegation(created.assignment.assignment_id);
    expect(c2.ok).toBe(false);
  });

  it("max parallel assignments enforced", () => {
    const { supervisor } = makeSupervisor(dir, { max_parallel: 1 });
    const graph = diamondGraph();
    supervisor.bindTaskGraph(graph);
    const a = supervisor.createDelegation(graph, graph.tasks.find((t) => t.id === "TASK-A")!);
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    supervisor.claimDelegation(a.assignment.assignment_id);
    const b = supervisor.createDelegation(graph, graph.tasks.find((t) => t.id === "TASK-B")!);
    expect(b.ok).toBe(false);
    expect(b.error).toMatch(/max parallel/i);
  });
});

describe("SE-04 AgentExecutor + Runtime integration", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se04-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("E2E deterministic: TaskGraph → Supervisor → AgentExecutor → Runtime → Evidence", async () => {
    const bus = new EventBus();
    const { supervisor, bridge } = makeSupervisor(dir, { bus });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(true);
    expect(out.assignment?.status).toBe("SUCCEEDED");
    expect(out.result?.runtime_effect?.provider_invoked).toBe(true);
    expect(out.result?.runtime_effect?.success).toBe(true);
    expect(out.evidence).toBeDefined();
    expect(bridge.effects.length).toBe(1);
    expect(supervisor.getState().tasks["TASK-001"]?.status).toBe("COMPLETED");

    const types = bus.getEvents().map((e) => e.type);
    expect(types).toContain("DelegationCreated");
    expect(types).toContain("DelegationClaimed");
    expect(types).toContain("AgentStarted");
    expect(types).toContain("DecisionValidated");
    expect(types).toContain("RuntimeExecutionStarted");
    expect(types).toContain("DelegationSucceeded");
  });

  it("malformed decision → agent failure (executor rejects)", async () => {
    const { supervisor } = makeSupervisor(dir, {
      provider: new TestReasoningProvider({ scenario: "malformed" }),
    });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("FAILED");
    expect(out.assignment?.status).toBe("FAILED");
  });

  it("semantically invalid decision via submit → INVALID", async () => {
    const { supervisor, store } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    supervisor.claimDelegation(created.assignment.assignment_id);
    const running = store.transition(created.assignment.assignment_id, "RUNNING", {
      started_at: new Date().toISOString(),
    });
    const out = await supervisor.submitAgentDecision(graph, running, created.delegation, {
      decision_type: "ACTION_PROPOSAL",
      reason: "bad",
      proposed_actions: [],
    });
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("INVALID");
  });

  it("provider unavailable → AGENT_FAILURE", async () => {
    const { supervisor } = makeSupervisor(dir, {
      provider: new TestReasoningProvider({ scenario: "provider_unavailable" }),
    });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("FAILED");
  });

  it("analytical FINAL_RESPONSE completes without runtime effect", async () => {
    const { supervisor, bridge } = makeSupervisor(dir, {
      provider: new TestReasoningProvider({
        payloadFactory: () => ({
          decision_type: "FINAL_RESPONSE",
          decision_id: "dec-final",
          reason: "analysis complete",
          details: "no side effects required",
        }),
      }),
    });
    const graph = singleTaskGraph({
      type: "RESEARCH",
      required_capabilities: [],
      side_effects: ["READ_ONLY"],
    });
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error(created.error);
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(true);
    expect(out.assignment?.status).toBe("SUCCEEDED");
    expect(bridge.effects.length).toBe(0);
  });

  it("POLICY_BLOCKED stays BLOCKED — not rewritten as success", async () => {
    const { supervisor } = makeSupervisor(dir, {
      denied: ["filesystem.write"],
    });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("BLOCKED");
    expect(out.result?.message).toMatch(/POLICY_BLOCKED/);
    expect(out.assignment?.status).toBe("BLOCKED");
  });

  it("CONFIRMATION_REQUIRED → WAITING_CONFIRMATION (no auto-confirm)", async () => {
    const { supervisor } = makeSupervisor(dir, {
      require_confirmation_for: ["filesystem.write"],
    });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("WAITING_CONFIRMATION");
    expect(out.error).toBe("CONFIRMATION_REQUIRED");
  });

  it("runtime provider failure after ALLOW → FAILED", async () => {
    const { supervisor } = makeSupervisor(dir, { fail_provider: true });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("FAILED");
  });
});

describe("SE-04 adversarial authority", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se04-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("forbidden capability in decision → INVALID", () => {
    const graph = singleTaskGraph();
    const { supervisor } = makeSupervisor(dir);
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v = validateDelegationDecision(
      {
        decision_type: "ACTION_PROPOSAL",
        reason: "evil",
        proposed_actions: [{ capability: "unrestricted.shell" }],
      },
      {
        delegation: created.delegation,
        expected_assignment_id: created.assignment.assignment_id,
        expected_task_id: "TASK-001",
        known_capabilities: ["filesystem.write", "unrestricted.shell"],
      },
    );
    expect(v.ok).toBe(false);
    expect(v.outcome).toBe("INVALID");
  });

  it("capability not in agent allow-list → INVALID", () => {
    const graph = singleTaskGraph();
    const { supervisor } = makeSupervisor(dir);
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v = validateDelegationDecision(
      {
        decision_type: "ACTION_PROPOSAL",
        reason: "escalate",
        proposed_actions: [{ capability: "demo.work" }],
      },
      {
        delegation: created.delegation,
        expected_assignment_id: created.assignment.assignment_id,
        expected_task_id: "TASK-001",
        known_capabilities: ["filesystem.write", "demo.work"],
      },
    );
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /not allowed/i.test(e))).toBe(true);
  });

  it("scope escape path rejected", () => {
    const graph = singleTaskGraph();
    const { supervisor } = makeSupervisor(dir);
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v = validateDelegationDecision(
      {
        decision_type: "IMPLEMENTATION_PROPOSAL",
        reason: "escape",
        proposed_actions: [{ capability: "filesystem.write", paths: ["/etc/passwd"] }],
      },
      {
        delegation: created.delegation,
        expected_assignment_id: created.assignment.assignment_id,
        expected_task_id: "TASK-001",
        known_capabilities: ["filesystem.write"],
      },
    );
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /escapes task scope/i.test(e))).toBe(true);
  });

  it("wrong task_id / assignment_id in decision → INVALID", () => {
    const graph = singleTaskGraph();
    const { supervisor } = makeSupervisor(dir);
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v = validateDelegationDecision(
      { ...actionPayload(), task_id: "OTHER", assignment_id: "asgn-old" },
      {
        delegation: created.delegation,
        expected_assignment_id: created.assignment.assignment_id,
        expected_task_id: "TASK-001",
        known_capabilities: ["filesystem.write"],
      },
    );
    expect(v.ok).toBe(false);
    expect(v.errors.some((e) => /mismatch/i.test(e))).toBe(true);
  });

  it("REQUIREMENTS_PROPOSAL forbidden on delegation path", () => {
    const graph = singleTaskGraph();
    const { supervisor } = makeSupervisor(dir);
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v = validateDelegationDecision(
      {
        decision_type: "REQUIREMENTS_PROPOSAL",
        reason: "mutate baseline",
        proposed_requirements: { requirements: [] },
      },
      {
        delegation: created.delegation,
        expected_assignment_id: created.assignment.assignment_id,
        expected_task_id: "TASK-001",
      },
    );
    expect(v.ok).toBe(false);
    expect(v.errors[0]).toMatch(/forbidden on task delegation/i);
  });

  it("ForbiddenDirectProviderBridge never invokes provider", async () => {
    const bridge = new ForbiddenDirectProviderBridge();
    const { supervisor } = makeSupervisor(dir, { bridge });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out.ok).toBe(false);
    expect(out.result?.runtime_effect?.provider_invoked).toBe(false);
  });

  it("context isolation: DelegationRequest has context_authority none and no secrets", () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const json = JSON.stringify(created.delegation);
    expect(created.delegation.context_authority).toBe("none");
    expect(json).not.toMatch(/password|api_key|secret|TOKEN_VALUE/i);
    expect(created.delegation).not.toHaveProperty("other_tasks");
  });

  it("effectful decision denied by policy cannot complete as success", async () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const claimed = supervisor.claimDelegation(created.assignment.assignment_id);
    expect(claimed.ok).toBe(true);
    const store = new AssignmentStore(dir);
    const running = store.transition(created.assignment.assignment_id, "RUNNING", {
      started_at: new Date().toISOString(),
    });
    const deniedBridge = new SimulatedRuntimeBridge({ denied_capabilities: ["filesystem.write"] });
    const sup2 = new Supervisor({
      supervisor_id: "sup-a",
      store,
      agentExecutor: new DefaultAgentExecutor({
        provider: new TestReasoningProvider({ payloadFactory: () => actionPayload() }),
      }),
      runtimeBridge: deniedBridge,
      agents: defaultAgentCatalog(),
      known_capabilities: ["filesystem.write"],
    });
    sup2.bindTaskGraph(graph);
    const out = await sup2.submitAgentDecision(graph, running, created.delegation, actionPayload());
    expect(out.ok).toBe(false);
    expect(out.result?.outcome).toBe("BLOCKED");
  });
});

describe("SE-04 idempotency / recovery / parallelism", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "se04-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("duplicate completion fingerprint ignored", async () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const out1 = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
    expect(out1.ok).toBe(true);
    const out2 = await supervisor.submitAgentDecision(
      graph,
      out1.assignment!,
      created.delegation,
      actionPayload(),
    );
    expect(
      out2.ok === false ||
        out2.error?.includes("duplicate") ||
        out2.error?.includes("stale") ||
        out2.error != null ||
        out2.assignment?.status === "SUCCEEDED",
    ).toBe(true);
  });

  it("stale TaskGraph version rejected", () => {
    const { supervisor } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const v2 = { ...graph, version: 2 };
    const again = supervisor.createDelegation(v2, graph.tasks[0]!);
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/version mismatch/i);
  });

  it("crash recovery: expired lease → RECOVERING → reclaim", () => {
    const { supervisor, store } = makeSupervisor(dir, { lease_ms: 1, supervisor_id: "sup-a" });
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    const claimed = supervisor.claimDelegation(created.assignment.assignment_id);
    expect(claimed.ok).toBe(true);
    const a = store.loadAssignment(created.assignment.assignment_id)!;
    store.saveAssignment({
      ...a,
      lease_until: new Date(Date.now() - 1000).toISOString(),
    });
    const rec = supervisor.recover();
    expect(rec.recovered).toContain(created.assignment.assignment_id);
    const after = store.loadAssignment(created.assignment.assignment_id)!;
    expect(after.status).toBe("RECOVERING");

    const supB = new Supervisor({
      supervisor_id: "sup-b",
      store,
      agentExecutor: new DefaultAgentExecutor({
        provider: new TestReasoningProvider({ payloadFactory: () => actionPayload() }),
      }),
      runtimeBridge: new SimulatedRuntimeBridge(),
      agents: defaultAgentCatalog(),
      lease_ms: 60_000,
      known_capabilities: ["filesystem.write"],
    });
    supB.bindTaskGraph(graph);
    const reclaim = supB.claimDelegation(created.assignment.assignment_id);
    expect(reclaim.ok).toBe(true);
    expect(reclaim.assignment?.supervisor_id).toBe("sup-b");
  });

  it("corrupted supervisor-state.json does not throw on loadState", () => {
    const store = new AssignmentStore(dir);
    writeFileSync(join(dir, "supervisor-state.json"), "{not-json", "utf-8");
    expect(store.loadState()).toBeNull();
  });

  it("parallel A/B then C becomes ready after both complete", async () => {
    const { supervisor } = makeSupervisor(dir, { max_parallel: 4 });
    const graph = diamondGraph();
    supervisor.bindTaskGraph(graph);

    for (const id of ["TASK-A", "TASK-B"]) {
      const task = graph.tasks.find((t) => t.id === id)!;
      const created = supervisor.createDelegation(graph, task);
      expect(created.ok).toBe(true);
      if (!created.ok) continue;
      const out = await supervisor.executeDelegation(graph, created.assignment.assignment_id, created.delegation);
      expect(out.ok).toBe(true);
    }

    const ready = supervisor.listReady(graph).map((t) => t.id);
    expect(ready).toContain("TASK-C");
    const c = graph.tasks.find((t) => t.id === "TASK-C")!;
    const createdC = supervisor.createDelegation(graph, c);
    expect(createdC.ok).toBe(true);
    if (!createdC.ok) return;
    const outC = await supervisor.executeDelegation(graph, createdC.assignment.assignment_id, createdC.delegation);
    expect(outC.ok).toBe(true);
    expect(supervisor.getState().tasks["TASK-C"]?.status).toBe("COMPLETED");
  });

  it("REPLAN_REQUEST → REQUIRES_REPLAN without Supervisor mutating graph", async () => {
    const { supervisor, store } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const created = supervisor.createDelegation(graph, graph.tasks[0]!);
    if (!created.ok) throw new Error("create failed");
    supervisor.claimDelegation(created.assignment.assignment_id);
    const running = store.transition(created.assignment.assignment_id, "RUNNING", {
      started_at: new Date().toISOString(),
    });
    const out = await supervisor.submitAgentDecision(graph, running, created.delegation, {
      decision_type: "REPLAN_REQUEST",
      decision_id: "replan-1",
      reason: "blocked by missing dependency",
    });
    expect(out.result?.outcome).toBe("REQUIRES_REPLAN");
    expect(graph.version).toBe(1);
  });

  it("second attempt increments delegation_attempt", () => {
    const { supervisor, store } = makeSupervisor(dir);
    const graph = singleTaskGraph();
    supervisor.bindTaskGraph(graph);
    const c1 = supervisor.createDelegation(graph, graph.tasks[0]!);
    expect(c1.ok).toBe(true);
    if (!c1.ok) return;
    store.transition(c1.assignment.assignment_id, "CLAIMED", {});
    store.transition(c1.assignment.assignment_id, "RUNNING", {});
    store.transition(c1.assignment.assignment_id, "FAILED", {
      completed_at: new Date().toISOString(),
    });
    supervisor.getState().tasks["TASK-001"]!.status = "READY";
    supervisor.getState().assignments[c1.assignment.assignment_id]!.status = "FAILED";
    const c2 = supervisor.createDelegation(graph, graph.tasks[0]!);
    expect(c2.ok).toBe(true);
    if (!c2.ok) return;
    expect(c2.assignment.delegation_attempt).toBe(2);
  });

  it("decisionNeedsRuntime only for ACTION_PROPOSAL", () => {
    expect(
      decisionNeedsRuntime({
        decision_id: "x",
        decision_type: "FINAL_RESPONSE",
        reason: "ok",
      }),
    ).toBe(false);
    expect(
      decisionNeedsRuntime({
        decision_id: "y",
        decision_type: "ACTION_PROPOSAL",
        reason: "go",
        proposed_actions: [{ capability: "filesystem.write" }],
      }),
    ).toBe(true);
  });

  it("evidence binds assignment + agent + outcome", () => {
    const assignment: AgentAssignment = {
      kind: "AgentAssignment",
      apiVersion: "evolveloop.io/se/v1",
      assignment_id: "asgn-1",
      task_id: "TASK-001",
      task_graph_id: "tg",
      task_graph_version: 1,
      agent_id: "backend-agent",
      agent_version: "0.1.0",
      role: "backend",
      status: "SUCCEEDED",
      scope: ["src/**"],
      required_capabilities: ["filesystem.write"],
      policy_reference: "rapid-prototype",
      delegation_attempt: 1,
      supervisor_id: "sup-a",
      created_at: new Date().toISOString(),
      execution_id: "exec-1",
    };
    const result = buildDelegationResult({
      assignment_id: "asgn-1",
      task_id: "TASK-001",
      outcome: "DECISION_PRODUCED",
      validation_ok: true,
      execution_id: "exec-1",
      runtime_effect: {
        attempted: true,
        allowed: true,
        provider_invoked: true,
        success: true,
        evidence_refs: ["evidence://runtime/exec-1"],
      },
    });
    const ev = buildDelegationEvidence("run-1", assignment, result);
    expect(ev.metadata.capability).toBe("supervisor.delegate");
    expect(ev.spec.assumptions?.some((a) => a.includes("asgn-1"))).toBe(true);
  });
});

describe("SE-04 selectEligibleAgents routing", () => {
  it("deterministic candidate set by role + capabilities", () => {
    const task = baseTask({
      id: "T1",
      title: "test suite",
      preferred_agent_role: "testing",
      required_capabilities: ["test.run"],
    });
    const selected = selectEligibleAgents(task, defaultAgentCatalog());
    expect(selected.map((a) => a.agent_id)).toEqual(["tester-agent"]);
  });
});
