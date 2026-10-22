# Auditoria do estado atual

**Tree:** `release/v2.1-freeze-preparation` @ `28ab56ce` (2026-10-11), salvo indicação `evolve-v3`.

## 1. Arquitetura real da V2

O README público descreve o núcleo como Capability → Policy/PDA → Runtime/Evidence → Knowledge (Wiki) → Telemetry/Evals/Evolution. O `orchestrator/README.md` chama o pacote de **Orquestrador v2** e aponta as specs em `.cursor/skills/orquestrar/references/specs/`.

Peças observadas no código:

| Peça | Onde | O que faz de fato |
|---|---|---|
| `KnowledgeBackend` | `orchestrator/src/knowledge/backend/types.ts` | União fechada `"wiki" \| "fake"`. Operações `search`, `inspect`, `health`. |
| `WikiKnowledgeBackend` | `wiki-backend.ts` | `spawn("python", ["-m", módulo, "search", query])` com `cwd = WIKI_ROOT`. Timeout 20 s. STDOUT JSON ou linhas `fonte \| score \| excerpt`. Excerpt cortado em 500 caracteres (`cleanOutput`). Herda `process.env`. |
| `KnowledgeStore` | `knowledge-store.ts` | Lista em memória. Busca por capability, tag e `content.includes`. Não é embedding. |
| `FilesystemKnowledgeStore` | `filesystem-knowledge-store.ts` | Markdown com frontmatter sob `patterns/`, `pitfalls/`, `bugs/`, `decisions/`, `learned-lessons/`, `contracts/` + `index.yaml`. |
| `MemoryStore` | `memory-store.ts` | Escopo `feature_id`. Append de preferências, rejeições e decisões. Comentário no arquivo: “V2 API”. |
| Checkpoint | freeze V2.1 fase 3 | Envelope HMAC-SHA256 no job path. Não é memória semântica. |
| Perfil | `profiles/default.yaml` | `knowledge.backend: wiki`. `memory.enabled: false`, provider `wiki-mem`. |
| Hooks públicos | `.cursor/hooks.json` | Só pickup do orquestrador (`stop`, `afterShellExecution` de `run-engine`). Sem hooks `wiki-mem`. |
| Skills de conhecimento | `.cursor/skills/wiki`, `wiki-mem`; `wiki-carpaccio` está fora do pack podado (`host_only_untouched` no inventário de 2026-09-19) | Papéis diferentes, descritos abaixo. |

O contrato `knowledge.search` (`orchestrator/contracts/knowledge.search.yaml`, v1.0.0) declara `token_cost: none`, `network: false`, `shell: false`. A implementação dá `spawn` de Python com o ambiente do processo. O freeze V2.1 (2026-10-11) já registrou que `knowledge.*`, quando autorizado, corre no host. O contrato e o processo não são a mesma cerca.

EvolveLoop V1 (camada de evolução, não o “produto V2”) está documentado como `V1_READY_WITH_LIMITATIONS`: observação, candidatos com gate, adapters de Evidence/Eval/Feedback incompletos (`docs/architecture/public/LIMITATIONS.md`).

## 2. Escopo documentado da V3

Fonte: branch `evolve-v3`, não este working tree.

`docs/architecture/v3/MASTER-MODEL.md` define arquitetura **aditiva**:

```text
substrato V2 (Intent → Capability → Policy → Runtime → Provider → Evidence)
  + Agency
  + Intelligence (World Model / Memory trust / Reasoning)
  + interação persistente com o mundo
  + evolução governada
  + Meta 0 (prova pública)
```

Proibições explícitas no mesmo conjunto de docs:

- Descartar a V2 ou criar segundo registry / segundo evidence stack.
- Agency executar capabilities direto.
- Segundo knowledge store competindo com `KnowledgeBackend`.
- Escrever inferência no canal Observation.

`WORLD-MODEL.md` empilha `WorldModelStore` (Observation + Belief) **acima** do `KnowledgeBackend` e do `MemoryStore` V2, sem substituí-los. Memory Trust na primeira onda é schema (`memory-trust.yaml`: OBSERVED, VERIFIED, INFERRED, REPORTED, LEARNED, PREDICTED, INVALIDATED, STALE). O runtime de Memory Trust está nos non-goals desse checkpoint.

`EVOLVELOOP_V3.md` reserva para a V3, entre outras metas ainda não entregues no checkpoint c0:

