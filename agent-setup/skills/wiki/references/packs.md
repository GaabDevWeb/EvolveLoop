# Packs

Packs estáticos em `$RAG_REPO_ROOT/rag/packs/`.

| Pack | Uso |
|------|-----|
| `kernelbot-rag` | RAG KernelBot: BM25, hybrid, ingest, contratos de search |
| `orbitbot-kernel` | Integração OrbitBot ↔ Kernel / ISS |

Carregar:

```bash
bash ~/.cursor/skills/wiki/scripts/ground.sh pack kernelbot-rag
bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs
```

Ao implementar no repo KernelBot, preferir **pack + 1 scout** sobre search longo.
