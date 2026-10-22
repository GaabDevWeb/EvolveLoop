# V2.2 — Roadmap de implementação (documentação e gates; sem código core nesta entrega)

**Proibido nesta fase:** alterar `orchestrator/src/**`, instalar Graphify/Caveman, merge em `main`.

## Fases

```text
F0  (concluída)  Pack de metas + pesquisa versionada + validador
F1  Documentação  V22-GOAL-001 ADR draft → review → accepted/rejected
F2  Convenção     V22-GOAL-002 cerca + hierarquia (ADR/addendum + fixtures spec)
F3  Medição       V22-GOAL-003 harness + B0/B1 raw
F4  Operação wiki V22-GOAL-005 + V22-GOAL-004 continuidade (fixtures)
F5  Contexto      V22-GOAL-006 budget GATE_BUNDLE + V22-GOAL-007 canário
F6  Condicional   V22-GOAL-008 Graphify bench → decisão
F7  Condicional   V22-GOAL-009 brevidade host; V22-GOAL-010 se adapter
```

## Dependências (DAG)

```text
V22-GOAL-001 ─┬─► (desbloqueia compaction futura, não V2.2 runtime)
V22-GOAL-002 ─┼─► V22-GOAL-004, V22-GOAL-005
V22-GOAL-003 ─┴─► V22-GOAL-006 (alvos token), V22-GOAL-008, V22-GOAL-009
V22-GOAL-005 ───► V22-GOAL-004, V22-GOAL-006
```

F1 e F2 podem paralelizar. **Nenhuma fase P2 promete economia** antes de F3.

## Entregáveis por fase (artefatos, não código)

| Fase | Artefatos | Meta |
|------|-----------|------|
| F1 | `docs/adr/NNNN-context-ownership.md` | 001 |
| F2 | Addendum + spec fixture em `docs/architecture/v2.2/` ou ADR | 002 |
| F3 | `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/` + raw JSON | 003 |
| F4 | Runbook wiki + profile opt-in memória | 004, 005 |
| F5 | Checklist GATE_BUNDLE + teste canário | 006, 007 |
| F6 | Relatório bench Graphify | 008 |
| F7 | Decisão host brevidade / adapter cache | 009, 010 |

## Relação com freeze V2.1

`docs/architecture/release-audit-2026-10-11/V2.1-FREEZE-SCOPE-REPORT.md` permanece `FREEZE_NOT_READY`. V2.2 **não** substitui certificação de sandbox/HMAC global; entrega capacidades de conhecimento medidas.

## V3 (hipótese)

Quando a branch `evolve-v3` existir no remoto: revalidar TRACEABILITY “preparar arquitetura” vs duplicação de store. Até lá, documentação V3 de produto não está neste branch (apenas referências na pesquisa versionada).
