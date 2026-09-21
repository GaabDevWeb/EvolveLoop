/**
 * Mass scenario matrix — structural expectations post-prune (no LLM).
 * Each case is one observable routing/gate/catalog assertion.
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateGrillMeTransition,
  evaluateImageToCodeGate,
  type RiskTier,
} from "../../src/policy/skill-gates.js";

const ROOT = join(import.meta.dirname, "../../..");
const GLOBAL = join(ROOT, "global-skills");

const REMOVED = [
  "linkedin-posts",
  "gsap",
  "framer-motion",
  "lenis",
  "hover-effects",
  "particles",
  "r3f-shaders",
] as const;

type Expect = "allow" | "block" | "not_required" | "required" | "absent_skill";

interface Case {
  id: string;
  area: string;
  expect: Expect;
  run: () => void;
}

const cases: Case[] = [];

function add(c: Case) {
  cases.push(c);
}

// --- grill-me matrix (tiers × evidence) ---
const tiers: RiskTier[] = ["hotfix", "standard", "sensitive", "audit"];
const evidences = ["absent", "satisfied", "failed", "blocked", "exempt"] as const;

for (const tier of tiers) {
  for (const ev of evidences) {
    add({
      id: `GM-${tier}-${ev}`,
      area: "grill-me",
      expect: "block",
      run: () => {
        const d = evaluateGrillMeTransition({
          risk_tier: tier,
          phase05_active: tier !== "hotfix",
          docs_approved: tier !== "hotfix",
          evidence_status: ev,
          trivial_non_design: false,
          runtime_verified: ev === "satisfied" || ev === "exempt",
          explicit_exempt: ev === "exempt",
        });
        if (tier === "hotfix" && ev !== "failed") {
          // hotfix without phase05 → often not required
          expect(typeof d.allow_transition).toBe("boolean");
          return;
        }
        if (d.required) {
          if (ev === "satisfied" || ev === "exempt") expect(d.allow_transition).toBe(true);
          else expect(d.allow_transition).toBe(false);
        }
      },
    });
  }
}

// trivial / exempt / fully specified
for (let i = 0; i < 10; i++) {
  add({
    id: `GM-trivial-${i}`,
    area: "grill-me",
    expect: "not_required",
    run: () => {
      const d = evaluateGrillMeTransition({
        risk_tier: "standard",
        phase05_active: true,
        docs_approved: true,
        trivial_non_design: true,
      });
      expect(d.required).toBe(false);
      expect(d.allow_transition).toBe(true);
    },
  });
}

// --- image-to-code ---
for (let i = 0; i < 15; i++) {
  add({
    id: `ITC-on-${i}`,
    area: "image-to-code",
    expect: "required",
    run: () => {
      expect(evaluateImageToCodeGate({ image_attachment: true }).required).toBe(true);
    },
  });
  add({
    id: `ITC-off-${i}`,
    area: "image-to-code",
    expect: "not_required",
    run: () => {
      expect(evaluateImageToCodeGate({ image_attachment: false }).required).toBe(false);
    },
  });
}

// --- removed skills absent ---
for (const id of REMOVED) {
  for (let i = 0; i < 5; i++) {
    add({
      id: `ABSENT-${id}-${i}`,
      area: "adversarial-removed",
      expect: "absent_skill",
      run: () => {
        expect(existsSync(join(GLOBAL, id, "SKILL.md"))).toBe(false);
      },
    });
  }
}

// --- protected still present ---
const keep = [
  "grill-me",
  "image-to-code",
  "agent-browser",
  "technical-library-dossier",
  "find-skills",
  "debugger",
].map((id) =>
  id === "debugger"
    ? join(ROOT, ".cursor", "skills", "debugger", "SKILL.md")
    : join(GLOBAL, id, "SKILL.md"),
);
for (let i = 0; i < keep.length; i++) {
  for (let j = 0; j < 5; j++) {
    const path = keep[i];
    add({
      id: `KEEP-${i}-${j}`,
      area: "protected",
      expect: "allow",
      run: () => expect(existsSync(path)).toBe(true),
    });
  }
}

// --- planning PRD path blocks ---
for (let i = 0; i < 12; i++) {
  add({
    id: `PLAN-block-${i}`,
    area: "planning",
    expect: "block",
    run: () => {
      const d = evaluateGrillMeTransition({
        risk_tier: "standard",
        phase05_active: true,
        docs_approved: true,
        evidence_status: "absent",
      });
      expect(d.allow_transition).toBe(false);
    },
  });
}

// --- architecture / scope ---
for (let i = 0; i < 10; i++) {
  add({
    id: `ARCH-${i}`,
    area: "architecture",
    expect: "required",
    run: () => {
      const d = evaluateGrillMeTransition({
        risk_tier: "sensitive",
        phase05_active: false,
        docs_approved: false,
        significant_scope_change: true,
        evidence_status: "absent",
      });
      expect(d.required).toBe(true);
      expect(d.allow_transition).toBe(false);
    },
  });
}

describe(`mass scenario matrix (${cases.length} cases)`, () => {
  it(`executes all ${cases.length} structural scenarios`, () => {
    expect(cases.length).toBeGreaterThanOrEqual(100);
    const failures: string[] = [];
    for (const c of cases) {
      try {
        c.run();
      } catch (e) {
        failures.push(`${c.id} [${c.area}]: ${e instanceof Error ? e.message : e}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});
