# EvolveLoop V2 — Freeze Decision

**Branch:** `evolve-v2`  
**Date:** 2026-09-21  
**Decision authority:** Final integrity campaign evidence (not aspiration).

---

## Scope

**In freeze:** Deterministic EvolveLoop V2 Core — IR → TaskGraph → Supervisor/Engine → PRE_EXECUTE (A03) → Deterministic providers / gated effects → Evidence → Checkpoint/Recovery → Skill hard-gate artifact verification → Autonomous **path** confinement.

**Not in freeze claims:** Live Cursor/Codex/Claude/Antigravity behavioral certification; OS process sandbox; HMAC-signed checkpoints/attestations; self-evolution; long-horizon production SLOs.

---

## Proven properties

1. Caller-attested gate/grounding status alone cannot ALLOW.  
2. Wrong-context attestation plants DENY (task/project/execution/feature bindings).  
3. Incoherent checkpoint forgeries DETECT.  
4. Evidence does not auto-PASS DoD; lineage mismatch DETECT when expected lineage supplied.  
5. External job success without readable Evidence file cannot complete via Engine resume (fail-closed).  
6. Workspace write/shell without `workspaceRoot` DENY; path escape and `.env` DENY; symlink escape DETECT at assert.  
7. Autonomous `provider.yaml` module traversal/absolute DENY.  
8. V1 canonical **274/274**, V2 canonical **308/308**, full suite **825 passed / 2 skipped** (this run).  
9. Red-team + integrity harness: no UNSAFE findings.  
10. Mutation critical set **M1–M6 = 6/6**.

---

## Accepted limitations (`ACCEPTED_V2_LIMITATION`)

| # | Limitation | Why acceptable for V2 core freeze |
|---|------------|-----------------------------------|
| 1 | Checkpoint without HMAC | Coherent forge requires jobsDir write ≅ process compromise; incoherent forge DETECT |
| 2 | Attestation plantable same-context | Workspace writer trust model; wrong-context DENY; not cryptographic MFA |
| 3 | Symlink TOCTOU without OS sandbox | Re-check denies post-replace; true race needs OS sandbox (future) |
| 4 | Agentic Cursor / pickup / SkillWorker outside universal A03 | Explicitly LIMITED; Decision≠Effect on Engine path |
| 5 | `SANDBOX_NOT_IMPLEMENTED` for autonomous JS | Path confined; in-process privileges remain |
| 6 | Planted Evidence JSON can satisfy structural validator | External completeJob writer trusted; inventing evidence without file **closed** |
| 7 | `WIKI_ROOT` unset | Knowledge backend degradation; not A03 integrity failure |
| 8 | LLM / host skills NOT_MEASURED or BLOCKED | Honest certification accounting |
| 9 | Hard-gates agent-mediated beyond TS-enforced set | Documented; grill-me/image/grounding TS path PASS |

**Count: 9**

---

## Must-fix before freeze

| # | Item | Status |
|---|------|--------|
| 1 | Job-resume invented PASS | **CLOSED** this campaign |

**MUST_FIX_BEFORE_FREEZE remaining: 0**

---

## Out of scope

| # | Item |
|---|------|
| 1 | Implementing Codex / Claude / Antigravity product adapters |
| 2 | Self-evolution loops |
| 3 | New Knowledge / Evidence / Runtime / Policy engines |
| 4 | Forcing 46/46 CERTIFIED skills |

**OUT_OF_SCOPE: 4**

---

## Requires future version

| # | Item |
|---|------|
| 1 | HMAC / signed checkpoints & attestations |
| 2 | OS sandbox / secure subprocess for autonomous & TOCTOU close |
| 3 | Live LLM behavioral certification matrix |
| 4 | Long-horizon production integrity SLOs |
| 5 | Universal A03 enclosure of vendor-native agentic tools |

**REQUIRES_FUTURE_VERSION: 5**

---

## Unsupported claims (do not assert)

- “Attestation file proves legitimate human/agent intent cryptographically.”  
- “Agentic Cursor edits are A03 ENFORCED.”  
- “Autonomous skills are sandboxed.”  
- “Checkpoint cannot be forged by anyone.”  
- “All 46 skills are CERTIFIED.”  
- “V2 includes self-evolution.”  

---

## Freeze criteria checklist

| Criterion | Met? |
|-----------|------|
| A03 without critical bypass on Engine path | YES |
| Evidence without false PASS (incl. resume invent) | YES |
| Grounding without forged caller authorization | YES |
| Checkpoint detects incoherent corruption | YES |
| Lineage rejects stale mutation when checked | YES |
| Workspace known escapes denied | YES |
| Skill hard-gates without known caller bypass | YES |
| E2E deterministic PASS | YES |
| Recovery PASS (B04) | YES |
| V1 regression PASS | YES |
| Canonical accounting defined | YES |

---

## Final test accounting

| Bucket | Result |
|--------|--------|
| V1 Canonical | 274/274 |
| V2 Canonical (unit+integration) | 308/308 |
| Validator (red-team + integrity packs) | 77/77 |
| Skill Certification harness | 38/38 |
| Full orchestrator | 825 passed + 2 skipped |
| Red-Team Regression | PASS |
| Skill Certification product | PARTIAL (`PARTIALLY_CERTIFIED`) |

---

## Future work (post-freeze)

1. Optional HMAC secret for checkpoints/attestations.  
2. OS sandbox for autonomous handlers.  
3. Tighten external job evidence to workspace re-observation where DoD allows.  
4. Live backend certification when keys/environments available.  
5. Bind checkpoint path feature_id to document.feature_id fail-closed helper (hardening; not required for freeze under accepted limitation #1).

---

## Final decision

```text
V2 CORE FREEZE: APPROVED
```

Rationale: No known remaining path of **false success**, **unauthorized Engine effect**, or **silent incoherent state corruption** in the deterministic core. Residuals are explicit, tested, and non-bypass for the enforced boundary. Live/agentic/sandbox/HMAC remain open with honest labels — not hidden as PASS.
