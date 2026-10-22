# V2.2 — Matriz de rastreabilidade

Legenda de rotulo: `pesquisa` = evidência da pesquisa versionada; `projeto` = evidência do repositório; `produto` = decisão CEO D1–D5; `hipótese` = não verificável neste checkout; `meta` = V22-GOAL-NNN.

## Metas oficiais

| Achado / meta | Evidência | Problema | Meta | Critério de aceite | Validação |
|---------------|-----------|----------|------|-------------------|-----------|
| ADR-DR-0005 bloqueia compaction | `docs/architecture/finalization/adrs/ADR-DR-0005-context-ownership-before-compaction.md` (projeto) | Ownership indefinido | V22-GOAL-001 | 9 perguntas respondidas | Revisão ADR |
| ADR-DR-0002 adia budget skills | `docs/architecture/finalization/ADR-INDEX.md` (projeto) | Sem budget runtime | V22-GOAL-001 + V22-GOAL-003 | ADR + baseline antes de alvo | E-001 + V22-BENCH |
| Isolamento entre repos | `docs/research/evolveloop-v2.2/10-risks-and-open-questions.md` (pesquisa) | Vazamento MCP/grafo | V22-GOAL-002 | Cenário 12 | `truth-source-fence.test.ts` + `v22-wire.integration.test.ts` |
| Hierarquia fonte de verdade | `docs/research/evolveloop-v2.2/07-compatibility-matrix.md` (pesquisa) | Conflito wiki/grafo | V22-GOAL-002 | Proveniência + obsoleto | engine `knowledge.search` + integração |
| E-001 PROXY apenas | `docs/internal/historical/evals/docs-evals/experiments/E-001/EXPERIMENT.md` (projeto) | Sem baseline live | V22-GOAL-003 | B0/B1 raw JSON | integrity_test |
| B0 real monorepo | `V22-BENCH/EXPERIMENT-REAL.md` (projeto) | recall B0 informativo | V22-GOAL-003 | `OFFICIAL_BASELINE` B0 | `real_corpus_harness.py` |
| B1 pack bench | `fixtures/evolveloop-project-knowledge/` (projeto) | recall circular | V22-GOAL-003 | `PROVISIONAL_CURATED_PACK` | aguarda V22-GOAL-005 |
| Sintético F3 | `V22-BENCH/raw/battery/` (projeto) | tautologia | V22-GOAL-003 | `PROVISIONAL_SYNTHETIC` | `bench_harness.py` |
| Continuidade S03/S07 | `fixtures/continuity-s37/` (projeto) + engine `session-continuity` | não `/mem` engine default | V22-GOAL-004 | `PROVISIONAL_CURATED_PACK` B1 | `v22-session-continuity.integration.test.ts` |
| B1→oficial | `BENCHMARK-PLAN.md` § B1→oficial (projeto) | ground.sh+held-out | V22-GOAL-005 → 003 | `PENDING_BASELINE` | F4 wiki ops |
| Memória off no default | `profiles/default.yaml` L10–13 (projeto) | Sem continuidade | V22-GOAL-004 | Cenários 3, 7 | Fixture |
| Hooks sem wiki-mem | `.cursor/hooks.json` (projeto) | Episódico não wired | V22-GOAL-004 | Procedimento opt-in | Skill wiki-mem |
| RAG_REPO_MISSING sem vault | `orchestrator/src/knowledge/backend/wiki-backend.ts` L134–142 (projeto) | Grounding falha | V22-GOAL-005 | ground.sh OK | list-packs |
| ADR dual Carpaccio+Wiki | `docs/adr/0004-project-knowledge-contract.md` (projeto) | Duas skills | V22-GOAL-005 | Workflows 4× | Fixture |
| Sem orçamento de leitura | `docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` § P1-2 (pesquisa) | Explosão contexto | V22-GOAL-006 | Cenário 10 | Log paths |
| GATE_BUNDLE sem budget | `.cursor/skills/orquestrar/references/gate-bundle.md` (projeto) | Política incompleta | V22-GOAL-006 | Briefing PDA | Checklist |
| Segredo em evidence | `docs/architecture/release-audit-2026-10-11/V2.1-FREEZE-SCOPE-REPORT.md` (projeto) | Redação V3 não merged | V22-GOAL-007 | Canário 0× | `secret-redaction.test.ts` + `v22-wire.integration.test.ts` |
| Graphify hipótese | `docs/research/evolveloop-v2.2/03-repositories-and-tools.md` (pesquisa) | Dependentes código | V22-GOAL-008 | B3 vs B0/B1 | Bench |
| Caveman −8,5% saída | `docs/research/evolveloop-v2.2/04-community-findings.md` (pesquisa) | **contexto D2** | V22-GOAL-009 | `FIXTURE_PICKUP_INVOKE` R01–R06+H07–H12 | `measure-pickup-prompts.ts` |
| Prompt cache | `docs/research/evolveloop-v2.2/sources.md` (pesquisa) | Custo prefixo | V22-GOAL-010 | `FIXTURE_PREFIX_STABILITY`; vendor **NOT_MEASURED** | `measure-prompt-cache-prefix.ts` |
| CEO escopo base 09 | `docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` (pesquisa) + D1 (produto) | Alinhamento | V22-GOAL-001…010 | Pack completo | `validate-v22-artifacts.sh` |

