# CLI e paths — Wiki

## Paths

| Recurso | Path |
|---------|------|
| Vault | `$WIKI_ROOT` (alias `$RAG_REPO_ROOT`) — **required**, no username default |
| Canonical runtime corpus (author host) | historically `…/Documentos/gitHub/karpathyWiki` (set via env) |
| RAG package (EXTERNAL) | `$WIKI_ROOT/gaabwiki/` (Python package name remains `gaabwiki`) |
| Índice | `…/.data/` (`bm25/`, `lancedb/`, `manifest.json`) |
| Packs | notas wiki (`KernelBot/wiki/…`) ou `…/packs/*.md` |
| Venv CLI | `…/.venv/bin/python` → `python -m gaabwiki` (override: `WIKI_CLI_MODULE`) |
| Skill script | `~/.cursor/skills/wiki/scripts/ground.sh` |

## Env úteis

```bash
export WIKI_ROOT=/path/to/wiki-vault
# alias kept for existing installs:
# export RAG_REPO_ROOT="$WIKI_ROOT"
export WIKI_PYTHON="$WIKI_ROOT/.venv/bin/python"
# optional — only if package installs a bin:
# export WIKI_BIN="$WIKI_ROOT/.venv/bin/gaabwiki"
# optional — if vault package is renamed later:
# export WIKI_CLI_MODULE=wiki
```

## Comandos manuais (debug)

```bash
cd "$WIKI_ROOT"
source .venv/bin/activate

python -m gaabwiki search "query"
python -m gaabwiki search "query" --json --top-k 8
python -m gaabwiki search "query" --json --projeto kernelbot
python -m gaabwiki health
python -m gaabwiki index          # exige Ollama (embeddings)
```

Via skill:

```bash
bash ~/.cursor/skills/wiki/scripts/ground.sh scout "query" [projeto]
bash ~/.cursor/skills/wiki/scripts/ground.sh search "query" [projeto]
bash ~/.cursor/skills/wiki/scripts/ground.sh pack kernelbot-rag
bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs
```

## Troubleshooting

| Sintoma | Acção |
|---------|--------|
| `WIKI_ROOT … is required` | export `WIKI_ROOT` (or `RAG_REPO_ROOT`) |
| `Pacote gaabwiki não importável` | `cd $WIKI_ROOT && pip install -e ".[dev]"` |
| `PACK_NOT_FOUND` | verificar `WIKI_ROOT`; packs = notas wiki |
| Results vazios / `empty_corpus` | correr `python -m gaabwiki index` com Ollama; ou declarar GAP |
| `empty_corpus` ≠ `unavailable` | empty = índice ok sem hits; unavailable = CLI/path down |
