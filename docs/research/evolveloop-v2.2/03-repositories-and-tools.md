# Catálogo e matriz de avaliação

Consulta GitHub API e páginas oficiais: **2026-10-21**. Stars são snapshot, não critério. Notas 1–5 são julgamento do pesquisador, com o fato que as sustenta na linha seguinte. Não são medidas.

Escala: 1 fraco, 5 forte, **para o benefício na V2.2 do EvolveLoop**, não para o mercado.

## Resumo

| Nome | Categoria | Estado em 2026-10-21 | Recomendação | Nota benefício V2.2 |
|---|---|---|---|---|
| wiki-carpaccio | Wiki de projeto | Skill local, draft 1.0.0 | INTEGRAR (operar o que já existe) | 5 |
| KnowledgeBackend Wiki | RAG organizacional | Código V2, fail-closed | INTEGRAR (sem mudar o seam) | 4 |
| wiki-mem | Memória episódica | Opt-in, fora dos hooks públicos | INTEGRAR só como opt-in já especificado | 3 |
| Graphify OSS `graphifyy` | Grafo de código | Ativo, release v0.9.93 (2026-10-20) | PROTOTIPAR, código only | 3 |
| Padrão Karpathy (gist) | Doutrina de wiki | Ideia, sem produto | Já absorvido pela skill; não adotar um segundo pacote | 4 como doutrina |
| Aider repo map | Mapa de símbolos | Repo Apache; push 2026-05-22 | Não integrar o produto. Mecanismo já estudado em `docs/research` | 2 |
| Busca lexical (`rg` / filesystem.search) | Recuperação | Já no host e no provider | INTEGRAR como baseline do harness | 5 |
| Prompt cache (Anthropic e equivalentes) | Cache de prefixo | Doc de provedor | PROTOTIPAR só se o provider da run expuser cache. Cursor host: UNKNOWN | 3 |
| Contextual Retrieval (Anthropic) | Indexação RAG | Engineering blog | MONITORAR. Exige LLM na indexação | 2 |
| Caveman skill de voz | Estilo de saída | Apache, v4.0.1 (2026-10-13) | MONITORAR no host. Não no core | 2 |
| Caveman proxy / compress | Compressão de contexto e de arquivos | Mesmo repo | PROTOTIPAR proxy só com bench próprio; DESCARTAR compress de contratos | 2 / 1 |
| LLMLingua / LLMLingua-2 | Compressão de prompt | MIT, papers EMNLP/ACL | DESCARTAR no caminho quente | 1 |
| Graphiti | Grafo temporal | Apache, ativo | MONITORAR | 2 |
| Microsoft GraphRAG | Graph RAG batch | MIT, manutenção | DESCARTAR como dependência nova | 1 |
| LightRAG | Graph + vetor | MIT, EMNLP 2025 | MONITORAR | 2 |
| Serena | MCP de símbolos | GPL-3.0-or-later na aplicação | MONITORAR como processo externo; não incorporar ao core MIT | 2 |
| Mem0 | Memória de agente | Apache | DESCARTAR no core | 1 |
| Letta | Agente com memória | Apache | DESCARTAR no core | 1 |
| claude-mem | Memória de sessão | Apache, ativo | DESCARTAR (duplica wiki-mem) | 1 |
| MCP `server-memory` | Grafo JSON do host | Já no `mcp.json` | DESCARTAR como wiki de projeto | 1 |
| Repomix | Empacotar repo | MIT | DESCARTAR como contexto padrão | 1 |
| Context7 | Docs de libs | Já no `mcp.json` | Manter no host. Fora do escopo da wiki de projeto | 3 para docs externas |

---

## wiki-carpaccio

