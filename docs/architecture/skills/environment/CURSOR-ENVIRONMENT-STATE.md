# Cursor Environment State (post-rebuild)

**Status:** `CURSOR_SKILLS_REBUILD_SUCCESS`  
**Timestamp:** 20260920T005842Z

## Layout

```text
CURSOR
  ├── ~/.cursor/skills          → evolveloop-essential (25 symlinks)
  ├── ~/.cursor/skills-cursor   → product pack (untouched)
  ├── ~/.cursor/commands        → commands (+ grill-me.md synced)
  └── ~/.agents/skills          → hard gates + globals (untouched wipe)
         ├── grill-me → global-skills/grill-me
         └── image-to-code → global-skills/image-to-code
```

## Essential pack

25 entries — see `CURSOR-ESSENTIAL-SKILL-PACK.yaml`.

## Added vs pre-rebuild

- `agent-architecture-mining` now linked into Cursor skills (was missing; DO-NOT-REMOVE-V2)

## Excluded / not reintroduced

Motion + linkedin-posts remain absent from Cursor and `global-skills`.

## Baseline operational

This Cursor skill environment is the new operational baseline for EvolveLoop skill loading via `~/.cursor/skills`.

## Commands dedupe (2026-09-20)

**Symptom:** slash menu showed each EvolveLoop command twice.

**Cause:** Cursor merges user `~/.cursor/commands` + project `.cursor/commands`; identical copies existed in both.

**Fix:** removed 29 overlapping files from `~/.cursor/commands`; SSOT remains `CursorSKILLS/.cursor/commands/` (31). Home keeps only `wiki-carpaccio.md` (host-only).

**Note:** `/code-review` (Cursor product) ≠ `/code-reviewer` (EvolveLoop) — not a duplicate.

**Rollback:** `.prune-snapshots/cursor-commands-dedupe-*/RESTORE.sh`
