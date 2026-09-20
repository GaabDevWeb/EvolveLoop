/**
 * AgentExecutor contract — deterministic, no LLM/SDK.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DefaultAgentExecutor,
  TestReasoningProvider,
  assembleAgentExecutionRequest,
  validateAgentDecisionPayload,
  applyAgentDecisionToPlan,
  toPersistableDecisionMeta,
  applyReasoningUsageToAccounting,
  isTokenBudgetExhausted,
  assertNoForbiddenKeys,
  AgentBackedReplanner,
  evaluatePreExecute,
  validateExecutableIR,
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  buildRegistryFromManifests,
  EventBus,
  type CapabilityIR,
  type ReplanInput,
} from "../../src/index.js";

function baseRequest(overrides?: Record<string, unknown>) {
  return assembleAgentExecutionRequest({
    execution_id: "exec-agent-1",
    task_id: "task-1",
    attempt: 0,
    agent_id: "test-agent",
    agent_version: "0.1.0",
    role: "planner",
    objective: "run demo.work",
    decision_mode: "PLAN",
    policy_summary: { policy_id: "rapid-prototype" },
    available_capabilities: [
      { capability_id: "demo.work", available: true },
      { capability_id: "filesystem.write", available: true, risk: "high" },
    ],
    available_providers: [{ provider_id: "prov-demo" }],
    ...overrides,
  });
}

describe("AgentExecutionRequest / context safety", () => {
  it("assembles least-privilege request without secrets", () => {
    const req = baseRequest();
    expect(req.request_id).toBeTruthy();
    expect(req.schema_id).toBe("agent-decision/v1");
    expect(assertNoForbiddenKeys(req).ok).toBe(true);
  });

  it("blocks sensitive keys from reaching provider (context leakage)", async () => {
    const provider = new TestReasoningProvider({ scenario: "valid_plan" });
    const executor = new DefaultAgentExecutor({ provider });
    const dirty = {
      ...baseRequest(),
      policy_summary: {
        policy_id: "rapid-prototype",
        api_key: "sk-leak-me",
      } as { policy_id: string },
    };
    const result = await executor.execute(dirty as ReturnType<typeof baseRequest>);
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_REFUSED");
    expect(provider.invokeCount).toBe(0);
  });

  it("redacts forbidden keys via assertNoForbiddenKeys", () => {
    const r = assertNoForbiddenKeys({ password: "x", ok: 1 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.key).toMatch(/password/i);
  });
});

describe("AgentDecision validation", () => {
  it("accepts valid PLAN_PROPOSAL", () => {
    const v = validateAgentDecisionPayload(
      {
        decision_type: "PLAN_PROPOSAL",
        reason: "ok",
        proposed_intent: {
          id: "i1",
          goal: "g",
          steps: [{ id: "s1", capability: "demo.work" }],
        },
      },
      { known_capabilities: ["demo.work"] },
    );
    expect(v.ok).toBe(true);
  });

  it("rejects unknown capability (semantic)", () => {
    const v = validateAgentDecisionPayload(
      {
        decision_type: "ACTION_PROPOSAL",
        reason: "bad",
        proposed_actions: [{ capability: "nonexistent" }],
      },
      { known_capabilities: ["demo.work"] },
    );
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("REASONING_SEMANTIC_ERROR");
  });

  it("rejects direct tool_call", () => {
    const v = validateAgentDecisionPayload({
      tool_call: { name: "filesystem.write" },
    });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.code).toBe("REASONING_SCHEMA_ERROR");
  });

  it("rejects malformed / invalid schema", () => {
    const v = validateAgentDecisionPayload({ decision_type: "PLAN_PROPOSAL", reason: "" });
    expect(v.ok).toBe(false);
  });
});

describe("AgentExecutor + TestReasoningProvider", () => {
  it("success → PLAN_PROPOSAL (not ExecutionResult)", async () => {
    const bus = new EventBus();
    const provider = new TestReasoningProvider({ scenario: "valid_plan" });
    const executor = new DefaultAgentExecutor({ provider, eventBus: bus });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(true);
    expect(result.decision?.decision_type).toBe("PLAN_PROPOSAL");
    expect(result.decision_id).toBeTruthy();
    expect((result as { status?: string }).status).toBeUndefined();
    expect(bus.getEvents().some((e) => e.type === "AgentInvocationStarted")).toBe(true);
    expect(bus.getEvents().some((e) => e.type === "AgentDecisionProduced")).toBe(true);
  });

  it("malformed output → REASONING_MALFORMED_OUTPUT", async () => {
    const provider = new TestReasoningProvider({ scenario: "malformed" });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_MALFORMED_OUTPUT");
    expect(result.decision).toBeUndefined();
  });

  it("provider unavailable → structured failure, no synthetic decision", async () => {
    const provider = new TestReasoningProvider({ scenario: "provider_unavailable" });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_PROVIDER_UNAVAILABLE");
    expect(result.decision).toBeUndefined();
  });

  it("timeout → REASONING_TIMEOUT", async () => {
    const provider = new TestReasoningProvider({ scenario: "timeout" });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_TIMEOUT");
  });

  it("unknown capability rejected before plan emit", async () => {
    const provider = new TestReasoningProvider({ scenario: "unknown_capability" });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("REASONING_SEMANTIC_ERROR");
  });

  it("NEED_INFORMATION / AGENT_UNABLE", async () => {
    const p1 = new TestReasoningProvider({ scenario: "need_information" });
    const r1 = await new DefaultAgentExecutor({ provider: p1 }).execute(baseRequest());
    expect(r1.success).toBe(true);
    expect(r1.decision?.decision_type).toBe("NEED_INFORMATION");

    const p2 = new TestReasoningProvider({ scenario: "agent_unable" });
    const r2 = await new DefaultAgentExecutor({ provider: p2 }).execute(baseRequest());
    expect(r2.decision?.decision_type).toBe("AGENT_UNABLE");
  });
});

describe("PLAN_PROPOSAL → PlanEmitter → IR", () => {
  it("emits valid Executable IR", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "prov-demo",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1.0.0",
        },
      },
    ]);
    const provider = new TestReasoningProvider({ scenario: "valid_plan" });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    const applied = applyAgentDecisionToPlan(result, "exec-agent-1", {
      preflight: { registry },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.ir.metadata.decision_id).toBe(result.decision_id);
    const pre = validateExecutableIR(applied.ir, { registry });
    expect(pre.ok).toBe(true);
  });
});

describe("Policy bypass — Agent proposes, Runtime DENY, provider count=0", () => {
  it("ACTION_PROPOSAL forbidden capability: executor succeeds, A03 DENY, no execute", async () => {
    const mock = createMockProvider("fs");
    const provider = new TestReasoningProvider({
      payloadFactory: () => ({
        decision_type: "ACTION_PROPOSAL",
        reason: "agent wants forbidden write",
        proposed_actions: [
          { capability: "filesystem.write", inputs: { path: "/etc/passwd" } },
        ],
      }),
    });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(true);
    expect(result.decision?.decision_type).toBe("ACTION_PROPOSAL");

    const gate = evaluatePreExecute({
      node: {
        id: "n1",
        capability: "filesystem.write",
        type: "worker",
        dependencies: [],
        definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
        status: "pending",
        retry_count: 0,
      },
      provider: {
        id: "fs",
        priority: 1,
        cost: "low",
        quality_score: 1,
        availability: "active",
        version: "1",
      },
      authority: { allowWrite: false, allowShell: false },
      gateContext: { denied_capabilities: ["filesystem.write"] },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "strict",
    });
    expect(gate.decision).toBe("DENY");
    expect(mock.getExecuteCount()).toBe(0);
  });
});

describe("B01 accounting seam", () => {
  it("records usage and blocks next invocation when budget exhausted", async () => {
    const accounting = { tokens_used: 0, tokens_unknown_events: 0 };
    const token_budget = 100;
    const provider = new TestReasoningProvider({
      scenario: "valid_plan",
      usage: { total_tokens: 80, input_tokens: 40, output_tokens: 40 },
    });
    const executor = new DefaultAgentExecutor({
      provider,
      onUsage: (u) => applyReasoningUsageToAccounting(accounting, u),
      isBudgetExhausted: () => isTokenBudgetExhausted(accounting, token_budget),
    });

    const r1 = await executor.execute(baseRequest());
    expect(r1.success).toBe(true);
    expect(accounting.tokens_used).toBe(80);

    accounting.tokens_used = 100;
    const r2 = await executor.execute(baseRequest({ attempt: 1 }));
    expect(r2.success).toBe(false);
    expect(r2.error?.code).toBe("REASONING_REFUSED");
    expect(provider.invokeCount).toBe(1);
  });
});

describe("B04 decision identity", () => {
  it("persistable meta correlates decision_id with execution/task/attempt/lineage", async () => {
    const provider = new TestReasoningProvider({ scenario: "valid_plan" });
    const executor = new DefaultAgentExecutor({ provider });
    const req = baseRequest({ attempt: 2 });
    const result = await executor.execute(req);
    const applied = applyAgentDecisionToPlan(result, req.execution_id);
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    const meta = toPersistableDecisionMeta(req, result, {
      plan_id: applied.plan_id,
      plan_version: 1,
    });
    expect(meta?.decision_id).toBe(result.decision_id);
    expect(meta?.execution_id).toBe(req.execution_id);
    expect(meta?.task_id).toBe(req.task_id);
    expect(meta?.attempt).toBe(2);
    expect(meta?.plan_id).toBe(applied.plan_id);
  });
});

describe("Deterministic E2E: Intent → Agent → Plan → A03 → B01 → Engine → Evidence", () => {
  it("full path without LLM", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "prov-demo",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1.0.0",
        },
      },
    ]);
    const router = new ProviderRouter();
    router.register(createMockProvider("prov-demo"));

    const reasoning = new TestReasoningProvider({
      scenario: "valid_plan",
      usage: { total_tokens: 10 },
    });
    const accounting = { tokens_used: 0, tokens_unknown_events: 0 };
    const agent = new DefaultAgentExecutor({
      provider: reasoning,
      onUsage: (u) => applyReasoningUsageToAccounting(accounting, u),
      isBudgetExhausted: () => isTokenBudgetExhausted(accounting, 10_000),
    });

    const agentResult = await agent.execute(baseRequest());
    expect(agentResult.success).toBe(true);
    expect(accounting.tokens_used).toBe(10);

    const applied = applyAgentDecisionToPlan(agentResult, "exec-e2e", {
      preflight: { registry },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    const node = applied.ir.spec.nodes[0]!;
    const provMeta = registry.capabilities["demo.work"]!.providers[0]!;
    const gate = evaluatePreExecute({
      node: { ...node, status: "pending", retry_count: 0 },
      provider: provMeta,
      authority: { allowWrite: true },
      gateContext: {},
      run_id: "r-e2e",
      execution_id: "exec-e2e",
      policy_id: "rapid-prototype",
    });
    expect(gate.decision).toBe("ALLOW");

    const engine = new ExecutionEngine({
      providers: router,
      registry,
    });
    const run = await engine.run({
      ir: applied.ir,
      policy_id: "rapid-prototype",
      feature_id: "feat-agent-e2e",
    });
    expect(run.success).toBe(true);
  });
});

describe("Replan E2E: Failure → A04 → AgentExecutor → REPLAN → A03 → B01 → Success", () => {
  it("reason → act → observe → reason (deterministic)", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "provider-a",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1.0.0",
        },
      },
      {
        capability: "demo.work",
        provider: {
          id: "provider-b",
          priority: 50,
          cost: "low",
          quality_score: 0.5,
          availability: "active",
          version: "1.0.0",
        },
      },
    ]);
    const router = new ProviderRouter();
    const a = createMockProvider("provider-a");
    a.setDefaultBehavior({ type: "fail", error: "provider A down" });
    router.register(a);
    router.register(createMockProvider("provider-b"));

    const reasoning = new TestReasoningProvider({ scenario: "valid_replan" });
    const agent = new DefaultAgentExecutor({ provider: reasoning });
    const replanner = new AgentBackedReplanner({ executor: agent });

    const planAgent = new DefaultAgentExecutor({
      provider: new TestReasoningProvider({ scenario: "valid_plan" }),
    });
    const planResult = await planAgent.execute(baseRequest());
    const applied = applyAgentDecisionToPlan(planResult, "exec-replan-e2e", {
      preflight: { registry },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;

    // Prefer A so first attempt fails then AgentBackedReplanner switches
    applied.ir.spec.nodes[0]!.constraints = {
      ...(applied.ir.spec.nodes[0]!.constraints ?? {}),
      prefer_provider: "provider-a",
    };

    const engine = new ExecutionEngine({
      providers: router,
      registry,
      replanner,
      maxReplans: 3,
    });

    const run = await engine.run({
      ir: applied.ir,
      policy_id: "rapid-prototype",
      feature_id: "feat-replan-agent",
    });
    expect(run.success).toBe(true);
    expect(a.getExecuteCount()).toBeGreaterThanOrEqual(1);
    expect(reasoning.invokeCount).toBeGreaterThanOrEqual(1);
    expect(run.events.some((e) => e.type === "ReplanApplied")).toBe(true);
  });
});

describe("Architecture: ExecutionEngine must not import ReasoningProvider", () => {
  it("static dependency direction preserved", () => {
    const enginePath = resolve(process.cwd(), "src/engine/execution-engine.ts");
    const src = readFileSync(enginePath, "utf8");
    expect(src).not.toMatch(/ReasoningProvider/);
    expect(src).not.toMatch(/from ["'].*\/agent\//);
    expect(src).not.toMatch(/openai|anthropic|@cursor\/sdk/i);
  });
});

describe("Fake autonomy check", () => {
  it("AgentExecutor does not execute capabilities; Runtime does", async () => {
    const mock = createMockProvider("prov-demo");
    const provider = new TestReasoningProvider({
      payloadFactory: () => ({
        decision_type: "ACTION_PROPOSAL",
        reason: "propose only",
        proposed_actions: [{ capability: "demo.work" }],
      }),
    });
    const executor = new DefaultAgentExecutor({ provider });
    const result = await executor.execute(baseRequest());
    expect(result.success).toBe(true);
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.decision?.decision_type).toBe("ACTION_PROPOSAL");
  });
});

describe("AgentBackedReplanner unit", () => {
  it("produces REPLAN_PROPOSED from AgentExecutor", async () => {
    const agent = new DefaultAgentExecutor({
      provider: new TestReasoningProvider({ scenario: "valid_replan" }),
    });
    const replanner = new AgentBackedReplanner({ executor: agent });
    const ir: CapabilityIR = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "CapabilityGraph",
      metadata: {
        id: "plan-v1",
        ir_version: "2.0.0",
        policy_ref: "rapid-prototype",
        plan_version: 1,
      },
      spec: {
        nodes: [
          {
            id: "step-a",
            capability: "demo.work",
            type: "worker",
            dependencies: [],
            definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
          },
        ],
      },
    };
    const input: ReplanInput = {
      execution_id: "e1",
      feature_id: "f1",
      current_plan: ir,
      graph: {
        feature_id: "f1",
        nodes: [{ ...ir.spec.nodes[0]!, status: "failed", retry_count: 1 }],
      },
      failed_node: { ...ir.spec.nodes[0]!, status: "failed", retry_count: 1 },
      failure: {
        disposition: "REPLANABLE",
        failure_class: "PROVIDER_UNAVAILABLE",
        error_code: "PROVIDER_UNAVAILABLE",
        reason: "down",
      },
      attempt: 1,
      replan_count: 0,
      max_replans: 3,
      completed_node_ids: [],
      available_capabilities: ["demo.work"],
      available_providers: ["provider-a", "provider-b"],
      failed_provider_id: "provider-a",
      policy_id: "rapid-prototype",
      recent_plan_hashes: [],
    };
    const out = await replanner.replan(input);
    expect(out.status).toBe("REPLAN_PROPOSED");
    if (out.status === "REPLAN_PROPOSED") {
      expect(out.replan_id).toBeTruthy();
    }
  });
});