| Campo | Informação |
|---|---|
| Nome | wiki-carpaccio |
| Categoria | Wiki de projeto |
| Repositório | Skill local `~/.agents/skills/wiki-carpaccio/SKILL.md` (não é um produto GitHub separado neste ambiente). Princípio externo: gist Karpathy |
| Documentação | A própria SKILL.md e `references/workflows.md` |
| Licença | Não há SPDX no frontmatter lido. Tratar como artefato do ambiente do autor, não como licença de terceiros verificada |
| Estado | `status: draft`, `version: 1.0.0` no frontmatter |
| Funcionalidade | Cria `.ai/{CLAUDE.md,index.md,log.md,raw/,wiki/}`. Ingest atualiza páginas em vez de copiar a fonte. Query lê o índice e só as páginas necessárias. Lint marca `obsoleto` e conflito. Código vence a wiki |
| Evidência | Texto da skill + ADR-0004 accepted no checkout |
| Consumo de tokens | `NOT_MEASURED`. A skill manda não carregar a wiki inteira. Isso é regra, não medição |
| Dependências | Nenhuma rede. Git só para histórico |
| Integração | Já é a convenção do ADR-0004. O engine não precisa importá-la. O agente segue a skill no diretório do projeto |
| Compatibilidade | Agentes que leem Markdown. Não exige Obsidian |
| Sobreposição | Com Graphify `--wiki`, com vault `WIKI_ROOT`, com `KnowledgeStore` de run |
| Riscos | Wiki stale se ninguém correr update. `.ai/CLAUDE.md` é instrução: conteúdo malicioso numa wiki clonada é injeção |
| Custo | Tempo de agente na init/lint. Sem serviço |
| Recomendação | **INTEGRAR** no sentido de passar a usar. Não reescrever |

Notas (1–5): benefício 5, evidência 4 (spec+ADR, zero uso medido neste repo), economia de tokens 2 (hipótese), qualidade de recuperação 4 para decisões e 2 para “onde está a função”, integração 5, manutenção 5, segurança 3 (injeção via markdown), maturidade 3 (draft), sobreposição se virar RAG 1.

O que mudaria a nota: um harness em que a wiki aumente arquivos lidos ou contradiga o código sem ser marcada.

## KnowledgeBackend Wiki

| Campo | Informação |
|---|---|
| Nome | `WikiKnowledgeBackend` + CLI `gaabwiki` |
| Categoria | RAG / grounding organizacional |
| Repositório | `orchestrator/src/knowledge/backend/wiki-backend.ts`. Pacote Python vive na vault, fora deste git |
| Documentação | `docs/architecture/knowledge/KNOWLEDGE-BACKEND-CONTRACT.md`, ADR-0012, ADR-0004 |
| Licença | Core EvolveLoop MIT. Pacote da vault não auditado aqui (vault ausente) |
| Estado | Ativo no código. Indisponível neste ambiente (`WIKI_ROOT` vazio) |
| Funcionalidade | Search/inspect/health. Devolve `EvidenceSet` com `error_code` |
| Evidência | Código + testes `knowledge-backend.test.ts` existem; não foram reexecutados nesta pesquisa |
| Consumo de tokens | Contrato diz `token_cost: none` para a capability. O modelo externo usado na vault, se houver, não foi medido |
| Dependências | Python, `WIKI_ROOT`, módulo `WIKI_CLI_MODULE` (default `gaabwiki`). Embeddings: Ollama opcional |
| Integração | Já é o default |
| Compatibilidade | Qualquer corpus no layout da CLI. Não indexa o repo de código sozinho |
| Sobreposição | Não substitui `.ai/` do repo (ADR-0004) |
| Riscos | `spawn` com `env` completo. Timeout vira evidência vazia, e o gate de grounding não pode tratar vazio como sucesso sem `skipped_trivial` |
| Custo | Processo Python por query |
| Recomendação | **INTEGRAR** como está. Não embutir LanceDB no TS (alternativa já rejeitada) |

## wiki-mem

