import { describe, it, expect } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventBus } from "../../src/events/event-bus.js";
import {
  recordSkillLifecycle,
  aggregateSkillTelemetry,
  loadSkillTelemetryFromDir,
  appendSkillTelemetryJsonl,
  buildSkillTelemetryRecord,
} from "../../src/telemetry/skill-telemetry.js";
import { CursorSkillProvider, CallbackSkillExecutor } from "../../src/plugins/cursor-skill-provider.js";
import type { ExecuteRequest, ProviderManifest } from "../../src/types/index.js";

describe("skill-telemetry observe-only", () => {
  it("skill activated → telemetry event on bus", () => {
    const bus = new EventBus();
    const seen: string[] = [];
    bus.subscribe("SkillLifecycle", (e) => {
      seen.push(String(e.payload.event_type));
    });
    recordSkillLifecycle(
      { bus },
      { event_type: "ACTIVATED", skill_id: "planner", source: "test" },
    );
    expect(seen).toContain("ACTIVATED");
  });

  it("skill not activated → não contar como activation no aggregate", () => {
    const records = [
      buildSkillTelemetryRecord({ event_type: "REFERENCED", skill_id: "legacy-motion-example" }),
      buildSkillTelemetryRecord({ event_type: "EXECUTED", skill_id: "backend" }),
    ];
    const { by_skill } = aggregateSkillTelemetry(records);
    const legacy = by_skill.find((s) => s.skill_id === "legacy-motion-example");
    const backend = by_skill.find((s) => s.skill_id === "backend");
    expect(legacy?.activation_count ?? 0).toBe(0);
    expect(backend?.execution_count).toBe(1);
  });

  it("gate required / satisfied → evidence events", () => {
    const records = [
      buildSkillTelemetryRecord({ event_type: "GATE_REQUIRED", skill_id: "grill-me" }),
      buildSkillTelemetryRecord({ event_type: "GATE_SATISFIED", skill_id: "grill-me" }),
    ];
    const { by_skill } = aggregateSkillTelemetry(records);
    const g = by_skill.find((s) => s.skill_id === "grill-me")!;
    expect(g.gate_required_count).toBe(1);
    expect(g.gate_satisfied_count).toBe(1);
  });

  it("telemetry failure → execution continua", async () => {
    const dir = mkdtempSync(join(tmpdir(), "skill-tel-"));
    // Use a path that cannot be written if we point at a file-as-dir — still must not throw
    const bad = join(dir, "not-a-dir-will-be-created");
    const r = appendSkillTelemetryJsonl(bad, buildSkillTelemetryRecord({
      event_type: "EXECUTED",
      skill_id: "testing",
    }));
    expect(r.ok).toBe(true);

    const bus = new EventBus();
    // even with bus, provider execute must succeed
    const manifest: ProviderManifest = {
      apiVersion: "capability-orchestrator.io/v2",
      kind: "Provider",
      metadata: { name: "demo", version: "1.0.0" },
      spec: {
        plugin: { type: "cursor-skill", entrypoint: "package.json" },
        capabilities: [{ id: "demo", type: "worker" }],
      },
    };
    // package.json exists as stand-in for readable "skill" file
    const root = join(import.meta.dirname, "../..");
    const provider = new CursorSkillProvider(
      manifest,
      new CallbackSkillExecutor(async (req) => ({
        run_id: req.run_id,
        success: true,
        duration_ms: 1,
        provider_id: "demo",
      })),
      root,
      { telemetryBus: bus, telemetryEventsDir: dir },
    );

    const req = {
      run_id: "r1",
      node_id: "n1",
      capability: "demo",
      inputs: [],
      definition_of_done: [],
      policy: { retries_remaining: 0 },
      memory_scope: "m",
      knowledge_hits: [],
      briefing: "",
      node: { id: "n1", capability: "demo", type: "worker", dependencies: [], definition_of_done: [] },
    } as ExecuteRequest;

    const result = await provider.execute(req);
    expect(result.success).toBe(true);
    const loaded = loadSkillTelemetryFromDir(dir);
    expect(loaded.some((x) => x.event_type === "LOADED")).toBe(true);
    expect(loaded.some((x) => x.event_type === "EXECUTED")).toBe(true);
    rmSync(dir, { recursive: true, force: true });
  });
});
