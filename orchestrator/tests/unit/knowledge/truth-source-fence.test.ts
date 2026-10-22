import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  applyTruthFence,
  codeOverridesWiki,
  ProjectKnowledgeRuntime,
  detectCrossProjectLeakage,
  projectScopeId,
  scopedGraphCacheDir,
  normalizeAiPageStatus,
  fenceEvidenceSet,
  type TruthSourcedItem,
} from "../../../src/index.js";

describe("V22-GOAL-002 truth-source fence", () => {
  it("tier priority: code wins over vault on same topic_key", () => {
    const items: TruthSourcedItem[] = [
      {
        topic_key: "auth.policy",
        tier: "vault",
        provenance: { source_ref: "vault://auth.md" },
        excerpt: "wiki says X",
      },
      {
        topic_key: "auth.policy",
        tier: "code",
        provenance: { source_ref: "src/auth.ts" },
        excerpt: "code does Y",
      },
    ];
    const { accepted, rejected } = applyTruthFence(items);
    expect(accepted).toHaveLength(1);
    expect(accepted[0].tier).toBe("code");
    expect(rejected.some((r) => r.rejection_reason === "superseded_by_higher_tier")).toBe(true);
  });

  it("rejects items without provenance", () => {
    const { accepted, rejected } = applyTruthFence([
      {
        topic_key: "orphan",
        tier: "vault",
        provenance: { source_ref: "" },
      },
    ]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0].rejection_reason).toBe("missing_provenance");
  });

  it("rejects atual .ai page without source", () => {
    const { accepted, rejected } = applyTruthFence([
      {
        topic_key: "orphan",
        tier: "ai",
        provenance: { source_ref: "" },
        ai_status: "atual",
      },
    ]);
    expect(accepted).toHaveLength(0);
    expect(rejected[0].rejection_reason).toBe("atual_without_source");
  });

  it("atual page without source cannot stay atual", () => {
    const norm = normalizeAiPageStatus("atual", { source_ref: "" });
    expect(norm.valid).toBe(false);
    expect(norm.status).toBe("draft");
  });

  it("obsolete .ai/ pages are not injected", () => {
    const { accepted } = applyTruthFence([
      {
        topic_key: "old",
        tier: "ai",
        provenance: { source_ref: ".ai/wiki/old.md" },
        ai_status: "obsoleto",
      },
    ]);
    expect(accepted).toHaveLength(0);
  });

  it("code divergent from wiki: wiki marked superseded", () => {
    const code = [
      {
        topic_key: "k",
        tier: "code" as const,
        provenance: { source_ref: "src/k.ts" },
      },
    ];
    const wiki = [
      {
        topic_key: "k",
        tier: "ai" as const,
        provenance: { source_ref: ".ai/wiki/k.md" },
        excerpt: "wiki fixes silently",
      },
    ];
    const demoted = codeOverridesWiki(code, wiki);
    expect(demoted[0].superseded).toBe(true);
    expect(demoted[0].rejection_reason).toBe("code_authority_over_wiki");
  });

  it("scenario 12 — zero cross-project canary leakage", () => {
    const rootA = mkdtempSync(join(tmpdir(), "v22-a-"));
    const rootB = mkdtempSync(join(tmpdir(), "v22-b-"));
    const canaryA = `CANARY_PROJECT_A_${projectScopeId(rootA)}`;

    mkdirSync(join(rootA, ".ai"), { recursive: true });
    writeFileSync(join(rootA, ".ai", "marker.txt"), canaryA);

    const runtimeA = new ProjectKnowledgeRuntime({ projectRoot: rootA });
    runtimeA.ingestAiPage(
      { source: join(rootA, ".ai/marker.txt"), excerpt: canaryA },
      "marker",
      "atual",
    );

    const runtimeB = new ProjectKnowledgeRuntime({ projectRoot: rootB });
    runtimeB.ingestCode(
      { source: join(rootB, "src/main.ts"), excerpt: "only B" },
      "main",
    );

    const bundleB = runtimeB.buildInjectionBundle();
    const report = detectCrossProjectLeakage(canaryA, bundleB);
    expect(report.leak_count).toBe(0);
    expect(report.ok).toBe(true);
    expect(runtimeB.assertNoForeignCanary(canaryA, bundleB)).toBe(true);
  });

  it("scoped graph cache paths differ per project root", () => {
    const a = scopedGraphCacheDir("/data", "/proj/a");
    const b = scopedGraphCacheDir("/data", "/proj/b");
    expect(a).not.toBe(b);
  });

  it("fenceEvidenceSet drops vault hits without source", async () => {
    const fenced = fenceEvidenceSet(
      {
        kind: "EvidenceSet",
        query: "q",
        hits: [
          { source: "ok.md", excerpt: "x" },
          { source: "", excerpt: "bad" },
        ],
        retrieval_method: "fake",
      },
      "/tmp/project",
    );
    expect(fenced.fenced.accepted).toHaveLength(1);
    expect(fenced.evidence.hits).toHaveLength(1);
  });
});
