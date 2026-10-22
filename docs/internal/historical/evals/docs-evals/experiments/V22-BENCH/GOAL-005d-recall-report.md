# V22-GOAL-005d — diagnóstico e recall B1 oficial (sem circularidade)

## Contexto

- **Base:** `release/v2.1-freeze-preparation` @ `0d2abf0` (merge PR #7).
- **Medição aceita pré-005d (H07–H18):** B0 **8/12**, B1 **2/12** (harness 1.3.0, BM25 degradado).
- **Held-out teste congelado antes de otimizar:** H19–H24 (`recall_holdout_test_extension` em `tasks-held-out-frozen.json`).
- **Motor:** karpathyWiki snapshot `cd3cf08` em `/opt/karpathyWiki`; **sem** edição do motor; ingest/query apenas no lado EvolveLoop.

## Diagnóstico (dev H07–H18)

Script: `docs/architecture/v2.2/scripts/diagnose-official-b1-recall.py`  
Evidência: `raw/battery-held-out-real-engine/recall-diagnosis.json`

| Task | Ingerido | BM25 rank (raw) | BM25 rank (expandido) | Causa provável |
|------|:--------:|----------------:|----------------------:|----------------|
| H07 | sim | 5 | 19 | top-k (expansão piorou) |
| H08 | sim | 45 | 42 | top-k + PT vs EN |
| H09 | sim | 21 | 30 | top-k |
| H10 | sim | 58 | 21 | top-k |
| H11 | sim | 26 | **6** | top-k / idioma |
| H12 | sim | 30 | **2** | chunking / ruído de hits |
| H13 | sim | 48 | 49 | top-k + PT (ADR-0005) |
| H14 | sim | 54 | 18 | top-k |
| H15 | sim | 130 | 69 | top-k + PT |
| H16 | sim | **3** | 11 | in_top_k (proveniência) |
| H17 | sim | **4** | 4 | in_top_k |
| H18 | sim | **1** | 7 | in_top_k |

**Padrão:** anchors **100% ingeridos**; falhas são quase sempre **rank BM25 > 12** ou **pergunta em PT vs corpus misto**, não ausência de página. Títulos/paths passam a ser indexados via bloco `evolveloop-index-block` na ingestão.

## Diagnóstico (teste H19–H24)

Evidência: `raw/battery-held-out-real-engine-005d-test/recall-diagnosis.json`

| Task | Ingerido | BM25 rank (melhor) | Causa provável |
|------|:--------:|-------------------:|----------------|
| H19 | sim | 43 | top-k + PT (ADR-0003) |
| H20 | sim | — | PT vs EN (`fence.ts` não ranqueia) |
| H21 | sim | 47 | top-k |
| H22 | sim | 10 | in_top_k BM25 mas proveniência errada no harness |
| H23 | sim | 91 | top-k + expansão degrada rank |
| H24 | sim | 26 | top-k |

## Mudanças (EvolveLoop, genéricas)

| Área | Alteração |
|------|-----------|
| Ingestão | `evolveloop_recall_support.build_index_preamble` — path, headings, símbolos; chunking por seções em `.md` |
| Glossário | Derivado do allowlist (`build_glossary` no ingest → `.data/evolveloop-query-glossary.json`) |
| Query B1 | Expansão PT→EN por co-ocorrência no corpus + união **query raw + expandida** (sem `rg_patterns` de tarefa) |
| Híbrido lexical | `V22_B1_HYBRID_LEXICAL=1` (default): `rg` só com padrões extraídos da query+glossário |
| Harness | `ground_b1_harness.py` **1.4.0**, `V22_B1_TOP_K=16`, dual-search |
| Bootstrap | Re-ingest 861 ficheiros → BM25 **9409** linhas (modo degradado) |

## Medição pós-melhorias

Comandos:

```bash
KARPATHYWIKI_SRC=/opt/karpathyWiki bash docs/architecture/v2.2/scripts/bootstrap-karpathywiki-official-bench.sh
V22_WIKI_ENGINE=official python3 .../ground_b1_harness.py .../battery-held-out-real-engine-005d-dev --tasks H07-H18
V22_WIKI_ENGINE=official python3 .../ground_b1_harness.py .../battery-held-out-real-engine-005d-test --tasks H19-H24
```

### Dev (H07–H18) — otimização permitida

| Task | B0 rec | B0 tok | B0 ms | B1 rec | B1 tok | B1 ms |
|------|--------|-------:|------:|--------|-------:|------:|
| H07 | 0.0 | 14011 | 30 | 0.0 | 41639 | 5626 |
| H08 | 0.0 | 13645 | 15 | 0.0 | 37980 | 5624 |
| H09 | 1.0 | 14038 | 19 | 1.0 | 31142 | 5584 |
| H10 | 1.0 | 22105 | 18 | 1.0 | 28651 | 5669 |
| H11 | 0.0 | 10725 | 34 | 1.0 | 44128 | 5648 |
| H12 | 0.0 | 6716 | 24 | 0.0 | 36732 | 5618 |
| H13 | 1.0 | 37007 | 25 | 0.0 | 32807 | 5729 |
| H14 | 0.0 | 9370 | 15 | 0.0 | 37393 | 5603 |
| H15 | 0.0 | 10725 | 25 | 0.0 | 34740 | 5791 |
| H16 | 1.0 | 8266 | 17 | 0.0 | 34523 | 5710 |
| H17 | 1.0 | 27626 | 22 | 1.0 | 29658 | 5668 |
| H18 | 0.0 | 14085 | 21 | 1.0 | 36472 | 5705 |

**Recall ≥1:** B0 **5/12**, B1 **5/12** (vs baseline oficial 8/12 e 2/12). B1 **+3** no dev; B0 variou (cap `rg` 45 e ordem de hits — não alterado neste goal).

**Mediana:** B1 paths ~31, tokens ~**35.6k**, latência ~**5.7s**/tarefa (dual `gaabwiki search`).

### Teste (H19–H24) — held-out congelado

| Task | B0 rec | B1 rec |
|------|--------|--------|
| H19 | 1.0 | 0.0 |
| H20 | 1.0 | 0.0 |
| H21 | 1.0 | 0.0 |
| H22 | 1.0 | 0.0 |
| H23 | 1.0 | 1.0 |
| H24 | 0.0 | 1.0 |

**Recall ≥1:** B0 **5/6**, B1 **2/6**.

### Aceite teste (H19–H24)

**Não atingido:** B1 (2/6) **<** B0 (5/6). Relatório honesto: com BM25 degradado e perguntas PT, expansão+glossário e híbrido lexical **genérico** melhoram dev mas **não** fecham o gap no held-out teste; H20/H21/H22 exigem embeddings ou top-k muito maior / reranker, fora do escopo sem Ollama.

## Validação

| Suite | Resultado |
|-------|-----------|
| `orchestrator` vitest | **286** passed |
| `fixtures/evolveloop-wiki-vault` pytest | **2** passed |
| `test-official-wiki-stale.sh` | **PASS** |
| `validate-v22-artifacts.sh` | **PASS** |

## SHA / PR

- **Commit de medição:** `f453b84` (`freeze_tree_sha` nos `held-out-summary.json` da branch `cursor/v22-goal-005d-recall-2e17`).
- **PR:** contra `release/v2.1-freeze-preparation`.

## Riscos

1. **BM25 degradado** — sem vetor/híbrido real; rank alto em NL-PT é estrutural.
2. **Dual-search** — dobra latência B1 (~5.7s vs ~2.8s em 005c).
3. **Híbrido lexical** — pode puxar ficheiros errados (H22: hit em doc de canário vs `secret-redaction.ts`).
4. **B0 no dev** — variância do `rg` cap 45; não confundir com ganho de B1 no teste.
