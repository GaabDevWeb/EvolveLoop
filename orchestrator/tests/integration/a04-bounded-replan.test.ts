/**
 * GAP-A04 — Automatic Bounded Replanning
 */
import { describe, it, expect } from "vitest";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  buildRegistryFromManifests,
  DeterministicReplanner,
  UnavailableReplanner,
  classifyFailure,
  shouldReplan,
  hashCapabilityIR,
  stampPlanLineage,
  emitPlanOrThrow,
  type CapabilityIR,
  type Replanner,
  type ReplanInput,
  type ReplanResult,
  type StructuredIntent,
} from "../../src/index.js";

function makeIR(overrides?: Partial<CapabilityIR["spec"]> & { id?: string }): CapabilityIR {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityGraph",
    metadata: {
      id: overrides?.id ?? "plan-v1",
      ir_version: "2.0.0",
      policy_ref: "rapid-prototype",
      plan_version: 1,
    },
    spec: {
      nodes: overrides?.nodes ?? [
        {
          id: "step-a",
          capability: "demo.work",
          type: "worker",
          dependencies: [],
          definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
        },
      ],
      assumptions: overrides?.assumptions,
    },
  };
}

describe("Failure classification", () => {
  it("marks AUTHORITY_DENIED as POLICY_BLOCKED", () => {
    const c = classifyFailure({ error_code: "AUTHORITY_DENIED" });
    expect(c.disposition).toBe("POLICY_BLOCKED");
  });

  it("marks PROVIDER_UNAVAILABLE as REPLANABLE", () => {
    const c = classifyFailure({ error_code: "PROVIDER_UNAVAILABLE" });
    expect(c.disposition).toBe("REPLANABLE");
  });

  it("shouldReplan rejects policy bypass", () => {
    const d = shouldReplan({
      classification: classifyFailure({ error_code: "AUTHORITY_DENIED" }),
      replan_count: 0,
      max_replans: 3,
    });
    expect(d.should).toBe(false);
    expect(d.code).toBe("POLICY_BLOCKED");
  });
});

describe("A04 provider switch e2e", () => {
  it("auto-replans from provider A failure to provider B success without manual requestReplan", async () => {
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
    // Force MOCK_FAILURE then after retries → unrecoverable; use code via fail
    // MockProvider uses MOCK_FAILURE — map by making A always fail and B succeed.
    // Classification: after retries, lastErrorCode MOCK_FAILURE is RETRYABLE.
    // Need PROVIDER_UNAVAILABLE or unrecoverable with replanable disposition.
    // Override: use fail with attemptsBeforeSuccess Infinity, and set error - still MOCK_FAILURE.
    // Fix: DeterministicReplanner triggers on unrecoverable_failure + we classify MOCK_FAILURE
    // after retries as... RETRYABLE in classifyFailure. shouldReplan returns USE_RETRY.
    //
    // Change: after retries exhausted, blockedReason is unrecoverable_failure and
    // orchestrator remaps with error_code. decideDetailed uses:
    //   effective = classifyFailure({ blocked: unrecoverable, error_code: lastErrorCode })
    // For MOCK_FAILURE + unrecoverable_failure path:
    //   In decideDetailed: blocked === unrecoverable_failure → classify with PROVIDER_UNAVAILABLE default
    //   Actually: `error_code: context.error_code ?? "PROVIDER_UNAVAILABLE"`
    //   So MOCK_FAILURE is passed as error_code!
    //   classifyFailure(MOCK_FAILURE) → RETRYABLE
    //   Then shouldReplan RETRYABLE → USE_RETRY → corrigir (retry node)
    //
    // That would infinite corrigir. Need to fix decideDetailed: when blocked is
    // unrecoverable_failure, force REPLANABLE regardless of underlying retryable code.

    router.register(a);
    const b = createMockProvider("provider-b");
    router.register(b);

    const ir = makeIR();
    // Prefer A first via quality_score (highest_quality not used — rapid-prototype uses fastest)
    // rapid-prototype strategy is "fastest" — both have no duration → stable order.
    // Force A first with prefer_provider on IR:
    ir.spec.nodes[0].constraints = { prefer_provider: "provider-a" };

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: new DeterministicReplanner(),
      maxReplans: 3,
    });

    const result = await engine.run({
      ir,
      policy_id: "rapid-prototype",
      feature_id: "a04-switch",
    });

    expect(result.success).toBe(true);
    expect(result.events.some((e) => e.type === "ReplanApplied")).toBe(true);
    expect(result.events.some((e) => e.type === "ReplanProposed")).toBe(true);
    expect(result.metrics.replan_count).toBeGreaterThanOrEqual(1);
    const lineage = result.events.find((e) => e.type === "ReplanApplied");
    expect(lineage?.payload.parent_plan_id || lineage?.payload.plan_version).toBeTruthy();
  });
});

