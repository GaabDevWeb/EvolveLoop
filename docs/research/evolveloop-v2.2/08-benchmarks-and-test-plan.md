# Plano de benchmarks

**Resultado desta pesquisa:** todos os cenários abaixo estão `NOT_MEASURED` no EvolveLoop. Nenhum número de aceite deve ser copiado da JetBrains, do autor do Caveman, do Repowise ou do E-001.

## Linha de base

Registrar antes de qualquer otimização, no mesmo modelo e no mesmo tokenizer:

| Campo | Por quê |
|---|---|
| Identidade do modelo e data | Números não cruzam modelos |
| Tokenizer | E-001 usou whitespace. Isso não serve para aceite |
| Harness (Cursor agent, engine TS, ou ambos) e versão do tree | `28ab56ce` é a base desta auditoria; o bench futuro precisa pinar o SHA |
| Tarefa, fixture e verificador | Nota de juiz LLM é secundária. Teste do repositório é primário |
| Orçamento de contexto declarado | Sem isto, “cabeu” não significa “usou pouco” |
| Contagem de `read`/`rg` por path | A métrica de leitura redundante |

Métricas obrigatórias, por tarefa e por braço:

- Tokens de entrada, de saída e totais (tokenizer declarado).
- Chamadas ao modelo.
- Latência total e tempo só de retrieval/indexação.
- Custo em moeda, se o provedor devolver; senão `NOT_MEASURED` no custo.
- Acerto do verificador (testes, oracle), não só “o modelo disse que acabou”.
- Precisão do retrieval: o path que contém o fato estava no conjunto recuperado? (rótulo humano no fixture).
- Atualidade: a página ou aresta usada apontava para o blob atual? (hash).
- Fidelidade após compressão: negações, paths e números do gabarito ainda presentes no payload enviado (diff automático).
- Leituras redundantes: mesmo path mais de uma vez na run.
- Regressão: testes que passavam e passaram a falhar.

Qualidade mínima que bloqueia “economia”:

- Verificador da tarefa não pode cair além da margem pré-registrada (proposta: margem zero em teste determinístico do fixture; margem estatística só com N pré-registrado).
- Nenhuma negação do gabarito pode sumir do payload se o braço for de compressão.
- Nenhum excerpt de outro projeto no contexto.
- Nenhum segredo no log de evidência (canário `.env` no fixture).

Se o braço economizar tokens e falhar o verificador, o braço perde.

## Braços

| ID | Conteúdo |
|---|---|
| B0 | Sem `.ai/`, sem grafo. Agente com `rg` e leitura, como hoje |
| B1 | `.ai/` inicializada com fatos verdadeiros do fixture |
| B1s | Igual B1 com uma página deliberadamente errada |
| B2 | B1 + manifest de hash que marca a página stale depois de um commit |
| B3 | B1 + Graphify só código, query com budget fixo, sem passagem LLM |
| B4 | B0 + estilo de saída curto (Caveman voz ou instrução “seja breve”). Entrada idêntica |
| B5 | B0 com catálogo de skills cheio vs reduzido. Só se o host permitir controlar isso. Não adicionar `max_skills` ao engine para medir |

Não incluir LLMLingua, Mem0, Repomix nem GraphRAG no primeiro ciclo.

## Cenários

| # | Cenário | Braços | O que decide |
|---|---|---|---|
| 1 | Projeto sem wiki | B0 | Baseline de tokens e de arquivos lidos |
| 2 | Wiki inicializada | B0 vs B1 | B1 só ganha se acertar com menos tokens **ou** menos arquivos, sem perder o verificador |
| 3 | Nova sessão, mesma tarefa de retomar decisão | B0 vs B1 | A decisão tem de aparecer sem varrer o repo |
| 4 | Documentação extensa (fixture de vault ou pasta `docs/`) | B0 vs B1 | Não indexar a vault pessoal. Fixture sintético |
| 5 | Mudança num módulo com dependentes | B0 vs B1 vs B3 | B3 precisa apontar os dependentes com `file:line` real |
| 6 | Wiki desatualizada | B1s | O agente tem de notar o conflito com o código ou a página tem de estar `obsoleto`. Seguir a wiki errada é falha |
| 7 | Decisão antiga | B1 | Resposta cita a página e o ADR/código |
| 8 | Tarefa longa com teto de contexto | B0 vs B1 | Não pode “caber” porque omitiu o verificador |
| 9 | Compressão de saída | B0 vs B4 | Comparar saída e custo. Esperar efeito pequeno. Falha se o diff ou o comando sair alterado |
| 10 | Retrieval seletivo vs leitura ampla | B0 (instrução de ler muito) vs B1 | Contar paths |
| 11 | Muitas alterações | B2 vs B3 sem `--update` | Grafo ou página stale não pode ser citada como atual |
| 12 | Dois projetos no mesmo `data-dir` | B1 nos dois | Zero hits cruzados. Canário: uma string única em cada `.ai/` |

Cada cenário: mesma semente de tarefa, pelo menos 5 repetições se o modelo for não determinístico, pares quando der. Publicar o JSON bruto, como E-001 fez em `raw/battery/`. Sem raw, o número não entra em ADR.

## Calibração de alvo

Depois de B0 vs B1 no cenário 2 e 5:

- Se a mediana de tokens totais de B1 for menor e o verificador não piorar, o alvo da P1 vira “não regredir o verificador e reduzir a mediana de paths lidos”, com o percentual observado como **hipótese para o próximo ciclo**, não como gate retroativo.
- Se B1 não reduzir paths, a wiki ainda pode ser aceita por acerto no cenário 3 e 7 (continuidade), desde que não aumente tokens acima de uma margem pré-registrada (proposta de partida: +10% de tokens totais mediana é falha; ajustar só com o baseline em mãos).
- B3 precisa vencer B0 no cenário 5 em acerto de dependentes **e** não aumentar tokens totais acima de B1. Senão o grafo sai.
- B4 precisa mostrar redução de saída no tokenizer do provedor sem queda de verificador. O 8,5% da JetBrains não é o limiar. O limiar é “melhor que B0 neste harness, com p ou intervalo pré-registrado”. Se não houver N suficiente, o resultado fica `NOT_MEASURED` e a skill não entra no default.

## O que não conta como prova

- Estrela de GitHub, download PyPI, “13,1M repositórios” do marketing Graphify.
- Token estimado por whitespace ou por caractere/4.
- Uma pergunta de demo.
- O modelo dizer que usou a wiki.
- Teste unitário do engine sem chamada de modelo, para qualquer claim de qualidade de LLM.
- Bench de outro harness sem repetir o verificador.

## Dados necessários

Fixtures pequenos, versionados, sem segredo real:

- Repositório sintético com 2 módulos dependentes e 1 ADR.
- Página wiki correta e página wiki falsa.
- Dois roots lado a lado.
- Canário `SUPERSECRETO_NAO_LOGAR` num arquivo que não deve ser lido, e outro num arquivo que se lido não pode ir para o log.

Não usar a vault pessoal nem credenciais do `mcp.env`.
