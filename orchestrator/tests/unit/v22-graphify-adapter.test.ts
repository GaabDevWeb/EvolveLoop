import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { queryGraphifyCodeStructure } from "../../src/v22/graphify-adapter.js";

describe("graphify adapter (GOAL-008)", () => {
  const prev = process.env.EVOLVELOOP_GRAPHIFY;

  afterEach(() => {
    if (prev === undefined) delete process.env.EVOLVELOOP_GRAPHIFY;
    else process.env.EVOLVELOOP_GRAPHIFY = prev;
  });

  it("returns disabled stub when flag off", () => {
    delete process.env.EVOLVELOOP_GRAPHIFY;
    const r = queryGraphifyCodeStructure({ projectRoot: "/tmp", query: "checkpoint" });
    expect(r.enabled).toBe(false);
    expect(r.edges).toHaveLength(0);
    expect(r.source).toBe("disabled");
  });

  it("returns stub edges when flag on and CLI absent", () => {
    process.env.EVOLVELOOP_GRAPHIFY = "on";
    const emptyRoot = mkdtempSync(join(tmpdir(), "gf-stub-"));
    const r = queryGraphifyCodeStructure({ projectRoot: emptyRoot, query: "checkpoint" });
    expect(r.enabled).toBe(true);
    expect(r.source).toBe("stub");
    expect(r.edges.length).toBeGreaterThan(0);
    expect(r.edges.every((e) => e.kind === "INFERRED" || e.kind === "EXTRACTED")).toBe(true);
  });
});
