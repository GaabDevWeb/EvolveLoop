# V22-BENCH — Baselines B0/B1 (V22-GOAL-003)

## Hypothesis

Com `.ai/` verdadeiro (B1), um agente recupera fatos com **menos paths lidos** e **menos tokens de entrada** que `rg` + leitura ampla (B0), mantendo o verificador determinístico.

## Classification

**EXECUTED** — bateria offline determinística (2026-10-22).  
LLM ao vivo: `NOT_MEASURED` (sem chamadas de modelo).  
Tokenizer: `tiktoken:cl100k_base` quando disponível; senão `PROXY:whitespace_split`.

## Arms

| Arm | Política simulada |
|-----|-------------------|
| B0 | `rg` por padrões da tarefa; leitura ordenada dos hits (cap 15); sem `.ai/` |
| B1 | Páginas `.ai/` da tarefa + paths de código declarados; sem varredura ampla |

## Scenarios (mínimo plano 08)

| ID | Plano 08 | Braços |
|----|----------|--------|
| S01 | 1 | B0 |
| S02 | 2 | B0, B1 |
| S05 | 5 | B0, B1 |

## Harness

`harness/bench_harness.py` + `harness/integrity_test.py`

## Raw

`raw/battery/` — ver `battery-summary.json` e `all-runs.json`.
