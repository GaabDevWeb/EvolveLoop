# /mem — Knowledge (episódico + promote)

Invoca a skill **wiki-mem** (`~/.cursor/skills/wiki-mem/SKILL.md`) — specialization **Knowledge** / PDA `librarian`.

1. Ler `LATEST.md` em `$WIKI_ROOT/.ai/sessions/` (alias `$RAG_REPO_ROOT`; env required).
2. Se houver query: `python3 ~/.cursor/hooks/wiki-mem/mem.py search "…"`
3. Contratos/arquitectura → **não** usar só isto; usar `/wiki` (Context Engineer / HARD-GATE).
4. Promote: `mem.py promote` → librarian append `{Projeto}/log.md` (± `wiki/`); **NUNCA** `raw/`.
5. Research web externo → **não** este comando; usar `/pesquisar` (`researcher`).

Args opcionais após `/mem`: `search …` | `digest` | `promote` | pergunta de continuidade.
