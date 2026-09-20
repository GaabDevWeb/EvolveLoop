# Packs

Packs estáticos para grounding rápido. Resolução (por ordem) em `ground.sh`:

1. `$WIKI_ROOT/packs/<nome>.md` (alias `$RAG_REPO_ROOT`)
2. `$WIKI_ROOT/.ai/packs/<nome>.md`
3. Notas wiki: `KernelBot/wiki/<nome>.md`, `OrbitBot/wiki/<nome>.md`, `.ai/wiki/<nome>.md`

| Pack | Ficheiro típico |
|------|-----------------|
| `kernelbot-rag` | `KernelBot/wiki/kernelbot-rag.md` |
| `orbitbot-kernel` | `OrbitBot/wiki/orbitbot-kernel.md` |

Vault: `$WIKI_ROOT` / `$RAG_REPO_ROOT` (required).

Carregar:

```bash
bash ~/.cursor/skills/wiki/scripts/ground.sh pack kernelbot-rag
bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs
```

Ao implementar no repo KernelBot, preferir **pack + 1 scout** sobre search longo.
