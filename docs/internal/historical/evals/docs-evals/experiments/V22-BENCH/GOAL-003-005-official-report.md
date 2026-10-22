# V22-GOAL-003-005-official — OFFICIAL_WIKI_GROUND (híbrido)

**Base:** `release/v2.1-freeze-preparation` @ `9b647f8`  
**Branch medição:** `cursor/v22-goal-003-005-official-2e17`  
**Manifest:** `raw/battery-held-out-official-hybrid/OFFICIAL-MANIFEST.json`  
**Harness:** `v22-ground-b1-harness-1.5.0`  
**Scorer canônico:** `v22-anchor-scorer-1.0.0` modo `file_evidence` (`harness/v22_anchor_scorer.py`)  
**Tokenizer canônico (budget):** `tiktoken:cl100k_base` (`V22_BENCH_TOKENIZER=tiktoken`)  
**Motor:** karpathyWiki `cd3cf08` (tarball SHA256 `11160e77…852377`)  
**Embedding:** Ollama `nomic-embed-text`  
**Índice:** `gaabwiki index --rebuild` com `CORPUS_SET=evolveloop` (8760 chunks, 891 docs)

## Reconciliação PR #14 (Graphify B3) vs medição PROXY inicial

PR #14 (`cursor/v22-goal-008-graphify-b3-2d12`, `raw/battery-b3-graphify/b3-summary.json`) reportou held-out **dev** B0 **5/12**, B1 **4/12** e **teste** B0 **3/6**, B1 **3/6**, enquanto a primeira corrida oficial usou tokenizer **`PROXY:whitespace_split`** e obteve **8/12**, **9/12** e **5/6**, **6/6**.

| Causa | Evidência | Conclusão |
|-------|-----------|-----------|
| Scorer diferente? | `harness/reconcile_canonical_scores.py` re-pontua `paths_read` congelados com `v22-anchor-scorer-1.0.0` | **Não.** `recall_at_run` = `canonical_recall` em oficial e B3 (modo `file` ≡ `file_evidence`). |
| `V22_ANCHOR_RECALL` | B3 summary `anchor_recall_mode: file`; harness 1.5.0 | Alinhado ao scorer canônico; não explica o gap. |
| `RG_GLOBS` / leak B1 | Mesmo `ground_b1_harness.py` 1.5.0 nas duas linhagens | **Não** é o delta principal entre PR #14 held-out B0 e oficial PROXY. |
| **Budget 45 paths / 22k tokens** | Tokenizer altera projeção em `read_rel()` **antes** de anexar cada arquivo | **Causa raiz** para B0 (e efeito colateral em B1 live). |
| B1 **4/12** no B3 | `b3-summary` mede B1 **live** com `FIXTURE_WIKI_GROUND` (`official_motor_on_vm: false`), não o frozen 005e **9/12** | Gap B1 é **motor/fixture**, não scorer. |

**Exemplo H08 B0:** com `tiktoken`, o budget estoura após ~5–9 paths de documentação e **não** lê `orchestrator/src/knowledge/backend/wiki-backend.ts` (recall 0). Com `PROXY:whitespace_split`, a mesma ordem de `rg` permitiu **15** paths e recall 1.0 (drift de linha aceito em `file_evidence`). Ver `raw/canonical-reconcile.json` (linhas H08) e `battery-b3-graphify/held-out/H08/B0/run-01.json`.

**Tabela canônica (re-score de `paths_read` congelados — não re-roda retrieval):**

Gerada por `python3 harness/generate_canonical_bench_table.py` a partir de `raw/canonical-reconcile.json`.

