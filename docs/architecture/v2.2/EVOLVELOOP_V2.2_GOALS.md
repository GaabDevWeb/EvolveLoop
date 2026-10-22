# EvolveLoop V2.2 — Metas oficiais (produto)

| Campo | Valor |
|-------|-------|
| **task_id** | V22-T2-goals-docs |
| **Base normativa** | `docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` validado contra inventário V22-T1 |
| **Checkout de referência** | `release/v2.1-freeze-preparation` @ `28ab56ce091fc25edbf67e5106268580becff2b2` |
| **Política numérica (D2)** | Nenhum alvo percentual ou multiplicador como gate sem baseline B0/B1; métricas de otimização = `PENDING_BASELINE` até calibração |

## Visão

A V2.2 torna **conhecimento por projeto** e **recuperação com orçamento** operáveis e **medíveis**, sem antecipar a V3 (World Model, Agency, Memory Trust em runtime). O substrato V2 (`KnowledgeBackend`, `MemoryStore`, checkpoint, Capability IR → Evidence) permanece; a entrega é documentação, convenções, harness e gates verificáveis — não um segundo knowledge store nem compaction destrutiva no hot path.

## Problemas que a V2.2 resolve

1. **Ownership do contexto de trabalho** indefinido — ADR-DR-0005 adia compaction; ADR-DR-0002 adia budget de skills no runtime (`docs/architecture/finalization/ADR-INDEX.md`).
2. **Hierarquia de fonte de verdade** não operacionalizada — código, `.ai/`, vault e grafo inferido coexistem sem proveniência nem detecção de obsoleto unificada (`docs/research/evolveloop-v2.2/07-compatibility-matrix.md`).
3. **Medição parcial** — E-001 é PROXY whitespace; B0/B1 offline em `V22-BENCH` (`docs/internal/historical/evals/docs-evals/experiments/V22-BENCH/EXPERIMENT.md`); LLM ao vivo ainda `NOT_MEASURED`.
4. **Continuidade entre sessões** não verificável no perfil público — `memory.enabled: false`, hooks sem `wiki-mem` (`profiles/default.yaml`, `.cursor/hooks.json`).
5. **Grounding Wiki fail-closed** quando `WIKI_ROOT` ausente (`orchestrator/src/knowledge/backend/wiki-backend.ts`).

## Princípios (decisão de produto D1)

| # | Princípio | Rotulo |
|---|-----------|--------|
| P1 | Ordem de autoridade: **código > `.ai/` (não obsoleto) > vault (`WIKI_ROOT`) > grafo INFERRED**; arestas EXTRACTED citáveis; INFERRED nunca substitui código | decisão de produto |
| P2 | **Proveniência obrigatória** em páginas/decisões recuperadas (fonte, hash ou path) | decisão de produto |
| P3 | **Detecção de obsoleto** antes de injetar (lint wiki, hash, `status: obsoleto`) | decisão de produto |
| P4 | **Sem alvo numérico** de economia até baseline B0/B1 publicado (D2) | decisão de produto |
| P5 | Fora de escopo V2.2 / V3: World Model, Memory Trust runtime, Agency, cost governor, roteamento de modelo; descartar Mem0/Letta e `caveman-compress` em contratos salvo nova evidência (D1) | decisão de produto |

## Metas

### Template (14 campos)

Cada meta abaixo declara os 14 campos exigidos pelo pack V2.2.

---

## V22-GOAL-001

- **ID:** V22-GOAL-001
- **Prioridade:** P0
- **Título:** ADR de ownership do contexto de trabalho
- **Problema:** ADR-DR-0005 bloqueia compaction/reinject; ownership entre contexto compactado, Memory, Knowledge e Checkpoint permanece em checklist aberto (`docs/architecture/finalization/adrs/ADR-DR-0005-context-ownership-before-compaction.md`).
- **Estado atual:** Compaction `NOT_IMPLEMENTED`; ADR `docs/adr/0013-context-ownership-working-context.md` **accepted**; runtime mínimo em `orchestrator/src/context/`.
- **Resultado:** ADR novo em `docs/adr/` respondendo às 9 perguntas do escopo proposto (conteúdo candidato em `docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` § P0-1), sem criar store permanente para working context.
- **Solução:** Documento ADR apenas; desbloqueia desenho futuro de compaction e interpretação de ADR-DR-0002 (budget) sem fundir stores.
- **Dependências:** Nenhuma ferramenta externa.
- **Impacto arquitetural:** Aditivo em `orchestrator/src/context/` (owner por spawn, contrato compaction); tipos `KnowledgeBackend` / `MemoryStore` / checkpoint inalterados (`orchestrator/src/knowledge/backend/types.ts`, `orchestrator/src/memory/memory-store.ts`).
- **Critérios de aceite:** As 9 perguntas com resposta explícita; Knowledge ≠ Memory ≠ Checkpoint; working context declarado descartável na fronteira da chamada ao modelo.
- **Métricas:** N/A (decisão documental); sem alvo numérico.
- **Validação / testes:** Revisão cruzada com ADR-DR-0005 e ADR-DR-0002; quando `evolve-v3` existir, confrontar com `WORLD-MODEL.md` (**hipótese pendente** — branch ausente no remoto).
- **Riscos:** Respostas que autorizem sumarizador destrutivo cedo.
- **Condição de conclusão:** ADR merged com status `accepted` ou `rejected` explícito (ambos fecham a pergunta).

