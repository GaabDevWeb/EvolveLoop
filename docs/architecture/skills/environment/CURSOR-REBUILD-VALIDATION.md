# Cursor Skills Rebuild — Validation

## Target

`~/.cursor/skills` wiped and reinstalled from essential pack.  
`~/.agents/skills` **not** wiped.  
`~/.cursor/skills-cursor` **not** touched.

## Checks

| Check | Result |
|-------|--------|
| Backup restorable | PASS (`RESTORE.sh` + tar.gz) |
| Source valid (all SKILL.md) | PASS |
| Wipe emptied target | PASS (0 entries mid-op) |
| Essential pack installed | PASS (25) |
| expected == actual | PASS |
| Removed skills absent | PASS (gsap/framer/…/linkedin) |
| Hard gates present | PASS (agents: grill-me, image-to-code) |
| grill-me fail_closed contract | PASS (grill-me-gate.md) |
| image-to-code do_not_remove | PASS (HARD-GATES-V2) |
| Paths / SKILL.md | PASS |
| Idempotent re-link | PASS (still 25) |
| Commands core | PASS (+ synced missing `grill-me.md`) |
| Providers/registry tests | PASS (suite) |
| EvolveLoop + full suite | PASS **225/225** |
| Agents count unchanged | PASS (39) |

## grill-me behavioural contract (static)

- Policy require → planner blocked without `satisfied|exempt`
- Simple/hotfix can be outside require
- Invalid/missing → BLOCKED (fail_closed)

## image-to-code behavioural contract (static)

- `image_attachment: true` → required
- No image → not required

## Telemetry

Skill activation telemetry is best-effort; suite does not fail on telemetry absence. Rebuild did not remove telemetry hooks under `~/.cursor/hooks`.

## Verdict

`CURSOR_SKILLS_REBUILD_SUCCESS`
