# ADR-0005: Hybrid retrieval degraded mode (Ollama down → BM25)

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Status | accepted |
| Deciders | MegaBrain / platform evolution / wiki |

## Contexto

Wiki usa hybrid retrieval (BM25 + vector via embeddings Ollama). Se Ollama estiver down e o wiring falhar “tudo ou nada”, o sistema confundia **serviço de embeddings indisponível** com **corpus vazio** ou **sem hits** — estados semanticamente diferentes para evals e agents.

## Decisão

1. Com índice BM25 populado e embedder ausente/indisponível: correr **BM25 only**, marcar `degraded: true` / `degraded_reason: ollama_unavailable` (ou equivalente no wire).
2. Classificar status de forma discriminada:
   - `empty_corpus` — corpus size 0
   - `no_hits` — corpus > 0, zero resultados
   - `degraded` — hits (ou tentativa) com embeddings off
   - `ok` — hybrid/normal saudável
3. **Nunca** mapear Ollama down → `empty_corpus` se o índice lexical existir.
4. No provider TS `knowledge.search`, falhas de CLI/repo usam `retrieval_method: unavailable` + `error_code` (`RAG_REPO_MISSING`, `WIKI_UNAVAILABLE`, …) distinto de hits vazios com `error_code: null`.

## Alternativas consideradas

### Alternativa A — Fail-hard se Ollama down

- Prós: força fix da infra
- Contras: RAG inutilizável offline; agentes sem grounding lexical

### Alternativa B — Silenciar degraded e devolver lista vazia

- Prós: API simples
- Contras: impossível distinguir empty / down / no_hits nos evals

### Alternativa C — BM25 degraded explícito (escolhida)

- Prós: útil offline; observável; alinhado a ports EmbeddingProvider
- Contras: qualidade lexical-only inferior ao hybrid — aceitável e documentado

## Consequências

### Positivas

- Pytest cobre degraded vs empty_corpus vs no_hits
- Agents / Capability IR podem ramificar em `degraded` vs `error_code`
- Ollama permanece default, não single point of total failure

### Negativas / trade-offs

- Consumidores devem ler campos de status (não só `len(hits)`)
- Hybrid RRF incompleto em modo degraded (só lexical)

## Referências

- `karpathyWiki` HybridRetriever + `classify_retrieval_status`
- Relacionado: ADR-0004
