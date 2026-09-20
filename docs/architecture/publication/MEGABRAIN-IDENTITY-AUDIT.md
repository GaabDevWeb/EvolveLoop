# MegaBrain Identity Audit — EvolveLoop

**Status:** `MEGABRAIN_IDENTITY_AUDIT_COMPLETE`  
**Generated:** 2026-09-20T13:35:32Z  
**Mode:** READ-ONLY scan (audit artifacts created only; product identity files not altered by this audit beyond these reports)  
**Repo:** EvolveLoop (`origin` → `GaabDevWeb/EvolveLoop`)

---

## 1. Executive Summary

`EvolveLoop` public branding (`/evolve`, README, LICENSE) exists, but **MegaBrain remains the dominant in-system identity string** across skills, agent mirrors, orquestrar HARD-GATE docs, agent-setup install manifests, provider `stack` tags, and TypeScript compatibility aliases.

| Metric | Count |
|--------|------:|
| Content matches (all text, excl. node_modules/dist) | ~1186 (active scan excl. historical lines file had 944; full ~1076) |
| Files with matches (classified walk) | 360 |
| Pathname hits (project) | 4 |
| Active non-historical files | 177 |
| Public-surface files still mentioning MegaBrain | 4 |
| Host pathname hits | 5 |

**Central answer:** MegaBrain is **no longer the Cursor command on `main`**, but it is still an **architectural display name and install identity** across the skill pack and host. Goal `PUBLIC_ACTIVE_MEGABRAIN_REFERENCES = 0` is **not** met.

## 2. Current Identity Model

```text
Intended:
  Project     = EvolveLoop
  Entrypoint  = /evolve
  Legacy      = /MegaBrain (GaabType only)

Observed residual:
  Skills/docs still say "MegaBrain" as system name
  agent-setup still ships MegaBrain components
  Host Cursor still has MegaBrain command/rule/skill links
  TS keeps MegaBrain* aliases + skill-gates.ts filename
```

## 3. Search Methodology

- Patterns: `MegaBrain|megaBrain|MEGABRAIN|mega-brain|mega_brain|megabrain` (case-insensitive)
- Tools: ripgrep + pathlib walk
- Excluded: `.git`, `node_modules`, `.prune-snapshots`, `dist`
- Host scanned: `~/.cursor`, `~/.agents` (classified EXTERNAL/HOST)
- Branches checked: `main` (no MegaBrain.md), `GaabType` (MegaBrain.md present)

## 4. File/Directory Findings

Project pathnames containing MegaBrain:

- `docs/internal/historical/MegaBrain-Ecosystem.md` (file) — rename_required=False
- `docs/internal/historical/cursor-megabrain-rag-stack.md` (file) — rename_required=False
- `orchestrator/src/policy/skill-gates.ts` (file) — rename_required=True
- `orchestrator/tests/unit/skill-gates.test.ts` (file) — rename_required=True

Host pathnames:

- `/home/gaab/.cursor/commands/MegaBrain.md`
- `/home/gaab/.cursor/plans/megabrain_runtime_v2.1_6633b7ff.plan.md`
- `/home/gaab/.cursor/skills/MegaBrain`
- `/home/gaab/.cursor/rules/megabrain.mdc`
- `/home/gaab/.agents/skills/MegaBrain`

## 5. Code Findings

Critical TS:
- `orchestrator/src/config/profile.ts` — `MegaBrainProfile*` types + `loadMegaBrainProfile` + `MEGABRAIN_*` env
- `orchestrator/src/knowledge/backend/resolve.ts` — imports `loadMegaBrainProfile`
- `orchestrator/src/index.ts` — re-exports MegaBrain symbols + skill-gates
- `orchestrator/src/policy/skill-gates.ts` — module filename + gate helpers
- Tests import the above modules by MegaBrain names

Provider metadata: `stack: [cursor, evolveloop]` in multiple `provider.yaml` files.

## 6. Commands/Aliases

| Location | /evolve | /MegaBrain |
|----------|---------|------------|
| main | present | **absent** |
| GaabType | present | present (legacy redirect) |
| Host ~/.cursor | may vary | **present** |

**Flow trace:** `/MegaBrain` → command md → skill `orquestrar` → PDA/gates. **Not** a separate TS routing ID. Roles: thin **ONLY_ALIAS** on GaabType file; still **ARCHITECTURAL_IDENTIFIER/DISPLAY_NAME** in skill corpus.

## 7. Skills

Widespread in `.cursor/skills/**` especially `orquestrar` (SKILL.md + all HARD-GATE references). Nearly every pipeline skill says “no MegaBrain” / “Fase N do MegaBrain”.

## 8. Agents

