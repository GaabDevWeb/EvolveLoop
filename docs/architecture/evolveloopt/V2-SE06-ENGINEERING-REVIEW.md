# SE-06 — Engineering Review & Verification Runtime

**Status:** IMPLEMENTED  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  
**Code:** `orchestrator/src/engineering/review/`  
**Depends on:** SE-05 EngineeringWorker, SE-01..04 contracts, A03/B01/B04/A04

---

## Problem

Tests alone can pass while the change violates requirements, architecture, scope, or acceptance criteria. Implementer self-approval is not sufficient.

---

## Boundaries

| Role | Authority |
|------|-----------|
| Reviewer | Analyze / findings / recommend — **never** Provider/Capability/fs/shell |
| Validation | Completion gate (impl + tests + review + DoD + policy) |
| Worker | Materialize repairs via Runtime |
| A04 | Replan when `recommended_action = REPLAN` |

```text
Review ≠ Test ≠ Validation ≠ Completion
```

---

## Contracts

- `EngineeringReviewRequest` / `EngineeringReviewResult` / `ReviewFinding`
- Status: `APPROVED | CHANGES_REQUIRED | BLOCKED | REVIEW_INVALID | REVIEW_UNAVAILABLE`
- Severity: `INFO…BLOCKER` (blockers prevent COMPLETE)

---

## Modes

1. **Deterministic** — scope, secrets, unsafe patterns, required/prohibited patterns, architecture forbid/require, test authenticity, expected outputs, prompt-injection heuristics.
2. **Agent** — AgentExecutor reasoning only (no write authority); unavailable → `REVIEW_UNAVAILABLE` (never auto-approve).
3. **Hybrid** — merge deterministic + agent findings.

Independence: when `require_independent_review`, `implementer_agent_id ≠ reviewer_agent_id` (deterministic reviewer id is distinct).

---

## Diff

`buildDiffSummary` from changed files + baseline snapshots; optional `git.diff` observation. Implementation version fingerprint invalidates prior APPROVED reviews.

---

## Completion gate

`buildValidationResult(..., { review, require_review })` — `tests PASS + review FAIL` ⇒ not COMPLETE. `assertCompletionAllowed` enforces.

---

## Proven cases

| Case | Result |
|------|--------|
| A correct | APPROVED → COMPLETE |
| B tests PASS / req gap | CHANGES_REQUIRED → REPAIR |
| C repair → re-review | APPROVED on v2 |
| D scope | BLOCKED |
| E architecture | CHANGES_REQUIRED |
| G strategy | REPLAN |
| H unavailable | REVIEW_UNAVAILABLE |

---

## Limitations

- Not a full SAST/security product.
- Live Ollama review quality: **NOT_MEASURED**.
- Sandbox still NOT_IMPLEMENTED.
- Exactly-once not claimed (AT_LEAST_ONCE + fingerprints).