| Campo | Informação |
|---|---|
| Nome | wiki-mem |
| Categoria | Memória episódica |
| Repositório | `.cursor/skills/wiki-mem/` e espelho `Agents/Wiki-mem.md` |
| Documentação | SKILL.md da skill; menção em `AGENT.md` |
| Licença | Parte do projeto |
| Estado | Especificada. `memory.enabled: false` no perfil público. Hooks ausentes de `.cursor/hooks.json` |
| Funcionalidade | Sessão, `promote-queue`. Promote não escreve `raw/` |
| Evidência | Docs + perfil. Não observada em execução nesta sessão |
| Consumo de tokens | `NOT_MEASURED` |
| Dependências | Hooks e profile |
| Integração | Já prevista como opt-in |
| Sobreposição | claude-mem, Mem0, Letta, MCP memory |
| Riscos | Log de sessão com segredo. Promote precipitado vira “fato” |
| Custo | Baixo se opt-in |
| Recomendação | **INTEGRAR** apenas no sentido de não criar outra memória. Ligar hooks continua decisão de perfil, não da V2.2 de wiki |

## Graphify

| Campo | Informação |
|---|---|
| Nome | Graphify (Graphify Labs). CLI `graphify`, pacote PyPI **`graphifyy`** |
| Categoria | Grafo de código / wiki gerada / MCP |
| Repositório | https://github.com/Graphify-Labs/graphify |
| Documentação | https://docs.graphify.com/quickstart e skill `graphify/skill-pi.md` na branch `v8`. Índice de marketing: https://graphify.com/llms-full.txt |
| Licença | Apache-2.0 (API GitHub, 2026-10-21) |
| Estado | Ativo. `pushed_at` 2026-10-21. Release **v0.9.93** publicada 2026-10-20. Não arquivado. `safishamsi/graphify` resolve para este repo |
| Funcionalidade | Árvore de código com tree-sitter, sem LLM, segundo o README e o `llms-full.txt`. Docs, PDF, imagem e vídeo usam modelo do assistente ou API. Arestas `EXTRACTED`, `INFERRED`, `AMBIGUOUS`. Saídas em `graphify-out/` (`graph.json`, `graph.html`, `GRAPH_REPORT.md`). Query BFS/DFS, `path`, `explain`, `--budget N`. `--update` reextrai arquivos mudados. `--watch` reconstrói código sem LLM. `--wiki` gera `index.md` e um artigo por comunidade. `--mcp` sobe servidor stdio. Merge de vários repos. Export Neo4j/FalkorDB opcional |
| Evidência | README, skill e texto do vendor. Benchmark de sessão: ver arquivo 04. Claim “71×” é mantenedor (abr/2026) e não foi confirmado por bench posterior |
| Consumo de tokens | Query aceita `--budget`. Custo da extração semântica: **não medido**. Extração de código: local, sem token de modelo, segundo o vendor |
| Dependências | Python ≥ 3.10, `uv` ou pipx. Modelo só na passagem semântica. Neo4j não é obrigatório |
| Integração | Skill de host ou CLI atrás de experiment flag. Artefatos no repo ou em cache fora do git. **Não** novo valor de `KnowledgeBackendId` na P1 |
| Compatibilidade | Pastas, não exige Git (o CLI aceita path local). Monorepo: a skill aponta um fluxo de merge; não foi lido o algoritmo de dedupe. Produto cloud (app.graphify.com, MCP `api.graphify.com`) é outro contrato, com conta |
| Sobreposição | `--wiki` duplica `.ai/`. Grafo de símbolos sobrepõe Serena e o repo map do Aider. Não sobrepõe decisões de ADR |
| Riscos | Arestas `INFERRED` tratadas como fato. `GRAPH_REPORT.md` vira contexto stale. Passagem de docs envia conteúdo a um modelo. Skill manda query o grafo **antes** de ler código: isso compete com “código vence wiki”. Injeção via nó de documentação. Telemetria do binário OSS: o `llms-full.txt` diz “no telemetry” no engine open source. Não foi auditado o código |
| Custo | CPU local na extração AST. LLM se `--mode deep` ou corpus não-código. Disco de `graph.json` |
| Recomendação | **PROTOTIPAR** só a passagem de código + `query --budget`. **DESCARTAR** `--wiki` como segunda wiki e o cloud como dependência da V2.2 |

