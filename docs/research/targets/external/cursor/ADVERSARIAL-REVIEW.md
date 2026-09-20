# ADVERSARIAL-REVIEW — Cursor TARGET_RESEARCH

**Date:** 2026-09-18  
**Reviewer role:** Same investigator (self-critique before finish)  
**Standard:** agent-architecture-mining evals — no invented internals; no MegaBrain≡Cursor; decisions only from allowed set.

## Attack 1 — “You reverse-engineered Cursor”

| | |
|--|--|
| **Charge** | REPORT invents closed harness internals. |
| **Verdict** | **Mitigated.** Architecture map labeled closed boxes as DOCUMENTED/INFERRED from docs, not source. Internals parked in UNKNOWNS. |
| **Residual risk** | Diagram may still be *read* as fact by hasty consumers. |

**Fix applied:** Explicit “Provenance note” + UNKNOWNS IDs for system prompt, tool selection, compaction, index.

## Attack 2 — “You confused MegaBrain with Cursor”

| | |
|--|--|
| **Charge** | Because MegaBrain runs in Cursor, findings treat product mechanisms as ours. |
| **Verdict** | **Mitigated.** Identity separation table; EQUIVALENCE NONE/PARTIAL called out for host tools/search/router/composer; REJECT on identity equivalence. |
| **Residual risk** | `ALREADY_PRESENT` on Rules/Skills/Subagents can be misread as “we already built Cursor.” |

**Fix applied:** Decision notes distinguish *channel/pattern* presence vs *owning* product implementation.

## Attack 3 — “Semantic indexing claimed without evidence”

| | |
|--|--|
| **Charge** | Lens demanded codebase indexing; report overstates index. |
| **Verdict** | **Accepted risk → corrected.** Public search page is Instant Grep–centric; semantic remains CONFLICT/UNKNOWN with SDK `semSearch` + blog mention only. |
| **Residual risk** | Older community knowledge may contradict 2026 docs. |

**Fix applied:** CONFLICT block; no pipeline description.

## Attack 4 — “Marketing treated as architecture”

| | |
|--|--|
| **Charge** | Blog best-practices used as technical fact. |
| **Verdict** | **Partially guilty then corrected.** Blog used for harness narrative and “semantic search” wording with labels; primary mechanism claims prefer docs pages. |
| **Residual risk** | Blog quality % claims (e.g. Intelligence +20–30% in help text) not promoted to mechanisms. |

## Attack 5 — “Decisions smuggle implementation”

| | |
|--|--|
| **Charge** | ADAPT/PROTOTYPE implies build now. |
| **Verdict** | **Mitigated.** Handoff states no implementation; PROTOTYPE only for optional checkpoint/evidence UX; Router/Composer REJECT reimplementation. |

## Attack 6 — “Incomplete lens coverage”

| Lens | Coverage |
|------|----------|
| Agent / Tools / MCP / Rules / Skills | Covered |
| Context / Context selection / Code editing / Terminal | Covered |
| Codebase indexing | Covered as **UNKNOWN-heavy** |
| Composer / agent workflow | Covered (model + Agent surface + Plan) |
| Background execution | Covered (Cloud Agents + Task background) |
| Model routing | Covered (Router/Auto) |
| DX | Covered (Customize, context ring, `/` skills) |
| **Missing depth** | Full Cloud security matrix, permissions.json schema detail, Tab vs Agent hook split — acknowledged as partial pass |

## Attack 7 — “Popularity / ranking”

| | |
|--|--|
| **Charge** | Implicit “Cursor is best.” |
| **Verdict** | **Mitigated.** Adoption table separated; no scores; no rankings. |

## Attack 8 — “OBSERVED session ≠ product contract”

| | |
|--|--|
| **Charge** | This chat’s tool list is MegaBrain/parent injection, not Cursor docs. |
| **Verdict** | **Valid caution.** OBSERVED tools confirm a *host agent tool surface compatible with docs*, not that every listed tool is identical across all Cursor plans/modes. |
| **Fix** | OBSERVED used to corroborate existence of Rules/Skills/MCP/Task patterns; mechanism definitions cite docs URLs. |

## Attack 9 — “Baseline comparison shallow”

| | |
|--|--|
| **Charge** | Did not re-audit orchestrator code paths. |
| **Verdict** | **Accepted.** Comparisons use OUR-SYSTEM-BASELINE COMPOSITE statuses; where unsure, UNKNOWN/GAP — per skill rules. |

## Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN
- [x] Epistemic labels on claims
- [x] OUR_CURRENT_MECHANISM comparisons
- [x] No Agent System implementation
- [x] No ranking / no duplicate registries proposed when ALREADY_PRESENT
- [x] Adversarial self-critique recorded

## Overall confidence in target package

| Area | Confidence |
|------|------------|
| Documented product surfaces (Rules, Skills, MCP, Hooks, Subagents, Plan, Cloud, Router) | HIGH |
| Search/index internals | LOW |
| MegaBrain gap decisions | MEDIUM–HIGH (baseline-dependent) |
| Identity non-equivalence | HIGH |

## Summary judgment

This package is **safe for Lead synthesis** as a **host-product map with hard UNKNOWN boundaries**. It is **not** a reverse engineering of Cursor’s proprietary agent. Highest-value MegaBrain takeaways are negative space: do not clone harness/router/composer; keep Policy/Evidence/Capabilities distinct from Rules/Skills/host tools; treat search/index as opaque dependency.
