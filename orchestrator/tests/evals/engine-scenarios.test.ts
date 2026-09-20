import { describe, it, expect } from "vitest";
import { join } from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  ExecutionEngine,
  ProviderRouter,
  buildRegistryFromManifests,
  loadContractsFromDir,
  createMockProvider,
} from "../../src/index.js";
import type { CapabilityIR } from "../../src/types/index.js";

const minimalTestingIR: CapabilityIR = {
  apiVersion: "capability-orchestrator.io/v2",
  kind: "CapabilityGraph",
  metadata: { id: "eval-discovery", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
  spec: {
    nodes: [
      {
        id: "test-only",
        capability: "testing",
        type: "gate",
        dependencies: [],
        inputs: [],
        outputs: [{ id: "test-report", path: "telemetry/evidence/test.json" }],
        definition_of_done: [{ id: "d1", check: "Suite verde", verification: "automated" }],
        gate: { verdict_required: true },
      },
    ],
  },
};

describe("Eval — provider discovery runtime", () => {
  it("discovers testing provider when absent from registry", async () => {
    const jobsDir = mkdtempSync(join(tmpdir(), "orch-disc-"));
    const orchestratorRoot = join(import.meta.dirname, "../..");
    const agentsRoot = join(orchestratorRoot, "..");

    const router = new ProviderRouter();
    const engine = new ExecutionEngine({
      registry: buildRegistryFromManifests([]),
      providers: router,
      agentsRoot,
      jobsDir,
      discovery: {
        agentsRoot,
        orchestratorProvidersDir: join(orchestratorRoot, "providers"),
      },
    });

    const result = await engine.run({
      ir: minimalTestingIR,
      policy_id: "rapid-prototype",
      feature_id: "eval-discovery-test",
    });

    expect(result.events.some((e) => e.type === "ProviderDiscoveryStarted")).toBe(true);
    expect(result.events.some((e) => e.type === "ProviderDiscoveryCompleted")).toBe(true);
    expect(result.success).toBe(false);
    expect(result.blocked_reason).toBeDefined();
  });
});

describe("Eval — contract version gate", () => {
  it("blocks when capability_version incompatible with provider contract", async () => {
    const contractsDir = join(import.meta.dirname, "../../contracts");
    const registry = buildRegistryFromManifests([
      {
        capability: "frontend-ui",
        provider: {
          id: "frontend-pro",
          priority: 100,
          cost: "medium",
          quality_score: 0.9,
          availability: "active",
          version: "1.1.0",
          contract: "contracts/frontend-ui@2.0.0",
        },
      },
    ]);

    const ir: CapabilityIR = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "CapabilityGraph",
      metadata: { id: "eval-contract", ir_version: "2.0.0", policy_ref: "rapid-prototype" },
      spec: {
        nodes: [
          {
            id: "fe",
            capability: "frontend-ui",
            capability_version: ">=3.0.0",
            type: "worker",
            dependencies: [],
            inputs: [],
            outputs: [],
            definition_of_done: [{ id: "d1", check: "done", verification: "evidence" }],
          },
        ],
      },
    };

    const router = new ProviderRouter();
    router.register(createMockProvider("frontend-pro"));

    const engine = new ExecutionEngine({
      registry,
      providers: router,
      contracts: loadContractsFromDir(contractsDir),
    });

    await expect(
      engine.run({ ir, policy_id: "rapid-prototype", feature_id: "eval-contract" }),
    ).rejects.toThrow("No provider");
  });
});
