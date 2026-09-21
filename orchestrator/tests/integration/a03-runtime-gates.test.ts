/**
 * GAP-A03 — Runtime-Enforced Gates (adversarial + A04×A03)
 */
import { describe, it, expect } from "vitest";
import {
  ExecutionEngine,
  ProviderRouter,
  createMockProvider,
  buildRegistryFromManifests,
  DeterministicReplanner,
  evaluatePreExecute,
  classifyFailure,
  type CapabilityIR,
  type Replanner,
  type ReplanInput,
  type ReplanResult,
  type RuntimeGateContext,
} from "../../src/index.js";

function makeIR(
  capability = "demo.work",
  opts?: { id?: string; constraints?: Record<string, unknown>; metadata?: Record<string, unknown> },
): CapabilityIR {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityGraph",
    metadata: {
      id: opts?.id ?? "a03-plan",
      ir_version: "2.0.0",
      policy_ref: "rapid-prototype",
      plan_version: 1,
    },
    spec: {
      nodes: [
        {
          id: "step-a",
          capability,
          type: "worker",
          dependencies: [],
          definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
          constraints: opts?.constraints,
          metadata: opts?.metadata,
        },
      ],
    },
  };
}

function registryFor(...caps: string[]) {
  return buildRegistryFromManifests(
    caps.map((capability) => ({
      capability,
      provider: {
        id: `prov-${capability}`,
        priority: 100,
        cost: "low" as const,
        quality_score: 1,
        availability: "active" as const,
        version: "1.0.0",
      },
    })),
  );
}

describe("evaluatePreExecute (unit)", () => {
  it("denies capability deny-list before authority", () => {
    const ir = makeIR("demo.forbidden");
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true, allowShell: true },
      gateContext: { denied_capabilities: ["demo.forbidden"] },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.code).toBe("CAPABILITY_DENIED");
  });

  it("denies missing grounding when required", () => {
    const ir = makeIR();
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true },
      gateContext: { grounding: { required: true, status: "absent" } },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.code).toBe("GROUNDING_REQUIRED");
  });

  it("denies grill-me when required and evidence absent", () => {
    const ir = makeIR();
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          evidence_status: "absent",
        },
      },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.gate_id).toBe("grill-me");
  });

  it("requires confirmation for write without allowWrite", () => {
    const ir = makeIR("filesystem.write");
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { workspaceRoot: "/tmp/ws" },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("CONFIRMATION_REQUIRED");
  });

  it("denies write when workspaceRoot missing", () => {
    const ir = makeIR("filesystem.write");
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.reason).toMatch(/workspace_root_required/);
  });

  it("forged grill-me satisfied without artifact → DENY", () => {
    const ir = makeIR();
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true, workspaceRoot: "/tmp/ws" },
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          evidence_status: "satisfied",
        },
      },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.gate_id).toBe("grill-me");
  });

  it("fail_closed_missing_attestation denies missing grill-me when required in metadata", () => {
    const ir = makeIR("demo.work", { metadata: { require: ["grill-me"] } });
    const node = {
      ...ir.spec.nodes[0]!,
      status: "pending" as const,
      retry_count: 0,
      metadata: { require: ["grill-me"] },
    };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { allowWrite: true },
      gateContext: { fail_closed_missing_attestation: true },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.reason).toBe("grill_me_attestation_missing");
  });

  it("denies path escape outside workspace", () => {
    const ir = makeIR("filesystem.read", { constraints: { path: "../etc/passwd" } });
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const r = evaluatePreExecute({
      node,
      provider: { id: "p", priority: 1, cost: "low", quality_score: 1, availability: "active", version: "1" },
      authority: { workspaceRoot: "/tmp/ws", allowWrite: true },
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(r.decision).toBe("DENY");
    expect(r.code).toBe("AUTHORITY_DENIED");
  });
});

