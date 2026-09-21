# 36 — RED TEAM Remediation Report

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Baseline (pre-remediation HEAD):** `5edab1ae334a54f4fb2b823209afd7532f8626d6`  
**Method:** FINDING → ROOT CAUSE → INVARIANT → FIX → REGRESSION → ADVERSARIAL RETEST  

**Adversarial retest:** `tests/evals/redteam-adversarial-campaign.test.ts` → **15/15**, **broken findings = 0**  
**Full suite:** **728 passed / 2 skipped** (SE08 live)

---

## Finding lifecycle

| ID | Lifecycle | Result |
|----|-----------|--------|
| RT-A03-01 | CLOSED | Forged grill-me DENY; provider execute count = 0 |
| RT-A03-02 | CLOSED | `fail_closed_missing_attestation` wired |
| RT-A03-03 | CLOSED | Missing root ⇒ path escape = true |
| RT-A03-04 | CLOSED | Write/shell without workspaceRoot ⇒ DENY |
| RT-A03-06 | CLOSED | Symlink realpath confinement |
| RT-B04-02 | CLOSED | Semantic accounting rejection |
| RT-B04-03 | CLOSED | Inflated `nodes_completed` ⇒ CORRUPT |
| RT-EV-01 | CLOSED | No auto DoD PASS |
| RT-EV-02 | CLOSED | Lineage mismatch rejected |
| RT-SEC-01/03 | CLOSED | `.env` ForbiddenPathError at FS layer |
| RT-A03-05/B04-01/04/SEC-02 | CLOSED (were resisted) | Still resisted |

---

## Per-finding detail

### RT-A03-01 — Forged grill-me

- **Root cause:** Runtime trusted caller `evidence_status=satisfied` without artifact verification.
- **Invariant:** Caller metadata is never attestation authority; only workspace artifact verified by Runtime.
- **Fix:** `src/gates/attestation.ts` + sanitize in `evaluatePreExecute`; `runtime_verified` required in `evaluateGrillMeTransition`.
- **Regression:** a03 + redteam RT-A03-01 (DENY + `getExecuteCount()===0`).
- **Retest:** PASS. Residual: artifact files remain forgeable by anyone with workspace write (expected without signed attestations / HMAC).

### RT-A03-02 — Dead fail_closed flag

- **Root cause:** Flag declared, never read.
- **Fix:** Step 0 in `evaluatePreExecute` — if flag set and node `metadata.require` includes gate without context ⇒ DENY.
- **Regression:** a03 + RT-A03-02.
- **Retest:** PASS.

### RT-A03-03 / 04 — Workspace escape

- **Root cause:** `pathEscapesWorkspace` returned false when root missing; write allowed without root.
- **Invariant:** Write/shell/path ops require `workspaceRoot`; missing root is fail-closed.
- **Fix:** `capability-authority.ts`.
- **Regression:** authority unit + RT-A03-03/04 + engine tests pass `authorityContext.workspaceRoot`.
- **Retest:** PASS.

### RT-A03-06 — Symlink escape

- **Root cause:** Lexical resolve only; `realpath` of symlink target not checked.
- **Fix:** `paths.ts` realpath + parent-chain under lexical root.
- **Limitation (LIMITED):** TOCTOU between check and use without OS sandbox — classified, not claimed PASS as sandbox.
- **Retest:** PASS (direct symlink denied).

### RT-B04-02 / 03 — Checkpoint integrity

- **Root cause:** Schema-only validation.
- **Fix:** `validateCheckpointSemantics` — non-negative counters, `nodes_completed ≤ |graph.nodes|`, lineage id checks.
- **Limitation (LIMITED):** Semantically consistent forged checkpoint without HMAC secret still possible.
- **Retest:** PASS for original attacks.

### RT-EV-01 / 02 — Evidence false PASS / lineage

- **Root cause:** `buildWorkerEvidence` auto-marked all DoD `pass`; validator ignored lineage.
- **Fix:** Default checks=`skip`, status=`partial`; callers must supply `checkResults`. `validateEvidenceV21(..., lineage?)`.
- **Retest:** PASS.

### RT-SEC-01 / 03 — Secret exposure

