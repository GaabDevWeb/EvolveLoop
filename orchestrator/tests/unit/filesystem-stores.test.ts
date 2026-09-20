import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parse as parseYaml } from "yaml";
import { FilesystemKnowledgeStore } from "../../src/knowledge/filesystem-knowledge-store.js";
import { FilesystemMemoryStore } from "../../src/memory/filesystem-memory-store.js";

describe("FilesystemKnowledgeStore", () => {
  it("persists proposed entries to disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-kb-"));
    const kb = new FilesystemKnowledgeStore(dir);

    const entry = kb.propose({
      kind: "pattern",
      content: "Parallel BE/FE after contract",
      capabilities: ["backend-implementation", "frontend-ui"],
      tags: ["parallelism"],
    });

    expect(existsSync(join(dir, "index.yaml"))).toBe(true);
    expect(existsSync(join(dir, "patterns", `${entry.id}.md`))).toBe(true);

    const reloaded = new FilesystemKnowledgeStore(dir);
    expect(reloaded.search({ capability: "backend-implementation" })).toHaveLength(1);
  });
});

describe("FilesystemMemoryStore", () => {
  it("persists preferences and context per feature", () => {
    const dir = mkdtempSync(join(tmpdir(), "orch-mem-"));
    const mem = new FilesystemMemoryStore(dir);

    mem.initFeature("2026-login", { ir_id: "2026-login", policy: "rapid-prototype" });
    mem.append("2026-login", {
      timestamp: "2026-06-30T10:00:00Z",
      source: "user",
      type: "preference",
      content: "Blue login button",
    });

    const featDir = join(dir, "2026-login");
    expect(existsSync(join(featDir, "context.yaml"))).toBe(true);
    expect(existsSync(join(featDir, "preferences.yaml"))).toBe(true);

    const prefs = parseYaml(readFileSync(join(featDir, "preferences.yaml"), "utf-8")) as {
      entries: Array<{ content: string }>;
    };
    expect(prefs.entries).toHaveLength(1);
    expect(prefs.entries[0].content).toBe("Blue login button");

    const reloaded = new FilesystemMemoryStore(dir);
    expect(reloaded.getPreferences("2026-login")).toHaveLength(1);
  });
});