**Rotulo dominante:** meta + decisão de produto.

---

## V22-GOAL-002

- **ID:** V22-GOAL-002
- **Prioridade:** P0
- **Título:** Cerca de fonte de verdade e isolamento por raiz de projeto
- **Problema:** `feature_id` e `data-dir` não isolam repositórios; MCP memory global e grafos compartilhados podem vazar contexto (`docs/research/evolveloop-v2.2/10-risks-and-open-questions.md`).
- **Estado atual:** Sem detector de toplevel no engine; hierarquia código > `.ai/` > vault documentada na pesquisa mas não normativa no repo (`docs/adr/0004-project-knowledge-contract.md` cobre contrato dual, não ordem de desempate completa).
- **Resultado:** Convenção escrita + testes: uma raiz = um `.ai/` = um cache de grafo opcional; proveniência obrigatória; obsoleto detectável; cenário 12 (canário entre projetos) passa.
- **Solução:** ADR ou addendum em `docs/adr/` + fixtures de path; implementação mínima pode permanecer em skill/checklist até fase de código autorizada.
- **Dependências:** V22-GOAL-001 recomendado em paralelo (evita discutir “onde mora resumo” sem ownership).
- **Impacto arquitetural:** Preferir convenção e testes; evitar novo backend id no TS (`KnowledgeBackendId` permanece `wiki` \| `fake`).
- **Critérios de aceite:** String canário do projeto A ausente do contexto do projeto B; página sem fonte não permanece `status: atual`; código divergente não é “corrigido” só na wiki.
- **Métricas:** 0 vazamentos no fixture de isolamento (contagem, não percentual de tokens).
- **Validação / testes:** Dois roots temporários; cenário 12 do `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md`.
- **Riscos:** Monorepo multi-produto na mesma raiz — documentar uso de páginas, não múltiplas wikis.
- **Condição de conclusão:** Teste de canário existe, passa, e convenção publicada em `docs/architecture/v2.2/` ou `docs/adr/`.

**Rotulo dominante:** meta + evidência pesquisa.

---

## V22-GOAL-003

- **ID:** V22-GOAL-003
- **Prioridade:** P0
- **Título:** Harness de benchmark e baselines B0/B1
- **Problema:** E-001 mede `token_estimate` por whitespace e `task_success NOT_MEASURED` (`docs/internal/historical/evals/docs-evals/experiments/E-001/EXPERIMENT.md`).
- **Estado atual:** B0 real `OFFICIAL_BASELINE` (`raw/battery-real/`); B1 bench pack `PROVISIONAL_CURATED_PACK`; sintético `PROVISIONAL_SYNTHETIC`; LLM `NOT_MEASURED`.
- **Resultado:** B0 medido no monorepo (6 tarefas); B1 no pack curado (recall circular); S03/S07 no mini-fixture (B1 provisório).
- **Solução:** `V22-BENCH/` + `BENCHMARK-PLAN.md` § B1→oficial.
- **Dependências:** **B1 OFFICIAL** bloqueado até **V22-GOAL-005** (`ground.sh`/`WIKI_ROOT`, conhecimento sem gabarito, held-out). LLM ao vivo: `NOT_MEASURED`.
- **Impacto arquitetural:** Nenhum no runtime de produção.
- **Critérios de aceite:** Raw contém tokens entrada/saída, paths lidos, verificador, SHA do tree, id do modelo; integridade do scorer.
- **Métricas:** **OFFICIAL_BASELINE (B0):** paths mediana 45; tokens entrada mediana ~66747; recall por tarefa informativo (não gate). **PROVISIONAL_CURATED_PACK (B1):** observação recall 1.0*, paths mediana 3, tokens 1781 — *circular; **não** alvo oficial. Alvos B1/continuidade: `PENDING_BASELINE` até GOAL-005 + held-out. **PROVISIONAL_SYNTHETIC:** sanity apenas. LLM: `NOT_MEASURED`.
- **Validação / testes:** `integrity_test` análogo ao E-001; cenários 1–2 mínimos para B0/B1.
- **Riscos:** Cache do host Cursor desconhecido → registrar `UNKNOWN` no raw.
- **Condição de conclusão:** B0 oficial publicado; B1 oficial após V22-GOAL-005; P1/P2 economia só com B1 oficial ou `PENDING_BASELINE`.

