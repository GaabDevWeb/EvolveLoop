import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildPickupPrompt } from "../../src/jobs/job-pickup.js";
import {
  CAVEMAN_EXCEPTION_LINE,
  CAVEMAN_GATE_HEADING,
  CAVEMAN_UPSTREAM_COMMIT,
  readVendoredCavemanSkill,
} from "../../src/v22/caveman-hard-gate.js";
import {
  isCavemanBrevityExplicitlyOn,
  isCavemanOutputGateEnabled,
} from "../../src/v22/feature-flags.js";
import type { SkillJob } from "../../src/jobs/job-store.js";

const repoRoot = join(import.meta.dirname, "../../..");
const prev = process.env.EVOLVELOOP_BREVITY_CAVEMAN;

const PAYLOAD = [
  "```ts\nexport const token = 1;\n```",
  "npm test -- --run",
  "orchestrator/src/v22/brevity-caveman.ts",
  '{"kind":"Evidence","id":"e1"}',
  "d262ab3882952a59312ff3537cd86d894523c5ab",
  "chore: sync SKILL.md copies [skip ci]",
  "See docs/v22/VENDOR-MEASURE.md for the operator command.",
  "task_id: V22-CAVEMAN-HG-1",
  "status: pass",
  "No secret leakage in evidence payload",
];

function job(briefing: string): SkillJob {
  return {
    apiVersion: "capability-orchestrator.io/v2",
    kind: "SkillJob",
    run_id: "00000000-0000-4000-8000-0000000000c1",
    provider_id: "testing",
    skill_path: ".cursor/skills/testing/SKILL.md",
    capability: "testing",
    node_id: "n1",
    briefing,
    definition_of_done: [{ id: "d1", check: "pass", verification: "automated" }],
    inputs: [{ name: "sha", value: CAVEMAN_UPSTREAM_COMMIT }],
    status: "pending",
  };
}

describe("caveman output hard gate", () => {
  afterEach(() => {
    if (prev === undefined) delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    else process.env.EVOLVELOOP_BREVITY_CAVEMAN = prev;
  });

  it("pins the vendored skill bytes", () => {
    const pin = JSON.parse(readFileSync(join(repoRoot, "vendor/juliusbrussee-caveman/PIN.json"), "utf8")) as {
      commit: string;
      vendored_paths: Record<string, string>;
    };
    expect(pin.commit).toBe(CAVEMAN_UPSTREAM_COMMIT);
    for (const [rel, sha] of Object.entries(pin.vendored_paths)) {
      const body = readFileSync(join(repoRoot, "vendor/juliusbrussee-caveman", rel));
      expect(createHash("sha256").update(body).digest("hex")).toBe(sha);
    }
    expect(pin.vendored_paths["skills/caveman/SKILL.md"]).toBe(
      createHash("sha256").update(readVendoredCavemanSkill()).digest("hex"),
    );
  });

  it("is on by default and off only for the documented opt-out", () => {
    delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    expect(isCavemanOutputGateEnabled()).toBe(true);
    expect(isCavemanBrevityExplicitlyOn()).toBe(false);
    for (const value of ["on", "true", "1", "yes", "ON"]) {
      process.env.EVOLVELOOP_BREVITY_CAVEMAN = value;
      expect(isCavemanOutputGateEnabled()).toBe(true);
    }
    for (const value of ["off", "false", "0", "no", " OFF "]) {
      process.env.EVOLVELOOP_BREVITY_CAVEMAN = value;
      expect(isCavemanOutputGateEnabled()).toBe(false);
      expect(isCavemanBrevityExplicitlyOn()).toBe(false);
    }
  });

  it("keeps exception payloads byte-identical and embeds the official skill only when on", () => {
    const briefing = PAYLOAD.join("\n");
    delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    const on = buildPickupPrompt(job(briefing), "/tmp/jobs", join(repoRoot, "orchestrator"));
    process.env.EVOLVELOOP_BREVITY_CAVEMAN = "on";
    const explicit = buildPickupPrompt(job(briefing), "/tmp/jobs", join(repoRoot, "orchestrator"));
    process.env.EVOLVELOOP_BREVITY_CAVEMAN = "off";
    const off = buildPickupPrompt(job(briefing), "/tmp/jobs", join(repoRoot, "orchestrator"));

    const skill = readVendoredCavemanSkill();
    expect(on).toContain(CAVEMAN_GATE_HEADING);
    expect(on).toContain(CAVEMAN_EXCEPTION_LINE);
    expect(on).toContain(skill);
    expect(explicit).toContain(skill);
    expect(off).not.toContain(CAVEMAN_GATE_HEADING);
    expect(off).not.toContain("Only fluff die.");
    expect(on).toContain("caveman_output: on");
    expect(off).toContain("caveman_output: off");

    const dod = "## Definition of Done";
    const onContract = on.slice(on.indexOf(dod));
    expect(explicit.slice(explicit.indexOf(dod))).toBe(onContract);
    expect(off.slice(off.indexOf(dod))).toBe(onContract);
    expect(on).toContain(briefing);
    expect(explicit).toContain(briefing);
    expect(off).toContain(briefing);
    expect(onContract).toContain(`"value": "${CAVEMAN_UPSTREAM_COMMIT}"`);
    expect(onContract).toContain('"id": "d1"');
  });
});