- Meta 6 — memória semântica, episódica, procedural, de trabalho, de falha e de decisão, com seleção e compressão.
- Meta 7 — atenção: experiência bruta → compressão → saliência → retrieval → contexto ativo. Acumular histórico no contexto é rejeitado pelo próprio texto.
- Meta 22 — orçamento e custo como governor.
- Meta 78 — frescor do conhecimento.
- Seções 192–195 — consolidação, esquecimento, defesa contra contaminação entre projetos.
- Meta 0 — demos reproduzíveis. No checkpoint, `runDemoStub` não emite PASS (`META0-DEMOS.md`).

Status do checkpoint c0, nas palavras do master model: **não COMPLETE**. Sandbox de SO, planner LLM, horizonte longo, aquisição real e Meta 0 live continuam abertos.

Consequência para a V2.2: pode melhorar a wiki de projeto e a recuperação **no substrato V2**. Não deve implementar World Model, Agency, Memory Trust runtime, nem um grafo que passe a competir com `KnowledgeBackend`.

## 3. Conhecimento, memória, wiki, RAG

Há quatro mecanismos. Confundi-los é o erro que o ADR-DR-0005 tenta evitar.

| Mecanismo | Escopo | Persistência | Retrieval | Quem escreve |
|---|---|---|---|---|
| Vault Wiki (`WIKI_ROOT`, CLI `gaabwiki`) | Corpus do usuário, vários projetos em notas | Fora do repo EvolveLoop | BM25; LanceDB/Ollama opcional (ADR-0004, ADR-0005 de embeddings). Não reimplementado no TS | Skill `wiki` + CLI |
| `.ai/` wiki-carpaccio | Um repositório | Git do projeto | Ler `index.md` e páginas. A skill **proíbe** construir RAG agora | Agente, sob pedido |
| `KnowledgeStore` / filesystem | `data-dir` da run, kinds fixos | Disco se o CLI receber `--data-dir` | Substring | Providers / curadoria |
| `MemoryStore` + `wiki-mem` | Feature ou sessão | YAML por feature; `.ai/sessions` no desenho da skill de memória | Filtro por tipo; CLI `mem.py` na doc histórica | Append de sessão |

ADR-0004 (2026-09-17, accepted) escolhe o contrato dual: Carpaccio em `.ai/` **e** bridge RAG no Python. Alternativa de embutir LanceDB no Node foi rejeitada.

No ambiente desta sessão o bridge está inoperante: `WIKI_ROOT` vazio → `RAG_REPO_MISSING`. Isso é o comportamento fail-closed documentado em `KNOWLEDGE-ARCHITECTURE.md`, não um bug novo.

## 4. Skills relevantes

Inventário pós-poda (2026-09-19) não é um catálogo de retrieval. Skills que importam para esta pesquisa:

| Skill | Função comprovada | Dependência |
|---|---|---|
| `wiki` | Context pack. Ritual `ground.sh`. Não promove memória. | `WIKI_ROOT`, Python `gaabwiki` |
| `wiki-mem` | Episódio e fila de promote. Não é o RAG. | Profile `memory.enabled`; hooks próprios, ausentes do `hooks.json` público |
| `wiki-carpaccio` | Wiki Markdown por repo. Init, ingest, query, update, lint. | Nenhuma rede. Git opcional para histórico |
| `researcher` | Pesquisa externa citada. Não grava na vault. | Ferramentas de busca do host |
| `orquestrar` | Grafo de execução e gate `knowledge-grounding` | Contratos em `references/specs/knowledge-memory.md` |

O spec `knowledge-memory.md` descreve árvores `knowledge/` e `memory/<feature_id>/` e uma regra de promoção “3 ocorrências”. Isso é normativo da skill. O `MemoryStore` TS implementa append e filtros, não a promoção automática “3×”. Tratar o YAML da spec como runtime seria inventar comportamento.

## 5. MCPs disponíveis no manifesto

`mcp/README.md` e `mcp/mcp.json` listam, entre outros: context7, playwright, browsermcp, puppeteer, github, sequential-thinking, filesystem, docker, firecrawl, **memory** (`@modelcontextprotocol/server-memory`), sentry, linear, railway.

Nesta sessão, firecrawl e github não autenticaram. O servidor `memory` do MCP é um grafo JSON do host. Não há, no core, uma cerca que impeça esse grafo de misturar projetos. Não é o `KnowledgeBackend`.

Context7 serve documentação de bibliotecas externas. Não substitui wiki de projeto.

## 6. Redução de contexto hoje

| Mecanismo | Estado |
|---|---|
| Compaction / reinject no engine | `NOT_IMPLEMENTED` (ADR-DR-0005) |
| Budget `max_skills` no engine | Adiado (ADR-DR-0002). E-001 é harness offline |
| Excerpt cap no parser wiki | 500 caracteres por hit, no código |
| STDOUT cap | 50_000 caracteres de stdout, 20_000 de stderr, no `wiki-backend.ts` |
| Progressive disclosure de skills | Pesquisado (P-001). Não é governor de produção |
| Prompt cache no engine | Ausente. Relatórios internos de Aider/Claude Code/Codex marcam isso como gap do host, não como feature deste repo |