| Label | Split | Arm | recall≥1 (canonical) | recall≥1 (at run) |
|-------|-------|-----|----------------------|-------------------|
| official-hybrid-run-01/02 (PROXY) | dev | B0 | 8/12 | 8/12 |
| official-hybrid-run-01/02 (PROXY) | dev | B1 | 9/12 | 9/12 |
| official-hybrid-run-01/02 (PROXY) | test | B0 | 5/6 | 5/6 |
| official-hybrid-run-01/02 (PROXY) | test | B1 | 6/6 | 6/6 |
| graphify-b3-held-out (tiktoken, PR #14) | dev | B0 | 5/12 | 5/12 |
| graphify-b3-held-out (tiktoken, PR #14) | dev | B1 | 4/12 | 4/12 |
| graphify-b3-held-out (tiktoken, PR #14) | dev | **B3** | **9/12** | 9/12 |
| graphify-b3-held-out (tiktoken, PR #14) | test | B0 | 3/6 | 3/6 |
| graphify-b3-held-out (tiktoken, PR #14) | test | B1 | 3/6 | 3/6 |
| graphify-b3-held-out (tiktoken, PR #14) | test | **B3** | **6/6** | 6/6 |

## Medição OFFICIAL canônica (2× rebuild, tiktoken + scorer 1.0.0)

Reexecutado em `2026-10-22` (`tree_sha` do manifest). Runs estáveis entre run-01 e run-02.

| Run | Split | B0 recall≥1 | B1 recall≥1 | B1 tokens (med.) | B1 latência ms (med.) |
|-----|-------|-------------|-------------|------------------|------------------------|
| run-01 | dev H07–H18 | **7/12** | **9/12** | 20463 | 1639 |
| run-01 | test H19–H24 | **4/6** | **5/6** | 21531 | 1654 |
| run-02 | dev H07–H18 | **7/12** | **9/12** | 20463 | 1656 |
| run-02 | test H19–H24 | **4/6** | **5/6** | 21531 | 1679 |

**B3 (Graphify, PR #14 raw re-scoreado com o mesmo scorer):** dev B3 **9/12** (B0 **5/12** no mesmo pacote, árvore `e9c25633`); teste B3 **6/6**. Comparar B0 apenas entre corridas na **mesma** `tree_sha`; o pacote B3 usou fixture para B1 live (**4/12**), enquanto a medição oficial acima usa motor karpathyWiki híbrido (**9/12** dev).

Linha histórica **PROXY** (8/12, 9/12) fica obsoleta para gates — budget subcontava tokens vs produção (`tiktoken`).

## Comandos

```bash
docs/architecture/v2.2/scripts/run-official-wiki-hybrid-bench.sh
# integrity (após manifest SUCCESS):
python3 docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/harness/integrity_test.py \
  --official docs/.../OFFICIAL-MANIFEST.json
```

**Exit codes observados:** pipeline `0`; Ollama ausente `10`; bootstrap falha `11`.

## Estabilidade (2 rebuilds completos)

Ver tabela **Medição OFFICIAL canônica** acima (run-01 ≡ run-02 em recall).

## Integridade

| Check | Resultado |
|-------|-----------|
| `tasks-held-out-frozen.json` SHA256 | `e3a536b8…ada995e` (manifest) |
| B1 sem `task["rg_patterns"]` | PASS |
| `held-out-summary.json` vs `held-out-all-runs.json` | PASS |
| `integrity_test.py --official` | `ALL_OFFICIAL_INTEGRITY_OK` |
| `pytest test_official_manifest.py` | PASS (com manifest) |

## Alvos D2 (calibrados nesta medição)

| Alvo | Valor | Passa (teste H19–H24) |
|------|------:|:---------------------:|
| Recall B1 ≥ B0 (held-out teste) | 5/6 ≥ 4/6 | sim |
| B1 mediana tokens entrada | ≤ 22000 | sim (~21531) |
| B1 mediana latência | ≤ 3000 ms | sim (~1679) |
| Estabilidade 2× rebuild | recall igual | sim |

## Correção de reprodutibilidade

`bootstrap-karpathywiki-official-bench.sh` exporta `CORPUS_YAML` + `CORPUS_SET=evolveloop` **antes** de `gaabwiki index --rebuild` (evita indexar corpus default do motor e apagar `EvolveLoop/wiki`).

## Riscos

1. Ollama + rebuild ~20 min/run — não é gate de CI rápido.  
2. Corpus evolveloop cresce com o monorepo (891 docs nesta SHA).  
3. Scorer canônico `file_evidence`; modo `line_strict` via `V22_ANCHOR_SCORER_MODE=line_strict` para auditoria 005c.
4. Re-score offline: `python3 harness/reconcile_canonical_scores.py --label … --raw-root …`.
