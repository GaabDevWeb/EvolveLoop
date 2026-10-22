# Compatibilidade entre peças

Regra: uma fonte de verdade por tipo de informação. Cache pode existir. Cache que discorda da fonte é lixo, não voto.

## Combinações

### Wiki Markdown + código + `rg`

| | |
|---|---|
| Funções | Código: comportamento. `.ai/wiki`: decisão e procedimento. `rg`: achar o sítio. `index.md`: mapa |
| Fonte de verdade | Código, depois decisão explícita |
| Armazenamento | Árvore do projeto; nenhum serviço |
| Atualização | Workflow update/lint da skill; hash dos paths citados marca stale |
| Recuperação | Índice → páginas → `rg` com orçamento |
| Invalidação | `status: obsoleto` ou conflito. Não apagar |
| O que vai ao modelo | Páginas escolhidas e trechos, como dados |
| Custo extra | Leitura de poucos arquivos |
| Falhas | Índice desatualizado; página sem fonte |
| Teste | Cenários 2, 6, 7, 10 do plano de bench |

Esta combinação é a P1. Não precisa de MCP.

### Graphify (código) + a wiki acima

| | |
|---|---|
| Funções | Graphify: caminho entre símbolos. Wiki: por quê. `rg`: confirmação literal |
| Fonte de verdade | Arquivo fonte. Grafo é derivado |
| Armazenamento | `graphify-out/` gitignored, por raiz de projeto |
| Atualização | `--update` quando o manifest de hashes do código mudar. Não em toda mensagem |
| Recuperação | `graphify query --budget` só se a tarefa for relacional (quem chama, quem importa). Senão não chamar |
| Invalidação | Apagar o cache ou `--update`. Aresta `INFERRED` nunca promove página para `status: atual` sozinha |
| O que vai ao modelo | Subgrafo dentro do budget, com `file:line` e tag da aresta |
| Custo extra | CPU de parse; zero token se a passagem LLM estiver desligada |
| Falhas | Agente obedece a skill do Graphify e deixa de abrir o arquivo. Cache de outro projeto se o cwd estiver errado |
| Teste | Cenário 5 e 11, braço com e sem grafo |

Não ligar `--wiki`, `--neo4j-push`, cloud MCP, nem a passagem de PDF.

### Vault `knowledge.search` + wiki de projeto

| | |
|---|---|
| Funções | Vault: notas entre projetos do usuário (packs, doutrina). `.ai/`: este repo |
| Fonte de verdade | Cada um no seu escopo. Conflito: código do repo vence a vault para comportamento deste repo |
| Armazenamento | `WIKI_ROOT` vs `.ai/` |
| Atualização | Ingest da vault é ritual `/wiki`, não hook de cada edit |
| Recuperação | `knowledge.search` com query curta. Vazio com `RAG_REPO_MISSING` não é “não existe fato” |
| Invalidação | A CLI da vault não foi reauditada aqui. GAP: política de stale da vault |
| O que vai ao modelo | Hits com `source` e excerpt ≤ 500 caracteres (limite do parser atual) |
| Custo extra | Processo Python |
| Falhas | Excerpt curto demais corta a restrição. Env herdado |
| Teste | Cenário 4 com fixture de vault, não com a vault pessoal |

Não copiar `.ai/` do projeto para dentro da vault automaticamente (contaminação e duplicação).

### Memória de feature + wiki

| | |
|---|---|
| Funções | MemoryStore: “nesta feature pediram X”. Wiki: “no projeto a regra é Y” |
| Fonte de verdade | Não promover preferência de uma feature a regra de projeto sem a curadoria que a spec descreve e que o TS **não** executa sozinho |
| Armazenamento | `memory/<feature_id>` vs `.ai/` |
| Atualização | Append vs edit de página |
| Recuperação | `getPreferences` / `getDecisions` da feature corrente apenas |
| Invalidação | Feature termina; memória não vaza para a próxima raiz |
| O que vai ao modelo | Preferências da feature se a tarefa for de produto; não o YAML inteiro de outras features |
| Custo | Baixo |
| Falhas | `feature_id` reutilizado entre projetos no mesmo `data-dir` |
| Teste | Cenário 12 |

Checkpoint não entra nessa tabela como contexto de modelo. Ele restaura o grafo. Mandar o JSON do checkpoint ao LLM duplica estado e pode carregar payload demais.

### Caveman voz + recuperação seletiva

| | |
|---|---|
| Funções | Retrieval escolhe o conteúdo. Voz só encurta a narração de saída |
| Fonte de verdade | Inalterada |
| O que vai ao modelo | O mesmo contexto de entrada. A saída é que muda |
| Custo | Nenhum de indexação. Economia teto ~8,5% de saída no bench JetBrains, não garantida aqui |
| Falhas | Handoff entre agentes fica ambíguo |
| Teste | Cenário 9, só no canal de resposta ao usuário, com verificador de tarefa |

Caveman-compress **não** entra em combinação com a wiki.

### Prompt cache + retrieval

O prefixo cacheável é o que não muda no turno: contrato de sistema, lista curta de tools estáveis. O retrieval entra **depois** do breakpoint, senão cada pergunta invalida o cache (doc Anthropic, 2026-10-21).

No host Cursor desta pesquisa o ponto de cache é UNKNOWN (`docs/research/targets/external/cursor/REPORT.md`). Não desenhar a V2.2 como se o engine controlasse o cache do IDE.

### O que não combinar

| Par | Motivo |
|---|---|
| Graphify `--wiki` + `.ai/` | Duas wikis |
| MCP `server-memory` + MemoryStore + wiki-mem | Três memórias de sessão |
| Mem0 ou Letta + engine | Outro runtime |
| LightRAG + LanceDB da vault + Graphify semântico | Três indexadores LLM |
| Repomix + retrieval | Manda o corpus e também os trechos |
| LLMLingua + prompt cache | O texto do prefixo deixa de ser estável |
| Grafo mergeado de dois repos | Fura o isolamento que a V3 seção 194 pede e que a V2 ainda não impõe |

## Mudança de contrato público?

| Proposta | Muda contrato público? |
|---|---|
| Operar `.ai/` pela skill, sem novo backend | Não |
| Manifest de hashes e lint de stale | Não, se for convenção da skill / arquivos no projeto |
| Evidência da run listar paths (campo aditivo) | Aditivo. Consumidor que ignora campo novo segue válido. Exige cuidado para não exigir o campo em evidência antiga |
| Novo id em `KnowledgeBackendId` | Sim. Evitar na V2.2 |
| `max_skills` no engine | Sim, e o ADR-DR-0002 adia |
| Compaction/reinject | Bloqueado até o ADR de ownership. O ADR em si não muda runtime |
| World Model, MemoryTrust runtime | Escopo V3, branch `evolve-v3`, fora |

A via que respeita os dez princípios do pedido é a híbrida contida sem novo backend, sem dependência obrigatória em toda execução (Graphify só com flag), e com fail-closed quando a vault não existe.