Notas: benefício 3 (relações de código, não decisões), evidência 3 (docs fortes, benches de token fracos ou enviesados), economia 2, qualidade 3 para call graph e 2 para “por que decidimos”, integração 3, custo operacional 3, segurança 3, maturidade 3 (v0.9.x apesar da adoção), risco de duplicação 4 se ligado por default.

O que mudaria para INTEGRAR: no harness da seção 08, menos arquivos lidos **e** igual ou melhor taxa de acerto em tarefas de dependência, com arestas INFERRED rotuladas na evidência. O que mudaria para DESCARTAR: adoção tipo “o agente não chama” (visto no bench comunitário com Claude Code) ou respostas sem `file:line` verificável.

Identidade que não é este projeto: outros pacotes PyPI `graphify*` e o site graphify.net, ambos negados pelo vendor no `llms-full.txt`.

## Caveman

| Campo | Informação |
|---|---|
| Nome | Caveman (`JuliusBrussee/caveman`), não o fork de skills genérico |
| Categoria | Estilo de saída; proxy de compressão; compressão de arquivos de memória |
| Repositório | https://github.com/JuliusBrussee/caveman |
| Documentação | `skills/caveman/SKILL.md`, `skills/caveman-compress/SKILL.md`, README do release 4.x |
| Licença | Apache-2.0 (API, 2026-10-21) |
| Estado | Ativo. Release **v4.0.1** em 2026-10-13. `pushed_at` 2026-10-21 |
| Funcionalidade | **Voz:** respostas curtas; persistência até “stop caveman”; níveis lite/full/ultra. A skill diz para voltar à prosa em aviso de segurança, ação irreversível e sequência ambígua. **Compress:** reescreve Markdown de memória via Claude, valida blocos de código, recusa nomes sensíveis (`.env`, chaves). Backup fora da árvore. **Proxy 4.x (README):** comprime logs/JSON/CSV antes do modelo; roteamento de modelo (“Auto”, conta gratuita); “blocks” reexecutam scripts. Números do README (63→20, −33,2% input, −54% vs Opus, 129,8× em página) são do mantenedor |
| Evidência | Skill + blog JetBrains para o modo voz. Proxy: post do autor, não reproduzido |
| Consumo de tokens | Voz em tarefas agênticas: −8,5% saída no bench JetBrains. −65% não se aplica a esse desenho. Proxy: `NOT_MEASURED` aqui |
| Dependências | Voz: nenhuma. Compress: Claude. Proxy: processo local no caminho do provedor. Auto: conta, segundo o README |
| Integração | Host do agente, nunca dentro de Policy/Evidence. Não é `KnowledgeBackend` |
| Compatibilidade | O efeito depende do que a saída contém. Código não encolhe, por desenho |
| Sobreposição | Qualquer instrução “seja breve”. Não substitui retrieval |
| Riscos | Ultra/wenyan aumenta ambiguidade. Compress destrói nuance de requisito se alguém apontar para ADR ou contrato. Proxy pode alterar tool output de que o próximo passo depende. Um trial no bench JetBrains mostrou custo maior por contexto longo |
| Custo | Voz: zero de infra. Compress e Auto: chamadas de modelo |
| Recomendação | Voz: **MONITORAR** (opcional no host, fora do core). Compress de arquivo: **DESCARTAR** para contrato, skill, código, policy, evidência. Proxy: **PROTOTIPAR** só como experimento isolado, com original byte-a-byte e diff do que foi enviado ao modelo |

Preservação declarada na skill de compress: código cercado, inline code, URLs, paths, comandos, nomes técnicos, números, env vars, headings. Remoção declarada: artigos, hedging, conectivos. Isso pode apagar uma negação que esteja em prosa (“não” solto). A própria skill de voz diz que uma negação caída custa mais que o token poupado. Não há prova automática de que o modelo compressor obedece sempre.