`Agents/Orquestrador-v2.md` and several Agents/*.md still document `/MegaBrain` and “Fase MegaBrain”.

## 9. Providers

`stack: megabrain` in provider YAMLs under `.cursor/skills` and `orchestrator/providers`.

## 10. Policies/Gates

Gate docs titled “HARD-GATE MegaBrain”; decision helpers live in `skill-gates.ts`.

## 11. Config

- Env: `MEGABRAIN_PROFILE_PATH`, `MEGABRAIN_ROOT` (legacy dual-read)
- agent-setup `components.yaml` / `profiles.yaml` / `manifest.yaml` keys `megabrain` / `MegaBrain`

## 12. Telemetry

No distinct `MEGABRAIN_*` error-code enum found as primary; stack tag `megabrain` may affect catalog. Evidence bus docs mention “extensão MegaBrain”.

## 13. Tests

`skill-gates.test.ts`, `knowledge-backend.test.ts` (legacy loaders/env), post-prune imports.

## 14. Evals

orquestrar `evals-v24.json`, planner evals, agent-authoring/mining evals prompt with “MegaBrain”.

## 15. Documentation

Public README/AGENT mostly EvolveLoop with legacy notes (OK). Skill/agent/setup docs still MegaBrain-first (MUST/SHOULD rename). Historical under `docs/internal/historical/` = PRESERVE.

## 16. Git/GitHub

- No branch/tag named MegaBrain
- Remote: `git@github.com:GaabDevWeb/EvolveLoop.git`
- Folder on disk still `CursorSKILLS` (path identity, out of string scan)

## 17. Historical References

`docs/internal/historical/MegaBrain-Ecosystem.md`, `cursor-megabrain-rag-stack.md`, older audits — **HISTORICAL_VALID**.

## 18. Required Renames

1. agent-setup manifests/components/profiles → EvolveLoop/`evolve`
2. orquestrar skill + gate references MegaBrain → EvolveLoop/`/evolve`
3. Host reinstall from updated installer (HOST)
4. `skill-gates.ts` (+ tests/imports)
5. Provider `stack: megabrain` → `evolveloop`
6. Agents mirrors documenting `/MegaBrain` as primary
7. Deprecate public use of `loadMegaBrainProfile` / `MEGABRAIN_*` (keep compat window)

## 19. Recommended Renames

- Remaining skill SKILL.md “Fase MegaBrain” phrasing
- Eval prompts
- Comments in hooks (“loops MegaBrain”)

## 20. Preserved Legacy

- GaabType `/MegaBrain` command file (alias)
- Historical docs
- Temporary TS aliases during migration window
- Publication audit YAMLs that discuss MegaBrain as subject

## 21. Risk

See `MEGABRAIN-RENAME-RISK.yaml`. Top: **installer + orquestrar docs + host drift**.

## 22. Rename Ordering

```text
1. agent-setup manifests (stop reinstalling MegaBrain identity)
2. orquestrar SKILL + gate references (canonical narrative)
3. filesystem: skill-gates.ts + test + imports
4. symbols/env dual-read → EvolveLoop-primary
5. provider stack ids
6. Agents/* + other skills wording
7. evals/tests assertions
8. docs (non-historical)
9. HOST reinstall / AGENT.md note
10. keep GaabType legacy alias last (explicit)
```

## 23. Final Identity Target

```text
EvolveLoop
├── /evolve
├── evolve.md
├── evolveloop-skill-gates (or skill-gates)
├── EvolveLoop references in active docs/skills
└── historical MegaBrain references preserved
    + GaabType optional /MegaBrain → /evolve
```

## Category matrix

| Categoria | Ficheiros | Rename provável | Risco |
|-----------|----------:|-----------------|-------|
| Arquivos (path name) | 4 | required except historical | HIGH for policy module |
| Diretórios (path name) | 0 | host only in project=0 | HOST |
| orchestrator_src | 3 | REQUIRED | HIGH |
| skills | 60 | RECOMMENDED→REQUIRED for orquestrar | CRITICAL |
| agents | 6 | RECOMMENDED | MEDIUM |
| commands | 1 | evolve done; legacy GaabType | LOW/MEDIUM |
| agent_setup | 10 | REQUIRED | CRITICAL |
| tests | 4 | REQUIRED with modules | HIGH |
| docs | 245 | mix | MEDIUM |
| scripts | 1 | REQUIRED (cleanup strings) | MEDIUM |
| hooks | 1 | RECOMMENDED | LOW |
| profiles | 0 | check GaabType prefs | LOW |
| Histórico | 165 | PRESERVE | NONE |


## Goal zero

| Goal | Status |
|------|--------|
| PUBLIC_ACTIVE_MEGABRAIN_REFERENCES = 0 | **NOT MET** |
| HISTORICAL_MEGABRAIN_REFERENCES >= 0 | OK (preserve) |

## Checklist

- [x] repository scanned
- [x] .cursor scanned
- [x] orchestrator scanned
- [x] agents scanned
- [x] skills scanned
- [x] providers scanned
- [x] policy/gates scanned
- [x] knowledge/profile scanned
- [x] tests/evals scanned
- [x] configs/scripts/docs scanned
- [x] Git/GitHub scanned
- [x] aliases + command flow traced
- [x] rename/risk maps generated
- [x] no product renames executed
