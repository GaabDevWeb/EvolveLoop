import { describe, it, expect } from "vitest";
import { pathsFromGraphifyQueryOutput } from "../../src/v22/graphify-adapter.js";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("graphify query path parse", () => {
  it("extracts src= paths in order", () => {
    const root = mkdtempSync(join(tmpdir(), "gf-parse-"));
    const rel = "orchestrator/src/jobs/checkpoint.ts";
    mkdirSync(join(root, "orchestrator/src/jobs"), { recursive: true });
    writeFileSync(join(root, rel), "export const x = 1;\n");
    const sample = `NODE checkpoint.ts [src=${rel} loc=L1]\nNODE other [src=agent-setup/src/agent_setup/install.py loc=L1]\n`;
    const paths = pathsFromGraphifyQueryOutput(sample, root);
    expect(paths[0]).toBe(rel);
    expect(paths).toHaveLength(1);
  });
});