## Graphiti

| Campo | Informação |
|---|---|
| Nome | Graphiti (`getzep/graphiti`) |
| Categoria | Grafo temporal para agentes |
| Repositório | https://github.com/getzep/graphiti |
| Documentação | https://help.getzep.com/graphiti |
| Licença | Apache-2.0 |
| Estado | Ativo (`pushed_at` 2026-10-21). 488+ issues abertas no snapshot da busca; o número inclui o que a UI mostra, não foi recontado |
| Funcionalidade | Grafo que integra episódios ao longo do tempo, com proveniência e retrieval híbrido (semântico + keyword + travessia). Não recomputa o grafo inteiro a cada update, segundo o README. Zep é o produto hospedado por cima; o grafo de produção do Zep é proprietário |
| Evidência | README + paper citado pelo projeto (“Zep: A Temporal Knowledge Graph Architecture”). Paper não foi relido linha a linha nesta sessão |
| Consumo de tokens | Extração de entidades usa LLM. `NOT_MEASURED` para o EvolveLoop |
| Dependências | Grafo (Neo4j ou equivalente; o README distingue o engine proprietário do Zep). Chave de modelo para extração |
| Integração | Seria um segundo store. A V3 proíbe competir com `KnowledgeBackend`. O World Model futuro é o lugar de crença temporal, e ainda não deve ser antecipado |
| Sobreposição | MemoryStore, wiki-mem, World Model V3, Graphify |
| Riscos | Fato extraído por LLM vira aresta. Cross-project se o grafo for único. Custo contínuo de extração |
| Custo | Serviço de grafo + tokens de indexação |
| Recomendação | **MONITORAR**. Não é a wiki de código da V2.2 |

## Microsoft GraphRAG

| Campo | Informação |
|---|---|
| Nome | GraphRAG |
| Categoria | Graph RAG em lote |
| Repositório | https://github.com/microsoft/graphrag |
| Documentação | https://microsoft.github.io/graphrag/ |
| Licença | MIT |
| Estado | README consultado via busca em 2026-10-21: **maintenance mode**, sem features novas, bugs e CVEs apenas. `pushed_at` 2026-10-20 (manutenção ainda ocorre) |
| Funcionalidade | Pipeline LLM que extrai grafo de texto não estruturado e responde com comunidades/sumários |
| Evidência | README + paper original da Microsoft Research. Custo de indexação é conhecido como alto na literatura; não remedido aqui |
| Consumo de tokens | Alto na indexação (LLM por documento). Número exato: não copiado de memória; `NOT_MEASURED` nesta sessão |
| Dependências | Modelo de extração, armazenamento do índice |
| Integração | Segundo índice, batch, pouco incremental para um repo que muda todo dia |
| Sobreposição | LightRAG, Graphify semântico, vault |
| Riscos | Projeto sem evolução de feature. Custo. Sumário de comunidade desatualizado |
| Custo | Alto |
| Recomendação | **DESCARTAR** como dependência nova da V2.2 |

## LightRAG

| Campo | Informação |
|---|---|
| Nome | LightRAG (`HKUDS/LightRAG`) |
| Categoria | RAG grafo + vetor |
| Repositório | https://github.com/HKUDS/LightRAG |
| Documentação | https://arxiv.org/abs/2410.05779 |
| Licença | MIT |
| Estado | Ativo (`pushed_at` 2026-10-20). Paper EMNLP 2025 |
| Funcionalidade | Indexação mais barata que GraphRAG clássico, updates incrementais, grafo e vetor juntos. O README afirma qualidade alta mesmo com LLM de ~30B. Isso é claim do paper/projeto, não replicado aqui |
| Evidência | README + arXiv |
| Consumo de tokens | Menor que GraphRAG no desenho do paper; valor absoluto `NOT_MEASURED` |
| Dependências | LLM + embeddings + store |
| Integração | Mais um índice paralelo à wiki e ao `KnowledgeBackend` |
| Sobreposição | Vault LanceDB já prevista como opcional no ADR-0004, do lado Python |
| Riscos | Dois índices para manter frescos. Licença MIT é compatível; o custo operacional não |
| Custo | Médio-alto |
| Recomendação | **MONITORAR**. Se um dia o corpus `.ai/` passar de busca por índice humano, o lugar é o backend Python já previsto, não um segundo framework |