## Achados adiados (não metas V2.2)

| Achado | Evidência | Destino | Rotulo |
|--------|-----------|---------|--------|
| Compaction/reinject engine | ADR-DR-0005 DEFER | Após V22-GOAL-001 | projeto |
| Sandbox SO / HMAC freeze completo | `V2.1-FREEZE-SCOPE-REPORT.md` | V2.1 / V3 | projeto |
| `max_skills` runtime | ADR-DR-0002 | Após E-001-LIVE / baseline | projeto |
| Promote “3×” spec vs MemoryStore | `01-current-state-audit.md` (pesquisa) + `memory-store.ts` (projeto) | Esclarecer spec ou implementação futura | hipótese |
| EvolveLoop adapters não wired | `docs/internal/historical/audits/.agent_history.md` (histórico) | Fora V2.2 wiki | projeto |

## Achados descartados (D1)

| Item | Evidência | Rotulo |
|------|-----------|--------|
| Mem0 / Letta / claude-mem núcleo | `09-v2.2-proposed-scope.md`, `03-repositories-and-tools.md` | produto + pesquisa |
| caveman-compress em contratos | D1 | produto |
| GraphRAG dependência nova | `README` pesquisa maintenance | pesquisa |
| Serena no core MIT | GPL app (`sources.md`) | pesquisa |
| Segundo KnowledgeBackend LanceDB | ADR-0004 | projeto |

## Mapeamento capacidade → entrega (D3)

| Capacidade | V2.2 entregar | Preparar arquitetura | V3 | Descartar |
|------------|---------------|----------------------|-----|-----------|
| Ownership contexto ADR | V22-GOAL-001 | — | confrontar World Model quando branch existir | — |
| Hierarquia + cerca | V22-GOAL-002 | — | defesa contaminação (metas V3 citadas na pesquisa) | — |
| Benchmark B0/B1 | V22-GOAL-003 | pasta `experiments/V22-BENCH/` | — | — |
| Continuidade sessão | V22-GOAL-004 | profile opt-in | memória semântica Meta 6 | — |
| Wiki vault + `.ai/` | V22-GOAL-005 | — | — | — |
| Budget contexto / GATE_BUNDLE | V22-GOAL-006 | evidence JSON | atenção Meta 7 | — |
| Canário segredo | V22-GOAL-007 | — | redação hardening V3 | — |
| Grafo código Graphify | V22-GOAL-008 (flag) | não alterar `KnowledgeBackendId` | grafo como plataforma | backend obrigatório |
| Brevidade saída | V22-GOAL-009 | host skill | — | compress arquivo |
| Prompt cache | V22-GOAL-010 | adapter | cost governor | cache IDE simulado |
| World Model / Agency | — | tipos não criados | V3 (`evolve-v3` **hipótese**) | — |
| Memory Trust runtime | — | schema citado na pesquisa | V3 | — |
| Mem0/Letta | — | — | — | sim |
