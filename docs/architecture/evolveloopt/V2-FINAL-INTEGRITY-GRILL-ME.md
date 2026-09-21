# V2 Final Integrity — Grill-Me

**Question:** What could still make EvolveLoop V2 falsely trust state?  
**Branch:** `evolve-v2`  
**Date:** 2026-09-21  
**Method:** adversarial grill over residual trust surfaces (no new features).

---

## 1. Checkpoint

| Risk | Mechanism | Current control | Residual |
|------|-----------|-----------------|----------|
| Schema-valid but semantic lie | Inflated counters / impossible accounting | `validateCheckpointSemantics` | Closed for incoherent forgeries |
| Policy / limit tamper | Raise max_replans / retries in snapshot | Lineage + soft bounds | Coherent rewrite of snapshot + counters possible |
| Cross-run / copy | Copy checkpoint file under another feature path | Inner `feature_id` preserved; path is not HMAC-bound | Caller must bind path↔feature |
| Stale / replay | Reload old coherent checkpoint | Revision preference; no crypto freshness | Same-process compromise model |
| **HMAC absent** | Rewrite coherent checkpoint | None cryptographic | **LIMITED** — see freeze decision |

**False trust path?** Yes if attacker already writes `jobsDir` and forges a *semantically consistent* checkpoint. That is process/workspace equivalence, not silent schema corruption.

**Grill verdict:** HMAC absence is **not** a silent-corruption hole for incoherent state; it **is** missing authenticity against a jobsDir writer. Classify as accepted limitation under local-trust model, not as “checkpoint is unsigned so everything is broken.”

---

## 2. Evidence

| Risk | Control | Residual |
|------|---------|----------|
| Auto DoD PASS | `buildWorkerEvidence` defaults skip/partial | Closed |
| Lineage tamper | `validateEvidenceV21(..., lineage?)` | Closed when lineage supplied |
| Invented PASS on job resume | **Was open** — `jobResultToExecuteResult` called `buildSuccessEvidence` on missing file | **CLOSED** this campaign (fail-closed `EVIDENCE_MISSING` / `EVIDENCE_UNREADABLE`) |
| Planted evidence JSON with all `pass` | Structural validation only; no re-observation of workspace | **LIMITED** — trusted when `completeJob` writer is trusted |

---

## 3. Attestation / Grounding / Grill-me / Image-to-code

| Risk | Control | Residual |
|------|---------|----------|
| Caller `status=satisfied` | Ignored; artifact verify required | Closed |
| Wrong task/project/execution plant | Fail-closed bindings | Closed |
| Same-context plant by workspace writer | File presence + bindings | **LIMITED** — existence ≠ cryptographic creator proof |
| Empty provenance (grounding) | Non-empty `source_ids` required | Closed |

**Grill answer:** *Does a file in the workspace mean it is trustworthy?*  
**No** for wrong-context / caller status.  
**Operationally yes** for same-context plants under the workspace-writer trust model — that is an **accepted V2 limitation**, not a gate bypass of binding rules.

---

## 4. Completion

| Attack | Expected | Status |
|--------|----------|--------|
| PASS without evidence file (external job) | Fail | Closed (job-resume) |
| PASS with forged attestation alone | DENY | Closed |
| PASS after policy denial | DENY / no execute | Closed on Engine path |
| PASS with stale lineage | Invalid when lineage checked | Closed |
| PASS with planted evidence JSON | Possible if completeJob trusted | LIMITED (external agent model) |

---

## 5. Workspace / Symlink TOCTOU

| Attack | Status |
|--------|--------|
| Symlink escape at check | DETECT (realpath) |
| Check → replace → re-check | DETECT on re-check |
| True race between check and open | **LIMITED** — no OS sandbox |
| Absolute / parent escape | DENY |
| `.env` | Forbidden |

---

## 6. Agentic execution

| Path | A03 |
|------|-----|
| `ExecutionEngine` → `evaluatePreExecute` → provider | **ENFORCED** |
| Engineering `runtime-effects` / `test-execute` | **ENFORCED** |
| Cursor `agentic_workspace` native tools | **LIMITED** |
| Job pickup / external Cursor complete | **LIMITED** |
| `SkillWorker` + autonomous in-process | **LIMITED** (`SANDBOX_NOT_IMPLEMENTED`) |
| Wiki backend spawn | **LIMITED** (process; gated by env) |

Decision ≠ Effect holds on Supervisor/AgentExecutor/Engine. Cursor agentic inverts order (effects may precede JSON decision).

---

## 7. Recovery

Recovery reloads checkpoint + re-runs gates. It must not grant grounding/attestation from checkpoint metadata alone (proven DENY). Coherent forged checkpoint remains LIMITED (HMAC).

---

## 8. Version lineage

IR id / policy id mismatch rejected. Stale plan_hash confirmation binding exists for human confirm. Telemetry is not authorization.

---

## 9. WIKI_ROOT unset

| Role | Required? |
|------|-----------|
| Deterministic Runtime / A03 gates | **No** |
| Wiki knowledge retrieval backend | **Yes** for live wiki hits |
| Agent wiki log writer (Cursor rules) | Env for product ops docs |
| Freeze of deterministic core | **Not a blocker** |

---

## 10. Still dangerous if misunderstood

1. Treating workspace attestation files as cryptographic proof.  
2. Treating Cursor agentic edits as A03-enclosed.  
3. Treating coherent checkpoint forge as “impossible” without HMAC.  
4. Treating missing `WIKI_ROOT` as Runtime integrity failure.

---

## Grill-Me outcome

No new **critical** false-trust path in the deterministic Engine core after job-resume fail-closed. Remaining trust forgeries require **already privileged writers** (workspace / jobsDir / vendor agent) and are classified as **ACCEPTED_V2_LIMITATION** or **OUT_OF_SCOPE / FUTURE**.
