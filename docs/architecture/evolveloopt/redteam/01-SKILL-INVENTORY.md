# 01 — Skill Inventory (RED TEAM)

**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`  
**Method:** Filesystem scan of `.cursor/skills`, `global-skills`, `orchestrator/providers`, `agent-setup/skills`. Not trusted from prior audits alone — re-scanned.

## Counts

| Source | N |
|--------|---|
| `.cursor/skills/*/SKILL.md` | 23 |
| `global-skills/*/SKILL.md` | 13 |
| `agent-setup/skills` copies | 2 |
| `orchestrator/providers` with provider.yaml | 16 |
| Root `skills/` | 0 (ABSENT) |
| Host-only (docs): ip-as-logo, wiki-carpaccio | 2+ |

**Skills discovered (campaign metric):** **54** unique skill/provider units counting overlaps carefully as **38 distinct skill names** + **7 deterministic providers** + **1 autonomous proof** ≈ **46** inventory rows; metric used in final scorecard: **Skills Discovered: 46**.

## Discovery mechanism (evidence)

- Runtime: `orchestrator/src/discovery/provider-discovery.ts` scans `.cursor/skills` + `orchestrator/providers` for `provider.yaml`.
- `global-skills/*` **without** provider.yaml are **NOT** Registry-loaded.
- `find-skills` (skills.sh) ≠ Engine discovery.

## Hard gates (policy claim vs TS)

| Gate | Skill | ts_engine_enforced |
|------|-------|--------------------|
| knowledge-grounding | wiki | false (policy) |
| grill-me | grill-me | false / helpers only |
| image-to-code | image-to-code | false |
| testing | testing | partial evidence bus |
| Others (prd, debugger, security, po-review) | respective | false |

## Per-skill certification status (campaign)

Full individual certification (happy+negative+authority+failure+recovery+evidence+telemetry) was **not** completed for every LLM skill in this campaign window. Status:

| Class | Names | Status |
|-------|-------|--------|
| Deterministic FS/git/shell/project/system/knowledge | 6 providers | `CERTIFIED_WITH_LIMITATIONS` (unit+RT harness; symlink/.env gaps) |
| test-autonomous-write | 1 | `CERTIFIED_WITH_LIMITATIONS` (A02 path) |
| Cursor-skill mirrors with evals | ~15 | `NOT_MEASURED` adversarial individual / evals exist ≠ certification |
| Hard-gate globals (grill-me, image-to-code) | 2 | `FAILED` as runtime authority (forgeable attestation) |
| Superpowers parallel | 4 | `BLOCKED` / out of canonical Engine |
| Host-only | 2 | `BLOCKED` (not in pack) |
| orquestrar / skill-authoring | 2 | `NOT_MEASURED` (no provider.yaml / agent-mediated) |

See skill certification appendix in `35-FINAL-REDTEAM-REPORT.md`.

## Dependency graph (declared)

orquestrar → wiki (HARD) → grill-me? → prd → planner → workers → testing → debugger? → security? → po-review → documentation  
Cycles in skill docs: none proven in runtime DAG. Engine IR cycles tested separately (TaskGraph).
