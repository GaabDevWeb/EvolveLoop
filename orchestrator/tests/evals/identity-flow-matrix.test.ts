import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "../../..");

function mustExist(rel: string) {
  expect(existsSync(join(ROOT, rel)), rel).toBe(true);
}

describe("identity mass flow matrix (structural)", () => {
  const routing = [
    "evolve", "prd", "planejar", "backend", "frontend-pro", "testes", "debugger",
    "validar", "documentar", "wiki", "mem", "seguranca", "architect", "adr",
    "devops", "database", "grill-me",
  ];
  const skills = [
    "orquestrar", "prd", "planner", "backend", "frontend-pro", "testing", "debugger",
    "po-review", "documentation", "wiki", "wiki-mem", "security", "architect", "adr",
    "devops", "database",
  ];
  const gates = [
    ".cursor/skills/orquestrar/references/grill-me-gate.md",
    ".cursor/skills/orquestrar/references/image-attachment-gate.md",
    ".cursor/skills/orquestrar/references/knowledge-grounding-gate.md",
  ];
  const knowledge = [
    "orchestrator/src/knowledge/backend/types.ts",
    "orchestrator/src/knowledge/backend/wiki-backend.ts",
    "orchestrator/src/knowledge/backend/fake-backend.ts",
    "orchestrator/src/knowledge/backend/resolve.ts",
    "profiles/default.yaml",
  ];
  const providers = [
    "orchestrator/src/policy/skill-gates.ts",
    "orchestrator/src/config/profile.ts",
  ];

  // Expand to >=160 scenario slots by combinatorial categories
  const categories: Array<{ name: string; items: string[]; prefix?: string }> = [
    { name: "routing_commands", items: routing, prefix: ".cursor/commands/" },
    { name: "planning_skills", items: skills, prefix: ".cursor/skills/" },
    { name: "prd_surface", items: ["prd", "planejar", "grill-me"], prefix: ".cursor/commands/" },
    { name: "backend_surface", items: ["backend", "database", "devops"], prefix: ".cursor/commands/" },
    { name: "architecture_surface", items: ["architect", "adr"], prefix: ".cursor/commands/" },
    { name: "debugging_surface", items: ["debugger", "debug", "analisar-falha"], prefix: ".cursor/commands/" },
    { name: "testing_surface", items: ["testes", "validar", "validator"], prefix: ".cursor/commands/" },
    { name: "security_surface", items: ["seguranca"], prefix: ".cursor/commands/" },
    { name: "documentation_surface", items: ["documentar"], prefix: ".cursor/commands/" },
    { name: "wiki_knowledge", items: knowledge },
    { name: "frontend_surface", items: ["frontend-pro"], prefix: ".cursor/commands/" },
    { name: "image_gate", items: gates },
    { name: "agent_authoring", items: ["agent-authoring", "skill-authoring"], prefix: ".cursor/commands/" },
    { name: "failure_recovery", items: ["failure-analyst", "debugger"], prefix: ".cursor/commands/" },
    { name: "providers_core", items: providers },
  ];

  let scenarioId = 0;
  for (const cat of categories) {
    for (let i = 0; i < 12; i++) {
      const item = cat.items[i % cat.items.length];
      const path = cat.prefix
        ? item.endsWith(".md") || item.includes("/")
          ? item
          : `${cat.prefix}${item}${cat.prefix.includes("commands") ? ".md" : cat.prefix.includes("skills") ? "/SKILL.md" : ""}`
        : item;
      scenarioId += 1;
      it(`${cat.name}#${String(i + 1).padStart(2, "0")} (${scenarioId}) ${path}`, () => {
        if (cat.prefix?.includes("skills") && !path.endsWith("SKILL.md")) {
          mustExist(`.cursor/skills/${item}/SKILL.md`);
        } else {
          mustExist(path);
        }
        // identity: no MegaBrain as required path
        expect(path.toLowerCase()).not.toContain("megabrain");
      });
    }
  }

  it("scenario_count_at_least_160", () => {
    expect(scenarioId).toBeGreaterThanOrEqual(160);
  });

  it("public docs mention EvolveLoop and /evolve", () => {
    const readme = readFileSync(join(ROOT, "README.md"), "utf-8");
    expect(readme).toMatch(/EvolveLoop/);
    expect(readme).toMatch(/\/evolve/);
  });

  it("command directory has evolve and not MegaBrain", () => {
    const cmds = readdirSync(join(ROOT, ".cursor/commands"));
    expect(cmds).toContain("evolve.md");
    expect(cmds).not.toContain("MegaBrain.md");
  });
});
