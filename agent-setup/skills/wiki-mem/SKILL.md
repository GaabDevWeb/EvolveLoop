---
name: wiki-mem
description: >
  Memória episódica de sessões Cursor (Wiki): search em .ai/sessions,
  LATEST.md, promote-queue para promoção controlada à wiki canónica. Use quando
  o utilizador pedir memória de sessão, o que fizemos ontem, continuidade entre
  chats, mem search, promote para log.md, ou estilo claude-mem. Não use para
  contratos/arquitectura canónicos — aí é wiki + RAG. Não substitui o HARD-GATE
  EvolveLoop de grounding wiki.
---

# Wiki Mem — memória episódica

**Papel:** continuidade de sessão (o que o Agent fez).  
**Não é** SSOT de domínio — isso continua vault `wiki/` + RAG (`rag/`).

## Paths

| Recurso | Path |
|---------|------|
| Store | `$WIKI_ROOT/.ai/sessions/` (alias `$RAG_REPO_ROOT`) |
| Digest | `…/LATEST.md` |
| Fila promoção | `…/promote-queue.md` |
| CLI | `python3 ~/.cursor/hooks/wiki-mem/mem.py` |

## Comandos

```bash
python3 ~/.cursor/hooks/wiki-mem/mem.py search "filtro projeto BM25"
python3 ~/.cursor/hooks/wiki-mem/mem.py promote   # só fila — não escreve wiki/
python3 ~/.cursor/hooks/wiki-mem/mem.py digest
```

## Ritual

1. Pedido de continuidade → `search` + ler `LATEST.md`
2. Contratos/arquitectura → skill **wiki** / RAG (HARD-GATE EvolveLoop)
3. Após trabalho estável → `promote` **ou** o hook de fecho já enfileirou → Agent/librarian append em `{Projeto}/log.md` (± `wiki/` se contratos)

## Hooks (automáticos)

`sessionStart` · `afterFileEdit` · `stop` · `sessionEnd` em `~/.cursor/hooks.json`.

**Fecho (`stop` / `sessionEnd`):** se houver `promote_candidates` ou file_edits de código, **append/refresh** `promote-queue.md`. **Nunca** escreve `{Projeto}/wiki/` nem `raw/`. `followup_message` vazio (sem loops EvolveLoop). Promoção canónica = librarian / Agent.

Se `sessionStart.additional_context` falhar (bug Cursor conhecido), o Agent **deve** ler `LATEST.md` quando precisar de continuidade.