## Serena

| Campo | Informação |
|---|---|
| Nome | Serena (`oraios/serena`) |
| Categoria | MCP de recuperação e edição simbólica |
| Repositório | https://github.com/oraios/serena |
| Documentação | https://oraios.github.io/serena |
| Licença | Aplicação **GPL-3.0-or-later**; SolidLSP MIT. Visão geral no `LICENSE` do repo (raw, 2026-10-21). SPDX da API: `NOASSERTION` |
| Estado | Ativo (`pushed_at` 2026-10-20) |
| Funcionalidade | Find symbol, outline, referências, diagnósticos, via LSP (default) ou plugin JetBrains pago. Não é wiki |
| Evidência | README. No bench comunitário, foi pouco chamada no Claude Code e −16% de tokens de saída no Codex (amostra pequena, conflito de interesse de quem mediu) |
| Consumo de tokens | `NOT_MEASURED` aqui. Pode reduzir leitura de arquivo se o agente usar o símbolo certo |
| Dependências | Language servers instalados. Plugin JetBrains é pago |
| Integração | MCP de host. Embutir no repo MIT mistura GPL |
| Sobreposição | IDE do Cursor, `go to definition`, Graphify AST |
| Riscos | GPL no core. Edição simbólica fora do Policy/Evidence do engine. Marketplace de MCP está desatualizado, segundo o próprio README |
| Custo | Processos LSP |
| Recomendação | **MONITORAR**. Não copiar para `orchestrator/` |

## LLMLingua

