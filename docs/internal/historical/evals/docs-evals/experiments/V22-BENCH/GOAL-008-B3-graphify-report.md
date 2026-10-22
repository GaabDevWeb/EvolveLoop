# V22-GOAL-008 — Graphify B3 measurement report

| Campo | Valor |
|-------|-------|
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **harness** | `v22-graphify-b3-harness-1.5.0` + `v22-ground-b1-harness-1.5.0` |
| **recall** | por arquivo (`V22_ANCHOR_RECALL=file`) |
| **budget** | 45 paths, 22 000 tokens |
| **raw** | `raw/battery-b3-graphify/` (`b3-summary.json` → `split_tables`) |
| **decisão** | ADR-0014 — flag OFF default |

## Pacote Graphify (origem oficial)

| Campo | Valor |
|-------|-------|
| PyPI | **`graphifyy`** (nome do pacote; não confundir com outros `graphify*` no índice) |
| CLI | `graphify` |
| Versão medida | 0.9.93 |
| Repositório | https://github.com/Graphify-Labs/graphify |
| Vendor | https://graphify.com |
| Licença | Apache-2.0 (upstream) |

## Tabelas por split

### R01–R06 (B0 vs B3; B1 **CIRCULAR** — fora)

| Braço | recall=1 / 6 | med. paths | med. tokens | med. ms |
|-------|-------------:|-----------:|------------:|--------:|
| B0 | 0 | 19 | 21 338 | 114 |
| B3 | 2 | 8 | 20 545 | 806 |

### H07–H18 dev (B0 live; B1 frozen hybrid PR #10 lineage; B3 live)

| Braço | recall=1 / 12 | med. paths | med. tokens | med. ms |
|-------|--------------:|-----------:|------------:|--------:|
| B0 | 5 | 18,5 | 21 370 | 94 |
| B1 | 4 | 20,5 | 15 036 | 155 |
| B3 | 9 | 9 | 20 661 | 750 |

B1 frozen: `raw/battery-held-out-real-engine-005e-hybrid-dev/`.

### H19–H24 teste

| Braço | recall=1 / 6 | med. paths | med. tokens | med. ms |
|-------|-------------:|-----------:|------------:|--------:|
| B0 | 3 | 19,5 | 19 798 | 103 |
| B1 | 3 | 6 | 13 652 | 135 |
| B3 | 6 | 10,5 | 20 560 | 718 |

B1 frozen: `raw/battery-held-out-real-engine-005e-hybrid-test/`.

## Comandos

```bash
pip install graphifyy
export PATH="$HOME/.local/bin:$PATH"
graphify update . --no-cluster   # graphify-out/ (gitignored)
bash docs/architecture/v2.2/scripts/run-graphify-b3-bench.sh
```
