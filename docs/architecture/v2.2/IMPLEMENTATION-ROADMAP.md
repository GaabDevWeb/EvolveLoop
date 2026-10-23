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
V22-GOAL-003 ─┬─► V22-GOAL-006 (alvos token), V22-GOAL-008, V22-GOAL-009
              │     (B0 OFFICIAL entregue F3c; B1 OFFICIAL bloqueado — ver abaixo)
V22-GOAL-005 ─┼─► V22-GOAL-004, V22-GOAL-006
              └─► V22-GOAL-003 fecho B1 OFFICIAL (ground.sh/WIKI_ROOT, conhecimento
                  sem gabarito, tarefas held-out — ver BENCHMARK-PLAN.md § B1→oficial)
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

## Rollback por fase

Nenhuma fase apaga `raw/` já publicado. Reverter código não é tarefa desta secção: aqui está o que reverter e como provar que voltou. O padrão é o do ADR-0013: reversão explícita, sem apagar evidência.

### F0 — pack documental

Não há flag. Reverter é um commit que retire o pack em `docs/architecture/v2.2/` introduzido com o validador. A prova é `docs/architecture/v2.2/scripts/validate-v22-artifacts.sh` deixar de encontrar os ficheiros exigidos. Não apaga raw de bench posterior.

### F1 — ADR-0013

Commit de introdução: `9293309` (`feat(v2.2): context ownership ADR and spawn context budget runtime`). Esse commit também traz o runtime de orçamento (F5). Reverter o commit inteiro desfaz as duas fases. Para reverter só o ADR: novo ADR que rejeite 0013, como a secção Reversibilidade de `docs/adr/0013-context-ownership-working-context.md` já diz, ou `git revert -n 9293309` limitado a `docs/adr/0013-context-ownership-working-context.md`. Prova: `orchestrator/tests/unit/context-ownership.test.ts` («ADR responde 9 perguntas») falha se as respostas saírem. Não apaga raw.

### Condenser extrativo (P0-6)

Flag `EVOLVELOOP_COMPACTION`, default OFF, em `orchestrator/src/v22/feature-flags.ts`. O contrato de reinject em `orchestrator/src/context/compaction-contract.ts` não muda: continua `NOT_IMPLEMENTED` e `reinject_allowed: false`. Rollback operacional: a variável ausente. Prova: `orchestrator/tests/unit/v22-p0-compaction.test.ts` com a env ausente devolve o texto de entrada sem o filtrar, e `orchestrator/tests/unit/context-ownership.test.ts` continua a recusar reinject. Não apaga `docs/v22/baseline/raw/` nem o raw histórico de bench.

### F2 — cerca de proveniência

Commit de introdução: `4bbbe4b` (`feat(v22): truth-source fence and evidence secret redaction`). Reverter esse commit, ou só `orchestrator/src/knowledge/truth-source/`. Prova: `orchestrator/tests/unit/knowledge/truth-source-fence.test.ts` deixa de passar. Não apaga raw de bench.

### F3 — harness B0/B1

Não há flag de produto. Reverter os scripts de harness sob `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/` sem tocar em `raw/`. Prova: o harness deixa de existir e os JSON em `raw/` continuam no tree. `git clean` e apagar `raw/` não são rollback.

### F4 — wiki e continuidade

Memória episódica: `profiles/default.yaml` tem `memory.enabled: false`. Ligar essa chave é opt-in; o rollback é mantê-la ausente ou `false` e não definir o provider como obrigatório. Continuidade de sessão: commit `c98fffe` (`feat(v22): session continuity checkpoint + memory`). Reverter `orchestrator/src/session/session-continuity.ts` e o teste de integração. Prova: `orchestrator/tests/integration/v22-session-continuity.integration.test.ts` deixa de existir ou falha, e `memory.enabled` permanece `false`. Não apaga raw.

### F5 — orçamento de contexto

Não há flag. O runtime entrou em `9293309` junto com o ADR. Reverter só o orçamento é retirar `orchestrator/src/context/budget.ts` da montagem do pickup, sem reverter o ADR. Prova: `orchestrator/tests/integration/context-budget-pickup.test.ts` deixa de ver o bloco orçado. Não apaga raw.

### F6 — Graphify

Flag `EVOLVELOOP_GRAPHIFY`. Rollback operacional: variável ausente (não `1`, `true`, `on` ou `yes`). O default em `orchestrator/src/v22/feature-flags.ts` (commit `498661a`) já é OFF. O adapter real entrou em `e9c2563`. Prova: `orchestrator/tests/unit/v22-graphify-adapter.test.ts` com a env ausente fica no stub. Não apagar `docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/raw/battery-b3-graphify/`.

### F7 — Caveman e cache de prefixo

Flags `EVOLVELOOP_BREVITY_CAVEMAN` e `EVOLVELOOP_PROMPT_CACHE`, ambas default OFF no mesmo `498661a`. Rollback: as duas variáveis ausentes. Prova: `orchestrator/tests/integration/v22-p2-goals.integration.test.ts` («run-engine output unchanged when all P2 flags off»). Não apaga medições de fixture já commitadas.

## V3 (hipótese)

Quando a branch `evolve-v3` existir no remoto: revalidar TRACEABILITY “preparar arquitetura” vs duplicação de store. Até lá, documentação V3 de produto não está neste branch (apenas referências na pesquisa versionada).
