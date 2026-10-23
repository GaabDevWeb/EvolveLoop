# CI

Workflow: `.github/workflows/ci.yml`.

Roda em `pull_request` e em `push` para `release/**` e `cursor/**`. Não publica, não faz deploy e não lê segredos. Permissão do job: `contents: read`.

O job único executa, nesta ordem:

| Passo | Comando | Diretório |
|-------|---------|-----------|
| Dependências Node | `npm ci` | `orchestrator/` |
| Suíte | `npm test` | `orchestrator/` |
| Bench | `npm run test:bench` | `orchestrator/` |
| Dependências Python | `python -m pip install -e "./agent-setup[dev]"` | raiz |
| Pytest | `python -m pytest -q` | `agent-setup/` |
| Validate | `bash docs/architecture/v2.2/scripts/validate-v22-artifacts.sh` | raiz |

Na máquina local, `agent-setup/bootstrap.sh` precisa de `python3-venv` (`apt-get install python3-venv` se o pacote não estiver instalado). O CI usa `actions/setup-python` e não depende desse pacote de sistema.

## Decisões que o workflow não altera

### Graphify permanece OFF

`EVOLVELOOP_GRAPHIFY` não é definida. O default em `orchestrator/src/v22/feature-flags.ts` é desligado. O CI não instala o CLI `graphify` e não trata o braço B3 como `KnowledgeBackendId` (ADR-0014).

### Ollama é opcional

O CI não sobe Ollama e não reexecuta o bench híbrido ao vivo. Com índice BM25 e embeddings indisponíveis, o retrieval cai para **BM25 only** e o estado é `degraded` / `ollama_unavailable` — não `empty_corpus` (ADR-0005).

O ganho medido do híbrido B1 sobre B0 existe só na corrida oficial com Ollama `nomic-embed-text`: held-out teste **5/6** contra B0 **4/6**, dev **9/12** contra **7/12** (scorer `v22-anchor-scorer-1.0.0`, tokenizer `tiktoken:cl100k_base`). Fonte: `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/GOAL-003-005-official-report.md` e a tabela de pendências em `docs/architecture/v2.2/CONSOLIDATION-REPORT.md`. Sem Ollama esse ganho não é reivindicado; o fallback é o BM25 lexical.

### Cache de vendor fica `NOT_MEASURED`

O workflow não define API keys. `vendor_http_cache_hit` permanece `NOT_MEASURED` (GOAL-010). Não colocar credenciais de provedor no YAML nem nos logs.
