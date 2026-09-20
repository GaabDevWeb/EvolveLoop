import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  evaluateGrillMeTransition,
  evaluateImageToCodeGate,
} from "../../src/policy/megabrain-skill-gates.js";
import { discoverAllManifests } from "../../src/discovery/provider-discovery.js";

const ROOT = join(import.meta.dirname, "../../..");
const GLOBAL = join(ROOT, "global-skills");
const CURSOR_SKILLS = join(ROOT, ".cursor", "skills");
const COMMANDS = join(ROOT, ".cursor", "commands");

const REMOVED = [
  "linkedin-posts",
  "gsap",
  "framer-motion",
  "lenis",
  "hover-effects",
  "particles",
  "r3f-shaders",
] as const;

const PROTECTED = [
  "grill-me",
  "image-to-code",
  "agent-browser",
  "technical-library-dossier",
  "find-skills",
  "systematic-debugging",
  "brainstorming",
  "frontend-design",
  "ui-ux-pro-max",
  "writing-plans",
  "executing-plans",
  "subagent-driven-development",
  "finishing-a-development-branch",
] as const;

describe("post-prune catalog invariants", () => {
  it("removed skills are not on disk under global-skills", () => {
    for (const id of REMOVED) {
      expect(existsSync(join(GLOBAL, id)), `${id} must be removed`).toBe(false);
    }
  });

  it("protected global skills remain", () => {
    for (const id of PROTECTED) {
      expect(existsSync(join(GLOBAL, id, "SKILL.md")), `${id} missing`).toBe(true);
    }
  });

  it("removed_skill_must_not_be_runtime_resolvable via provider.yaml", () => {
    const manifests = discoverAllManifests({
      agentsRoot: ROOT,
      orchestratorProvidersDir: join(ROOT, "orchestrator", "providers"),
    });
    for (const m of manifests) {
      expect(REMOVED.includes(m.metadata.name as (typeof REMOVED)[number])).toBe(false);
      const entry = m.spec.plugin.entrypoint ?? "";
      for (const id of REMOVED) {
        expect(entry.includes(`global-skills/${id}`)).toBe(false);
        expect(entry.includes(`/${id}/SKILL.md`) && entry.includes("global-skills")).toBe(false);
      }
    }
  });

  it("no command file requires a removed skill path", () => {
    for (const name of readdirSync(COMMANDS)) {
      if (!name.endsWith(".md")) continue;
      const text = readFileSync(join(COMMANDS, name), "utf-8");
      for (const id of REMOVED) {
        expect(text.includes(`global-skills/${id}`), `${name} refs ${id}`).toBe(false);
        expect(text.includes(`~/.agents/skills/${id}`), `${name} refs agents ${id}`).toBe(false);
      }
    }
  });

  it("core local skills still present", () => {
    for (const id of [
      "orquestrar",
      "planner",
      "prd",
      "frontend-pro",
      "debugger",
      "testing",
      "po-review",
      "documentation",
    ]) {
      expect(existsSync(join(CURSOR_SKILLS, id, "SKILL.md"))).toBe(true);
    }
  });
});

describe("post-prune hard gates preserved", () => {
  it("grill-me still fail-closed when required+absent", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "absent",
    });
    expect(d.allow_transition).toBe(false);
    expect(d.fail_closed).toBe(true);
  });

  it("grill-me satisfied still allows planner", () => {
    const d = evaluateGrillMeTransition({
      risk_tier: "standard",
      phase05_active: true,
      docs_approved: true,
      evidence_status: "satisfied",
    });
    expect(d.allow_transition).toBe(true);
  });

  it("image-to-code still required on attachment", () => {
    expect(evaluateImageToCodeGate({ image_attachment: true }).required).toBe(true);
    expect(evaluateImageToCodeGate({ image_attachment: false }).required).toBe(false);
  });
});

describe("adversarial removed-skill requests", () => {
  it("requesting removed skill by name does not resolve a global-skills path", () => {
    for (const id of REMOVED) {
      expect(existsSync(join(GLOBAL, id, "SKILL.md"))).toBe(false);
    }
  });

  it("library-dossier chain skills still exist", () => {
    expect(existsSync(join(GLOBAL, "technical-library-dossier", "SKILL.md"))).toBe(true);
    expect(existsSync(join(GLOBAL, "agent-browser", "SKILL.md"))).toBe(true);
    expect(existsSync(join(COMMANDS, "library-dossier.md"))).toBe(true);
  });

  it("descobrir / find-skills still exist (user discovery)", () => {
    expect(existsSync(join(COMMANDS, "descobrir.md"))).toBe(true);
    expect(existsSync(join(GLOBAL, "find-skills", "SKILL.md"))).toBe(true);
  });

  it("grill-me command and skill still exist", () => {
    expect(existsSync(join(COMMANDS, "grill-me.md"))).toBe(true);
    expect(existsSync(join(GLOBAL, "grill-me", "SKILL.md"))).toBe(true);
  });
});
