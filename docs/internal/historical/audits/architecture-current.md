# CURRENT REAL ARCHITECTURE — 2026-09-17

Factos verificados em código + testes. Docs ≠ prova; este ficheiro resume o **estado real** após Fases 2–7.

## Roots

| Root | Papel |
|------|--------|
| `AGENTS/Cursor/orchestrator` | SSOT runtime (`npm test`) |
| `CursorSKILLS` | Pacote portátil + docs/ADRs + espelho orchestrator |
| `karpathyWiki` / wiki | RAG Python (BM25 + hybrid; Ollama opcional) |

## Runtime (TS)

```text
Capability IR → ExecutionEngine / Scheduler
  → CapabilityAuthority.authorize (allow|deny|confirm)
  → RegistryClient.select + ExecutionPolicy (retries/gates/strategy)
  → ProviderRuntime
        ├─ cursor-skill (jobs)
        ├─ mock
        └─ deterministic (filesystem|git|shell|system|project|knowledge)
  → Evidence builders + EventBus + JSONL
  → summarizeExecutionTrace (resumo observabilidade)
```

**Não há** Temporal, Kafka, segundo registry, nem GraphRAG nesta arquitectura.

## Capabilities

- **Produto (LLM workers/gates):** planning, backend-implementation, testing, …
- **Operacionais (deterministic):** `filesystem.*`, `git.*`, `shell.execute`, `system.*`, `project.inspect`, `knowledge.search|inspect`, `repository.inspect`
- **Profiles:** coding / research / diagnose
- **Pendente:** `browser.*`

## Policy boundaries

| Camada | Estado |
|--------|--------|
| ExecutionPolicy | IMPLEMENTED |
| CapabilityAuthority | IMPLEMENTED |
| MegaBrain risk/budget spec | SPECIFIED_ONLY (docs) |

## Knowledge

| Peça | Estado |
|------|--------|
| Carpaccio `.ai/` | skill — sem RAG |
| Wiki hybrid + degraded BM25 | IMPLEMENTED (pytest) |
| TS KnowledgeStore | filtro leve — ≠ RAG |
| `knowledge.*` provider | bridge subprocess CLI |

## Observability

| Peça | Estado |
|------|--------|
| EventBus + JSONL | IMPLEMENTED |
| Authority + normalized worker evidence | IMPLEMENTED |
| `summarizeExecutionTrace` | IMPLEMENTED |
| Replay offline (docs) | DOCUMENTED — sem Temporal |

## Testes (última verificação desta entrega)

| Suite | Resultado |
|-------|-----------|
| AGENTS orchestrator `npm test` | **103** passed |
| wiki `pytest` | **21** passed |

## ADRs

- `docs/adr/0001` … `0005` (Capability model, Authority vs Policy, Knowledge contract, Degraded retrieval)
- Replay: `docs/execution-replay-model.md`
