# ADVERSARIAL-REVIEW — Codex TARGET_RESEARCH

**Date:** 2026-09-18  
**Reviewer stance:** Attack the report’s certainty, completeness, and decision quality.  
**Artifacts under review:** `REPORT.md`, `MECHANISMS.yaml`, `UNKNOWNS.md`

## Verdict

The dossier is **usable as Level-1 TARGET_RESEARCH** for MegaBrain comparison: primary docs + partial OSS observation, clear closed-boundary, decisions mostly conservative. It is **not** a full reverse-engineering of `codex-rs`, and several multi-agent / App-specific claims remain correctly parked as UNKNOWN/tertiary.

**Overall confidence in dossier:** MEDIUM–HIGH for documented harness loop & permissions; **LOW–MEDIUM** for multi-agent lifecycle and cloud/IDE internals.

## Attacks that land

### 1. “Partially closed” still over-reads OSS
**Attack:** Tree listing + `router.rs` header ≠ verified runtime behavior for approvals, sandbox refusal paths, or MCP policy evaluation.  
**Impact:** OBSERVED labels on M05/M12 are thin.  
**Mitigation already present:** UNKNOWNS admits non-exhaustive audit.  
**Residual risk:** Readers may treat MECHANISMS.yaml as “code-proven.”  
**Fix if revisited:** Cite specific functions/tests (`exec_policy` suites, seatbelt tests) per claim.

### 2. Doc churn / dual permission systems
**Attack:** Beta permission profiles vs legacy `sandbox_mode` means any snapshot ages quickly; `untrusted` CONFLICT shows docs disagree across pages.  
**Impact:** Operators (and we) can implement the wrong control plane.  
**Mitigation:** CONFLICT recorded; prefer latest sandboxing page.  
**Residual risk:** Config-reference vs concept pages may still diverge on defaults.

### 3. Multi-agent section contamination
**Attack:** Superpowers `codex-tools.md` is not OpenAI primary; V1/V2 wait/mailbox details could be wrong for current presets.  
**Impact:** False ALREADY_PRESENT equivalence to Cursor Task.  
**Mitigation:** REPORT marks tertiary; decision confidence MEDIUM.  
**Residual risk:** Still tempting to copy spawn/wait patterns.

### 4. App vs CLI conflation
**Attack:** Seatbelt worktree MEASURED findings are App-specific; generalizing to “Codex sandbox blocks git branch creation” is false for CLI.  
**Impact:** Bad skill/portability design.  
**Mitigation:** UNKNOWNS CONFLICT. Must stay surface-scoped.

### 5. Missing “validation/recovery/evals” depth vs assigned lens
**Attack:** User lens listed validation, recovery, evaluation; dossier mostly UNKNOWN there.  
**Impact:** Incomplete vs checklist, but honest.  
**Mitigation:** Explicit UNKNOWN section.  
**Not a failure** if epistemic rules hold — **is a coverage gap** for a follow-up pass.

### 6. Popularity / product gravity bias
**Attack:** ChatGPT bundling could inflate “ADAPT everything Codex does.”  
**Mitigation:** Adoption analysis separated; REJECT second registry; DEFER app-server/cloud.  
**Residual risk:** Permission-profile PROTOTYPE may be premature if MegaBrain never owns a local sandbox provider.

### 7. Cache/ZDR narrative is OpenAI-provider-specific
**Attack:** ADAPT “exact prefix cache discipline” may not transfer to Cursor’s model backend.  
**Mitigation:** Decision already notes provider coupling; confidence MEDIUM on our_equivalence UNKNOWN.  
**Good.**

### 8. Skills “2% budget” — is it worth ADAPT?
**Attack:** Without MEASURED token savings on *our* skill set, ADAPT is eager.  
**Counter:** Mechanism is DOCUMENTED and low-risk to prototype as policy.  
**Better decision hygiene:** Could have been PROTOTYPE not ADAPT.  
**Adversarial revision:** Prefer **PROTOTYPE** for budget numbers; keep **ADAPT** for progressive disclosure idea.

## Attacks that do *not* land

- “Invented ToolRouter” — path `codex-rs/core/src/tools/router.rs` OBSERVED.
- “Claimed IDE is open” — Open Source page explicitly says not.
- “Codex has Evidence Bus we must copy” — correctly absent / ALREADY_PRESENT ours.
- “Ranking Codex vs Claude Code” — not present.

## Decision quality audit

| Decision | Adversarial OK? | Note |
|----------|-----------------|------|
| ADAPT agent loop / turn contract | Yes | Abstract, not copy Responses |
| PROTOTYPE OS sandbox / profiles | Yes | Matches baseline Sandbox UNKNOWN |
| ALREADY_PRESENT MCP / multi-agent / plan | Caution | Multi-agent confidence should stay ≤ MEDIUM |
| ADAPT skills budget | Soft challenge | Downgrade numeric budget to PROTOTYPE |
| DEFER app-server & cloud | Yes | Correct non-goals |
| REJECT parallel registry | Yes | Anti-duplication |

## Self-check against skill anti-patterns

| Check | Result |
|-------|--------|
| Marketing as evidence | Pass — product pages used for *behavior* claims with labels |
| Invented internals | Pass — closed parts UNKNOWN |
| Implementation leaked | Pass — research markdown only |
| Popular = better | Pass |
| ALREADY_PRESENT ignored | Pass for MCP/Task/Evidence |

## Required follow-ups (if dossier upgraded)

1. Official multi-agent + automatic-review deep read → upgrade or demote M12.
2. MEASURED CLI matrix: read-only / workspace-write / network_proxy on Linux.
3. Inventory built-in tools from OSS handlers with OBSERVED table.
4. Revisit skills decision: progressive disclosure ADAPT vs budget PROTOTYPE.

## Summary for parent aggregator

Codex’s **publicly evidenced** core is a **cache-aware Responses agent loop** plus **orthogonal sandbox and approval controls** (evolving toward permission profiles), with **MCP outside the shell sandbox**, **skills progressive disclosure**, and an **OSS Rust harness** feeding multiple clients. IDE and Cloud remain closed. For MegaBrain: **adapt** dual policy controls and progressive skills; **prototype** OS-enforceable permission profiles; **do not** clone app-server or invent closed internals; treat multi-agent details as **substantially overlapping** Cursor Task but **not fully verified**.
