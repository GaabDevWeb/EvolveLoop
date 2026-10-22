# Wiki, Graphify e arquiteturas

## O que a wiki precisa ser

Pergunta operacional, copiada do propósito da skill: o que um agente novo precisaria saber para não repetir descoberta já feita.

Isso cabe em páginas curtas: propósito, arquitetura, decisões com motivo, restrições, como testar, estado do trabalho, bugs já pagos, relações nomeadas. Não cabe uma cópia do código. A hierarquia da skill já é a certa:

```text
código > decisão registrada > doc do projeto > wiki derivada > inferência
```

Graphify não substitui essa hierarquia. Uma aresta `INFERRED` é inferência. Uma página `.ai/` sem `fonte` também é. As duas devem carregar o rótulo.

## Graphify — papel real

| Pergunta | Resposta com fonte | Confiança |
|---|---|---|
| Qual projeto? | `Graphify-Labs/graphify`, pacote `graphifyy`, CLI `graphify`. Release v0.9.93 em 2026-10-20 | Alta (API + README) |
| Arquitetura | Parse AST local para código; passagem de modelo para docs/PDF/imagem/vídeo; grafo com comunidades; query por travessia | Alta no README/skill; o código do parser não foi auditado linha a linha |
| Linguagens | Vendor: 36 linguagens de código no `llms-full.txt`. Post de abril/2026 dizia 25. Não foi extraída a lista do tree-sitter desta release | Média |
| Código e docs? | Os dois, com custos diferentes. Código sem LLM; o resto com modelo | Alta (vendor) |
| Entidades | Funções, classes, imports, relações. Skill também fala em “god nodes” e comunidades. Não há, na doc lida, um esquema igual a ADR/decisão | Alta / média |
| Artefatos | `graphify-out/graph.json`, HTML, `GRAPH_REPORT.md`. Opcionais: wiki, Obsidian, Cypher | Alta |
| Incremental | `--update` reextrai mudados; `--watch` no código sem LLM | Alta na skill; algoritmo de invalidação de aresta antiga **não** foi lido no fonte |
| Detecta mudança? | `--update` / `--watch` implicam detecção de arquivo. Não há prova de que uma decisão em prosa seja invalidada quando o código diverge | Média |
| Consulta | `graphify query`, `--dfs`, `--budget`, `path`, `explain`. A skill, se `graph.json` existe, manda **não** reler o corpus e ir direto à query | Alta |
| MCP | `--mcp` stdio. Cloud MCP é outro produto | Alta |
| Monorepo | Fluxo de merge de paths/URLs na skill. Não testado | Baixa fora do texto |
| Tokens | `--budget` existe. Economia de sessão: não comprovada (arquivo 04) | Alta sobre a flag; baixa sobre o benefício |
| Modelo externo | Não, na passagem de código. Sim, na semântica e no modo deep | Alta (vendor) |
| Versus wiki Markdown | Grafo responde “quem chama quem” com citação `file:line` se o produto cumprir o marketing. Wiki responde “por que” e “não faça”. São perguntas diferentes | Inferência sustentada pelos dois desenhos |
| Versus RAG | Não é índice vetorial. Travessia em vez de top-k por cosseno | Alta (vendor) |
| Duplicar índice? | Sim, se `--wiki` escrever outra árvore ao lado de `.ai/`, ou se Neo4j for ligado sem necessidade | Alta |

Conclusão: Graphify é um **índice de estrutura de código**, candidato a protótipo. Não é o gerador da wiki de decisões.

## Comparação conceitual

| Abordagem | Serve para | Falha quando | Custo de manter fresco | No EvolveLoop hoje |
|---|---|---|---|---|
| Wiki Markdown | Decisão, restrição, procedimento, estado | Ninguém atualiza; vira romance do código | Baixo se a página for curta e tiver `fonte` + `atualizado` | Especificado, não operado pelo engine |
| Índice lexical (`rg`) | Achar símbolo e string exatos | Sinônimo, decisão que não repete o identificador | Zero (não há índice) | Host + `filesystem` search |
| Índice vetorial | Paráfrase em corpus grande | Chunk sem contexto; índice stale; embedding de segredo | Reembed do que mudou | Opcional na vault Python; ausente aqui |
| Grafo de código | Dependência e caminho | Inferência tratada como fato; grafo de doc desatualizado | Reparse AST barato; reparse semântico caro | Ausente |
| Híbrido lexical + wiki | A tarefa de engenharia típica: decisão + arquivo | Dois lugares sem regra de vitória | Médio | Recomendado |
| Híbrido + grafo | Tarefa que cruza muitos arquivos | Três lugares sem regra de vitória | Alto | Só se o bench ganhar |

Um grafo não é melhor por ser grafo. Ele paga o custo quando a pergunta é relacional e a resposta cabe num caminho com citação. Para “qual é a policy de checkpoint?” a página e o ADR ganham, com menos maquinaria.

## Três arquiteturas

### 1. Mínima — só o que já existe

