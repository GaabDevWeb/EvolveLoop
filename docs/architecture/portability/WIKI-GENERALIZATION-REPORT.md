# Wiki Generalization Report

**Status:** `WIKI_RENAME_VALIDATED`  
**Generated:** 2026-09-20T02:08:07Z  
**Snapshot:** `.prune-snapshots/wiki-rename-pre-20260920T020310Z/`

## 1. Motivation

Eliminar identidade pessoal `GaabWiki` e paths `/home/gaab/...` do subsistema de grounding, sem redesenhar Knowledge/RAG/EvolveLoop.

## 2. Scope

Rename controlado + parametrização de paths do subsistema Wiki.  
**Fora de escopo:** KnowledgeBackend, profiles, GaabType, AGENT.md, prune, EvolveLoop architecture.

## 3. Old Identity

`GaabWiki` / `gaabwiki` / `gaabwiki-mem` / `gaabwiki-grounding` / `gaabwiki-agent`

## 4. New Identity

`Wiki` / `wiki` / `wiki-mem` / `wiki-grounding` / `wiki-agent`

## 5. Renamed Components

| Old | New |
|-----|-----|
| `.cursor/skills/gaabwiki` | `.cursor/skills/wiki` |
| `.cursor/skills/gaabwiki-mem` | `.cursor/skills/wiki-mem` |
| `.cursor/hooks/gaabwiki-mem` | `.cursor/hooks/wiki-mem` |
| `Rules/gaabwiki-agent.mdc` | `Rules/wiki-agent.mdc` |
| `Agents/Gaabwiki.md` | `Agents/Wiki.md` |
| `Agents/Gaabwiki-mem.md` | `Agents/Wiki-mem.md` |
| `gaabwiki-grounding-gate.md` | `wiki-grounding-gate.md` |
| agent-setup mirrors | aligned |

## 6. Path Changes

- Runtime: `WIKI_ROOT` (preferred) + `RAG_REPO_ROOT` alias; **no** absolute `/home/gaab` default in `knowledge.ts`, `ground.sh`, `mem.py`, rules.
- Author host: `~/.cursor/agents.env` sets `WIKI_ROOT` to canonical `…/Documentos/gitHub/karpathyWiki`.
- Dual defaults eliminated from code paths.

## 7. Gate Changes

- Identity: `gaabwiki-grounding` → `wiki-grounding`.
- Semantics unchanged: grounding still required before plan/implement (unless skipped_trivial).

## 8. Provider Changes

- cursor-skill providers: `wiki`, `wiki-mem`.
- deterministic knowledge provider: portable root + `WIKI_*` error codes; CLI module still `gaabwiki` (EXTERNAL).

## 9. Hook Changes

- `hooks.json` → `./hooks/wiki-mem/*` (same lifecycle events).

## 10. Agent Changes

- Mirrors `Wiki.md` / `Wiki-mem.md`; Orquestrador references Wiki grounding.

## 11. Documentation Changes

- Active README/INVENTORY/GLOBAL-SETUP/commands/skills/orquestrar refs updated.
- Historical audit/pruning/evolveloopt/portability forensic **preserved**.

## 12. Residual Legacy References

See `WIKI-REFERENCE-AUDIT.yaml`. Active broken refs: **none**. External CLI package name `gaabwiki` retained deliberately.

## 13. Test Results

| Suite | Baseline | Post |
|-------|----------|------|
| orchestrator `npm test` | 225/225 | 225/225 |
| EvolveLoop subset | (within 225) | 93/93 |
| `ground.sh scout` | n/a | PASS |

## 14. Behavioral Equivalence

**PASS** — same grounding ritual, same gate obligation, same memory hooks, same RAG bridge behavior; identity/paths only.

## 15. Deferred Architecture Work

KnowledgeBackend, GaabType/profiles, AGENT.md, vault package rename, public main publication, full onboarding without personal corpus.
