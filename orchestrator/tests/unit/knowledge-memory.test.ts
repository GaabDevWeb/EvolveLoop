import { describe, it, expect } from "vitest";
import { KnowledgeStore } from "../../src/knowledge/knowledge-store.js";
import { MemoryStore } from "../../src/memory/memory-store.js";

describe("KnowledgeStore", () => {
  it("searches by capability", () => {
    const kb = new KnowledgeStore([
      { id: "k1", kind: "pattern", content: "JWT preferred", capabilities: ["backend-implementation"] },
    ]);
    expect(kb.search({ capability: "backend-implementation" })).toHaveLength(1);
    expect(kb.search({ capability: "frontend-ui" })).toHaveLength(0);
  });

  it("proposes new entries", () => {
    const kb = new KnowledgeStore();
    const entry = kb.propose({ kind: "lesson", content: "Always inline errors" });
    expect(entry.id).toBeDefined();
    expect(kb.getAll()).toHaveLength(1);
  });
});

describe("MemoryStore", () => {
  it("scopes memory per feature", () => {
    const mem = new MemoryStore();
    mem.append("feat-1", { timestamp: "t", source: "user", type: "preference", content: "blue button" });
    expect(mem.getPreferences("feat-1")).toHaveLength(1);
    expect(mem.getPreferences("feat-2")).toHaveLength(0);
  });
});
