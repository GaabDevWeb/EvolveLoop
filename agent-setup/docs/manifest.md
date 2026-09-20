# Manifest

Central declarative config in `manifest/`:

- `manifest.yaml` — schema version, platforms, default profile
- `profiles.yaml` — minimal | standard | full
- `components.yaml` — rules, commands, skills, hooks, rag, systemd

Source prefixes:

- `bundled:` — files inside agent-setup repo
- `repo:${AGENTS_ROOT}/...` — symlink to CursorSKILLS

Profiles use `extends` for composition without duplication.
