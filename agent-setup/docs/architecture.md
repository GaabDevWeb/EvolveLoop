# Architecture

## Separation of concerns

```
Agent Setup     → install, configure, verify, update, project init
MegaBrain       → orchestrate execution (orquestrar)
Wiki        → knowledge (vault + RAG)
RAG             → retrieval (rag/ package)
```

## Flow — new machine

```
bootstrap.sh → venv + agent CLI
agent install → manifest → detect/compare/backup/apply
agent doctor → actual state report
```

## Flow — existing project

```
agent init → detect → analyze → configure templates → verify
```

## State files

| Path | Role |
|------|------|
| `manifest/*.yaml` | Desired state (versioned) |
| `~/.agent-setup/config.yaml` | Machine paths |
| `~/.agent-setup/state.json` | Managed inventory |
| `~/.agent-setup/backups/<ts>/` | Rollback |

## Idempotency

Install compares checksums / symlink targets. Existing correct config → `already configured`.

## Conflicts

Local modifications to managed files → backup + report `CONFLICT` (preserve by default).
