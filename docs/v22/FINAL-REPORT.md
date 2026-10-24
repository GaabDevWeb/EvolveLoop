# Relatório final — seção 9

| Campo | Valor |
|-------|-------|
| **task_id** | V22-GAP-P0-2 |
| **Norma** | `docs/v22/GOALS-OFFICIAL.md` seções 8 e 9 |
| **Base da release** | `f611780` (merge do PR #19) |
| **Baseline citada** | `docs/v22/baseline/raw/p0-baseline-report.json` |
| **Handoff citado** | `docs/v22/baseline/raw/p0-handoff-report.json` |
| **Auditoria antiga** | `docs/v22/TRACEABILITY-AUDIT.md` contra `7ca568f`. Não foi reescrita |

`ENTREGUE_CI` em `docs/architecture/v2.2/CONSOLIDATION-REPORT.md` é vocabulário interno de CI verde. Não é `PASS`. Os números da baseline e do handoff estão nos JSON. Este texto não os copia: o `tree_sha` dentro de cada JSON é o commit medido.

Nenhum objetivo 001–006 fica `PASS`. O que mudou desde a auditoria de `7ca568f` é a baseline P0 (entrada determinística das seis tarefas) e a medição de handoff P0-5.

## GOAL-001 — contexto persistente e recuperação

Estado: **`LIMITED`**.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Working context persistente ou contrato que o declara descartável | `LIMITED` | ADR-0013 decisão 1 e pergunta 1: o payload da chamada é descartável e a retomada lê checkpoint, memory e páginas `.ai/`. Teste `orchestrator/tests/unit/context-ownership.test.ts` | O brief pede contexto persistente. O contrato aceito faz o contrário de propósito para o working context |
| Recuperação entre processos e checkpoint adulterado | `PASS` | `orchestrator/tests/integration/v22-session-continuity.integration.test.ts` retoma noutro processo e rejeita checkpoint adulterado | Não recupera o prompt bruto |
| Memória episódica | `LIMITED` | `profiles/default.yaml` `memory.enabled: false` | Opt-in. Não há corrida versionada de memória episódica |

## GOAL-002 — redução mensurável de tokens face a V2

Estado: **`LIMITED`**. A auditoria em `7ca568f` dizia `NOT_MEASURED` porque as seis tarefas não existiam. A baseline P0 mediu a entrada. Isso não fecha saída, cache, custo nem a frase de produto.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Entrada, dois braços, mesmo verificador, seis tarefas | `PASS` | JSON da baseline. B0 = leitura `rg` até 45 paths. V2.2 = pickup com budget 22000. Tokenizer `tiktoken:cl100k_base`. `n=3`. Dispersão de entrada 0, declarada `zero_expected_deterministic` | Não é modelo generativo |
| Economia de entrada | `PASS` | Seção 5.3: só conta quando a qualidade V2.2 ≥ B0. O JSON traz `deterministic_context_savings_status` por tarefa | Não autoriza percentual de produto |
| Saída | `NOT_MEASURED` | Campo `output_tokens` no JSON | Sem modelo generativo |
| Cache de leitura e de escrita | `NOT_MEASURED` | Campos no JSON. Sem chave de vendor | — |
| Custo | `NOT_MEASURED` | Campo `cost` no JSON | O provedor determinístico não devolve moeda |
| Latência | `LIMITED` | `latency_ms` é tempo de parede do retrieval, estado `LIMITED` | Não é latência de modelo (`model_latency_ms` = `NOT_MEASURED`) |
| Releituras | `PASS` | `reread_count` 0 nos dois braços, dispersão 0 | Contagem determinística, não de sessão de modelo |
| Restrições sob compactação | `LIMITED` | Condenser extrativo em `orchestrator/src/context/extractive-condenser.ts`. Flag `EVOLVELOOP_COMPACTION` default OFF. A corrida default do cartão continua `UNAVAILABLE` (`reinject_allowed: false`). A medição com a flag ligada está em `docs/v22/baseline/raw/p0-compaction-report.json` | Reinject continua recusado. Se a fidelidade das âncoras e restrições cair, a economia dessa corrida fica `NOT_MEASURED` e o JSON regista o trade-off. Saída de modelo `NOT_MEASURED` |
| Frase «a V2.2 gasta menos tokens» | `NOT_MEASURED` | `product_percent_gate` no JSON | Faltam saída, cache e custo |

Híbrido Ollama: `NOT_MEASURED`. Classe do braço V2.2: `PROJECT_WIKI_PICKUP_BUDGET`, não `OFFICIAL_WIKI_GROUND`.

## GOAL-003 — integridade, proveniência, obsolescência e conflito

Estado: **`LIMITED`**.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Item sem proveniência não entra | `PASS` | `orchestrator/tests/unit/knowledge/truth-source-fence.test.ts` | Host Cursor fora do contrato testado |
| Página obsoleta não é injetada | `PASS` | O mesmo teste | — |
| Conflito código vs wiki na cerca | `PASS` | O mesmo teste, código prevalece | — |
| Isolamento entre projetos | `PASS` | O mesmo teste, canário não cruza raiz | Fixture de unidade |
| Índice marca fonte stale | `LIMITED` | `fixtures/evolveloop-wiki-vault/tests/test_index.py` | Esse pytest não é o job de CI da release |
| Fontes conflitantes com repetição | `LIMITED` | Cartão `fontes_conflitantes` da baseline, `n=3`, cerca `code_authority_over_wiki`, marcador stale ausente no V2.2 | Não é o braço B1s com modelo |

## GOAL-004 — handoff medido

Estado: **`LIMITED`**.

O rácio 26,91 do P0-5 saía de `2180 / 81`. O denominador era o checklist `required_resume_payload`, uma sonda de sobrevivência. O método de referência passa a ser o dump dos stores do emissor. O pickup medido fica acima desse dump porque a montagem acrescenta chrome. O runtime não tem uma transcrição de chat fora desses stores.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Restrições sobrevivem no pickup | `PASS` | `orchestrator/tests/integration/context-budget-pickup.test.ts` e o payload de `p0-handoff-report.json` | — |
| Volume transferido vs referência | `LIMITED` | `reference_kind` `sender_complete_context`: briefing, DoD, restrições, decisões, próximo passo, grafo, conhecimento recuperado e evidência do emissor, sem `saved_at`. `transferred_tokens` é o pickup normalizado. `n=3`. O rácio 26,91 do P0-5 dividia o pickup por um checklist de 81 tokens (`required_resume_payload`). Esse checklist continua em `fidelity_checklist_tokens` e não é o denominador. `volume_ratio_status` = `LIMITED` (observação, não gate) | Não é saída de modelo |
| Retomada pelo agente receptor | `PASS` | O receptor faz `loadSessionContinuity` e `applySessionContinuityToMemory` e recupera `run_id`, `node_id` e a decisão. O teste é `orchestrator/tests/unit/v22-p0-handoff.test.ts` | Um handoff, não todos os papéis |
| Saída, cache, custo | `NOT_MEASURED` | Campos no JSON de handoff | Sem modelo e sem chave |
| Compactação no handoff | `LIMITED` | A mesma medição P0-6 na tarefa `restricoes_compactacao_handoff`, flag ligada só nessa corrida. Reinject continua `false` | Não é o hot path. A corrida default do handoff mantém compactação `UNAVAILABLE` |

## GOAL-005 — adoção ou rejeição rastreável de ferramentas

Estado: **`LIMITED`**.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Rejeições com motivo | `LIMITED` | `docs/architecture/v2.2/TECH-DECISIONS-MATRIX.md` | Várias rejeições não têm experimento local com modelo e repetição |
| Graphify | `LIMITED` | ADR-0014, flag `EVOLVELOOP_GRAPHIFY` default OFF | Não é adoção de produção |
| Caveman e cache de vendor | `NOT_MEASURED` | Flags default OFF. Hit de vendor `NOT_MEASURED` | Sem decisão de adotar com números de provedor |
| Um registo por ferramenta no formato do brief | `LIMITED` | A matriz aponta ficheiros | Não há o mesmo protocolo para cada ferramenta |

## GOAL-006 — benchmarks com configuração, modelo, repetições e limitações

Estado: **`LIMITED`**.

| Critério | Estado | Evidência | O que falta |
|----------|--------|-----------|-------------|
| Configuração da baseline | `PASS` | `docs/v22/baseline/tasks.json`: scorer `v22-anchor-scorer-1.0.0`, 45 paths, 22000 tokens, tiktoken | O manifest híbrido continua a ser outra corrida |
| Modelo | `LIMITED` | A baseline determinística usa `deterministic-provider`. A corrida live do CLI registou `model_id` `Auto` | Tokens de saída, cache e custo dessa corrida ficam `NOT_MEASURED` |
| Repetições e dispersão | `LIMITED` | A baseline determinística continua `n=3`, com dispersão 0 de entrada. A corrida live do CLI tem `N=5` e dispersão de latência | Dispersão de tokens do modelo fica `NOT_MEASURED`. Três tarefas ficaram 0/0 nos dois braços |
| Limitações escritas | `PASS` | Campo `limitation` nos dois JSON, com `tree_sha` | — |

## Entregáveis da seção 8

| # | Entregável | Estado | Onde |
|---|------------|--------|------|
| 1 | Metas 001–006 | `PASS` | `docs/v22/GOALS-OFFICIAL.md` |
| 2 | Matriz de rastreabilidade no grão do brief | `LIMITED` | Este relatório. `docs/architecture/v2.2/TRACEABILITY-MATRIX.md` continua nos IDs internos |
| 3 | Auditoria da ponta | `PASS` | `docs/v22/STATE-AUDIT-TIP.md`. O dossiê de outubro não foi reescrito |
| 4 | Plano de benchmark com as seis tarefas | `LIMITED` | `docs/v22/baseline/tasks.json` e a seção 3 de GOALS-OFFICIAL. `docs/architecture/v2.2/BENCHMARK-PLAN.md` continua o plano híbrido |
| 5 | Matriz de decisão | `PASS` | `docs/architecture/v2.2/TECH-DECISIONS-MATRIX.md` |
| 6 | Plano incremental com rollback | `PASS` | `docs/architecture/v2.2/IMPLEMENTATION-ROADMAP.md`, secção Rollback por fase |
| 7 | Relatório final no vocabulário da seção 9 | `PASS` | Este ficheiro. Fechar o relatório não torna os objetivos `PASS` |

## O que continua de fora

P0-6 mede o condenser extrativo numa tarefa, com a flag ligada só nessa corrida. O default continua OFF. Reinject continua `NOT_IMPLEMENTED`. Graphify permanece OFF. Nenhuma chave de vendor entra no tree.

## V22-GAP-VENDOR-1b

A corrida real do `cursor-agent` está em `docs/v22/baseline/raw/p0-vendor-cursor-agent-report.json`. Modelo `Auto`, `N=5`, 62 chamadas, árvore `7b1e67aab8638248e95a9fd42403f470a712d983`. O OpenRouter respondeu HTTP 429 duas vezes. Essa corrida não tem números.

O CLI não publica tokens nem custo. Entrada do provider, saída, cache e custo ficam `NOT_MEASURED`. `duration_ms` é igual a `duration_api_ms` nas 62 chamadas. A doc oficial diz que esses dois campos estão iguais, por isso não separam tempo de ferramenta.

Qualidade por substring, B0 versus V2.2: `curta` 0/0, `retomada` 0/0, `fontes_conflitantes` 0/0, `delegada` 0,5/0,5, `projeto_grande` 1/1. Em `restricoes_compactacao_handoff` o B0 ficou 0,667 nas cinco repetições e o V2.2 ficou 0,533. Quatro respostas V2.2 repetiram 0,667. A quinta ficou 0 e perdeu `reinject_allowed: false`. As âncoras do cartão não foram alteradas.

A latência média do V2.2, com prompt local menor, foi 2,99× em `projeto_grande`, 2,74× em `fontes_conflitantes`, 2,53× em `restricoes_compactacao_handoff` e 4,14× em `retomada`. `curta` e `delegada` não ficaram mais lentas.

O stream-json dessa corrida não foi guardado. O JSON parseado não tem eventos `tool_call`, então a contagem por braço fica `NOT_MEASURED`. O prompt V2.2, com o mesmo sha256 da corrida, pede leitura de `.cursor/skills/orquestrar/SKILL.md` e do repositório. O modo ask pesquisa o código. Isso pode alongar a chamada. Não é uma contagem de ferramentas.

A restrição `reinject_allowed: false` está no contexto V2.2 quatro vezes, num prompt de 22062 tokens: slice `spawn://security_restrictions` no token 671, `docs/architecture/v2.2/IMPLEMENTATION-ROADMAP.md` no token 9159, `docs/adr/0013-context-ownership-working-context.md` no token 13022 e `docs/v22/GOALS-OFFICIAL.md` no token 19493. A frase não foi cortada. A quinta resposta é que não a repetiu.

O critério semântico para um juiz está em `docs/v22/VENDOR-MEASURE.md`. Não foi executado.

Esta seção entra no corpus de `retomada` e sobe a pontuação de retrieval de `restricoes_compactacao_handoff`. O JSON de compactação foi remensurado por causa disso. Os paths e os tokens da corrida live do CLI não mudam: o sha256 do prompt continua o da árvore `7b1e67a`.