- **Root cause:** Engineering `isForbiddenPath` unused by deterministic FS.
- **Fix:** Enforce in `assertWithinWorkspace` via `ForbiddenPathError`.
- **Retest:** PASS.

---

## Mutation resistance (critical invariants)

| Mutation | Now detected by |
|----------|-----------------|
| Forge grill-me satisfied | RT-A03-01 / a03 |
| Dead fail_closed | RT-A03-02 |
| Remove workspace root check | RT-A03-03/04 / authority |
| Symlink follow | RT-A03-06 |
| Inflated checkpoint counters | RT-B04-02/03 |
| Auto evidence PASS | RT-EV-01 |
| Lineage tamper | RT-EV-02 |
| Ignore forbidden `.env` | RT-SEC-01/03 |

**Mutation Detection (critical remediated set):** **8/8 = 100%** (of the campaign’s critical/high broken set).  
Broader taxonomy (review auto-approve, telemetry fake completion, etc.): still PARTIAL — not claimed 100% universal.

---

## Test accounting (canonical)

Command: `bash orchestrator/scripts/test-accounting.sh` (or equivalent vitest globs below).

| Bucket | Files | Tests |
|--------|-------|-------|
| **V1** | evolveloop* + identity-flow-matrix + unit/evolveloop | **274** |
| **V2 unit** | SE01–08, backends, authority, skill-gates, deterministic, reasoning, benchmarks | **215** |
| **V2 integration** | A02–A04, B01, B04, intent, agent-executor | **91** |
| **V2 total** | unit + integration | **306** |
| **Validator** | redteam harness + post-prune-mass + engine-scenarios | **18** |
| **Full orchestrator** | all vitest | **728 passed + 2 skipped** |

### Discrepancy explanation (prior red-team report)

| Prior claim | Reality |
|-------------|---------|
| V1 424/424 | Mis-aggregated / non-canonical; measured V1 pack = **274** |
| V2 699/699 | Likely near-full suite mislabeled as V2; canonical V2 pack = **306** |
| V2 105 | Subset (integration core only) used in first campaign scorecard |
| Validator 179 | Was SE+RT pack, not a durable named bucket; now **18** for explicit validator globs |

Skipped: SE08 live (2) — requires `SE08_LIVE=1` + `CURSOR_API_KEY`.  
Live: Ollama available but not required for remediation exit.  
Flaky: none observed in remediation full run.

---

## Skill certification (honest)

| Status | N | Notes |
|--------|---|-------|
| CERTIFIED_WITH_LIMITATIONS | 6 | Deterministic FS/git/shell/project/system/knowledge (+ path/secret fixes) |
| FAILED → remediated | 1 | grill-me runtime authenticity (now enforced; still artifact-forge LIMITED) |
| BLOCKED | 8 | Host-only / Superpowers / no provider.yaml |
| NOT_MEASURED | ~31 | LLM skills — evals ≠ full adversarial certification |

**Skills Certified (strict CERTIFIED):** **0** (none meet full happy+negative+authority+failure+recovery+evidence+telemetry without limitations).  
**Skills Certified with limitations:** **6**  
Strategy: prioritize hard gates + deterministic providers + autonomous handlers before LLM soft skills.

---

## Autonomy / adapter notes

- `reasoning_only` vs `agentic_workspace`: unchanged — agentic remains **LIMITED** (A03 not universal).
- No new adapters added.
- Cursor live: BLOCKED without key. Ollama: NOT_MEASURED this remediation pass (prior PARTIAL stands).

---

## Exit criteria check

| Criterion | Status |
|-----------|--------|
| A03 critical bypass | CLOSED |
| Workspace escape | CLOSED |
| Symlink escape | CLOSED with TOCTOU LIMITED |
| Forged Evidence auto-PASS | CLOSED |
| Invalid checkpoint accepted (original attacks) | CLOSED; HMAC LIMITED |
| Lineage forgery | CLOSED when lineage supplied |
| Secret leak `.env` via deterministic FS | CLOSED |
| Completion without required proof | Improved; Engine path uses verified checks |

**OPEN CRITICAL:** 0  
**OPEN HIGH:** 0 (residuals classified LIMITED, not open bypass)  
**OPEN MEDIUM:** 0  