describe("A03 engine enforcement", () => {
  it("allowed capability executes", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const engine = new ExecutionEngine({ registry, providers: router });
    const result = await engine.run({ ir: makeIR() });
    expect(result.success).toBe(true);
    expect(mock.getExecuteCount()).toBe(1);
    expect(result.events.some((e) => e.type === "GateAllowed")).toBe(true);
  });

  it("denied capability — provider never executes", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const gateContext: RuntimeGateContext = { denied_capabilities: ["demo.work"] };
    const engine = new ExecutionEngine({ registry, providers: router, gateContext });
    const result = await engine.run({ ir: makeIR() });
    expect(result.success).toBe(false);
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.blocked_reason).toMatch(/POLICY_BLOCKED|CAPABILITY_DENIED|GATE_DENIED/);
    expect(result.events.some((e) => e.type === "GateDenied")).toBe(true);
    expect(result.events.some((e) => e.type === "AuthorizationDenied" || e.type === "PolicyDenied")).toBe(
      true,
    );
  });

  it("mock provider under denied policy still blocked", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    mock.setDefaultBehavior({ type: "success" });
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      gateContext: { denied_capabilities: ["demo.work"] },
    });
    await engine.run({ ir: makeIR() });
    expect(mock.getExecuteCount()).toBe(0);
  });

  it("confirmation required pauses without provider execute", async () => {
    const registry = registryFor("filesystem.write");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-filesystem.write");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      authorityContext: { workspaceRoot: "/tmp/ws" }, // no allowWrite, no confirmed
    });
    const result = await engine.run({ ir: makeIR("filesystem.write") });
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.blocked_reason).toMatch(/CONFIRMATION_REQUIRED|POLICY_BLOCKED/);
    expect(result.events.some((e) => e.type === "GateConfirmationRequired")).toBe(true);
  });

  it("missing required grill-me gate blocks", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      gateContext: {
        grill_me: {
          risk_tier: "sensitive",
          phase05_active: true,
          docs_approved: true,
          evidence_status: "absent",
        },
      },
    });
    const result = await engine.run({ ir: makeIR() });
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.events.some((e) => e.type === "GateDenied")).toBe(true);
  });

  it("image-to-code required when image attached", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      gateContext: {
        image_to_code: { image_attachment: true, evidence_status: "absent" },
      },
    });
    const result = await engine.run({ ir: makeIR() });
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.events.some((e) => e.payload.gate_id === "image-to-code")).toBe(true);
  });

  it("required grounding absent blocks", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      gateContext: { grounding: { required: true, status: "absent" } },
    });
    const result = await engine.run({ ir: makeIR() });
    expect(mock.getExecuteCount()).toBe(0);
    expect(result.blocked_reason).toMatch(/GROUNDING|POLICY/);
  });

  it("workspace outside authority denies", async () => {
    const registry = registryFor("filesystem.read");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-filesystem.read");
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      authorityContext: { workspaceRoot: "/tmp/authorized-ws", allowWrite: true },
    });
    const result = await engine.run({
      ir: makeIR("filesystem.read", { constraints: { path: "/etc/passwd" } }),
    });
    expect(mock.getExecuteCount()).toBe(0);
    expect(classifyFailure({ error_code: "AUTHORITY_DENIED" }).disposition).toBe("POLICY_BLOCKED");
    expect(result.blocked_reason).toMatch(/AUTHORITY|POLICY/);
  });

  it("invalid / fake evidence blocks continuation", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    const mock = createMockProvider("prov-demo.work");
    // Force success with incomplete evidence (fake)
    const orig = mock.execute.bind(mock);
    mock.execute = async (req) => {
      const r = await orig(req);
      return {
        ...r,
        evidence: {
          apiVersion: "capability-orchestrator.io/v2",
          kind: "Evidence",
          metadata: {
            node_id: req.node_id,
            run_id: req.run_id,
            provider_id: mock.id,
            capability: req.capability,
            submitted_at: new Date().toISOString(),
            source: "executor",
          },
          spec: {
            status: "incomplete",
            confidence: 1,
            coverage: 0,
            assumptions: [],
            known_gaps: [],
            checks: [],
            payload: { type: "execution", duration_ms: 1 },
          },
        },
      };
    };
    router.register(mock);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: { replan: async () => ({ status: "REPLAN_UNAVAILABLE", reason: "test", code: "REPLAN_UNAVAILABLE" }) },
      maxReplans: 0,
    });
    const result = await engine.run({ ir: makeIR() });
    expect(result.success).toBe(false);
    expect(mock.getExecuteCount()).toBeGreaterThan(0);
    expect(result.blocked_reason).toMatch(/evidence|unrecoverable|dod|REPLAN|NO_PROGRESS/i);
  });

  it("gate decisions produce evidence", async () => {
    const registry = registryFor("demo.work");
    const router = new ProviderRouter();
    router.register(createMockProvider("prov-demo.work"));
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      gateContext: { denied_capabilities: ["demo.work"] },
    });
    const result = await engine.run({ ir: makeIR() });
    const authEv = result.evidence.filter((e) => e.spec.payload?.type === "authority");
    expect(authEv.length).toBeGreaterThan(0);
  });
});

