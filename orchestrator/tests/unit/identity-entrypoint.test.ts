import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../../..");

describe("EvolveLoop public identity", () => {
  it("canonical /evolve command exists on main tree", () => {
    expect(existsSync(join(ROOT, ".cursor/commands/evolve.md"))).toBe(true);
  });

  it("MegaBrain command is not present on main tree", () => {
    expect(existsSync(join(ROOT, ".cursor/commands/MegaBrain.md"))).toBe(false);
  });

  it("orquestrar skill maps to command evolve", () => {
    const skill = readFileSync(join(ROOT, ".cursor/skills/orquestrar/SKILL.md"), "utf-8");
    expect(skill).toMatch(/command:\s*evolve/);
    expect(skill).toMatch(/\/evolve/);
    expect(skill).not.toMatch(/\/MegaBrain/);
  });

  it("skill-gates module uses functional path", () => {
    expect(existsSync(join(ROOT, "orchestrator/src/policy/skill-gates.ts"))).toBe(true);
    expect(existsSync(join(ROOT, "orchestrator/src/policy/megabrain-skill-gates.ts"))).toBe(false);
  });

  it("default profile has no MegaBrain product id", () => {
    const profile = readFileSync(join(ROOT, "profiles/default.yaml"), "utf-8");
    expect(profile).not.toMatch(/MegaBrain|megabrain/i);
  });
});
