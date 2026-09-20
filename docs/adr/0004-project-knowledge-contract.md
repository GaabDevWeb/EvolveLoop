# ADR-0004: Project Knowledge Contract (Carpaccio `.ai/` + Wiki RAG)

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Status | accepted |
| Deciders | MegaBrain / platform evolution |

## Contexto

Há duas memórias de projecto distintas:

1. **Wiki Carpaccio** — Markdown versionável em `.ai/` (skill wiki-carpaccio); memória contextual humana/agente, **sem** RAG por desenho.
2. **Wiki** — motor Python em `karpathyWiki` (BM25 + opcional LanceDB/Ollama) para retrieval com provenance.

O orchestrator TS tem `KnowledgeStore` (filtro substring) — **não** é o RAG. Embutir LanceDB no Node duplicaria stack e acoplava embeddings ao runtime de execução.

## Decisão

1. **Project Knowledge Contract** = convenção normativa: checklist Carpaccio (overview, architecture, decisions, troubleshooting, testing) em `.ai/`; **não** forçar árvore `wiki/` se `.ai/` for a convenção do repo.
2. **RAG** = Wiki (Python) via provider `knowledge.search` / CLI `python -m gaabwiki` (subprocess ou HTTP local futuro).
3. **Ollama é substituível** — ports `EmbeddingProvider` / `LLMProvider`; degraded BM25 quando embeddings indisponíveis (ADR-0005).
4. Orchestrator **não** embute vector DB; `KnowledgeStore` TS permanece store leve / memória de run.

## Alternativas consideradas

### Alternativa A — Só Carpaccio `.ai/` sem RAG

- Prós: simples
- Contras: sem retrieval semântico em vaults grandes; não cobre Wiki existente

### Alternativa B — LanceDB / embeddings dentro do orchestrator TS

- Prós: um processo
- Contras: duplica wiki; drift de paths; viola fronteira Python já estabelecida

### Alternativa C — Contrato dual Carpaccio + Wiki bridge (escolhida)

- Prós: papéis claros; Ollama swappable; evidence `EvidenceSet` com provenance
- Contras: duas tools/skills a manter alinhadas (wiki + wiki-carpaccio / wiki-mem)

## Consequências

### Positivas

- SSOT documental humano em `.ai/`; retrieval escalável no vault
- Provider deterministic `knowledge.*` com `error_code` / `degraded` explícitos
- Vault path canónico: `.../gitHub/karpathyWiki`

### Negativas / trade-offs

- Ponte skill↔CLI deve manter paths actualizados (`ground.sh`)
- Empty corpus ≠ unavailable ≠ no_hits — consumidores devem ler `error_code` / status

## Referências

- Plano RAG: `docs/architecture-plan-platform-evolution.md`
- Relacionado: ADR-0005
