# V22-GOAL-005-review — relatório adversarial (PR #4)

**Revisor:** V22-GOAL-005-review (cloud agent)  
**Branch:** `cursor/v22-goal-005-wiki-07ca`  
**Harness:** `v22-ground-b1-harness-1.1.0`  
**Baseline id:** `v22-held-out-b0b1-ground-2026-10-22-review`  
**Rótulo B1:** `FIXTURE_WIKI_GROUND` (não `OFFICIAL_WIKI_GROUND`)

## Veredito por suspeita do CEO

| # | Suspeita | Veredito | Evidência |
|---|----------|----------|-----------|
| 1 | gaabwiki no repo é fixture mínima | **CONFIRMADA** | `fixtures/evolveloop-wiki-vault/gaabwiki/__init__.py`: *"Minimal gaabwiki vault CLI (fixture implementation for EvolveLoop)."*; `README.md` confirma vault portátil para CI. Não é o motor `karpathyWiki` externo (`docs/research/evolveloop-v2.2/01-current-state-audit.md`). B1 reclassificado para `FIXTURE_WIKI_GROUND`. |
| 2 | Harness B1 usava `query + rg_patterns[0]` | **CONFIRMADA (corrigida)** | v1.0.0 linha 155–156: `composite = task["query"] + (" " + patterns[0] ...)`. v1.1.0 usa só `task["query"]`. `rg_patterns` derivam do gabarito (anchors no mesmo JSON). |
| 3 | Held-out H01–H06 pelo mesmo agente que o conhecimento | **CONFIRMADA para H01–H06** | `author: held-out-freeze-v22-goal-005` alinhado às 6 páginas `.ai/` de `generate-evolveloop-wiki-knowledge.sh` (tópicos espelhados). **Mitigação:** H07–H12 congelados em commit `141dec5` por `V22-GOAL-005-review` antes do harness. |
| 4 | Prova de não contaminação + stale | **PASS (reproduzido)** | `generate-evolveloop-wiki-knowledge.sh` exit **0**; allowlist sem leitura de gabaritos; `rg tasks-held-out` em `.ai/` não dispara FAIL. `pytest` vault: **2 passed**, `test_stale_after_source_change` exit **0**. |
| 5 | Escopo orchestrator + parser | **PARCIAL** | Diff GOAL-005 em `wiki-backend.ts`: `mapGaabwikiHit` + envelope `selected` + `stale` — **justificado** para contrato CLI fixture. `parseWikiSearchStdout` coberto em `knowledge-backend.test.ts` (12 tests, vitest exit **0**). Outras mudanças massivas em `orchestrator/` vêm de merges anteriores (F3), fora do escopo wiki deste PR. |

## Tabela B0/B1 — H01–H12 (harness 1.1.0, query-only B1)

| Task | B0 recall | B0 paths | B0 tokens | B0 ms | B1 recall | B1 paths | B1 tokens | B1 ms |
|------|-----------|---------|-----------|-------|-----------|---------|-----------|-------|
| H01 | 1.0 | 16 | 6381 | 22 | 1.0 | 1 | 180 | 39 |
| H02 | 1.0 | 7 | 2263 | 16 | 1.0 | 2 | 572 | 37 |
| H03 | 1.0 | 23 | 5815 | 15 | 1.0 | 3 | 678 | 35 |
| H04 | 1.0 | 45 | 12397 | 20 | 1.0 | 2 | 279 | 37 |
| H05 | 1.0 | 30 | 60659 | 21 | 1.0 | 1 | 333 | 36 |
| H06 | 1.0 | 10 | 2536 | 15 | 1.0 | 2 | 360 | 36 |
| H07 | 0.0 | 45 | 14011 | 27 | 0.0 | 1 | 180 | 35 |
| H08 | 1.0 | 16 | 12859 | 15 | 0.0 | 1 | 99 | 35 |
| H09 | 1.0 | 45 | 14038 | 20 | 0.0 | 1 | 99 | 35 |
| H10 | 1.0 | 24 | 21120 | 16 | 0.0 | 1 | 180 | 38 |
| H11 | 0.0 | 45 | 10725 | 32 | 0.0 | 1 | 180 | 35 |
| H12 | 1.0 | 9 | 6248 | 21 | 0.0 | 2 | 491 | 36 |
| **Mediana rollup** | — | **23.5** | **11561** | **20** | — | **1.0** | **229.5** | **36** |

Fonte: `raw/battery-held-out/held-out-summary.json`.

## Rótulo final

- **B0:** `OFFICIAL_BASELINE` (inalterado; usa `rg_patterns` por desenho).  
- **B1:** `FIXTURE_WIKI_GROUND` — mecanismo CLI + vault fixture + held-out parcialmente circular (H01–H06).

## Exit codes (esta revisão)

| Comando | Exit |
|---------|------|
| `ground_b1_harness.py` | 0 |
| `generate-evolveloop-wiki-knowledge.sh` | 0 |
| `pytest fixtures/evolveloop-wiki-vault/tests` | 0 |
| `npm test tests/unit/knowledge-backend.test.ts` | 0 |

## Recomendação de merge

**Não** para promover B1 a gate `OFFICIAL_WIKI_GROUND`. **Sim com ressalvas** para entregar infra wiki/carpaccio/fixture/harness corrigido: merge aceitável se objetivo do PR é operacionalização + evidência `FIXTURE_WIKI_GROUND` honesta, não fechar gate D2 oficial.

**SHA pós-correção:** ver `git rev-parse HEAD` no branch após push.
