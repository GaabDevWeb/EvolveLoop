# 11 — Skill Certification Remediation Report

**Date:** 2026-09-21  
**Branch:** `evolve-v2`  
**Campaign baseline:** `EVOLVELOOP_V2_SKILL_CERTIFICATION_COMPLETE`  
**Method:** FINDING → ROOT CAUSE → FIX → REGRESSION → ADVERSARIAL RETEST  

---

## Findings remediated

### CRITICAL — `wiki / grounding.status caller-attested → ALLOW` (RT-SKILL-WIKI-01)

| Field | Detail |
|-------|--------|
| **Finding** | `gateContext.grounding.status = satisfied` alone produced `ALLOW` with no verifiable evidence. |
| **Root cause** | Same class of bug as pre-fix grill-me: Runtime treated caller-declared status as authoritative. |
| **Fix** | `evaluatePreExecute` ignores `grounding.status`. Grounding requires on-disk `gate.knowledge-grounding` artifact verified by `verifyGateAttestationArtifact` with fail-closed bindings: `execution_id`, `task_id`, `project_id` (when expected), plus non-empty `source_ids` for `satisfied`. |
| **Tests** | `tests/evals/grounding-attestation-remediation.test.ts` (forge / wrong-task / wrong-project / wrong-execution / stale / empty / tamper / replan / checkpoint re-verify / positive ALLOW). Skill-cert wiki adversarial expects DENY. Red-team `RT-SKILL-WIKI-01`. |
| **Adversarial retest** | Caller status forge → DENY. Valid artifact + provenance → ALLOW. |
| **Residual** | Workspace-writable attacker can still plant a forged artifact (same trust model as grill-me). No HMAC on attestation. Knowledge backend does not cryptographically sign `source_ids` — provenance presence is required, authenticity of IDs is not globally proven. |

### HIGH — `autonomous provider.yaml import()` residual

| Field | Detail |
|-------|--------|
| **Finding** | `provider.yaml` → `autonomous.module` → in-process `import()` could resolve absolute / traversal paths. |
| **Root cause** | Module path treated as trusted filesystem path; no confinement before dynamic import. |
| **Fix** | `resolveAutonomousModule` (Option A + path confinement): relative-only, no `..`, extension allowlist (`.mjs/.js/.cjs`), realpath must stay under provider directory. Wired into `AutonomousSkillExecutor` and `canExecuteAutonomously`. Explicit `AUTONOMOUS_SANDBOX_STATUS = SANDBOX_NOT_IMPLEMENTED`. |
| **Tests** | `tests/evals/autonomous-loader-security.test.ts` (traversal, absolute, extension, symlink, protocol, denied before import, honest in-process residual). Red-team `RT-AUTONOMOUS-01`. |
| **Adversarial retest** | Traversal/absolute never load; marker file not created. Valid `./handler.mjs` under provider still executes. |
| **Residual** | **SANDBOX_NOT_IMPLEMENTED** — confined modules still run with orchestrator process privileges (env, FS, child_process if coded). Path confinement ≠ OS sandbox. |

---

## Trust model (declarative vs verified)

| Category | Examples | Gate authority? |
|----------|----------|-----------------|
| Declarative (caller) | `grounding.status`, `evidence_status`, checkpoint metadata claims | **Never** alone |
| Verified evidence | On-disk attestation under `workspaceRoot`, gate id match, context bindings, provenance array | **Yes** for PRE_EXECUTE |

Chosen autonomous model: **A (path confinement + extension allowlist)** — fits existing in-process executor without inventing a second registry/sandbox. Documented residual for full sandbox (C).

---

## Mutation detectors

| Mutation | Expected suite reaction | Status |
|----------|-------------------------|--------|
| Accept caller `grounding.status` | Forge test must not ALLOW | covered |
| Remove provenance check | Empty `source_ids` must fail verify | covered |
| Allow arbitrary `import()` | Absolute/traversal must DENY | covered |
| Remove boundary / accept invalid grounding on completion | PRE_EXECUTE still DENY without artifact | covered via forge + missing |

---

## Re-runs executed

- Skill certification harness (46 skills) → `skills-certification.json` regenerated  
- Red-team adversarial campaign (incl. RT-SKILL-WIKI-01, RT-AUTONOMOUS-01)  
- A02 / A03 / B04 / authority / evolveloop-final-evals  
- Grounding + autonomous remediation suites  

---

## Post-remediation accounting (skills)

See `10-FINAL-SKILL-CERTIFICATION-REPORT.md` and `01-SKILL-CERTIFICATION-MATRIX.md`.

Notable status change: **wiki** `FAILED` → `CERTIFIED_WITH_LIMITATIONS` (TS grounding gate fixed; vault CLI live still limited).

---

## Open residuals (not expanded this mission)

1. Checkpoint without HMAC  
2. Symlink TOCTOU without OS sandbox  
3. Agentic workspace outside A03 universal  
4. LLM skills without live backend → `NOT_MEASURED`  
5. Autonomous in-process privileges → `SANDBOX_NOT_IMPLEMENTED`  
6. Attestation artifact plantable by workspace writer  

**Open Critical after this remediation:** 0 (caller-attested grounding bypass closed)  
**Open High (controlled residual):** autonomous OS sandbox not implemented (documented, not a bypass of path confinement)