**Rotulo dominante:** meta + evidência projeto.

---

## V22-GOAL-004

- **ID:** V22-GOAL-004
- **Prioridade:** P0
- **Título:** Continuidade entre sessões verificável
- **Problema:** Retomar decisão em nova sessão não tem gate verificável no default público (`memory.enabled: false` em `profiles/default.yaml`; hooks sem `wiki-mem` em `.cursor/hooks.json`).
- **Estado atual:** Skill `wiki-mem` existe (`.cursor/skills/wiki-mem/SKILL.md`); ADR-0004 separa vault de `.ai/`; engine não inicializa `.ai/`.
- **Resultado:** Procedimento verificável (opt-in profile ou fixture de laboratório) onde cenários 3 e 7 do plano 08 passam — decisão recuperada sem varrer o repositório inteiro.
- **Solução:** Documentar fluxo `/mem` + `.ai/sessions` + promote-queue; fixture que grava e relê decisão; não exigir memória always-on no perfil público sem decisão de release.
- **Dependências:** V22-GOAL-002 (cerca); V22-GOAL-005 (wiki de projeto) para braço B1.
- **Impacto arquitetural:** Opt-in preservado; sem segundo `KnowledgeBackend`.
- **Critérios de aceite:** Cenário 3: mesma tarefa de retomada; verificador acerta; cenário 7: cita página/ADR/código.
- **Métricas:** S03/S07 B1 no mini-fixture: `PROVISIONAL_CURATED_PACK` (obs. paths 2, tokens 114). Alvos oficiais continuidade: `PENDING_BASELINE` até B1 wiki real (005). Episódico engine/host: `NOT_MEASURED`.
- **Validação / testes:** Fixture do plano 08; evidência em `memory/<feature_id>/evidence/` quando usar engine.
- **Riscos:** Confundir episódico com SSOT de domínio (wiki skill já proíbe).
- **Condição de conclusão:** Corrida registrada no fixture com verificador verde para cenários 3 e 7.

**Rotulo dominante:** meta + decisão de produto.

---

## V22-GOAL-005

- **ID:** V22-GOAL-005
- **Prioridade:** P1
- **Título:** Wiki operacional como backend default (vault + projeto)
- **Problema:** `WIKI_ROOT` ausente → `RAG_REPO_MISSING` (`orchestrator/src/knowledge/backend/wiki-backend.ts`); skill de projeto não é fluxo obrigatório do engine.
- **Estado atual:** `knowledge.backend: wiki` no perfil (`profiles/default.yaml`); `ground.sh` exige `WIKI_ROOT` (`.cursor/skills/wiki/scripts/ground.sh`); Carpaccio normativo em ADR-0004.
- **Resultado:** Ambiente de referência documentado onde `ground.sh list-packs` funciona; workflows init/query/update/lint em fixture; atualização incremental após mudança relevante.
- **Solução:** Operacionalizar `wiki` + `wiki-carpaccio` (host); bridge Python inalterada; sem LanceDB no TS (ADR-0004).
- **Dependências:** V22-GOAL-002; desbloqueia **B1 OFFICIAL** em V22-GOAL-003 (bench pack é `PROVISIONAL_CURATED_PACK`).
- **Impacto arquitetural:** Arquivos no projeto-alvo e config de ambiente; sem novo `KnowledgeBackendId`.
- **Critérios de aceite:** Cenários 2, 3, 6, 7 do plano 08; excerpt cap 500 permanece até ADR que altere (`wiki-backend.ts`).
- **Métricas:** Bench B1 pack: `PROVISIONAL_CURATED_PACK` (não gate). `ground.sh`+vault: pré-requisito B1 oficial — `NOT_MEASURED` no VM bench. Páginas `atual`+hash: `PENDING_BASELINE` até lint operacional.
- **Validação / testes:** Fixture; opcional `knowledge-backend.test.ts` quando deps instaladas.
- **Riscos:** Wiki gigante na primeira sessão — init mínima obrigatória no teste.
- **Condição de conclusão:** Quatro workflows (init, query, update, lint) com corrida registrada.

