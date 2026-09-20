# Skill Dependency Graph

**Audit:** 2026-09-19 · READ-ONLY · no pruning  
**Machine-readable:** [SKILL-DEPENDENCY-GRAPH.yaml](./SKILL-DEPENDENCY-GRAPH.yaml)

## Legend

| Edge | Meaning |
|------|---------|
| `HARD` | Blocks progress when condition met |
| `SOFT` | Recommended / optional |
| `FALLBACK` | Used when primary unavailable |
| `ABSORBED` | DO migrated into another package |
| `DOC_CLAIM` | Documented dependency not wired in TS runtime |
| `WRAPPER` | Thin entrypoint to another skill/command |

## Current MegaBrain core flow (CURRENT_FLOW)

```text
USER
  │
  ▼
/MegaBrain ──► orquestrar
  │
  ├─ HARD ► gaabwiki (/wiki)          [Fase 0]
  ├─ SOFT  ► brainstorming            [Fase 0.5 optional]
  ├─ HARD ► prd (/prd)                [Fase 0.5 approval]
  ├─ SOFT  ► grill-me                 [optional; WRAPPER→grilling MISSING]
  ├─ SOFT  ► planner (/planejar)      [Fase 1]
  │
  ├─ exec PDA
  │    ├─ backend
  │    ├─ frontend-pro ─HARD(if image)─► image-to-code
  │    │                 └─FALLBACK──► agent-browser (vs Puppeteer)
  │    ├─ database / devops / …
  │    └─ critic? ──► code-reviewer
  │
  ├─ HARD ► testing (/testes)
  │         └─ after 3 fails ─HARD─► debugger
  │                                  └─ABSORBED─◄ systematic-debugging
  ├─ HARD? ► security
  ├─ HARD ► po-review (/validar)
  │         └─ visual fail ─SOFT─► frontend-pro + image-to-code
  └─ SOFT ► documentation (/documentar)
```

## Superpowers parallel flow (INSTALLED, NOT MEGABRAIN-WIRED)

```text
brainstorming ─HARD(internal)─► writing-plans
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
        subagent-driven-development              executing-plans
                    │                                   │
                    └──────────────┬────────────────────┘
                                   ▼
                    finishing-a-development-branch
```

**Verdict:** Superpowers participates as **installed Tier3 + optional upstream (`brainstorming`/`grill-me`)**. Mid/downstream Superpowers skills are **not** called by `orquestrar/SKILL.md`. MegaBrain planning/execution uses `prd` → `planner` → PDA workers.

**DOCUMENTATION_DRIFT:** `ecosystem-v2.md` still narrates `finishing-a-development-branch` and `plan-execution → executing-plans` as if wired.

## Research flows

```text
CURRENT_FLOW:
  /pesquisar → researcher → (optional browser MCP) → handoff

PARALLEL (not child of researcher):
  /library-dossier → technical-library-dossier ─HARD─► agent-browser + Puppeteer
```

## Discovery flows

```text
DOCUMENTED (LEGACY_FLOW / unimplemented):
  capability gap → Registry → find-skills → npx skills → /descobrir

CURRENT_FLOW (orchestrator TS):
  selectProvider fail → ProviderDiscoveryStarted(engine)
    → scan .cursor/skills/*/provider.yaml (+ orchestrator/providers)
    → register → retry
  find-skills: Cursor agent DISCOVERY only (no TS call)
```

## Frontend / image hard gate

```text
image attached
  → orquestrar SSOT image_attachment:true
  → frontend-ui requires image-to-code
  → frontend-pro Vision
  → ~/.agents/skills/image-to-code/SKILL.md   [HARD — policy]
  → (optional) Review/Audit via Puppeteer|agent-browser
  → po-review may re-require image-to-code on visual fail
```

## Key skill→skill edges

| Source | Target | Relationship | Strength |
|--------|--------|--------------|----------|
| orquestrar | image-to-code | HARD_GATE | HARD |
| frontend-pro | image-to-code | HARD_GATE (Vision) | HARD |
| frontend-pro | agent-browser | FALLBACK / optional | FALLBACK |
| debugger | systematic-debugging | ABSORBED_BY (source DO) | HARD |
| prd | brainstorming | UPSTREAM optional | SOFT |
| orquestrar | brainstorming | UPSTREAM optional | SOFT |
| orquestrar | grill-me | UPSTREAM optional | SOFT |
| grill-me | grilling | WRAPPER | HARD (broken — target missing) |
| brainstorming | writing-plans | Superpowers terminal | HARD (within Superpowers) |
| writing-plans | SDD / executing-plans | REQUIRED SUB-SKILL | SOFT (MegaBrain unused) |
| technical-library-dossier | agent-browser | skill HARD_GATE | HARD |
| ecosystem-v2 | find-skills | DOC_CLAIM fallback | DOC_CLAIM |

## Broken / drift references

| Reference | Status |
|-----------|--------|
| `/descobrir` → find-skills | Command file **missing** |
| `grill-me` → `/grilling` / `grilling` | Target skill **missing** |
| `using-superpowers` (referenced inside Superpowers skills) | Package **not** in CursorSKILLS `global-skills/` |
| `ecosystem-v2` finishing-a-development-branch as MegaBrain step | **DOCUMENTATION_DRIFT** vs Fase 5–6 |
| provider-manifest example `image-to-code optional: true` | **GAP** vs HARD-GATE docs |
| `testing/references/correction-loop.md` → systematic-debugging | Prefer `/debugger` (drift) |
