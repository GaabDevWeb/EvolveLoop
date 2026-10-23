# V22-AUDIT-001 — Auditoria de rastreabilidade da release contra as metas V2.2

| Campo | Valor |
|-------|-------|
| **task_id** | V22-AUDIT-001 |
| **Release auditada** | `release/v2.1-freeze-preparation` @ `7ca568fabcaae55c6bed8c34314806dfbb5f1437` |
| **O que esta auditoria não inclui** | PR [#17](https://github.com/GaabDevWeb/EvolveLoop/pull/17) (V22-POST-001) não está neste SHA |
| **Norma** | Critérios do brief V22-AUDIT-001 (metas 001–006, seção 8, seção 9). O pack interno é evidência, não a numeração normativa |
| **Vocabulário da seção 9** | `PASS` · `LIMITED` · `BLOCKED` · `NOT_MEASURED` · `UNAVAILABLE` |

Nenhum critério abaixo foi reexecutado nesta auditoria. A evidência é o arquivo, o teste ou o SHA já versionado. Onde a corrida não está no tree, o status não sobe para `PASS`.

## 1. Confirmação do documento versionado (PR #2)

[PR #2](https://github.com/GaabDevWeb/EvolveLoop/pull/2) está **MERGED** em `release/v2.1-freeze-preparation` (2026-10-22, título `docs(v2.2): metas oficiais, pesquisa versionada e validador`).

O que o PR versionou:

| Caminho | Papel no PR |
|---------|-------------|
| `docs/research/evolveloop-v2.2/` | Dossiê de pesquisa. `09-v2.2-proposed-scope.md` diz, na primeira linha útil, que é proposta e não ADR |
| `docs/architecture/v2.2/EVOLVELOOP_V2.2_GOALS.md` | Autointitulado «Metas oficiais (produto)», IDs `V22-GOAL-001` … `010` |
| `docs/architecture/v2.2/TRACEABILITY-MATRIX.md` | Matriz interna |
| `docs/architecture/v2.2/BENCHMARK-PLAN.md` | Plano de bench |
| `docs/architecture/v2.2/TECH-DECISIONS-MATRIX.md` | Matriz de decisão |
| `docs/architecture/v2.2/IMPLEMENTATION-ROADMAP.md` | Fases F0–F7 |
| `docs/architecture/v2.2/CONSOLIDATION-REPORT.md` | Relatório posterior (o texto atual na release é o de `V22-FINAL-verify-2`, não o ficheiro curto do PR #2) |
| `docs/research/evolveloop-v2.2/01-current-state-audit.md` | Auditoria de estado presa a `28ab56ce` |

Não há, nesse PR nem no tree `7ca568f`, um ficheiro cuja seção 8 liste os sete entregáveis com esses nomes nem uma seção 9 que feche critérios com `PASS` / `LIMITED` / `BLOCKED` / `NOT_MEASURED` / `UNAVAILABLE`. O brief desta tarefa é a norma que faltava no tree. O pack interno usa outra numeração e outro vocabulário (`ENTREGUE_CI`, `FIXTURE_PROVA`, `FLAG_OPT_IN`, `PENDING_BASELINE`).

## 2. Reconciliação da numeração

| ID no brief Gaab | O que o brief pede | ID interno que o nome sugere | O que o ID interno é de fato |
|------------------|--------------------|------------------------------|------------------------------|
| GOAL-001 | Contexto persistente e recuperação | 001 | ADR de ownership. Working context é **descartável** (`docs/adr/0013-context-ownership-working-context.md`). A recuperação de job está no interno **004** |
| GOAL-002 | Redução mensurável de tokens vs V2, com as seis tarefas | 002 | Cerca de fonte de verdade (`truth-source`). Tokens estão no interno **003**, no **006** (orçamento) e, em parte, no **009**/**010** |
| GOAL-003 | Integridade, proveniência, obsolescência, conflito | 003 | Harness B0/B1. Proveniência e conflito código/wiki estão no interno **002**. Stale de índice está no fixture da wiki e no interno **005** |
| GOAL-004 | Handoff medido | 004 | Continuidade de sessão (checkpoint + memória de feature), não um bench de handoff |
| GOAL-005 | Adoção ou rejeição rastreável de ferramentas | 005 | Wiki operacional (vault + `.ai/`) |
| GOAL-006 | Benchmarks com config, modelo, repetições, limitações | 006 | Orçamento de contexto por spawn. O plano de bench é o interno **003** + `BENCHMARK-PLAN.md` |
| (sem ID no brief) | — | 007 | Canário de segredo na evidência |
| (sem ID no brief) | — | 008 | Graphify, flag default OFF |
| (sem ID no brief) | — | 009 | Brevidade Caveman, flag default OFF |
| (sem ID no brief) | — | 010 | Prefixo de prompt cache; hit HTTP de vendor `NOT_MEASURED` |

`CONSOLIDATION-REPORT.md` marca os internos 001–007 como `ENTREGUE_CI`. Esse rótulo não é `PASS` da seção 9 e não fecha os critérios do brief.

## 3. Critérios do brief

### GOAL-001 — contexto persistente e recuperação

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Working context sobrevive como SSOT entre chamadas | `LIMITED` | ADR-0013, decisão 1 e pergunta 1: o payload da chamada é descartável; não tem store próprio. Teste `orchestrator/tests/unit/context-ownership.test.ts` («ADR responde 9 perguntas») | O brief pede contexto persistente. O contrato aceito faz o contrário de propósito para o working context |
| Recuperação de trabalho entre processos | `PASS` | `orchestrator/tests/integration/v22-session-continuity.integration.test.ts` («resumes in a new process without redoing completed external jobs»; «rejects tampered checkpoint on resume»). Checkpoint HMAC em `orchestrator/src/jobs/checkpoint.ts` | Não recupera o prompt bruto. Recupera job, evidência e `next_action` |
| Memória episódica no perfil público | `LIMITED` | `profiles/default.yaml` com `memory.enabled: false` (citado na matriz e em `01-current-state-audit.md`). Skill `wiki-mem` existe; hooks públicos de `wiki-mem` não estão no perfil default | Retomada episódica é opt-in. Não há corrida versionada de `/mem` no tree |

Status do objetivo: **`LIMITED`**. Há recuperação de job. Não há contexto de trabalho persistente, e a memória episódica pública está desligada.

### GOAL-002 — redução mensurável de tokens vs V2

As seis tarefas exigidas (curta, projeto grande, retomada, delegada, fontes conflitantes, restrições sob compactação/handoff), com repetições e dispersão, **não existem** como conjunto congelado. `tasks-real-frozen.json` / `tasks-held-out-frozen.json` são outro desenho (R01–R06, H07–H24).

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Tokens de entrada separados, vs uma linha de base V2 | `NOT_MEASURED` | O manifest oficial publica mediana de tokens de **retrieval** (não de uma sessão de agente V2 vs V2.2): `OFFICIAL-MANIFEST.json` `tree_sha` `88f6b643` (ancestral de `7ca568f`, não a ponta). Dev: B0 21283.5 vs B1 20462.5. Teste: B0 20098.5 vs B1 **21531.0** (B1 sobe) | Não é redução uniforme. Não é o par entrada/saída/cache de uma tarefa de agente. Não está medido na ponta `7ca568f` |
| Tokens de saída separados | `NOT_MEASURED` | `raw/battery-real/**` grava `output_tokens: 0`. No sintético (`PROVISIONAL_SYNTHETIC`, não gate) o valor é constante `24` | Saída de modelo não foi medida no braço oficial |
| Cache separado (leitura e escrita) | `NOT_MEASURED` | `orchestrator/src/v22/measure-prompt-cache-prefix.ts` fixa `vendor_http_cache_hit` em `NOT_MEASURED`. `vendor-cache-adapter.integration.test.ts`: live probe `NOT_MEASURED` sem API key. Fixture de parse não é hit real | Sem credencial de vendor no tree, e o CI não pode tê-la |
| Custo | `NOT_MEASURED` | `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` manda `NOT_MEASURED` se o provedor não devolver moeda. Nenhum raw oficial traz custo | — |
| Latência | `LIMITED` | Manifest: latência de retrieval. Teste H19–H24, B1 mediana 1653.5 ms vs B0 86.5 ms (B1 mais lento). Duas reconstruções (`run-01`, `run-02`) com o mesmo recall | Latência de sessão de modelo, não. Dispersão (desvio, intervalo) não publicada |
| Releituras | `LIMITED` | `orchestrator/tests/unit/context-budget.test.ts` («dedup path já em evidência»). Não há contagem de releitura nas seis tarefas | O teste é de orçamento em laboratório, não do protocolo do brief |
| Seis tarefas com repetições e dispersão | `NOT_MEASURED` | Plano 08 tem 12 cenários diferentes. `08-benchmarks-and-test-plan.md` pede ≥5 repetições se o modelo não for determinístico. O manifest tem 2 runs de rebuild, recall idêntico, sem dispersão | As seis tarefas do brief não foram escritas nem corridas |
| Restrições sob compactação | `UNAVAILABLE` | ADR-0013: «Compaction engine: **NOT_IMPLEMENTED**». `compaction-contract.ts` é fail-closed; não há condenser | Não existe o mecanismo cuja fidelidade se pediu para medir |
| Redução vs V2 como afirmação de produto | `NOT_MEASURED` | Números adjacentes acima não fecham entrada, saída, cache, custo e as seis tarefas | Qualquer frase «a V2.2 gasta menos» no material interno não satisfaz este critério |

Status do objetivo: **`NOT_MEASURED`**.

### GOAL-003 — integridade, proveniência, obsolescência, conflito

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Item sem proveniência não entra | `PASS` | `orchestrator/tests/unit/knowledge/truth-source-fence.test.ts`: «rejects items without provenance»; «rejects atual .ai page without source»; «atual page without source cannot stay atual» | Cerca no engine. O host Cursor continua fora do contrato testado (`CONSOLIDATION-REPORT.md`, pendência «Host Cursor IDE») |
| Página obsoleta não é injetada | `PASS` | O mesmo ficheiro: «obsolete .ai/ pages are not injected» | — |
| Conflito código vs wiki | `PASS` | O mesmo ficheiro: «code divergent from wiki: wiki marked superseded» | Não é o cenário 6 / braço B1s do plano 08 (página errada de propósito, com repetições). Esse braço não tem raw |
| Isolamento entre projetos (canário) | `PASS` | O mesmo ficheiro: «scenario 12 — zero cross-project canary leakage»; «scoped graph cache paths differ per project root» | Fixture de unidade, não dois repositórios no host |
| Índice marca fonte stale | `LIMITED` | `fixtures/evolveloop-wiki-vault/tests/test_index.py`: `test_stale_after_source_change`, `test_search_returns_provenance`. Runbook `docs/architecture/v2.2/WIKI-OPS-RUNBOOK.md` | O pytest do vault **não** entra no workflow de CI da release em `7ca568f` (não há `.github/workflows` nesse SHA). Motor oficial com Ollama é pré-requisito externo |
| Cenário de fontes conflitantes com repetição | `NOT_MEASURED` | `08-benchmarks-and-test-plan.md` cenário 6 e braço B1s. Sem diretório de raw B1s | A cerca unitária não substitui o bench |

Status do objetivo: **`LIMITED`**. O mecanismo de cerca está testado. O bench de conflito e a prova no host não.

### GOAL-004 — handoff medido

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Handoff preserva restrição (DoD) numa corrida de laboratório | `PASS` | `orchestrator/tests/integration/context-budget-pickup.test.ts`: «pickup respects budget, preserves DoD verbatim, records ContextBudget evidence». `context-budget.test.ts`: classes protegidas não truncadas no meio | Uma corrida determinística. Sem N, sem dispersão |
| Handoff medido (entrada, saída, fidelidade, repetições, dispersão) | `NOT_MEASURED` | `measure-pickup-prompts.ts` mede tamanho de prompt de pickup com tokenizer proxy ou tiktoken no processo de bench de **brevidade** (interno 009), flag `EVOLVELOOP_BREVITY_CAVEMAN` default OFF | Isso não é um estudo de handoff entre agentes. Não há desvio publicado |
| Handoff sob compactação | `UNAVAILABLE` | Mesma ausência de condenser do GOAL-002 | — |

Status do objetivo: **`NOT_MEASURED`**. Há um teste de preservação de DoD. Não há medição de handoff no sentido do brief.

### GOAL-005 — adoção ou rejeição rastreável de ferramentas

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Rejeições nomeadas com motivo | `LIMITED` | `TECH-DECISIONS-MATRIX.md` TD-01…TD-14. Fora de escopo em `EVOLVELOOP_V2.2_GOALS.md` (Mem0, Letta, claude-mem, GraphRAG, LLMLingua, Repomix, `caveman-compress`, Serena no core MIT). Pesquisa `03-repositories-and-tools.md` | Várias rejeições são de leitura de upstream em 2026-10-21, sem experimento local com config, modelo e repetição |
| Graphify: decisão depois de medição, default OFF | `LIMITED` | ADR-0014: integrar atrás de `EVOLVELOOP_GRAPHIFY`, default OFF, sem mudar `KnowledgeBackendId`. Raw `battery-b3-graphify/`. Testes `v22-graphify-adapter.test.ts` (flag off → stub) | Não é adoção de produção. O bench não é as seis tarefas do brief. Numeração interna 008 |
| Caveman / cache de vendor | `NOT_MEASURED` como adoção | Flags default OFF. Hit de vendor `NOT_MEASURED` (interno 010). Compressão de arquivo descartada por D1 | Não há decisão «adotar» com números de saída de provedor |
| Registro único por ferramenta (config, modelo, repetição, limitação, decisão) | `LIMITED` | A matriz técnica existe e aponta ficheiros. Não há um registo por ferramenta nesse formato | O interno 005 (wiki) não é este critério |

Status do objetivo: **`LIMITED`**. Dá para seguir uma rejeição ou a flag do Graphify até um documento. Não dá para auditar cada ferramenta com o mesmo protocolo de bench.

### GOAL-006 — benchmarks com config, modelo, repetições, limitações

| Critério | Status | Evidência | Lacuna |
|----------|--------|-----------|--------|
| Config publicada | `PASS` | `OFFICIAL-MANIFEST.json`: `harness_version` `v22-ground-b1-harness-1.5.0`, `bench_env` (45 paths, 22000 tokens, tokenizer `tiktoken`, scorer `v22-anchor-scorer-1.0.0`, modo `file_evidence`), comando `run-official-wiki-hybrid-bench.sh` | A config é do retrieval híbrido, não das seis tarefas |
| Modelo identificado | `LIMITED` | `ollama_embedding_model`: `nomic-embed-text`. `karpathy_wiki_sha_label`: `cd3cf08` | Não há id de modelo generativo. LLM ao vivo está `NOT_MEASURED` em `BENCHMARK-PLAN.md` |
| Repetições | `LIMITED` | `run-01` e `run-02` no manifest, recall igual. Plano 08 pede ≥5 se não determinístico | Duas reconstruções de índice não são cinco corridas de modelo |
| Limitações escritas | `PASS` | `BENCHMARK-PLAN.md` separa `PROVISIONAL_SYNTHETIC`, `PROVISIONAL_CURATED_PACK` (recall circular, não gate), `FIXTURE_WIKI_GROUND`, `OFFICIAL_WIKI_GROUND`, `NOT_MEASURED`. Manifest `tree_sha` `88f6b643` ≠ ponta `7ca568f`. Ollama é obrigatório para repetir B1 live | A ponta da release não reexecutou o manifest |
| Dispersão | `NOT_MEASURED` | Os dois runs coincidem no recall e nas medianas de tokens; não há desvio, intervalo nem N pré-registrado de modelo | Estabilidade de dois rebuilds não é dispersão |

Status do objetivo: **`LIMITED`**.

## 4. Seção 8 — sete entregáveis

| # | Entregável exigido | Onde está no tree `7ca568f` | Status | Lacuna |
|---|--------------------|------------------------------|--------|--------|
| 1 | Metas | `docs/architecture/v2.2/EVOLVELOOP_V2.2_GOALS.md` | `LIMITED` | Existem 10 metas internas. Não são as 6 do brief |
| 2 | Matriz de rastreabilidade | `docs/architecture/v2.2/TRACEABILITY-MATRIX.md` | `LIMITED` | Rastreia os IDs internos. Não rastreia os critérios deste brief |
| 3 | Auditoria de estado | `docs/research/evolveloop-v2.2/01-current-state-audit.md` | `LIMITED` | Tree citado: `28ab56ce` (2026-10-11). O texto diz que a implementação V2.2 não foi iniciada. Isso é falso para `7ca568f` e não deve ser reescrito por cima: é o snapshot da pesquisa |
| 4 | Plano de benchmark | `docs/architecture/v2.2/BENCHMARK-PLAN.md` e `docs/research/evolveloop-v2.2/08-benchmarks-and-test-plan.md` | `LIMITED` | Plano real, com classes de evidência. Não contém as seis tarefas nem dispersão |
| 5 | Matriz de decisão | `docs/architecture/v2.2/TECH-DECISIONS-MATRIX.md` | `PASS` | TD-01…TD-14 com alternativa, evidência e meta interna. Não usa o vocabulário da seção 9; isso não anula a existência da matriz |
| 6 | Plano incremental com rollback | `docs/architecture/v2.2/IMPLEMENTATION-ROADMAP.md` | `LIMITED` | Fases F0–F7 e DAG. A palavra rollback não aparece. Reversibilidade só no ADR-0013 («Novo ADR ou rejeição explícita») e em flags default OFF |
| 7 | Relatório final | `docs/architecture/v2.2/CONSOLIDATION-REPORT.md` | `LIMITED` | Existe. Cita tip `b127bae` na secção de verificação; a release está em `7ca568f`. Fecha internos com `ENTREGUE_CI`, que não é o conjunto da seção 9 |

Nenhum dos sete falta como ficheiro. Nenhum, exceto a matriz de decisão, fecha o entregável no sentido do brief.

## 5. Seção 9 — condições de conclusão

O pack não classifica cada critério com `PASS` / `LIMITED` / `BLOCKED` / `NOT_MEASURED` / `UNAVAILABLE`.

| Rótulo da seção 9 | Uso no pack interno em `7ca568f` |
|-------------------|-----------------------------------|
| `PASS` | Não é o rótulo de fecho. `ENTREGUE_CI` foi usado no lugar, com outro significado |
| `LIMITED` | Ausente |
| `BLOCKED` | Ausente como fecho de meta. Há notas de dependência (B1 oficial dependia de wiki; isso depois ganhou manifest) |
| `NOT_MEASURED` | Usado para LLM ao vivo, hit de cache de vendor e vários alvos da pesquisa |
| `UNAVAILABLE` | Não é rótulo de fecho. O código usa `WIKI_UNAVAILABLE` / `RAG_REPO_MISSING` como erro de runtime, não como condição de meta |

Status deste requisito: **`LIMITED`**. O rótulo `NOT_MEASURED` já é honesto em vários sítios. O resto do vocabulário não foi aplicado, e `ENTREGUE_CI` nos internos 001–007 lê-se como conclusão onde o brief ainda está `LIMITED`, `NOT_MEASURED` ou `UNAVAILABLE`.

## 6. Critérios de aceite do pack interno (para não os misturar)

Isto julga a frase «Critérios de aceite» de `EVOLVELOOP_V2.2_GOALS.md`, não o brief.

| ID interno | Critério escrito | Status | Evidência | Lacuna |
|------------|------------------|--------|-----------|--------|
| 001 | 9 perguntas respondidas; Knowledge ≠ Memory ≠ Checkpoint; working context descartável | `PASS` | ADR-0013 tabela «Nove perguntas»; `context-ownership.test.ts` | Compaction continua `NOT_IMPLEMENTED`, e o próprio critério não a exige |
| 002 | Canário A ausente de B; página sem fonte não fica `atual`; código divergente não se «corrige» só na wiki | `PASS` | `truth-source-fence.test.ts` | Host Cursor não coberto |
| 003 | Raw com tokens de entrada/saída, paths, verificador, SHA, id de modelo; integridade do scorer | `LIMITED` | Manifest oficial (entrada, paths, SHA `88f6b643`, embedding, scorer). `output_tokens: 0` em `battery-real` | Saída e modelo generativo em falta. SHA do manifest não é a ponta |
| 004 | Cenário 3 acerta retomada; cenário 7 cita página/ADR/código | `LIMITED` | Teste de integração retoma job noutro processo. Raw `battery-real/continuity/S03` e `S07` com `output_tokens: 0`, classe `PROVISIONAL_CURATED_PACK` (o plano diz que não é gate) | Citação de página/ADR no cenário 7 não está provada fora do pack circular |
| 005 | Cenários 2, 3, 6 e 7; quatro workflows com corrida registrada | `LIMITED` | `WIKI-OPS-RUNBOOK.md` descreve init/query/update/lint. Manifest híbrido é corrida de retrieval | `memory/V22-GOAL-005-wiki/evidence/knowledge-generate.log` não está no tree (`memory/` está no `.gitignore`). Cenário 6 (wiki errada) sem raw |
| 006 | Cenário 10: orçamento não perde verificador nem relê canário | `PASS` | `context-budget.test.ts` e `context-budget-pickup.test.ts`; `npm run test:bench` cobre R01–R06 e H07–H18 em `bench-budget-nocirc.bench.test.ts` (18 testes no ficheiro) | Alvos numéricos de token do cenário continuam calibrados noutro harness, não neste teste |
| 007 | Zero ocorrências do canário na evidência publicada | `PASS` | `secret-redaction.test.ts`; integração `v22-wire.integration.test.ts` (GOAL-007 no nome do caso) | — |
| 008 | Cenários 5 e 11; aresta EXTRACTED ou INFERRED; vitória definida no plano | `LIMITED` | ADR-0014 e raw B3 (recall dev 7/9/9 e teste 4/5/6 para B0/B1/B3, no relatório de consolidação). Flag default OFF | Cenários 5 e 11 do plano 08 não são o held-out H07–H24. «Vitória» de recall no teste (6/6 vs B1 5/6) não é adoção |
| 009 | Verificador estável e negações do gabarito preservadas | `LIMITED` | Flag default OFF. `v22-p2-goals.integration.test.ts`: com flags off o pickup não muda. Medição de prompt é fixture | Não há decisão com números de saída de provedor, que é a condição de conclusão escrita na mesma meta |
| 010 | Duas chamadas com o mesmo prefixo mostram hit no provedor | `NOT_MEASURED` | Prefixo estável em fixture (`measure-prompt-cache-prefix.ts`). Live: `NOT_MEASURED` sem chave. Teste de telemetria usa resposta gravada, não o provedor | A condição de conclusão admite adiar com essa frase. Está adiado |

## 7. Lacunas P0

Ordem: o que impede afirmar a V2.2 do brief. Cada plano é uma tarefa pequena. Nenhuma foi implementada aqui.

### P0-1 — Congelar as seis tarefas e o esquema de métricas

**Por quê.** Sem este conjunto, GOAL-002 não pode sair de `NOT_MEASURED`.

**Tarefa.** Criar seis cartões versionados (curta, projeto grande, retomada, delegada, fontes conflitantes, restrições sob compactação/handoff) com campos obrigatórios: `input_tokens`, `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost` ou `NOT_MEASURED`, `latency_ms`, `reread_count`, `n`, dispersão (desvio ou intervalo), `model_id`, `tree_sha`, limitação. Braços: linha de base V2 e braço V2.2, mesmo verificador. O cartão de compactação fica `UNAVAILABLE` enquanto `compaction-contract.ts` disser que o condenser não existe — não construir o condenser nesta tarefa.

**Aceite.** Os seis cartões estão no tree; nenhum campo obrigatório falta; nenhum percentual vira gate antes dos dois braços existirem.

**Fora.** Não chamar modelo. Não ligar `EVOLVELOOP_GRAPHIFY`. Não pôr API key no repositório.

### P0-2 — Aplicar a seção 9 ao relatório que a release trata como final

**Por quê.** `ENTREGUE_CI` nos internos 001–007 é lido como conclusão. A seção 9 não permite esse atalho.

**Tarefa.** Acrescentar ao `CONSOLIDATION-REPORT.md` (ou a um sucessor citado por ele) uma tabela com o mesmo grão da seção 3 deste ficheiro, rótulos só da seção 9, SHA `7ca568f`. Não apagar o histórico `ENTREGUE_CI`; rotulá-lo como vocabulário interno.

**Aceite.** Cada critério do brief tem um rótulo da seção 9 e um path. `ENTREGUE_CI` deixa de aparecer sem a frase que o distingue de `PASS`.

**Fora.** Não mudar runtime nem testes.

### P0-3 — Auditoria de estado da ponta, sem reescrever o dossiê de outubro

**Por quê.** `01-current-state-audit.md` descreve `28ab56ce` e «implementação não iniciada». Usá-lo como estado da release é falso.

**Tarefa.** Novo ficheiro de estado preso a `7ca568f`, com uma linha no topo de `01-current-state-audit.md` a apontar o snapshot antigo e o ficheiro novo. Não alterar o corpo do dossiê.

**Aceite.** O ficheiro novo lista o que existe no SHA (ADR-0013, fence, session-continuity, manifest, flags OFF) e o que continua `NOT_MEASURED` / `UNAVAILABLE`. O corpo de `01-` permanece o texto de 2026-10-21.

**Fora.** Não «atualizar» números de bench dentro do dossiê histórico.

### P0-4 — Rollback no plano incremental

**Por quê.** A seção 8 pede plano incremental **com rollback**. `IMPLEMENTATION-ROADMAP.md` não tem.

**Tarefa.** Uma subsecção por fase F1–F7: o que reverter (intervalo de commits ou flag), como provar que voltou (teste ou ausência da env), o que a reversão não desfaz (raw de bench já publicado). Seguir o padrão de reversibilidade do ADR-0013.

**Aceite.** Cada fase tem rollback acionável sem novo subsistema. Nenhuma fase manda apagar `raw/` de evidência.

**Fora.** Não reverter código nesta tarefa.

### P0-5 — Uma medição de handoff, de uma corrida, com o resto explícito

**Por quê.** GOAL-004 está `NOT_MEASURED` apesar do teste de DoD.

**Tarefa.** Estender o relatório do teste `context-budget-pickup` (ou um JSON ao lado, gerado pelo teste que já existe) com: tokens de entrada do briefing, lista de restrições que tinham de sobreviver, se sobreviveram, `n=1`, dispersão `NOT_MEASURED`, compactação `UNAVAILABLE`. Não inventar N.

**Aceite.** O JSON existe, o teste continua verde, e o ficheiro não diz `PASS` para dispersão nem para compactação.

**Fora.** Não criar um novo harness de modelo. Não ligar Caveman por default.

### P0-6 — Não medir compactação que não existe

**Por quê.** O sexto cenário do GOAL-002 e o handoff sob compactação estão `UNAVAILABLE`, não «quase medidos».

**Tarefa.** No cartão P0-1 correspondente, citar `orchestrator/src/context/compaction-contract.ts` e o teste «contrato compaction/reinject fail-closed». O próximo passo, quando houver condenser, é um teste que falha se uma negação, um path ou um DoD sumir. Até lá o rótulo permanece `UNAVAILABLE`.

**Aceite.** O cartão não tem número de token de compactação. Não aparece `PENDING_BASELINE` no lugar de `UNAVAILABLE`.

**Fora.** Não implementar condenser, sumarizador nem reinject.

## 8. O que não é P0

- Hit HTTP de vendor: já está `NOT_MEASURED` no código e no interno 010. Não é lacuna escondida.
- Graphify em produção: flag OFF e ADR-0014. Não promover.
- PR #17 (install de `wiki` / `wiki-mem` e CI): fora deste SHA. Não entra nesta auditoria.
- Branch `evolve-v3`: a pesquisa marca como hipótese. Continua fora do tree.

## 9. Fecho

A release `7ca568f` tem o pack do PR #2 e bastante runtime posterior. Contra o brief, nenhum objetivo 001–006 está `PASS`. O mais próximo de fechado é a cerca de proveniência (partes do GOAL-003) e a recuperação de job (parte do GOAL-001). A redução de tokens vs V2, no formato exigido, não foi medida. Compactação não existe, logo não há como medi-la.
