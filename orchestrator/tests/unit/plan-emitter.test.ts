import { describe, it, expect } from "vitest";
import {
  emitPlan,
  emitPlanOrThrow,
  validateStructuredIntent,
  validateExecutableIR,
  REJECTED_BEFORE_EXECUTION,
  PolicyEngine,
  buildRegistryFromManifestFiles,
  loadProviderManifests,
  bootstrapProviders,
  type StructuredIntent,
} from "../../src/index.js";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const providersDir = resolve(__dirname, "../../providers");

function baseIntent(over?: Partial<StructuredIntent>): StructuredIntent {
  return {
    id: "intent-fs-list",
    goal: "Execute capability filesystem.list with input path=.",
    policy_ref: "rapid-prototype",
    steps: [
      {
        id: "list-root",
        capability: "filesystem.list",
        inputs: { path: "." },
      },
    ],
    ...over,
  };
}

describe("StructuredIntent validation", () => {
  it("accepts valid intent", () => {
    expect(validateStructuredIntent(baseIntent())).toEqual([]);
  });

  it("rejects missing goal", () => {
    const errors = validateStructuredIntent(baseIntent({ goal: "" }));
    expect(errors.some((e) => e.code === "INTENT_MISSING_GOAL")).toBe(true);
  });

  it("rejects empty steps", () => {
    const errors = validateStructuredIntent(baseIntent({ steps: [] }));
    expect(errors.some((e) => e.code === "INTENT_EMPTY_STEPS")).toBe(true);
  });

  it("rejects dangling dependency", () => {
    const errors = validateStructuredIntent(
      baseIntent({
        steps: [
          {
            id: "a",
            capability: "filesystem.list",
            dependencies: ["missing"],
          },
        ],
      }),
    );
    expect(errors.some((e) => e.code === "INTENT_DANGLING_DEPENDENCY")).toBe(true);
  });
});

describe("PlanEmitter → CapabilityGraph", () => {
  it("emits valid CapabilityIR with correlation ids", () => {
    const result = emitPlan(baseIntent());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.ir.kind).toBe("CapabilityGraph");
    expect(result.ir.spec.nodes).toHaveLength(1);
    expect(result.ir.spec.nodes[0].capability).toBe("filesystem.list");
    expect(result.ir.metadata.intent_id).toBe("intent-fs-list");
    expect(result.ir.metadata.execution_id).toBe(result.execution_id);
    expect(result.evidence.metadata.run_id).toBe(result.execution_id);
    expect(result.evidence.spec.payload?.type).toBe("planning");
  });

  it("rejects invalid intent before IR", () => {
    const result = emitPlan(baseIntent({ steps: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("INTENT_INVALID");
  });

  it("REJECTED_BEFORE_EXECUTION on unknown capability", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const result = emitPlan(
      baseIntent({
        steps: [{ id: "x", capability: "no.such.capability" }],
      }),
      {
        preflight: { registry, requireProviders: true },
      },
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(REJECTED_BEFORE_EXECUTION);
    expect(result.errors.some((e) => e.code === "IR_UNKNOWN_CAPABILITY" || e.code === "PROVIDER_UNAVAILABLE")).toBe(
      true,
    );
  });

  it("REJECTED_BEFORE_EXECUTION on dependency cycle in emitted IR", () => {
    const result = emitPlan(
      baseIntent({
        steps: [
          { id: "a", capability: "filesystem.list", dependencies: ["b"] },
          { id: "b", capability: "filesystem.list", dependencies: ["a"] },
        ],
      }),
      { preflight: {} },
    );
    // validateIR runs inside preflight when options.preflight is set (even empty)
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(REJECTED_BEFORE_EXECUTION);
    expect(result.errors.some((e) => e.code === "IR_CYCLE_DETECTED")).toBe(true);
  });

  it("policy rejection when requireKnownPolicy and unknown policy_ref", () => {
    const pe = new PolicyEngine();
    const result = emitPlan(baseIntent({ policy_ref: "does-not-exist-policy" }), {
      preflight: { policyEngine: pe, requireKnownPolicy: true },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.code === "IR_UNKNOWN_POLICY")).toBe(true);
  });

  it("emitPlanOrThrow succeeds for valid intent", () => {
    const ok = emitPlanOrThrow(baseIntent());
    expect(ok.ir.spec.nodes[0].id).toBe("list-root");
  });
});

describe("validateExecutableIR + real bootstrap", () => {
  it("passes when real deterministic provider is loaded", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot: resolve(__dirname, "../.."),
    });
    const emitted = emitPlanOrThrow(baseIntent(), {
      preflight: {
        registry: boot.registry,
        router: boot.router,
        requireProviders: true,
      },
    });
    const pre = validateExecutableIR(emitted.ir, {
      registry: boot.registry,
      router: boot.router,
      requireProviders: true,
    });
    expect(pre.ok).toBe(true);
    expect(boot.registered.some((r) => r.id === "filesystem" && r.plugin_type === "deterministic")).toBe(
      true,
    );
  });
});
