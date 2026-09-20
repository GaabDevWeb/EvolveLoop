# Evolve alias validation

Generated: 2026-09-20T13:43:17Z

| Alias | Role | Scope |
|-------|------|-------|
| `/evolve` | **Canonical public entrypoint** | main + GaabType |
| `/MegaBrain` | Legacy personal alias → same `orquestrar` flow | GaabType (+ optional host) |
| `orquestrar` | Internal orchestration skill authority | unchanged |

## Verified

- `main`: `.cursor/commands/evolve.md` present; `MegaBrain.md` absent
- `GaabType`: both present; MegaBrain.md is thin redirect
- Skill frontmatter `command: evolve`
- Installer installs `/evolve` and `EvolveLoop` skill symlink to `orquestrar`