```text
raiz do projeto
  → se .ai/index.md existe, ler o índice e as páginas citadas
  → senão, não criar nada até pedido explícito (diretório temporário, clone alheio)
  → código e rg para o resto
  → WIKI_ROOT/knowledge.search só para o corpus organizacional
  → MemoryStore só para a feature
  → checkpoint só para retomar o grafo
```

Fonte de verdade: código para comportamento; `.ai/wiki` para decisão registrada; vault para conhecimento entre projetos do usuário.

Trade-off: zero dependência nova, zero segunda indexação. Não responde “cadeia de chamadas” melhor do que o agente com `rg`. É o default correto.

### 2. Híbrida contida — recomendada

A mínima, mais:

- contrato de isolamento por raiz (não ler `.ai/` de outro repo);
- manifest leve (` .ai/manifest.yaml` ou equivalente) com hash dos arquivos citados pelas páginas, para o lint marcar stale sem LLM;
- orçamento: índice + no máximo N páginas + trechos recuperados por `rg`, N calibrado no harness;
- evidência da run lista paths lidos;
- **opcional, flag de experimento:** `graphify` só em código, `query --budget`, saída com tag EXTRACTED/INFERRED, sem `--wiki`, sem cloud, sem Neo4j.

Fonte de verdade não muda. O JSON do grafo é cache derivado. Se discordar do arquivo, o arquivo ganha e o grafo é reconstruído (`--update`).

Trade-off: um formato a mais, só se o experimento estiver ligado. Dá para apagar `graphify-out/` e voltar à mínima.

### 3. Avançada — não recomendada para a V2.2

Wiki + vetor + Graphify full (docs com LLM) + Graphiti ou LightRAG + Caveman proxy + reranker.

Fonte de verdade: nenhuma, na prática. Três extratores LLM escrevem três memórias. Isso antecipa World Model e Memory Trust, que a V3 ainda não fechou, e viola AP-004.

Trade-off: melhor recall hipotético em corpus heterogêneo enorme. Custo de indexação, staleness e contaminação maiores. Sem bench local, a hipótese não compra a dependência.

## Como a híbrida responde às perguntas da missão

| Pergunta | Desenho |
|---|---|
| Quem gera a wiki? | O agente com `wiki-carpaccio`, sob demanda. Graphify não gera a wiki de decisões |
| Onde fica? | `.ai/` na raiz do projeto. Fora de `raw/` nada é imutável. `graphify-out/` é cache, gitignored no experimento |
| Como inicia? | Se `.ai/` não existe e o usuário (ou a policy da tarefa) pediu continuidade de projeto, init mínimo. Não init em `/tmp`, em home, nem em repo aninhado sem raiz explícita |
| Como atualiza? | Workflow update depois de mudança que altere decisão, contrato, comando de teste ou invariante. Typo não atualiza (regra já escrita) |
| Como evita obsoleto? | Frontmatter `status` + data. Lint marca, não apaga. Manifest de hashes: se o arquivo-fonte mudou, a página fica `obsoleto` até revisão. Não reescrever a página por LLM em silêncio |
| Como recupera pouco? | `index.md` primeiro. Páginas nomeadas. `rg` no símbolo. Parar ao atingir o orçamento. Não reler arquivo já citado na evidência da mesma run |
| Entre sessões? | `.ai/` no git do projeto. Memória da feature no `MemoryStore` se a feature continuar. Sessão `wiki-mem` só se o perfil ligar |
| Isolamento? | Raiz canônica (git toplevel, ou path explícito se não houver git). Índices e `data-dir` de conhecimento de projeto ficam sob essa raiz. Vault `WIKI_ROOT` é outro escopo e não recebe `.ai/` de projeto automaticamente |
| Índice duplicado? | Um corpus organizacional (vault). Uma wiki por raiz. Um cache de grafo opcional, descartável |
| Monorepo | Uma wiki na raiz, páginas por pacote quando houver 3+ do mesmo tipo (regra da skill). Não um grafo mergeado com outro repo |
| Repo aninhado | Cada toplevel é um projeto. Não seguir submodule para dentro sem pedido |
| Sem git | `.ai/` ainda funciona. Frescor por hash de conteúdo, não por commit |
| Temporário | Não inicializar. Se a tarefa exigir nota, ela vai para `memory/<feature>` da run, não para uma wiki permanente |

## Segurança do texto recuperado

Páginas, `GRAPH_REPORT.md` e hits da vault são **dados**. Não são Policy e não autorizam tool. A V2 não tem o InstructionHierarchy da V3. A V2.2 deve exigir, no critério de aceite, que conteúdo recuperado não seja concatenado ao system prompt de autoridade. Vai no canal de evidência/contexto de usuário, com delimitador. Isso não “resolve” injeção. Reduz o lugar onde ela vira ordem.

Segredos: wiki não copia `.env`. O freeze desta branch não inclui o `secret-redaction.ts` de `8878cb6`. Evidência de retrieval não deve gravar o excerpt se o path parecer segredo. Critério de teste, não implementação nesta pesquisa.
