# V22-GOAL-008 — Graphify B3 measurement report

| Campo | Valor |
|-------|-------|
| **task_id** | `V22-GOAL-008-graphify-B3` |
| **harness** | `v22-graphify-b3-harness-1.5.0` (aligned with `v22-ground-b1-harness-1.5.0`) |
| **graphify** | `graphifyy` 0.9.93, `graphify update . --no-cluster` |
| **tree_sha** | `9b647f8721e9d0716c2b71841293449c0ae1f99f` |
| **raw** | `raw/battery-b3-graphify/` |
| **decisão** | ADR `docs/adr/0014-graphify-b3-benchmark-decision.md` — **INTEGRAR flag** |

## Rollup B3 (medido)

| Métrica | Valor |
|---------|-------|
| Mediana paths | 9 |
| Mediana tokens | 20 641 |
| Tarefas recall=1 | 17 / 24 |
| Mediana latência | ~700 ms |

## B0/B1 fontes (não re-executadas nesta VM)

| Tarefas | Manifest B0/B1 |
|---------|----------------|
| R01–R06 | `raw/battery-real/battery-summary.json` |
| H07–H18 | `raw/battery-held-out-real-engine/held-out-summary.json` (PR #10 / motor oficial) |
| H19–H24 | `raw/battery-held-out-real-engine-005e-hybrid-test/held-out-summary.json` (harness 1.5.0 hybrid) |

## Tabela comparativa (por tarefa)

Ver `raw/battery-b3-graphify/comparison-b0-b1-b3.json` (campos `B0_*`, `B1_*`, `B3_*`).

## Comandos

```bash
pip install graphifyy   # CLI `graphify`; PATH must include ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
cd "$REPO" && graphify update . --no-cluster
bash docs/architecture/v2.2/scripts/run-graphify-b3-bench.sh
```

Se o CLI não instalar: adapter permanece em **STUB**; documentar `pip install graphifyy` exit 0 e `graphify --version`.
