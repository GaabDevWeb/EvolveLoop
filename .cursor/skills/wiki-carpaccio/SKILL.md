---
name: wiki-carpaccio
description: >
  Wiki Markdown por repositório (.ai/ Carpaccio): init, query, update, lint com
  manifest de hashes e sync opcional para WIKI_ROOT. Use para V22-GOAL-005 e ADR-0004.
metadata:
  version: 1.0.0
  status: stable
disable-model-invocation: true
---

# wiki-carpaccio

Workflows mínimos (sem RAG no engine TS):

```bash
python3 .cursor/skills/wiki-carpaccio/scripts/carpaccio.py init
python3 .cursor/skills/wiki-carpaccio/scripts/carpaccio.py query "pergunta"
python3 .cursor/skills/wiki-carpaccio/scripts/carpaccio.py update --all
python3 .cursor/skills/wiki-carpaccio/scripts/carpaccio.py lint
```

Sync para vault: `docs/architecture/v2.2/scripts/sync-carpaccio-to-vault.sh`

Código vence wiki; páginas `status: obsoleto` quando o hash da fonte diverge.
