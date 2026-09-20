import { describe, it, expect, beforeEach, vi } from "vitest";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  LongitudinalEvolveLoop,
  snapshotInventoryFromRegistry,
  diagnoseWithInventory,
  attachEvolveLoopObserver,
  AnalysisCadence,
  ADAPTER_REGISTRY,
  longitudinalFailureArc,
  resetLongitudinalSeq,
} from "../../../src/evolveloop/index.js";
import { EventBus } from "../../../src/events/event-bus.js";
import type { CapabilityRegistry, ProviderEntry } from "../../../src/types/index.js";
import { resetSyntheticSeq } from "../../../src/evolveloop/adapters/synthetic-fixtures.js";

function mockProvider(id: string): ProviderEntry {
  return {
    id,
    priority: 100,
    cost: "low",
    quality_score: 0.9,
    availability: "active",
    version: "1.0.0",
  };
}

function sqlRegistry(): CapabilityRegistry {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "CapabilityRegistry",
    metadata: {},
    capabilities: {
      "sql.query": { providers: [mockProvider("sql-provider")] },
    },
  };
}

describe("live inventory + runtime observer", () => {
  beforeEach(() => {
    resetLongitudinalSeq();
    resetSyntheticSeq();
  });

  it("snapshotInventoryFromRegistry flattens caps/providers + revision", () => {
    const snap = snapshotInventoryFromRegistry(sqlRegistry(), {
      skillsHint: ["sql-helper"],
    });
    expect(snap.inventory.capabilities).toEqual(["sql.query"]);
    expect(snap.inventory.providers).toEqual(["sql-provider"]);
    expect(snap.inventory.skills).toEqual(["sql-helper"]);
    expect(snap.source_revision).toMatch(/^[a-f0-9]{16}$/);
    expect(snap.status).toBe("UNKNOWN");
  });

  it("live registry + skill overlap → diagnose avoids AGENT / prefers reuse", () => {
    const snap = snapshotInventoryFromRegistry(sqlRegistry(), {
      skillsHint: ["sql-helper"],
    });
    const advice = diagnoseWithInventory("AGENT_BOUNDARY", snap.inventory, "sql");
    expect(advice.prefer).toBe("SKILL");
    expect(advice.avoid).toContain("AGENT");
    expect(advice.overlaps.some((o) => o.startsWith("skill:") || o.startsWith("capability:"))).toBe(
      true,
    );
  });

  it("LongitudinalEvolveLoop snapshots registry when inventory not injected", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-live-"));
    try {
      const now = new Date();
      const loop = new LongitudinalEvolveLoop({
        evolutionDir: dir,
        now,
        registry: sqlRegistry(),
        skillsHint: ["sql-helper"],
      });
      for (const obs of longitudinalFailureArc("user-a", now)) {
        loop.ingest([obs], now);
      }
      const r = loop.analyze({ now, user_id: "user-a" });
      expect(r.inventory_snapshot?.inventory.capabilities).toContain("sql.query");
      expect(r.notes.some((n) => n.startsWith("inventory_rev:"))).toBe(true);
      const agentCands = r.candidates.filter((c) => c.type === "AGENT");
      expect(agentCands.length).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("scans agentsRoot for SKILL.md names", () => {
    const root = mkdtempSync(join(tmpdir(), "el-agents-"));
    try {
      const skillDir = join(root, "skills", "sql-helper");
      mkdirSync(skillDir, { recursive: true });
      writeFileSync(join(skillDir, "SKILL.md"), "---\nname: sql-helper\n---\n");
      const snap = snapshotInventoryFromRegistry(sqlRegistry(), { agentsRoot: root });
      expect(snap.inventory.skills).toContain("sql-helper");
      expect(snap.status).toBe("FRESH");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("observer ingests from EventBus emit", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-obs-"));
    try {
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir });
      const bus = new EventBus();
      const detach = attachEvolveLoopObserver(bus, loop, {
        scope: { type: "USER", id: "u1" },
        session_id: "sess-1",
      });

      bus.emit("NodeFailed", "feat-1", "scheduler", {
        run_id: "run-1",
        capability: "sql.query",
        node_id: "n1",
        user_id: "u1",
      });

      const signals = loop.getStore().loadAllSignals();
      expect(signals.length).toBeGreaterThanOrEqual(1);
      expect(signals[0]?.user_id).toBe("u1");
      expect(signals[0]?.domain).toBe("sql.query");
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("observer rejects NodeFailed without user_id for USER attach (no stamp)", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-obs-noid-"));
    try {
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir });
      const bus = new EventBus();
      const deferred: string[] = [];
      const detach = attachEvolveLoopObserver(bus, loop, {
        scope: { type: "USER", id: "u1" },
        session_id: "sess-1",
        onDeferredIdentity: (_e, r) => deferred.push(r),
      });

      bus.emit("NodeFailed", "feat-1", "scheduler", {
        run_id: "run-1",
        capability: "sql.query",
      });

      expect(loop.getStore().loadAllSignals().length).toBe(0);
      expect(deferred).toContain("missing_identity_for_attach_scope");
      detach();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("thrown ingest does not break emit path", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-obs-err-"));
    try {
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir });
      vi.spyOn(loop, "ingest").mockImplementation(() => {
        throw new Error("ingest boom");
      });

      const bus = new EventBus();
      const errors: unknown[] = [];
      let otherSaw = false;
      attachEvolveLoopObserver(bus, loop, {
        scope: { type: "USER", id: "u1" },
        onError: (e) => errors.push(e),
      });
      bus.onEvent(() => {
        otherSaw = true;
      });

      const ev = bus.emit("FeatureBlocked", "feat-x", "engine", {
        reason: "blocked",
        user_id: "u1",
      });
      expect(ev.event_id).toBeTruthy();
      expect(errors.length).toBe(1);
      expect(otherSaw).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("AnalysisCadence gates on min signals + cooldown", () => {
    const dir = mkdtempSync(join(tmpdir(), "el-cad-"));
    try {
      const loop = new LongitudinalEvolveLoop({ evolutionDir: dir });
      const cadence = new AnalysisCadence({ min_new_signals: 3, cooldown_ms: 60_000 });
      expect(cadence.shouldAnalyze(loop.getStore())).toBe(false);

      const now = new Date();
      for (const obs of longitudinalFailureArc("user-a", now)) {
        loop.ingest([obs], now);
      }
      expect(cadence.shouldAnalyze(loop.getStore())).toBe(true);
      cadence.recordAnalyze(loop.getStore());
      expect(cadence.shouldAnalyze(loop.getStore())).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ADAPTER_REGISTRY marks jsonl + runtime-eventbus connected", () => {
    expect(ADAPTER_REGISTRY.find((a) => a.id === "jsonl-events")?.status).toBe("CONNECTED");
    expect(ADAPTER_REGISTRY.find((a) => a.id === "runtime-eventbus")?.status).toBe("CONNECTED");
    expect(ADAPTER_REGISTRY.filter((a) => a.status === "NOT_CONNECTED").length).toBeGreaterThanOrEqual(
      2,
    );
  });
});