describe("A04 no-progress / no-replanner / policy", () => {
  it("stops with REPLAN_UNAVAILABLE when no replanner", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "only",
          priority: 1,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    const p = createMockProvider("only");
    p.setDefaultBehavior({ type: "fail", error: "always" });
    router.register(p);

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      // no replanner
      maxReplans: 2,
    });

    const result = await engine.run({
      ir: makeIR(),
      policy_id: "rapid-prototype",
      feature_id: "a04-none",
    });

    expect(result.success).toBe(false);
    expect(result.blocked_reason).toBe("REPLAN_UNAVAILABLE");
  });

  it("detects NO_PROGRESS on duplicate candidate plan", async () => {
    const sticky: Replanner = {
      replan(input: ReplanInput): ReplanResult {
        // Always propose the exact same IR shape (same hash as current)
        const clone = structuredClone(input.current_plan);
        return {
          status: "REPLAN_PROPOSED",
          candidate_ir: stampPlanLineage(clone, {
            execution_id: input.execution_id,
            plan_version: (input.current_plan.metadata.plan_version ?? 1) + 1,
            parent_plan_id: input.current_plan.metadata.id,
            replan_id: "dup",
          }),
          reason: "noop",
          strategy: "RETRY_WITH_CHANGED_PROVIDER",
          replan_id: "dup",
        };
      },
    };

    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "only",
          priority: 1,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    const p = createMockProvider("only");
    p.setDefaultBehavior({ type: "fail" });
    router.register(p);

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: sticky,
      maxReplans: 3,
    });

    const result = await engine.run({
      ir: makeIR(),
      policy_id: "rapid-prototype",
      feature_id: "a04-noprogress",
    });

    expect(result.success).toBe(false);
    expect(["NO_PROGRESS", "REPLAN_REJECTED"]).toContain(result.blocked_reason);
  });

  it("does not replan past POLICY_BLOCKED", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "denied",
          priority: 1,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    const p = createMockProvider("denied");
    // Custom fail — MockProvider only has MOCK_FAILURE. Inject via Callback-like:
    // Use setDefaultBehavior fail; then manually we need AUTHORITY_DENIED.
    // Override execute:
    p.execute = async (req) => ({
      run_id: req.run_id,
      success: false,
      error: { code: "AUTHORITY_DENIED", message: "forbidden" },
      duration_ms: 1,
      provider_id: "denied",
    });
    router.register(p);

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: new DeterministicReplanner(),
      maxReplans: 3,
    });

    const result = await engine.run({
      ir: makeIR(),
      policy_id: "rapid-prototype",
      feature_id: "a04-policy",
    });

    expect(result.success).toBe(false);
    expect(result.blocked_reason).toBe("POLICY_BLOCKED");
    expect(result.events.some((e) => e.type === "ReplanApplied")).toBe(false);
  });
});