**Rotulo dominante:** meta + evidência projeto.

---

## V22-GOAL-006

- **ID:** V22-GOAL-006
- **Prioridade:** P1
- **Título:** Orçamento de contexto por spawn / GATE_BUNDLE
- **Problema:** Nada impede reler repo inteiro ou injetar vault completa; sem dedup de paths (`docs/research/evolveloop-v2.2/09-v2.2-proposed-scope.md` § P1-2).
- **Estado atual:** `GATE_BUNDLE` com campos aditivos `context_budget` / `context_owner_id`; runtime `orchestrator/src/context/budget.ts` + telemetria `ContextBudget`.
- **Resultado:** Procedimento normativo: índice `.ai/`, até N páginas, até M paths `rg`; N/M calibrados pós-baseline ou parametrizados no fixture (N=5, M=15 proposta inicial **não é gate** — `PENDING_BASELINE`).
- **Solução:** Checklist em skill / briefing PDA; campos opcionais em JSON de evidência (aditivos); não quebrar `knowledge.search` v1 (`orchestrator/contracts/knowledge.search.yaml`).
- **Dependências:** V22-GOAL-005; V22-GOAL-003 para alvos numéricos de token.
- **Impacto arquitetural:** Aditivo em evidência; sem mudança obrigatória de contrato.
- **Critérios de aceite:** Cenário 10: braço com orçamento não perde verificador nem lê path canário redundante.
- **Métricas:** B0 oficial: cap observado 45 paths (informativo). B1 bench: `PROVISIONAL_CURATED_PACK` — alvos paths/tokens `PENDING_BASELINE` até B1 oficial (003←005). Redundância: 0. PROVISIONAL_SYNTHETIC: não gate.
- **Validação / testes:** Log de paths por run; gap do host Cursor documentado se paths não observáveis.
- **Riscos:** Orçamento corta função no meio — cortar por arquivo inteiro.
- **Condição de conclusão:** Fixture mostra lista de paths e ausência de canário cruzado.

**Rotulo dominante:** meta + decisão de produto.

---

## V22-GOAL-007

- **ID:** V22-GOAL-007
- **Prioridade:** P1
- **Título:** Canário de qualidade e redação de segredos
- **Problema:** Excerpts e logs podem vazar segredos; `secret-redaction.ts` citado só em branch de hardening não ancestral do freeze (`docs/architecture/release-audit-2026-10-11/V2.1-FREEZE-SCOPE-REPORT.md`).
- **Estado atual:** `cleanOutput` limita tamanho (`orchestrator/src/capabilities/results.ts`); sem teste de canário nesta branch.
- **Resultado:** Teste com string canário ausente de artefatos commitados de evidência; wiki não copia `.env` para `.ai/`.
- **Solução:** Teste primeiro; patch mínimo de redação só se falhar — fora do escopo de merge amplo V3-hardening.
- **Dependências:** Nenhuma externa.
- **Impacto arquitetural:** Possível ajuste local de log; formato HMAC checkpoint inalterado (`orchestrator/src/jobs/checkpoint.ts`).
- **Critérios de aceite:** 0 ocorrências do canário em evidence publicada.
- **Métricas:** Contagem de ocorrências do canário (0); sem alvo percentual.
- **Validação / testes:** Fixture dedicado no plano V22-BENCH.
- **Riscos:** Redação agressiva remove paths necessários à evidência.
- **Condição de conclusão:** Teste do canário passa no tree da V2.2.

**Rotulo dominante:** meta + evidência pesquisa.

---

## V22-GOAL-008