describe("A04 × A03 combination", () => {
  it("replan to allowed path executes", async () => {
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
    a.setDefaultBehavior({ type: "fail", error: "down" });
    const b = createMockProvider("provider-b");
    router.register(a);
    router.register(b);
    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: new DeterministicReplanner(),
      maxReplans: 3,
    });
    const result = await engine.run({ ir: makeIR() });
    expect(result.success).toBe(true);
    expect(b.getExecuteCount()).toBeGreaterThan(0);
    expect(result.events.some((e) => e.type === "GateAllowed")).toBe(true);
  });

  it("replan to denied path — forbidden provider never executes", async () => {
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
        capability: "demo.forbidden",
        provider: {
          id: "provider-forbidden",
          priority: 100,
          cost: "low",
          quality_score: 1,
          availability: "active",
          version: "1.0.0",
        },
      },
    ]);
    const router = new ProviderRouter();
    const a = createMockProvider("provider-a");
    a.setDefaultBehavior({ type: "fail", error: "down" });
    const forbidden = createMockProvider("provider-forbidden");
    router.register(a);
    router.register(forbidden);

    const forbiddenReplanner: Replanner = {
      async replan(input: ReplanInput): Promise<ReplanResult> {
        const next: CapabilityIR = {
          ...input.current_plan,
          metadata: {
            ...input.current_plan.metadata,
            id: "plan-v2-forbidden",
            plan_version: (input.current_plan.metadata.plan_version ?? 1) + 1,
            parent_plan_id: input.current_plan.metadata.id,
          },
          spec: {
            nodes: [
              {
                id: "step-a",
                capability: "demo.forbidden",
                type: "worker",
                dependencies: [],
                definition_of_done: [{ id: "d1", check: "ok", verification: "automated" }],
              },
            ],
          },
        };
        return {
          status: "REPLAN_PROPOSED",
          replan_id: "rp-forbidden",
          strategy: "REPLACE_FAILED_CAPABILITY",
          reason: "adversarial forbidden capability",
          candidate_ir: next,
        };
      },
    };

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      replanner: forbiddenReplanner,
      maxReplans: 3,
      gateContext: { denied_capabilities: ["demo.forbidden"] },
    });
    const result = await engine.run({ ir: makeIR() });
    expect(forbidden.getExecuteCount()).toBe(0);
    expect(result.success).toBe(false);
    expect(result.events.some((e) => e.type === "GateDenied" || e.type === "PolicyDenied")).toBe(true);
  });

  it("confirmation bound to plan_hash — replan hash requires revalidation", () => {
    const ir = makeIR("filesystem.write");
    const node = { ...ir.spec.nodes[0]!, status: "pending" as const, retry_count: 0 };
    const provider = {
      id: "p",
      priority: 1,
      cost: "low" as const,
      quality_score: 1,
      availability: "active" as const,
      version: "1",
    };
    const allowed = evaluatePreExecute({
      node,
      provider,
      authority: { confirmed: true, workspaceRoot: "/tmp/ws" },
      plan_hash: "plan-v1",
      confirmed_for_plan_hash: "plan-v1",
      run_id: "r1",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(allowed.decision).toBe("ALLOW");

    const afterReplan = evaluatePreExecute({
      node,
      provider,
      authority: { confirmed: true, workspaceRoot: "/tmp/ws" }, // flag still set
      plan_hash: "plan-v2",
      confirmed_for_plan_hash: undefined, // invalidated
      run_id: "r2",
      execution_id: "e1",
      policy_id: "p1",
    });
    expect(afterReplan.decision).toBe("CONFIRMATION_REQUIRED");
  });
});

describe("A03 direct provider bypass (public API boundary)", () => {
  it("documents that ProviderRuntime.execute is callable outside engine — enforcement is on ExecutionEngine path", async () => {
    const mock = createMockProvider("lone");
    // Direct call — not the public orchestration path
    await mock.execute({
      run_id: "x",
      node_id: "n",
      capability: "demo.work",
      inputs: [],
      definition_of_done: [],
      policy: { retries_remaining: 0 },
      memory_scope: "t",
      knowledge_hits: [],
      briefing: "bypass",
      node: {
        id: "n",
        capability: "demo.work",
        type: "worker",
        dependencies: [],
        definition_of_done: [],
        status: "pending",
        retry_count: 0,
      },
    });
    expect(mock.getExecuteCount()).toBe(1);
    // Engine path with deny still blocks — covered above
  });
});
