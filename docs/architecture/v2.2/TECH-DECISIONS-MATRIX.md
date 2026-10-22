# V2.2 — Matriz de decisões técnicas

| ID | Decisão | Alternativas consideradas | Evidência | Rotulo | Meta |
|----|---------|---------------------------|-----------|--------|------|
| TD-01 | Escopo base = `09-v2.2-proposed-scope.md` ajustado por CEO D1 | Inventário ad-hoc | `docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` | produto | todas |
| TD-02 | Não adicionar `graphify` a `KnowledgeBackendId` | Novo backend id | `orchestrator/src/knowledge/backend/types.ts` L10–11 | projeto | V22-GOAL-008 |
| TD-03 | Graphify só CLI externa + flag | Import no core | pesquisa `03-repositories-and-tools.md` | pesquisa | V22-GOAL-008 |
| TD-04 | RAG permanece Python bridge, não LanceDB no TS | Embutir vector DB | `docs/adr/0004-project-knowledge-contract.md` | projeto | V22-GOAL-005 |
| TD-05 | Orçamento via skill/GATE_BUNDLE/evidence aditiva | Campo obrigatório em `knowledge.search` v1 | `orchestrator/contracts/knowledge.search.yaml` | projeto | V22-GOAL-006 |
| TD-06 | Métricas de otimização `PENDING_BASELINE` até B0/B1 | Usar −8,5% JetBrains como gate | D2 + `04-community-findings.md` | produto | V22-GOAL-003, 009 |
| TD-07 | Caveman só voz no host; compress descartado | caveman-compress no pack | D1 + `06-token-optimization.md` | produto | V22-GOAL-009 |
| TD-08 | Versionar pesquisa em `docs/research/evolveloop-v2.2/` | Só tarball local | D4 | produto | rastreabilidade |
| TD-09 | Artefatos de planejamento em `docs/architecture/v2.2/` | Só release-audit | Paridade `release-audit-2026-10-11/` + ADRs | produto | pack |
| TD-10 | Branch `evolve-v3` tratada como hipótese até existir no remoto | Assumir docs V3 no tree | `git fetch origin evolve-v3` falhou (inventário V22-T1) | hipótese | TRACEABILITY |
| TD-11 | wiki-mem permanece opt-in no perfil público | Always-on hooks | `profiles/default.yaml`, `.cursor/hooks.json` | projeto | V22-GOAL-004 |
| TD-12 | Redação de segredos: teste antes de portar módulo V3-hardening | Merge `8878cb6` | `V2.1-FREEZE-SCOPE-REPORT.md` | projeto | V22-GOAL-007 |
| TD-13 | Prompt cache só com adapter HTTP próprio | Simular cache Cursor | pesquisa `sources.md` Anthropic doc | pesquisa | V22-GOAL-010 |
| TD-14 | Mem0/Letta descartados no núcleo salvo nova evidência | Integrar memória agente | D1 | produto | fora escopo |

## Contradições aceitas (registro, sem resolver nesta fase)

| Tema | Observação | Rotulo |
|------|------------|--------|
| `knowledge.search` `network: false` vs `spawn` Python | Documentado no freeze V2.1; implementação em `wiki-backend.ts` | projeto |
| “V3” baseline eval vs roadmap produto | `docs/internal/historical/evals/docs-evals/baseline-v3-2026-09-19/` ≠ roadmap `evolve-v3` (hipótese) | projeto |
| `wiki-carpaccio` fora do pack podado | Host-only; operacionalização V22-GOAL-005 | pesquisa |
