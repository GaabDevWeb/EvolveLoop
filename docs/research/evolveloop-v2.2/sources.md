# Fontes

Consulta: **2026-10-21**, salvo data própria do documento.

Classes: `primária` (código, doc oficial, paper, post do autor no domínio oficial), `git` (objeto deste repositório), `mantenedor` (README/skill/marketing), `comunitária`, `secundária` (reprint), `inferência`.

## Repositório EvolveLoop

| Fonte | Classe | Onde |
|---|---|---|
| Tree `release/v2.1-freeze-preparation` @ `28ab56ce091fc25edbf67e5106268580becff2b2` | git | checkout |
| `evolve-v3` @ `556473fb0e7c2172be4eb5da5112a5b2c7e826ce` | git | `EVOLVELOOP_V3.md`, `docs/architecture/v3/*`, `orchestrator/contracts/v3/memory-trust.yaml`, `v3-metas-topo.md` |
| ADR-0004, ADR-0012, ADR-DR-0002, ADR-DR-0005 | git | `docs/adr/`, `docs/architecture/finalization/adrs/` |
| E-001 e reconciliação de tokens | git | `docs/internal/historical/evals/docs-evals/experiments/E-001/`, decision-review 2026-09-19 |
| Freeze V2.1 | git | `docs/architecture/release-audit-2026-10-11/V2.1-FREEZE-SCOPE-REPORT.md` (medição 2026-10-11) |
| Contratos knowledge, perfil, hooks, MCP manifest | git | paths citados no arquivo 01 |
| Dossiês Aider, Claude Code, OpenHands, Cursor | git | `docs/research/targets/external/*/REPORT.md` |
| AP-004 | git | `docs/research/anti-patterns/AP-004-context-tool-explosion.md` |
| Skill wiki-carpaccio | primária local | `~/.agents/skills/wiki-carpaccio/SKILL.md` (frontmatter version 1.0.0, draft) |
| `ground.sh` | primária local | falhou: `WIKI_ROOT` required. 2026-10-21 |

## GitHub API (2026-10-21)

Metadados `pushed_at`, licença SPDX e release. User-Agent `evolveloop-research`.

| Repo | Licença API | pushed_at | Release lida |
|---|---|---|---|
| https://github.com/Graphify-Labs/graphify | Apache-2.0 | 2026-10-21T15:23:36Z | v0.9.93 em 2026-10-20 |
| https://github.com/JuliusBrussee/caveman | Apache-2.0 | 2026-10-21T07:45:53Z | v4.0.1 em 2026-10-13 |
| https://github.com/getzep/graphiti | Apache-2.0 | 2026-10-21T02:47:25Z | não consultada |
| https://github.com/microsoft/graphrag | MIT | 2026-10-20T15:24:08Z | não consultada |
| https://github.com/HKUDS/LightRAG | MIT | 2026-10-20T18:06:26Z | não consultada |
| https://github.com/oraios/serena | NOASSERTION na API; texto da licença abaixo | 2026-10-20T08:47:27Z | não consultada |
| https://github.com/mem0ai/mem0 | Apache-2.0 | 2026-10-21T01:16:37Z | não consultada |
| https://github.com/letta-ai/letta | Apache-2.0 | 2026-10-18T22:28:04Z | não consultada |
| https://github.com/Aider-AI/aider | Apache-2.0 | 2026-05-22T14:02:20Z | não consultada |
| https://github.com/microsoft/LLMLingua | MIT | 2026-09-10T23:37:23Z | não consultada |
| https://github.com/thedotmack/claude-mem | Apache-2.0 | 2026-10-21T21:25:26Z | não consultada |
| https://github.com/yamadashy/repomix | MIT | 2026-10-18T12:29:58Z | não consultada |

`https://api.github.com/repos/safishamsi/graphify` devolveu `Graphify-Labs/graphify` (rename ou redirect). Não é um segundo produto.

Serena, texto: https://raw.githubusercontent.com/oraios/serena/main/LICENSE — aplicação GPL-3.0-or-later, SolidLSP MIT.

## Documentação e papers

