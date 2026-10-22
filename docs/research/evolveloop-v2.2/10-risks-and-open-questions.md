# Riscos e perguntas abertas

## Riscos

| Risco | Por que é real | Mitigação na proposta |
|---|---|---|
| Wiki obsoleta seguida como ordem | A skill já prevê o caso; nada no engine impede | Cenário 6 falha se o agente obedecer a página errada. Hash marca `obsoleto` |
| Injeção via Markdown recuperado | Wiki clonada, PDF, nó de grafo | Dados delimitados, fora do system de autoridade. Não é sandbox |
| Vazamento entre projetos | `data-dir` compartilhado, MCP memory global, merge de grafos | P0-2 e proibição de merge |
| Segredo em excerpt ou sessão | `spawn` herda env; redação da V3-hardening não está neste tree | P1-3 canário |
| Economia fictícia | E-001 PROXY; claims de 65% e 71× | Tokenizer nomeado; verificador; raw JSON |
| Grafo INFERRED vira arquitetura | Skill do Graphify prioriza a query | Tag obrigatória; arquivo ganha |
| Segunda fonte de verdade | `--wiki`, Mem0, vault copiada | Uma wiki de decisões: `.ai/` |
| GPL da Serena no core MIT | LICENSE overview do repo | Não incorporar ao core |
| Custo de indexação LLM | Graphify semântico, GraphRAG, LightRAG, contextual retrieval | Passagem de modelo desligada no experimento |
| Compaction libera perda silenciosa | ADR-DR-0005 | P0-1 antes de qualquer condenser |
| Antecipar V3 | World Model é o lugar de crença | V2.2 não cria Belief store |
| Host não observa leituras | Dedup no engine é cego ao Cursor | Gap explícito no aceite da P1-2 |
| Outlier de contexto longo | JetBrains viu um trial inverter o custo | Mediana e total; não só média de tokens |
| Skill draft | wiki-carpaccio `status: draft` | Operar o workflow mínimo; não expandir a spec com RAG |

## Perguntas ainda abertas

1. A vault `gaabwiki` suporta filtro por projeto e stale por arquivo? Não foi lida: `WIKI_ROOT` ausente. GAP.
2. Dá para desligar 100% da passagem LLM do Graphify v0.9.93, inclusive em Markdown do próprio repo? O README separa código de docs. Não foi executado. Se Markdown do `.ai/` disparar LLM, o experimento não pode apontar para a raiz inteira; só para diretórios de código.
3. O Cursor desta instalação reporta tokens de cache? Relatório interno anterior: UNKNOWN. Continua UNKNOWN.
4. Quantos arquivos o agente lê hoje numa tarefa típica do EvolveLoop? `NOT_MEASURED`.
5. O algoritmo de `--update` remove arestas de arquivo apagado? Não lido no fonte.
6. A licença efetiva de `@modelcontextprotocol/server-memory` no npm. Não verificada.
7. O tweet de Karpathy não foi aberto. O gist sim.

## O que mudaria a recomendação

| Se acontecer | Então |
|---|---|
| B1 aumenta tokens e erros | A wiki mínima continua para humanos, mas deixa de ser injetada no agente |
| B3 reduz dependentes errados e tokens no cenário 5, com citação verificável | Graphify código sobe de PROTOTIPAR para flag default **do experimento seguinte**, ainda gitignored, ainda não-backend |
| B3 não é chamado pelo agente | DESCARTAR integração, mesmo com grafo bom (o bench comunitário já mostrou esse modo de falha) |
| JetBrains-like no nosso cenário 9 mostra perda de negação | Brevidade fica proibida até em resposta ao usuário |
| Proxy Caveman 4.x, num adapter nosso, corta entrada com fidelidade no diff do payload e no verificador | Reabrir P2. Até lá, não |
| ADR de ownership for rejeitado | Compaction permanece adiada. O resto da V2.2 (wiki, cerca, medida) segue |
| V3 passar a implementar retrieval de projeto no World Model | Parar a V2.2 de criar store paralelo e só alimentar Observation com ponteiros, não com um segundo grafo |

## Limitações desta pesquisa

- Não houve execução de Graphify, Caveman, Serena, gaabwiki nem dos cenários.
- Firecrawl 401, GitHub MCP indisponível, `agent-browser` ausente, X não lido.
- Stars e “repositórios indexados” não foram usados como qualidade e não devem migrar para um ADR como prova.
- Trechos de Reddit dependem do snippet/página retornada pela busca. Os posts estão linkados para releitura.
- O working tree não contém `orchestrator/src/v3`. Conclusões sobre a V3 dependem de `git show` em `556473fb`.
