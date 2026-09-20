# Cursor Environment — Rebuild Dependency Audit

**Generated:** 20260920T005842Z  
**Target:** `~/.cursor/skills`  
**Agents root:** `~/.agents/skills` (untouched wipe)

## Resolution model

| Layer | Path | Role after rebuild |
|-------|------|--------------------|
| Cursor skill pack | `~/.cursor/skills` | Essential EvolveLoop local skills (symlinks) |
| Agents host | `~/.agents/skills` | Hard gates + review-tier globals + host-only |
| Repo local | `CursorSKILLS/.cursor/skills` | Source of truth for local skills |
| Repo global | `CursorSKILLS/global-skills` | Source for grill-me, image-to-code, dossier, etc. |
| Cursor product | `~/.cursor/skills-cursor` | Untouched product pack |

## Critical dependency chain (verified)

```text
/evolve → ~/.cursor/skills/orquestrar → repo .cursor/skills/orquestrar
/prd → ~/.cursor/skills/prd
/planejar → ~/.cursor/skills/planner  (requires grill-me gate when Policy require[])
/grill-me → ~/.agents/skills/grill-me → global-skills/grill-me
/frontend-pro → ~/.cursor/skills/frontend-pro (+ image-to-code when attachment)
/library-dossier → ~/.agents/skills/technical-library-dossier → agent-browser
/debugger → ~/.cursor/skills/debugger (absorbs systematic-debugging DO)
/testes → ~/.cursor/skills/testing
/validar → ~/.cursor/skills/po-review
/documentar → ~/.cursor/skills/documentation
```

## Broken references

None found among installed Cursor skills (`SKILL.md` present for all 25).

## Providers

No `provider.yaml` under `~/.cursor/skills` entries (EvolveLoop skills use SKILL.md + orchestrator registry manifests). Orchestrator vitest **225/225** green including registry/provider tests.

## Agents

Essential agent-facing skills resolve via Cursor pack or Agents host. No required skill missing for core commands listed above.

## find-skills

Remains user-facing discovery under `~/.agents/skills/find-skills`. Not required for provider loading / runtime registry (confirmed by post-prune docs + runtime tests green without Cursor install of find-skills).
