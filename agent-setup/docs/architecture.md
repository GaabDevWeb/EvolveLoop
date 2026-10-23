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

Ficheiro gerido com conteúdo local diferente → backup por cópia + `CONFLICT` (o original fica no lugar).

Diretório real no destino de um componente `install: symlink` (cópia antiga de `wiki` / `wiki-mem`, ou `--force` sobre um diretório) → o diretório é **movido** para `~/.agent-setup/backups/<timestamp>/`. O destino passa a ser o symlink ou a cópia nova. O legado não é apagado. Ver `docs/wiki-skill-install.md`.
