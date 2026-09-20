# Cursor Skills Rebuild — Rollback

## When to rollback

- Core command cannot resolve skill
- Hard gate path missing
- Vitest / EvolveLoop regression
- Catalog/symlink corruption
- Accidental wipe outside `~/.cursor/skills`

## How to rollback

```bash
bash /home/gaab/Downloads/CursorSKILLS/.prune-snapshots/cursor-skills-rebuild-20260920T005842Z/RESTORE.sh
```

This restores the pre-rebuild `~/.cursor/skills` symlink set from `cursor-skills.tar.gz`.

## What rollback does NOT restore

- Changes to `~/.agents/skills` (none were made by wipe)
- `grill-me.md` command sync (safe to leave or delete manually)
- Orchestrator code / EvolveLoop

## Status this run

**Rollback not required** — rebuild validated green.
