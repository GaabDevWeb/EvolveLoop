import { describe, it, expect, afterEach } from "vitest";
import {
  applyCavemanBrevity,
  applyCavemanToBriefingSection,
  brevityPreservesNegation,
} from "../../src/v22/brevity-caveman.js";

describe("caveman brevity (GOAL-009)", () => {
  const prev = process.env.EVOLVELOOP_BREVITY_CAVEMAN;

  afterEach(() => {
    if (prev === undefined) delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    else process.env.EVOLVELOOP_BREVITY_CAVEMAN = prev;
  });

  it("is identity when flag off", () => {
    delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    const text = "Please carefully explain the checkpoint HMAC algorithm.";
    const r = applyCavemanBrevity(text);
    expect(r.enabled).toBe(false);
    expect(r.text).toBe(text);
    expect(r.output_tokens).toBe(r.input_tokens);
  });

  it("shrinks prose but keeps fenced JSON", () => {
    const text = `Please read this carefully and provide a thoroughly detailed explanation of every step.\n\n\`\`\`json\n{"kind":"Evidence","not":false}\n\`\`\``;
    const r = applyCavemanBrevity(text, { force: true });
    expect(r.output_tokens).toBeLessThan(r.input_tokens);
    expect(r.text).toContain('"kind":"Evidence"');
    expect(brevityPreservesNegation(text, r.text, ["not"])).toBe(true);
  });

  it("leaves DoD block intact in pickup-shaped prompt", () => {
    const prompt = `## Briefing\n\nPlease execute this task carefully with full detail.\n\n## Definition of Done\n\n\`\`\`json\n[{"id":"d1"}]\n\`\`\``;
    delete process.env.EVOLVELOOP_BREVITY_CAVEMAN;
    const off = applyCavemanToBriefingSection(prompt);
    process.env.EVOLVELOOP_BREVITY_CAVEMAN = "on";
    const on = applyCavemanToBriefingSection(prompt);
    expect(off.text).toBe(prompt);
    expect(on.output_tokens).toBeLessThanOrEqual(off.output_tokens);
    expect(on.text).toContain('"id":"d1"');
  });
});
