# Development Intelligence + graceful degradation

**Âmbito:** stack Cursor + EvolveLoop + Wiki RAG.  
**Código:** `karpathyWiki/rag/src/wiki_rag/devintel/`, `sanitize.py`, `scope.py`, `ranking.py`.  
**CLI:** `wiki-ingest metrics|feedback|observe|compare|eval-rag|pack-build`.

## Princípio

Instrumentar e medir **sem** tornar telemetria parte da lógica de negócio do orquestrador. Preferir JSONL local. Secrets nunca entram em telemetry/memory/logs/evidence.

## Graceful degradation (honesta)

| Componente down | Fallback | Sinal |
|-----------------|----------|-------|
| LanceDB / vector | BM25 only | `grounding: degraded` + event `degraded` |
| Ollama | Cursor se `CURSOR_API_KEY` | log warning |
| Cursor API | Ollama se URL reachable | runtime resolve |
| RAG inteiro | Agent continua | declarar `grounding: degraded` — **não** fingir retrieve |
| Memory hooks | Sessão continua | sem digest |
| Execution Engine (`dist/` ausente) | PDA manual | `engine: fallback PDA` — **proibido** fingir RunResult.success |
| systemd | Comandos manuais (`wiki watch`, `stack-health.sh`) | — |

Nunca fingir que um componente executou quando não executou.

## Feedback loop

```
run → telemetry JSONL → metrics → feedback patterns → candidate improvement
```

`auto_apply: false` sempre — skills/rules só mudam com controlo humano.

## Observabilidade de run

`wiki-ingest observe <run_id>` → árvore classification/workflow/agents/gates/retrieval/cost/why_slow.