- **ID:** V22-GOAL-008
- **Prioridade:** P2
- **Título:** Graphify como backend opcional (protótipo, flag)
- **Problema:** Cadeias de dependência em código custam leituras; hipótese não medida localmente (`docs/research/evolveloop-v2.2/03-repositories-and-tools.md`).
- **Estado atual:** Ferramenta ausente no repo; release upstream citada v0.9.93 (evidência pesquisa, 2026-10-21).
- **Resultado:** Experimento CLI externo Apache-2.0, `graphify-out/` gitignored por raiz; **sem** `--wiki`, sem cloud, sem LLM na passagem; decisão INTEGRAR-flag ou DESCARTAR após bench.
- **Solução:** Não adicionar `"graphify"` a `KnowledgeBackendId`; flag de experimento apenas.
- **Dependências:** V22-GOAL-003, V22-GOAL-006; Python 3.10+ no ambiente de experimento.
- **Impacto arquitetural:** Nenhum no contrato público se permanecer fora do backend.
- **Critérios de aceite:** Cenários 5 e 11; aresta EXTRACTED ou rotulada INFERRED; vitória definida no `BENCHMARK-PLAN.md` (não por marketing Reddit).
- **Métricas:** Tokens e dependentes corretos vs B0/B1 — alvos `PENDING_BASELINE` até execução; números externos (71×, Repowise) **contexto apenas** (D2).
- **Validação / testes:** Braço B3 do plano 08.
- **Riscos:** Skill upstream desencoraja abrir arquivo — instrução de experimento deve permitir verificação no disco.
- **Condição de conclusão:** Relatório de bench com decisão explícita; “instalado” não é conclusão.

**Rotulo dominante:** meta + hipótese pendente.

---

## V22-GOAL-009

- **ID:** V22-GOAL-009
- **Prioridade:** P2
- **Título:** Brevidade de saída (estilo Caveman, só voz)
- **Problema:** Prosa longa na resposta aumenta tokens de saída; efeito pequeno em trabalho agêntico (evidência pesquisa JetBrains −8,5% saída — **contexto**, não resultado EvolveLoop).
- **Estado atual:** Sem skill Caveman no pack EvolveLoop; `caveman-compress` **fora** de contratos (D1).
- **Resultado:** Instrução ou skill de host opcional, default off; proibida em mensagens com comando, JSON, diff ou gate.
- **Solução:** Host-only; não importar compressor de arquivo ao core.
- **Dependências:** V22-GOAL-003; cenário 9 do plano 08.
- **Impacto arquitetural:** Nenhum no orchestrator se host-only.
- **Critérios de aceite:** Verificador estável; negações do gabarito preservadas.
- **Métricas:** Redução de tokens de saída vs B0 `PENDING_BASELINE`; −8,5% JetBrains **não** é limiar (D2).
- **Validação / testes:** Braço B4; diff automático de fidelidade.
- **Riscos:** Handoff ambíguo; perda de negação.
- **Condição de conclusão:** Decisão registrada com números do harness V22, não de terceiros.

**Rotulo dominante:** meta + decisão de produto.

---

## V22-GOAL-010

- **ID:** V22-GOAL-010
- **Prioridade:** P2
- **Título:** Prompt cache no adapter HTTP (se existir)
- **Problema:** Prefixo estável reduz custo sem apagar informação; engine não chama modelo em testes live (`NOT_MEASURED` na pesquisa).
- **Estado atual:** Sem adapter HTTP de produção no freeze V2.1; documentação Anthropic descreve mecanismo (contexto em `docs/research/evolveloop-v2.2/sources.md` apenas).
- **Resultado:** Se adapter próprio existir: prefixo estável antes do breakpoint; retrieval depois; cache hit reportado pelo provedor.
- **Solução:** Aditivo no adapter; não simular cache do IDE Cursor.
- **Dependências:** Adapter real; ausente → adiar com frase explícita.
- **Impacto arquitetural:** Aditivo; segredos fora do prefixo cacheável.
- **Critérios de aceite:** Duas chamadas com mesmo prefixo mostram hit no provedor.
- **Métricas:** Tokens cacheados vs não cacheados `PENDING_BASELINE` ou `NOT_MEASURED` sem adapter.
- **Validação / testes:** Duas chamadas gravadas.
- **Riscos:** Segredo no prefixo cacheado no vendor.
- **Condição de conclusão:** Provedor mostra hit ou item permanece adiado documentado.

**Rotulo dominante:** meta + hipótese pendente.

---

## Fora de escopo (registro D1)

| Item | Classificação V3 / descartar | Rotulo |
|------|------------------------------|--------|
| World Model, Belief/Observation, Agency, Governor, Meta 0 | V3 | hipótese pendente (branch `evolve-v3`) |
| Memory Trust runtime | V3 | hipótese pendente |
| Cost governor, roteamento modelo, long-horizon | V3 | decisão de produto |
| Mem0, Letta, claude-mem, MCP memory como núcleo | descartar | evidência pesquisa |
| `caveman-compress` em contrato/skill/código | descartar | decisão de produto |
| Microsoft GraphRAG, LLMLingua hot path, Repomix default | descartar / monitorar | evidência pesquisa |
| `max_skills` no engine | adiado ADR-DR-0002 | evidência projeto |