| URL | Classe | Uso |
|---|---|---|
| https://github.com/Graphify-Labs/graphify | mantenedor | README: AST local, sem vetor, pacote `graphifyy` |
| https://github.com/Graphify-Labs/graphify/blob/v8/graphify/skill-pi.md | mantenedor | `--update`, `--budget`, `--wiki`, `--mcp`, `--watch`, merge |
| https://docs.graphify.com/quickstart | mantenedor | Quickstart local vs cloud |
| https://graphify.com/llms-full.txt | mantenedor | Identidade, Apache, “no telemetry” no OSS, 36 linguagens, negação de graphify.net e de outros pacotes PyPI. Claim “13.1M repositories” é marketing, não evidência |
| https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md | mantenedor | Regras da voz e o aviso sobre negação |
| https://github.com/juliusbrussee/caveman/blob/main/skills/caveman-compress/SKILL.md | mantenedor | Compressão destrutiva de Markdown via Claude; preservação de code fence |
| https://deepwiki.com/JuliusBrussee/caveman/8.1-compression-pipeline-and-scripts | secundária | Resumo do detector que recusa `.env` e código. Não substitui o fonte |
| https://github.com/getzep/graphiti | mantenedor | Grafo temporal, relação com Zep proprietário |
| https://help.getzep.com/graphiti | mantenedor | Docs |
| https://github.com/microsoft/graphrag | primária/mantenedor | Aviso de maintenance mode |
| https://microsoft.github.io/graphrag/ | mantenedor | Docs |
| https://github.com/HKUDS/LightRAG | mantenedor | Grafo+vetor, update incremental |
| https://arxiv.org/abs/2410.05779 | primária | Paper LightRAG |
| https://github.com/oraios/serena | mantenedor | MCP simbólico, aviso contra marketplace |
| https://oraios.github.io/serena | mantenedor | Docs |
| https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f | primária | LLM wiki, 2026-04-04. Três camadas e lint |
| https://platform.claude.com/docs/en/build-with-claude/prompt-caching | primária | Prefixo, TTL 5 min, ordem tools/system/messages |
| https://www.anthropic.com/engineering/contextual-retrieval | primária | −49% / −67% falhas de retrieval no estudo deles; custo de exemplo US$ 1,02 / M tokens de documento |
| https://arxiv.org/html/2310.05736 | primária | LLMLingua, até 20× nos datasets do paper |
| https://aclanthology.org/2024.findings-acl.57/ | primária | LLMLingua-2 |
| https://aclanthology.org/2025.findings-emnlp.949/ | primária | Compressão pode perder detalhe e grounding |

## Comunidade e imprensa

| URL | Data do post | Classe | Nota |
|---|---|---|---|
| https://blog.jetbrains.com/ai/2026/07/speak-to-ai-agents-like-cavemen-tosave-tokens/ | 2026-07 | primária | −8,5% saída, p=0,82, skill forçada, SkillsBench, Claude Code 2.1.200, sonnet-5 effort low |
| https://www.infoworld.com/article/4193775/talk-like-a-caveman-prompts-save-tokens-but-far-less-than-promised.html | 2026 | secundária | Repete a JetBrains |
| https://blog.jetbrains.com/ai/ | índice 2026 | primária | Série: Caveman parte 1; RTK parte 2 |
| https://www.reddit.com/r/LLMDevs/comments/1vnabcg/my_caveman_65_outputtoken_claim_got_85_in_an/ | 2026-08-13 | comunitária / mantenedor | Autor aceita 8,5% e alega −33,2% no proxy |
| https://www.reddit.com/r/ClaudeCode/comments/1vn9xyo/jetbrains_called_bullshit_on_cavemans_65_they/ | 2026-08-13 | comunitária / mantenedor | Mesmo relato |
| https://www.reddit.com/r/ClaudeAI/comments/1ss28rj/i_built_a_graphify_skill_for_claude_code_that/ | 2026-04-21 | mantenedor | Claim 71,5×; repo então citado como safishamsi/graphify |
| https://www.reddit.com/r/LLMDevs/comments/1vgdwfz/i_benchmarked_5_codebase_tools_across_claude_code/ | 2026-08-05 | comunitária, conflito de interesse | Autor trabalha em Repowise. Graphify ~0% a −11% de tokens de saída |
| https://www.reddit.com/r/vibecoding/comments/1wp1pto/i_benchmarked_repowise_codegraph_serena_graphify/ | 2026-09-24 | comunitária | Variante do mesmo esforço |
| https://magica.com/news/jetbrains-tests-caveman-and-rtk-token-claims | 2026-07-20 (página) | secundária | Não usada como número próprio |

## Não confirmado nesta sessão

| Item | Estado |
|---|---|
| https://x.com/karpathy/status/2039805659525644595 | Citado por fonte secundária (Hatchdoor). Página do X não aberta |
| Firecrawl, GitHub MCP, agent-browser | Indisponíveis (401, MCP error, binário ausente) |
| Execução de qualquer bench do arquivo 08 | `NOT_MEASURED` |
| Lista exata de gramáticas tree-sitter no Graphify v0.9.93 | Não extraída do código |
| Paper Zep/Graphiti linha a linha | Só o que o README afirma |
| Licença npm de `@modelcontextprotocol/server-memory` | Não verificada |
