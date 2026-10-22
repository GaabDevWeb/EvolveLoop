import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  deriveContextOwnerId,
  validateSpawnContext,
  getCompactionReinjectContract,
  assertReinjectAllowed,
} from "../../src/context/index.js";

const ADR_PATH = join(process.cwd(), "..", "docs", "adr", "0013-context-ownership-working-context.md");

describe("V22-GOAL-001 — context ownership", () => {
  it("AC: dono explícito por spawn (derivado quando omitido)", () => {
    const id = deriveContextOwnerId({
      parent_cycle_id: "cycle-9",
      role: "exec",
      spawn_depth: 2,
    });
    expect(id).toBe("cycle-9:exec:d2");
    const v = validateSpawnContext({
      parent_cycle_id: "cycle-9",
      spawn_depth: 2,
      max_spawn_depth: 3,
      role: "exec",
    });
    expect(v.valid).toBe(true);
    expect(v.context_owner_id).toBe("cycle-9:exec:d2");
  });

  it("AC: spawn sem GATE_BUNDLE completo → missing_gate_bundle", () => {
    const v = validateSpawnContext({ spawn_depth: 1, role: "exec" });
    expect(v.valid).toBe(false);
    expect(v.reason).toBe("missing_gate_bundle");
  });

  it("AC: contrato compaction/reinject fail-closed", () => {
    const c = getCompactionReinjectContract();
    expect(c.status).toBe("NOT_IMPLEMENTED");
    expect(c.reinject_allowed).toBe(false);
    expect(c.stores_must_remain_distinct).toContain("Memory");
    expect(assertReinjectAllowed(true).allowed).toBe(false);
    expect(assertReinjectAllowed(false).reason).toBe("fidelity_test_required");
  });

  it("AC: ADR responde 9 perguntas + Knowledge ≠ Memory ≠ Checkpoint", () => {
    const adr = readFileSync(ADR_PATH, "utf-8");
    for (let n = 1; n <= 9; n++) {
      expect(adr).toMatch(new RegExp(`\\| ${n} \\|`));
    }
    expect(adr).toMatch(/Knowledge ≠ Memory ≠ Checkpoint/);
    expect(adr).toMatch(/descartável/i);
    expect(adr).toMatch(/ADR-DR-0002/);
    expect(adr).toMatch(/accepted/i);
  });
});
