import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FakeKnowledgeBackend,
  WikiKnowledgeBackend,
  resolveKnowledgeBackend,
  resetKnowledgeBackendCache,
  loadMegaBrainProfile,
  resolveKnowledgeBackendId,
  DEFAULT_PROFILE,
  resolveWikiRoot,
} from "../../src/index.js";

const ROOT = join(import.meta.dirname, "../../..");

describe("KnowledgeBackend seam", () => {
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ["KNOWLEDGE_BACKEND", "WIKI_ROOT", "RAG_REPO_ROOT", "AGENTS_ROOT", "MEGABRAIN_PROFILE_PATH"]) {
      prev[k] = process.env[k];
    }
    resetKnowledgeBackendCache();
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    resetKnowledgeBackendCache();
  });

  it("defaults to wiki backend", () => {
    delete process.env.KNOWLEDGE_BACKEND;
    process.env.AGENTS_ROOT = ROOT;
    const b = resolveKnowledgeBackend();
    expect(b.id).toBe("wiki");
    expect(b).toBeInstanceOf(WikiKnowledgeBackend);
  });

  it("selects fake backend when KNOWLEDGE_BACKEND=fake", async () => {
    process.env.KNOWLEDGE_BACKEND = "fake";
    resetKnowledgeBackendCache();
    const b = resolveKnowledgeBackend();
    expect(b.id).toBe("fake");
    expect(b).toBeInstanceOf(FakeKnowledgeBackend);
    const set = await b.search("hello");
    expect(set.error_code).toBeNull();
    expect(set.hits.length).toBeGreaterThan(0);
    expect(set.retrieval_method).toBe("fake");
  });

  it("core can use FakeKnowledgeBackend without Wiki", async () => {
    const fake = new FakeKnowledgeBackend({
      hits: [{ source: "unit://a", excerpt: "x", retrieval_method: "fake" }],
    });
    const set = await resolveKnowledgeBackend({ instance: fake }).search("q");
    expect(set.hits[0]?.source).toBe("unit://a");
  });

  it("fake unavailable fail-closed style error_code", async () => {
    const fake = new FakeKnowledgeBackend({ error_code: "RAG_REPO_MISSING" });
    const set = await fake.search("q");
    expect(set.hits).toEqual([]);
    expect(set.error_code).toBe("RAG_REPO_MISSING");
    const h = await fake.health();
    expect(h.available).toBe(false);
  });

  it("WIKI_ROOT drives wiki root — no /home/gaab hardcoded in resolveWikiRoot", () => {
    process.env.WIKI_ROOT = "/tmp/custom-wiki-root-xyz";
    delete process.env.RAG_REPO_ROOT;
    expect(resolveWikiRoot()).toBe("/tmp/custom-wiki-root-xyz");
    expect(resolveWikiRoot()).not.toContain("/home/gaab");
  });

  it("missing wiki root yields RAG_REPO_MISSING (fail closed for retrieval)", async () => {
    process.env.WIKI_ROOT = join("/tmp", `missing-wiki-${Date.now()}`);
    process.env.RAG_REPO_ROOT = process.env.WIKI_ROOT;
    process.env.KNOWLEDGE_BACKEND = "wiki";
    resetKnowledgeBackendCache();
    const set = await resolveKnowledgeBackend().search("anything");
    expect(set.error_code).toBe("RAG_REPO_MISSING");
    expect(set.hits).toEqual([]);
  });
});

describe("EvolveLoop profile boundary", () => {
  afterEach(() => {
    delete process.env.AGENTS_ROOT;
    delete process.env.KNOWLEDGE_BACKEND;
    delete process.env.MEGABRAIN_PROFILE_PATH;
    delete process.env.EVOLVELOOP_PROFILE_PATH;
  });

  it("loads profiles/default.yaml when AGENTS_ROOT set", () => {
    process.env.AGENTS_ROOT = ROOT;
    delete process.env.KNOWLEDGE_BACKEND;
    const p = loadMegaBrainProfile();
    expect(p.id).toBe("default");
    expect(p.knowledge.backend).toBe("wiki");
    expect(p.memory.enabled).toBe(false);
  });

  it("DEFAULT_PROFILE is wiki without file", () => {
    delete process.env.AGENTS_ROOT;
    delete process.env.MEGABRAIN_PROFILE_PATH;
    expect(loadMegaBrainProfile().knowledge.backend).toBe(DEFAULT_PROFILE.knowledge.backend);
  });

  it("KNOWLEDGE_BACKEND env overrides profile", () => {
    process.env.AGENTS_ROOT = ROOT;
    process.env.KNOWLEDGE_BACKEND = "fake";
    expect(resolveKnowledgeBackendId()).toBe("fake");
  });
});

describe("core purity — knowledge backend module", () => {
  it("backend types/resolve contain no /home/gaab or GaabWiki identity", () => {
    const files = [
      "orchestrator/src/knowledge/backend/types.ts",
      "orchestrator/src/knowledge/backend/resolve.ts",
      "orchestrator/src/config/profile.ts",
      "orchestrator/src/providers/deterministic/knowledge.ts",
    ];
    for (const rel of files) {
      const text = readFileSync(join(ROOT, rel), "utf-8");
      expect(text.includes("/home/gaab"), rel).toBe(false);
      expect(text.includes("GaabWiki"), rel).toBe(false);
      expect(text.includes("karpathyWiki"), rel).toBe(false);
    }
  });

  it("profiles/default.yaml has no absolute personal paths", () => {
    const text = readFileSync(join(ROOT, "profiles/default.yaml"), "utf-8");
    expect(text.includes("/home/gaab")).toBe(false);
    expect(text.includes("Gaab")).toBe(false);
  });
});
