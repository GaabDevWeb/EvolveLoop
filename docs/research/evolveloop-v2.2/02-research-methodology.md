# Metodologia

**Consulta:** 2026-10-21. Relógio do ambiente: quarta-feira, 21 de outubro de 2026.

## Pergunta

Como a V2.2 pode manter conhecimento persistente por projeto e reduzir tokens sem regredir qualidade, sem invadir o escopo da V3 e sem um segundo sistema de verdade.

## O que foi lido no código

Working tree `release/v2.1-freeze-preparation` @ `28ab56ce091fc25edbf67e5106268580becff2b2`.

Leituras diretas: `README.md`, `profiles/default.yaml`, `orchestrator/README.md`, `orchestrator/src/knowledge/backend/{types,wiki-backend}.ts`, `orchestrator/src/knowledge/knowledge-store.ts`, `orchestrator/src/memory/memory-store.ts`, `orchestrator/contracts/knowledge.search.yaml`, `.cursor/hooks.json`, `mcp/README.md`, `mcp/mcp.json` (só nomes de servidores), ADRs 0004 e 0012, ADR-DR-0002 e ADR-DR-0005, E-001, freeze V2.1, relatórios internos já existentes de Aider, Claude Code, OpenHands e Cursor.

Branch `evolve-v3` @ `556473fb0e7c2172be4eb5da5112a5b2c7e826ce`, somente leitura (`git show` / `git grep`). Arquivos: `EVOLVELOOP_V3.md` (trechos das metas 6, 7, 22, 78 e seções 192–195, 306–307), `v3-metas-topo.md` (início), `docs/architecture/v3/{MASTER-MODEL,WORLD-MODEL,AGENCY,CONTRACTS,OWNERS,META0-DEMOS}.md`, `orchestrator/contracts/v3/memory-trust.yaml`.

`orchestrator/src/v3/` **não existe** neste working tree.

## Grounding da vault

```text
bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs
→ WIKI_ROOT (or RAG_REPO_ROOT) is required.
```

Regra do projeto: código verificado vence a wiki. A vault não foi consultada. Isso é GAP, não prova de que a vault esteja vazia.

## Ferramentas externas

| Canal | Resultado |
|---|---|
| `agent-browser` | Binário ausente. Não instalado. |
| Firecrawl | HTTP 401 em `firecrawl_search`. |
| GitHub MCP | `namespaceStatus: error`. Não autenticado nesta sessão. |
| GitHub REST API pública | Metadados de repositórios (stars, licença SPDX, `pushed_at`, release). |
| WebSearch / WebFetch | Docs, READMEs, gist, blog JetBrains, threads Reddit via snippets e, no caso JetBrains, trechos longos do post. |
| X / Twitter | Não aberto como página. A URL do tweet de Karpathy aparece só numa fonte secundária (Hatchdoor). O gist GitHub é a fonte primária usada. |

Não houve `npm install`, `uv tool install`, clone de terceiros nem execução de scripts de Graphify/Caveman.

## Classificação de evidência

Usada em todo o dossiê:

| Rótulo | Significado |
|---|---|
| Código deste checkout | Observado no tree auditado |
| Git da branch `evolve-v3` | Observado por `git show`, não no working tree |
| Primária | Doc, paper ou post do autor no sítio oficial |
| Mantenedor | README, skill ou post do próprio projeto; pode ser promocional |
| Comunitária | Reddit ou reprint; amostra e conflito de interesse declarados quando conhecidos |
| Inferência | Conclusão do pesquisador a partir das fontes acima |
| `NOT_MEASURED` | Não executado aqui |

Stars do GitHub foram lidos na API em 2026-10-21 e **não** entram como critério de qualidade. Servem só para identificar o repositório certo e a atividade recente (`pushed_at`).

## Conflitos tratados em voz alta

- “V3” nos baselines `docs/internal/historical/evals/.../baseline-v3-2026-09-19` é snapshot longitudinal de código. A V3 de produto está em `EVOLVELOOP_V3.md` na branch `evolve-v3`. São coisas diferentes.
- O post de abril de 2026 no Reddit aponta `github.com/safishamsi/graphify`. A API em 2026-10-21 resolve esse nome para `Graphify-Labs/graphify`. O pacote PyPI oficial, segundo o próprio `llms-full.txt`, é `graphifyy`. `graphify.net` é declarado não afiliado pelo mesmo texto.
- Caveman “−65%” (material de produto) e “−8,5%” (JetBrains, julho de 2026, tarefas agênticas) medem populações diferentes. Os dois números ficam, com o escopo de cada um.
- O benchmark comunitário que inclui Graphify é de um autor que declara trabalhar em Repowise. Os números são citados com esse conflito. Não são tratados como estudo independente.