| Campo | Informação |
|---|---|
| Nome | LLMLingua e LLMLingua-2 (`microsoft/LLMLingua`) |
| Categoria | Compressão de prompt |
| Repositório | https://github.com/microsoft/LLMLingua |
| Documentação | https://arxiv.org/abs/2310.05736 e https://aclanthology.org/2024.findings-acl.57/ |
| Licença | MIT |
| Estado | Push 2026-09-10. Pesquisa, não produto de agente |
| Funcionalidade | Remove tokens de baixa perplexidade (LLMLingua) ou classifica tokens a manter (LLMLingua-2, encoder pequeno, 3–6× mais rápido que o método anterior no paper, compressão 2–5× naquele estudo) |
| Evidência | Papers. Findings EMNLP 2025 (https://aclanthology.org/2025.findings-emnlp.949/) mostram que compressores podem falhar em preservar detalhe e grounding |
| Consumo de tokens | O paper de 2023 fala em até 20× com pouca perda em GSM8K/BBH/ShareGPT/Arxiv. Isso não é sessão de patch |
| Dependências | Modelo pequeno de compressão (LLaMA ou XLM-R, conforme o paper) |
| Integração | No meio do prompt do engine. Quebra cache de prefixo se o texto comprimido mudar a cada turno |
| Sobreposição | Caveman, sumarização |
| Riscos | Perda de negação, path, número. Custo do compressor. Incompatível com “não comprimir contrato” |
| Custo | GPU/CPU do modelo pequeno em toda chamada |
| Recomendação | **DESCARTAR** no caminho quente da V2.2 |

## Mem0, Letta, claude-mem, MCP memory, Repomix

| Nome | Repo | Licença | Estado API 2026-10-21 | Função | Recomendação |
|---|---|---|---|---|---|
| Mem0 | https://github.com/mem0ai/mem0 | Apache-2.0 | push 2026-10-21 | Memória plugável de agente, em geral com extração LLM e store | **DESCARTAR** no core. Duplica MemoryStore e empurra fato não verificado |
| Letta | https://github.com/letta-ai/letta | Apache-2.0 | push 2026-10-18 | Runtime de agente com memória (linha MemGPT) | **DESCARTAR**. É outro orquestrador |
| claude-mem | https://github.com/thedotmack/claude-mem | Apache-2.0 | push 2026-10-21 | Captura sessão, comprime, reidrata | **DESCARTAR**. Duplica wiki-mem. Risco de segredo em transcript |
| MCP memory | npm `@modelcontextprotocol/server-memory` | Licença do pacote npm **não verificada** nesta sessão | Listado no `mcp.json` | Grafo JSON local do host | **DESCARTAR** como SSOT de projeto. Um arquivo global mistura repos |
| Repomix | https://github.com/yamadashy/repomix | MIT | push 2026-10-18 | Um arquivo com o repo inteiro | **DESCARTAR** como estratégia de contexto. Útil só para export manual pontual, fora do loop |

## Técnicas sem repositório único

| Técnica | Fonte | Papel | Recomendação |
|---|---|---|---|
| Prompt caching | https://platform.claude.com/docs/en/build-with-claude/prompt-caching (consulta 2026-10-21) | Reusa prefixo exato (`tools` + `system` + `messages` até o breakpoint). TTL default 5 min; 1 h custa mais. Qualquer mudança no prefixo invalida | **PROTOTIPAR** no adapter do provedor que expuser isso. Não simular cache no Cursor se a API não estiver no caminho |
| Contextual Retrieval | https://www.anthropic.com/engineering/contextual-retrieval | Prefixa 50–100 tokens de contexto do documento antes de embeddar/BM25. Claim: −49% falhas de retrieval; −67% com rerank. Custo de geração amortizado com prompt cache no exemplo deles (US$ 1,02 / milhão de tokens de documento, premissas do post) | **MONITORAR**. O corpus atual nem está montado (`WIKI_ROOT` vazio). Aplicar isso na vault é evolução do `gaabwiki`, não da V2.2 de projeto |
| Repo map Aider | Já auditado em `docs/research/targets/external/aider/REPORT.md` | Tree-sitter + PageRank, orçamento `--map-tokens` ~1k | Não integrar o Aider. Se o protótipo Graphify falhar, este algoritmo é o braço alternativo — ainda assim `NOT_MEASURED` |
| Sumário hierárquico (RAPTOR e afins) | Não reaberto o paper nesta sessão | Árvore de sumários | **MONITORAR**. Inferência: mais um artefato que apodrece. Sem URL de replicação local, não entra no plano |
| Rerankers (bge, Cohere) | Não medidos | Reordenam top-k | **MONITORAR**. Só fazem sentido depois de existir um retriever com top-k grande. A wiki-carpaccio não tem esse retriever |

## Scores consolidados (benefício V2.2)

| Candidato | Benefício | Evidência | Tokens mensuráveis hoje | Integração | Segurança | Maturidade | Sobreposição |
|---|---:|---:|---:|---:|---:|---:|---:|
| wiki-carpaccio | 5 | 4 | 1 | 5 | 3 | 3 | 2 (baixa se for a única wiki) |
| KnowledgeBackend | 4 | 5 | 1 | 5 | 3 | 4 | 2 |
| lexical rg | 5 | 5 | 2 | 5 | 4 | 5 | 2 |
| Graphify código | 3 | 3 | 1 | 3 | 3 | 3 | 4 |
| Caveman voz | 2 | 4 (JetBrains) | 3 no harness deles, 1 no nosso | 4 no host | 3 | 3 | 2 |
| Graphiti / LightRAG | 2 | 3 | 1 | 2 | 2 | 4 | 5 |
| LLMLingua / Mem0 / Repomix / GraphRAG | 1 | 3 | 1 | 1 | 2 | varia | 5 |
