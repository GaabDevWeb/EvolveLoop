# Metas oficiais V2.2 — brief Gaab

| Campo | Valor |
|-------|-------|
| **Documento** | Norma versionada do brief usado em V22-AUDIT-001 |
| **task_id desta versão** | V22-GAP-P0-1 |
| **O que as seções 2–9 são** | O brief (objetivos 001–006, sete entregáveis, vocabulário de fecho). Esse texto não estava num ficheiro do PR #2 |
| **O que a seção 10 é** | Tabela de mapeamento para os IDs internos, pedida ao versionar este ficheiro. Não é um objetivo de produto extra |
| **Pack interno, outra numeração** | `docs/architecture/v2.2/EVOLVELOOP_V2.2_GOALS.md` |
| **Julgamento da release** | `docs/v22/TRACEABILITY-AUDIT.md` (escrito contra `7ca568f`, antes do merge do PR #17). Este ficheiro não repete nem atualiza esses rótulos |

## 1. Escopo e norma

Esta norma pede seis objetivos de produto, sete entregáveis e um vocabulário fechado de conclusão. O pack interno (`V22-GOAL-001` … `010`) é evidência de engenharia. Não substitui esta numeração e não herda o significado destes objetivos só porque o número coincide.

Regras de leitura:

- Um rótulo interno (`ENTREGUE_CI`, `FIXTURE_PROVA`, `FLAG_OPT_IN`, `PENDING_BASELINE`) não fecha um critério desta norma.
- Onde a grandeza pedida não foi medida, o estado é `NOT_MEASURED`.
- Onde o mecanismo que a medição pressupõe não existe, o estado é `UNAVAILABLE`. Não se publica um número no lugar desse estado.
- Nenhum alvo percentual de redução de tokens é gate de produto enquanto a medição não tiver, nos dois braços, as grandezas que o GOAL-002 separa (entrada, saída, cache e custo). Existirem dois braços de contexto determinístico não autoriza esse percentual.

## 2. GOAL-001 — contexto persistente e recuperação

O produto recupera trabalho entre chamadas e entre processos.

Critérios:

1. Contexto de trabalho persistente: o que a chamada ao modelo usou continua recuperável como fonte, ou o contrato declara de forma explícita que esse contexto é descartável e qual store o substitui na retomada.
2. Recuperação entre processos: um trabalho interrompido retoma sem repetir o que já ficou provado (job, evidência, próximo passo), e um checkpoint adulterado não é aceite.
3. Memória episódica: se o perfil público a oferecer, a retomada por essa memória é demonstrável; se estiver desligada, isso fica declarado e não conta como recuperação episódica.

Este objetivo não se confunde com o ID interno 001, que é o ADR de ownership.

## 3. GOAL-002 — redução mensurável de tokens face a V2

A V2.2 só afirma redução de tokens face à V2 com uma medição, não com um proxy de outra corrida.

### 3.1 Grandezas, separadas

Cada braço (linha de base V2 e braço V2.2), na mesma tarefa e com o mesmo verificador, regista:

| Campo | O que é |
|-------|---------|
| `input_tokens` | Tokens de entrada do contexto montado para a tarefa |
| `output_tokens` | Tokens de saída do modelo, separados da entrada |
| `cache_read_tokens` | Tokens servidos por cache de leitura |
| `cache_write_tokens` | Tokens escritos em cache |
| `cost` | Custo devolvido pelo provedor, na moeda que ele reportar |
| `latency_ms` | Latência da corrida |
| `reread_count` | Vezes em que o mesmo path volta a entrar no contexto montado |
| `n` | Número de repetições |
| `dispersion` | Desvio-padrão amostral ou intervalo, por grandeza medida |
| `model_id` | Identificador do modelo ou do provedor que realmente correu |
| `tree_sha` | SHA da árvore em que a corrida foi feita |
| `limitation` | O que esta corrida não prova |

Entrada, saída e cache não se somam num único «tokens». Custo ausente fica `NOT_MEASURED`; não se estima tarifa.

### 3.2 Seis tarefas de baseline

O conjunto congelado, e só este conjunto, satisfaz a lista do brief:

| id | Nome no brief |
|----|----------------|
| `curta` | Tarefa curta |
| `projeto_grande` | Projeto grande |
| `retomada` | Retomada |
| `delegada` | Delegada |
| `fontes_conflitantes` | Fontes conflitantes |
| `restricoes_compactacao_handoff` | Restrições sob compactação/handoff |

Cartões: `docs/v22/baseline/tasks.json`. Esquema das grandezas: `docs/v22/baseline/metrics.schema.json`. Harness: `orchestrator/src/v22/p0-baseline-harness.ts`.

Cada tarefa declara âncoras, restrições e, quando cabe, marcador de retomada ou par de conflito. Os dois braços usam esse verificador. O braço `B0` é a linha de base V2 desta baseline: lê os hits e não aplica orçamento nem cerca. Não é o retrieval híbrido publicado noutro manifest.

### 3.3 Repetições e dispersão

`n` mínimo desta baseline: 3. Para cada grandeza numérica medida, `dispersion` é o desvio-padrão amostral (divisor `n - 1`). Grandeza não medida leva `dispersion` = `NOT_MEASURED`, não um desvio inventado.

Com o provedor determinístico e o corpus congelado, a dispersão de `input_tokens` e de `reread_count` é 0 (`zero_expected_deterministic`). Isso é o resultado esperado dessa corrida, não uma prova de estabilidade de modelo. A dispersão de `latency_ms` pode ser maior que zero porque a montagem lê disco (`retrieval_io_jitter`). A dispersão de um modelo não determinístico continua `NOT_MEASURED`. O plano de investigação pede pelo menos 5 repetições quando o modelo não é determinístico; `n = 3` neste provider não cumpre essa exigência.

### 3.4 O que esta baseline pode e não pode afirmar

O pacote medido em `input_tokens` é o contexto efetivamente montado. No B0 isso é a leitura ampla dos hits de `rg` no corpus oficial (monorepo, teto de 45 paths, o mesmo cap do harness B0). No V2.2 é o pickup/handoff real mais o retrieval de wiki de projeto e de paths, com o budget do scorer canônico `v22-anchor-scorer-1.0.0` (`file_evidence`, `V22_BENCH_MAX_INPUT_TOKENS` 22000, `V22_BENCH_MAX_PATHS` 45). O híbrido com Ollama não corre neste harness e fica `NOT_MEASURED`.

O tokenizer da medição é `tiktoken:cl100k_base`. Se o contador cair no proxy de espaços, a medição falha. Não se publica esse proxy como número.

A economia desse delta só conta na condição da seção 5.3. Classe de evidência, quando conta: `MEASURED_DETERMINISTIC_CONTEXT`.

Ficam `NOT_MEASURED` porque exigem modelo generativo ou chave de vendor: `output_tokens`, `cache_read_tokens`, `cache_write_tokens`, `cost`, e a frase de produto «a V2.2 gasta menos tokens». Nesta baseline, `latency_ms` é o tempo de parede da montagem do contexto (rg, leitura, budget e pickup). O estado dessa grandeza é `LIMITED`: não é latência de modelo. `model_latency_ms` fica `NOT_MEASURED`.

`product_percent_gate` fica `NOT_MEASURED`. Nenhum teste transforma um percentual de redução em critério de falha.

### 3.5 Compactação

O cartão `restricoes_compactacao_handoff` existe. Enquanto `orchestrator/src/context/compaction-contract.ts` reportar condenser `NOT_IMPLEMENTED` e `reinject_allowed: false`, os campos de compactação ficam `UNAVAILABLE`. Não há número de token de compactação. A corrida desse cartão é o handoff **sem** compactar: a negação e o critério de pronto têm de continuar no contexto montado. Não se implementa condenser, sumarizador nem reinject nesta baseline.

## 4. GOAL-003 — integridade, proveniência, obsolescência e conflito

O contexto injetado respeita a origem do que entra.

Critérios:

1. Item sem proveniência não entra.
2. Página obsoleta não é injetada.
3. Em conflito entre código e wiki sobre o mesmo tópico, o código prevalece; a wiki não «corrige» o código.
4. Isolamento entre projetos: canário de um projeto não aparece no contexto de outro.
5. Índice ou página cuja fonte mudou fica marcado como stale, com a corrida que o demonstra.
6. O cenário de fontes conflitantes do GOAL-002 repete-se e publica dispersão, quando a grandeza for medida.

A cerca unitária não substitui, por si, o cartão `fontes_conflitantes` com repetições.

## 5. GOAL-004 — handoff medido

### 5.1 O que a corrida tem de publicar

Um handoff entre agentes fica medido quando a corrida publica, no formato do GOAL-002:

- tokens de entrada do briefing entregue;
- tokens de saída, se houve modelo;
- restrições que tinham de sobreviver (definição de pronto, negações, restrições de segurança) e se sobreviveram verbatim;
- `n` e dispersão;
- compactação `UNAVAILABLE` enquanto o condenser não existir.

Uma corrida de laboratório que preserva a definição de pronto é evidência parcial. Sem `n`, sem dispersão e sem as grandezas separadas, o objetivo não está fechado.

### 5.2 Compactação no handoff

Enquanto o condenser não existir, o handoff medido é o pacote sem compactar. O campo de compactação fica `UNAVAILABLE`. Não se publica economia de compactação.

### 5.3 Economia só com qualidade maior ou igual à do B0

O mesmo verificador corre nos dois braços. A qualidade é a fração de checagens que passam: âncoras presentes no contexto (scorer `file_evidence`), restrições esperadas presentes, conflito sinalizado quando a tarefa o pede, retomada correta quando a tarefa o pede.

A diferença de `input_tokens` só conta como economia quando a qualidade do braço V2.2 é maior ou igual à do B0. Se a qualidade cair, o delta pode ficar registado como observação, mas o estado da economia é `NOT_MEASURED`. Não se transforma esse delta num gate percentual de produto.

## 6. GOAL-005 — adoção ou rejeição rastreável de ferramentas

Cada ferramenta candidata tem um registo que dá para auditar sem reconstruir a discussão: configuração, modelo, repetições, limitação e a decisão (adotar ou rejeitar) com o motivo. Rejeição sem motivo, ou adoção só por flag default, não fecha o critério.

Ferramentas que o pack interno numera à parte (canário de segredo, Graphify, brevidade Caveman, cache de vendor) não são objetivos 001–006. Entram na seção 10. Graphify permanece opt-in e desligado por omissão; esta norma não o promove.

## 7. GOAL-006 — benchmarks com configuração, modelo, repetições e limitações

Um benchmark citável junto de uma afirmação de produto inclui, no mesmo artefacto:

1. Configuração (harness, limites, tokenizer, scorer, comando).
2. `model_id` do modelo que produziu a saída medida. Um modelo de embedding não ocupa o lugar de um modelo generativo.
3. Repetições (`n`) e dispersão.
4. Limitações escritas, incluindo o SHA da árvore e o que ficou `NOT_MEASURED` ou `UNAVAILABLE`.

Duas reconstruções com o mesmo resultado não são dispersão de modelo.

## 8. Entregáveis

São sete. Um ficheiro com o nome certo não fecha o entregável se o conteúdo não cumprir o que esta norma pede nesse ponto.

| # | Entregável | O que tem de conter |
|---|------------|---------------------|
| 1 | Metas | Os objetivos 001–006 desta norma |
| 2 | Matriz de rastreabilidade | Cada critério desta norma com evidência e estado da seção 9 |
| 3 | Auditoria de estado | Estado da ponta que se afirma, com o SHA; um snapshot antigo não serve de estado atual |
| 4 | Plano de benchmark | As seis tarefas, as grandezas separadas, `n`, dispersão e limitações |
| 5 | Matriz de decisão | Alternativa, evidência e decisão, por escolha técnica que a V2.2 assume |
| 6 | Plano incremental com rollback | Por fase: o que reverter, como provar que voltou, e o que a reversão não apaga (raw de evidência já publicado) |
| 7 | Relatório final | Os objetivos desta norma fechados com o vocabulário da seção 9, não com um rótulo interno no lugar de `PASS` |

Este ficheiro cumpre o entregável 1 como norma. Não substitui os outros seis.

## 9. Condições de conclusão

Só estes estados fecham um critério. Não se acrescentam sinónimos.

| Estado | Quando se usa |
|--------|----------------|
| `PASS` | A evidência exigida pelo critério está no tree e cobre o critério por inteiro |
| `LIMITED` | Parte do critério tem evidência; a parte em falta fica nomeada no mesmo sítio |
| `BLOCKED` | Um impedimento externo, já identificado, impede a prova |
| `NOT_MEASURED` | A grandeza ou a corrida pedida não foi feita. Proxy, fixture ou constante sintética não sobem este estado |
| `UNAVAILABLE` | O mecanismo que a medição pressupõe não está implementado. Não se publica um número parcial com outro nome |

`NOT_MEASURED` e `UNAVAILABLE` são estados válidos de conclusão honesta. Não são falha de redação a esconder com `PENDING_BASELINE` ou `ENTREGUE_CI`.

## 10. Mapeamento para os IDs internos

Fonte dos títulos internos: `docs/architecture/v2.2/EVOLVELOOP_V2.2_GOALS.md`. A coluna «o que o ID interno é» segue a reconciliação já escrita em `docs/v22/TRACEABILITY-AUDIT.md` (secção 2), sem novo julgamento.

| ID no brief | O que o brief pede | ID interno com número parecido | Título interno | O que esse ID interno é |
|-------------|--------------------|--------------------------------|----------------|-------------------------|
| GOAL-001 | Contexto persistente e recuperação | V22-GOAL-001 | ADR de ownership do contexto de trabalho | Working context descartável na fronteira da chamada. A recuperação de job está no interno 004 |
| GOAL-002 | Redução mensurável de tokens vs V2, seis tarefas, grandezas separadas, `n`, dispersão | V22-GOAL-002 | Cerca de fonte de verdade e isolamento por raiz de projeto | Proveniência e conflito. Tokens de bench estão no interno 003; orçamento no 006; parte da discussão no 009 e no 010 |
| GOAL-003 | Integridade, proveniência, obsolescência, conflito | V22-GOAL-003 | Harness de benchmark e baselines B0/B1 | O harness de retrieval. A cerca código/wiki é o interno 002. Stale de índice cruza o interno 005 |
| GOAL-004 | Handoff medido | V22-GOAL-004 | Continuidade entre sessões verificável | Checkpoint e retomada de job, não um bench de handoff |
| GOAL-005 | Adoção ou rejeição rastreável de ferramentas | V22-GOAL-005 | Wiki operacional como backend default (vault + projeto) | Operação da wiki, não o protocolo por ferramenta |
| GOAL-006 | Benchmarks com configuração, modelo, repetições, limitações | V22-GOAL-006 | Orçamento de contexto por spawn / GATE_BUNDLE | Teto de contexto. O plano de bench é o interno 003 mais o plano de benchmark do pack |
| (sem ID no brief) | — | V22-GOAL-007 | Canário de qualidade e redação de segredos | Fora dos objetivos 001–006 |
| (sem ID no brief) | — | V22-GOAL-008 | Graphify como backend opcional (protótipo, flag) | Flag default OFF. Fora dos objetivos 001–006 |
| (sem ID no brief) | — | V22-GOAL-009 | Brevidade de saída (estilo Caveman, só voz) | Flag default OFF. Fora dos objetivos 001–006 |
| (sem ID no brief) | — | V22-GOAL-010 | Prompt cache no adapter HTTP (se existir) | Hit de vendor tratado à parte. Fora dos objetivos 001–006 |