E-001 (2026-09-19), bateria offline, estimativa por whitespace:

| Condição | token_estimate | activation_precision | task_success |
|---|---:|---:|---|
| CONTROL (23 skills) | 1673 | 0,335 | `NOT_MEASURED` |
| T_SKILLS_5 | 382 | 0,511 | `NOT_MEASURED` |
| T_SKILLS_10 | 789 | 0,421 | `NOT_MEASURED` |
| T_TOKENS_40 | 1010 (−39,6% vs CONTROL) | 0,341 | `NOT_MEASURED` |

O “~40%” vale só para T_TOKENS_40 contra CONTROL, e só como PROXY. ADR-DR-0002 recusa transformar isso em API de budget.

## 7. Contratos entre orquestrador, agentes, provedores e ferramentas

Cadeia pública, repetida na V3 como imutável: Intent/Capability IR → Policy → Runtime → Provider → Evidence.

`KnowledgeBackend` é o seam de retrieval. Estender o id para `"graphify"` ou `"lancedb"` **altera** o tipo público `KnowledgeBackendId` e o perfil. Dá para evitar essa mudança tratando Graphify como ferramenta de host/skill, com o resultado citado no contexto do agente, sem novo backend. Essa é a via compatível com “não quebrar backends já suportados”.

`knowledge.search` continua determinístico e sem custo de token **no contrato**. Uma passagem LLM dentro do retrieval violaria esse contrato se fosse escondida dentro da capability. Por isso a passagem semântica de Graphify (docs/PDF) não deve ser chamada de `knowledge.search`.

## 8. Hooks, comandos, perfis

- Perfil default: wiki on, memória off.
- Comandos de conhecimento no desenho do produto: `/wiki`, `/mem` (memória opt-in), `/evolve`.
- Hooks de memória episódica não estão no JSON público. A doc de publicação trata isso como overlay pessoal (GaabType), não como default.

## 9. Benchmarks existentes e limites

| ID | O que mede | O que não mede |
|---|---|---|
| E-001 | Precisão de ativação offline; PROXY de tokens do prefixo de skills | Tokenizer de vendor; sucesso de tarefa; injeção live no Cursor |
| E-005 | Resume de job no mesmo processo; sem STATE_WRITE duplicado no fixture | Kill de SO; efeitos externos |
| Freeze V2.1 | Build/testes da branch de preparação; HMAC de checkpoint; grants | LLM live; isolamento de SO |
| Baselines V1…Vn em `docs/internal/historical/evals` | Fingerprints de arquivos | Qualidade de RAG ou de wiki |
| Demos V3 | Stub que devolve `NOT_MEASURED` | Autonomia |

Anti-padrão já registrado: AP-004, explosão de tools/MCP no contexto. A V2.2 que adicionar Graphify **e** Serena **e** Mem0 **e** um vector store viola um achado interno anterior.

## 10. Duplicações, lacunas, pontos de integração

**Já dá para reutilizar**

- `.ai/` como wiki de projeto (skill pronta, ADR aceito).
- `KnowledgeBackend` para o corpus organizacional, quando `WIKI_ROOT` existir.
- `MemoryStore` para preferência e decisão da feature.
- Checkpoint para retomar grafo.
- `rg` / filesystem search como baseline lexical. Não exige dependência nova.
- Evidence bus para guardar a query, os paths lidos e a contagem de tokens, sem gravar segredo (regra já desejada; redação de segredo do commit `8878cb6` **não** está nesta branch, segundo o freeze).

**Lacunas comprovadas**

- Nenhum componente detecta “entrei neste diretório, existe wiki?”.
- Nenhum componente invalida página `.ai/` quando o arquivo citado muda.
- `KnowledgeStore` e a wiki `.ai/` podem divergir: o primeiro tem kinds de run; a segunda é a convenção humana. ADR-0004 não funde os dois.
- Isolamento entre projetos depende de `feature_id` e de paths, não de uma raiz de repositório aplicada a todos os índices.
- Conteúdo recuperado (wiki, MCP, PDF) não passa por um filtro de “isto é dado, não instrução” no engine V2. A V3 tem InstructionHierarchy no checkpoint parcial; não está neste tree.

**Não integrar no núcleo só porque o MCP já está listado**

O servidor `memory` e o Firecrawl são capacidade de host. Estar no `mcp.json` não os torna backend de conhecimento.
