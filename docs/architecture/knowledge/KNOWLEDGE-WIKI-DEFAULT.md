# Wiki as Default Knowledge Backend

Without extra configuration:

```yaml
knowledge:
  backend: wiki
```

Resolution order:

1. `KNOWLEDGE_BACKEND`
2. profile `knowledge.backend`
3. **`wiki`**

Wiki implementation:

- `WikiKnowledgeBackend` (`orchestrator/src/knowledge/backend/wiki-backend.ts`)
- Deterministic capabilities `knowledge.search` / `knowledge.inspect`
- Cursor skill `wiki` + `ground.sh` (Context Engineer ritual)
- EXTERNAL CLI: `python -m ${WIKI_CLI_MODULE:-gaabwiki}`

Corpus path:

- Canonical: `WIKI_ROOT`
- Alias: `RAG_REPO_ROOT`
- No `/home/<user>` fallback in core

Episodic memory (`wiki-mem`) stays separate and enabled by profile `memory.enabled`.
