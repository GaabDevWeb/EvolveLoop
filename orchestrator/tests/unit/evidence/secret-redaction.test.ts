import { describe, it, expect } from "vitest";
import {
  redactSecrets,
  assertNoCanaryInPublishedEvidence,
  EVIDENCE_SECRET_CANARY,
  sanitizeEvidenceForPublish,
  serializeEvidenceForPublish,
} from "../../../src/index.js";
import { buildRetrievalEvidence } from "../../../src/evidence/builders.js";

describe("V22-GOAL-007 secret canary and redaction", () => {
  it("redacts fixture canary from text", () => {
    const raw = `token=${EVIDENCE_SECRET_CANARY} done`;
    const out = redactSecrets(raw);
    expect(out).not.toContain(EVIDENCE_SECRET_CANARY);
    expect(out).toContain("[REDACTED_CANARY]");
  });

  it("published evidence JSON has 0 canary occurrences", () => {
    const evidence = buildRetrievalEvidence("n1", "run-1", "wiki", {
      type: "retrieval",
      query: "q",
      hit_count: 1,
      hits: [{ source: "x.md", excerpt: EVIDENCE_SECRET_CANARY }],
      degraded: false,
    });
    const serialized = serializeEvidenceForPublish(evidence);
    const check = assertNoCanaryInPublishedEvidence(serialized);
    expect(check.ok).toBe(true);
    expect(check.total).toBe(0);
  });

  it("sanitizeEvidenceForPublish preserves structure", () => {
    const evidence = buildRetrievalEvidence("n1", "run-1", "wiki", {
      type: "retrieval",
      query: "q",
      hit_count: 1,
      hits: [],
      degraded: false,
    });
    const clean = sanitizeEvidenceForPublish(evidence);
    expect(clean.kind).toBe("Evidence");
    expect(clean.metadata.run_id).toBe("run-1");
  });

  it("redacts common secret patterns without stripping code paths", () => {
    const out = redactSecrets("see src/auth.ts and API_KEY=abc123secret");
    expect(out).toContain("src/auth.ts");
    expect(out).not.toContain("abc123secret");
  });
});
