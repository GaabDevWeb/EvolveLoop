# Deferred: gate artefact path asserts

Removed from active suite during Controlled Runtime Sync (2026-09-18)
because they assert `artifact_path_missing` / non-empty gate artefact paths,
which are **not** implemented in `validateEvidenceV21` / `buildGateEvidence`.

Classification: TEST_IS_STALE (aspirational vs implemented contract).
Future work (separate change): either implement enforcement + builder paths, or rewrite asserts against a documented contract ADR.

```typescript
  it("requires gate artefact path", () => {
    const gateNode: GraphNode = { ...workerNode, type: "gate", capability: "testing" };
    const evidence = buildSuccessEvidence(gateNode, "run-1", "testing", 100);
    evidence.spec.artifacts = [];
    if (evidence.spec.payload && evidence.spec.payload.type === "gate") {
      evidence.spec.payload.artifacts = [];
    }
    const result = validateEvidence(evidence, gateNode.definition_of_done, gateNode);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("artifact_path_missing");
  });

  it("accepts gate evidence with artefact path", () => {
    const gateNode: GraphNode = { ...workerNode, type: "gate", capability: "testing" };
    const evidence = buildSuccessEvidence(gateNode, "run-1", "testing", 100);
    const result = validateEvidence(evidence, gateNode.definition_of_done, gateNode);
    expect(result.valid).toBe(true);
    expect(evidence.spec.artifacts?.[0]?.path).toBeTruthy();
  });
```