describe("A04 lineage + preserve completed + Intent path", () => {
  it("preserves satisfied nodes across replan", async () => {
    const registry = buildRegistryFromManifests([
      {
        capability: "demo.ok",
        provider: {
          id: "ok",
          priority: 1,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
      {
        capability: "demo.work",
        provider: {
          id: "provider-a",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
      {
        capability: "demo.work",
        provider: {
          id: "provider-b",
          priority: 10,
          cost: "low",
          quality_score: 0.5,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    router.register(createMockProvider("ok"));
    const a = createMockProvider("provider-a");
    a.setDefaultBehavior({ type: "fail" });
    router.register(a);
    router.register(createMockProvider("provider-b"));

    const ir: CapabilityIR = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "CapabilityGraph",
      metadata: { id: "lineage", ir_version: "2.0.0", policy_ref: "rapid-prototype", plan_version: 1 },
      spec: {
        nodes: [
          {
            id: "a",
            capability: "demo.ok",
            type: "worker",
            dependencies: [],
            definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
          },
          {
            id: "b",
            capability: "demo.work",
            type: "worker",
            dependencies: ["a"],
            definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
            constraints: { prefer_provider: "provider-a" },
          },
        ],
      },
    };

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: new DeterministicReplanner(),
    });

    const result = await engine.run({
      ir,
      policy_id: "rapid-prototype",
      feature_id: "a04-preserve",
    });

    expect(result.success).toBe(true);
    const nodeA = result.graph.nodes.find((n) => n.id === "a");
    expect(nodeA?.status).toBe("satisfied");
    const applied = result.events.filter((e) => e.type === "ReplanApplied");
    expect(applied.length).toBeGreaterThanOrEqual(1);
    expect(applied[0].payload.plan_version).toBeGreaterThanOrEqual(2);
  });

  it("Intent → PlanEmitter → auto replan still works", async () => {
    const intent: StructuredIntent = {
      id: "intent-replan",
      goal: "demo",
      policy_ref: "rapid-prototype",
      steps: [
        {
          id: "s1",
          capability: "demo.work",
          inputs: {},
          definition_of_done: [{ id: "d", check: "ok", verification: "automated" }],
        },
      ],
    };
    const emission = emitPlanOrThrow(intent);
    emission.ir.spec.nodes[0].constraints = { prefer_provider: "provider-a" };

    const registry = buildRegistryFromManifests([
      {
        capability: "demo.work",
        provider: {
          id: "provider-a",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1",
        },
      },
      {
        capability: "demo.work",
        provider: {
          id: "provider-b",
          priority: 10,
          cost: "low",
          quality_score: 0.4,
          availability: "active",
          version: "1",
        },
      },
    ]);
    const router = new ProviderRouter();
    const a = createMockProvider("provider-a");
    a.setDefaultBehavior({ type: "fail" });
    router.register(a);
    router.register(createMockProvider("provider-b"));

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: new DeterministicReplanner(),
    });

    const result = await engine.run({
      ir: emission.ir,
      policy_id: "rapid-prototype",
      feature_id: emission.execution_id,
    });
    expect(result.success).toBe(true);
    expect(result.events.some((e) => e.type === "ReplanRequested")).toBe(true);
  });

  it("hash distinguishes retry vs replan plans", () => {
    const v1 = makeIR();
    const v2 = structuredClone(v1);
    v2.spec.nodes[0].constraints = { exclude_providers: ["provider-a"], prefer_provider: "provider-b" };
    expect(hashCapabilityIR(v1)).not.toBe(hashCapabilityIR(v2));
  });

  it("UnavailableReplanner is safe", async () => {
    const r = new UnavailableReplanner();
    const out = await r.replan({
      execution_id: "e",
      feature_id: "f",
      current_plan: makeIR(),
      graph: { feature_id: "f", nodes: [] },
      failure: classifyFailure({ error_code: "PROVIDER_UNAVAILABLE" }),
      attempt: 1,
      replan_count: 0,
      max_replans: 3,
      completed_node_ids: [],
      available_capabilities: [],
      available_providers: [],
      policy_id: "rapid-prototype",
      recent_plan_hashes: [],
    });
    expect(out.status).toBe("REPLAN_UNAVAILABLE");
  });
});
