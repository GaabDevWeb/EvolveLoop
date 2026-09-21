/**
 * V2 proof: StructuredIntent → IR → validate → real provider → ExecutionEngine → evidence
 * No MockProvider. No manual handoff between steps.
 */
import { describe, it, expect } from "vitest";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ExecutionEngine,
  emitPlanOrThrow,
  bootstrapProviders,
  loadProviderManifests,
  buildRegistryFromManifestFiles,
  validateExecutableIR,
  type StructuredIntent,
} from "../../src/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const providersDir = resolve(__dirname, "../../providers");
const workspaceRoot = resolve(__dirname, "../..");

describe("V2 foundation — intent → real execution", () => {
  it("runs filesystem.list end-to-end without mock or manual steps", async () => {
    const intent: StructuredIntent = {
      id: "v2-proof-list",
      goal: "Execute capability filesystem.list with input path=.",
      policy_ref: "rapid-prototype",
      steps: [
        {
          id: "list-ws",
          capability: "filesystem.list",
          inputs: { path: "." },
        },
      ],
    };

    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot,
    });

    const emission = emitPlanOrThrow(intent, {
      preflight: {
        registry: boot.registry,
        router: boot.router,
        requireProviders: true,
      },
    });

    const pre = validateExecutableIR(emission.ir, {
      registry: boot.registry,
      router: boot.router,
      requireProviders: true,
    });
    expect(pre.ok).toBe(true);

    const engine = new ExecutionEngine({
      registry: boot.registry,
      providers: boot.router,
      authorityContext: {
        workspaceRoot,
        allowWrite: true,
        allowShell: true,
        allowNetwork: false,
      },
    });

    const result = await engine.run({
      ir: emission.ir,
      policy_id: "rapid-prototype",
      feature_id: emission.execution_id,
    });

    expect(result.success).toBe(true);
    expect(result.graph.nodes.every((n) => n.status === "satisfied")).toBe(true);

    const selection = result.evidence.filter((e) => e.spec.payload?.type === "selection");
    expect(selection.length).toBeGreaterThan(0);
    const selPayload = selection[0].spec.payload as {
      type: "selection";
      ranking_snapshot: Array<{ provider_id: string; selected: boolean }>;
    };
    expect(selPayload.ranking_snapshot.some((r) => r.provider_id === "filesystem" && r.selected)).toBe(
      true,
    );

    const worker = result.evidence.find((e) => e.spec.payload?.type === "worker");
    expect(worker).toBeDefined();
    expect(worker!.metadata.run_id).toBeTruthy();
    expect(worker!.metadata.capability).toBe("filesystem.list");

    // Correlation: planning execution_id is feature / intent linkage
    expect(emission.ir.metadata.execution_id).toBe(emission.execution_id);
    expect(emission.evidence.metadata.run_id).toBe(emission.execution_id);

    // Prove not mock: FileListResult present
    const normalized = (worker!.spec as { normalized?: { kind?: string } }).normalized;
    const nested = (worker!.spec.payload as { result?: { kind?: string } })?.result;
    expect(normalized?.kind ?? nested?.kind).toBe("FileListResult");

    const providerSelected = result.events.find((e) => e.type === "ProviderSelected");
    expect(providerSelected?.payload).toMatchObject({ provider_id: "filesystem" });
  });

  it("rejects unknown capability before execution (no best-effort)", () => {
    const manifests = loadProviderManifests(providersDir);
    const registry = buildRegistryFromManifestFiles(manifests);
    const boot = bootstrapProviders({
      mode: "real",
      manifests,
      registry,
      workspaceRoot,
    });

    const bad: StructuredIntent = {
      id: "bad",
      goal: "nope",
      steps: [{ id: "x", capability: "totally.missing.cap" }],
    };

    const result = emitPlanOrThrow;
    expect(() =>
      result(bad, {
        preflight: {
          registry: boot.registry,
          router: boot.router,
          requireProviders: true,
        },
      }),
    ).toThrow(/REJECTED_BEFORE_EXECUTION|INTENT_INVALID|Unknown capability|PROVIDER_UNAVAILABLE/);
  });
});
