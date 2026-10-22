# V22-GOAL-008 — Graphify B3 measurement report

| Campo | Valor |
|-------|-------|
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **harness** | `v22-graphify-b3-harness-1.5.0` + `v22-ground-b1-harness-1.5.0` |
| **scorer** | `v22-anchor-scorer-1.0.0` (`file_evidence`) + `tiktoken:cl100k_base` |
| **budget** | 45 paths, 22 000 tokens |
| **suite** | `official-held-out` (H07–H24) |
| **raw** | `raw/battery-b3-graphify/` (`b3-summary.json` → `unified_official_table`) |
| **decisão** | ADR-0014 — flag OFF default |
| **tree** | `b127baefda7470bf7848d7632c285e3aac4c6bba` (`V22-FINAL-verify-2`) |

## Pacote Graphify (origem oficial)

| Campo | Valor |
|-------|-------|
| PyPI | **`graphifyy`** |
| CLI | `graphify` |
| Versão medida | 0.9.93 |
| Repositório | https://github.com/Graphify-Labs/graphify |
| Vendor | https://graphify.com |
| Licença | Apache-2.0 (upstream) |

## Tabela única — H07–H18 (dev)

B0/B1: paths+tokens do **OFFICIAL** híbrido `run-01`; recall rescored na árvore atual. B3: live.

| Braço | recall=1 / 12 | med. paths | med. tokens | med. ms |
|-------|--------------:|-----------:|------------:|--------:|
| B0 | 7 | 18,5 | 21 284 | 76 |
| B1 | 9 | 8,5 | 20 463 | 1 639 |
| B3 | 9 | 9 | 20 522 | 750 |

## Tabela única — H19–H24 (teste)

| Braço | recall=1 / 6 | med. paths | med. tokens | med. ms |
|-------|-------------:|-----------:|------------:|--------:|
| B0 | 4 | 19,5 | 20 099 | 87 |
| B1 | 5 | 7,5 | 21 531 | 1 654 |
| B3 | 6 | 10,5 | 20 699 | 724 |

## Comandos

```bash
pip install graphifyy
export PATH="$HOME/.local/bin:$PATH"
graphify update . --no-cluster   # graphify-out/ (gitignored)
bash docs/architecture/v2.2/scripts/run-graphify-b3-bench.sh
```
