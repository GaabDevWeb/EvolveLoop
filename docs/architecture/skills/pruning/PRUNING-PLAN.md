# Pruning Plan — Mass Skill Prune 2026-09-19

## Decision source

- User: remove all non-essential skills from primary pack
- V2: `PRUNE_CANDIDATE` + motion/UI standalone (KEEP_DISCOVERABLE overridden for pack membership)
- Protected: `DO-NOT-REMOVE-V2.yaml` + runtime

## Exact removal set (7)

| Skill | Reason |
|-------|--------|
| linkedin-posts | PRUNE_CANDIDATE |
| gsap | motion standalone / out of MegaBrain core |
| framer-motion | idem |
| lenis | idem |
| hover-effects | idem |
| particles | idem |
| r3f-shaders | idem |

## Explicitly NOT removed

- All of DO-NOT-REMOVE-V2
- Superpowers REVIEW chain (writing-plans, SDD, executing-plans, finishing) — needs separate Superpowers decision
- frontend-design, ui-ux-pro-max — soft deps / fork of frontend-pro

## Actions

1. Delete `global-skills/<id>/` for removal set
2. Remove pack-owned symlinks under `~/.agents/skills/<id>` only if target was project global-skills
3. Update README.md, INVENTORY.md factual lists
4. Leave audit historical docs as DOCUMENTED_STALE
5. Fix test fixture that used `gsap` as sample skill_id
6. Validate providers/commands/agents/gates
7. Adversarial + quality comparison artifacts
