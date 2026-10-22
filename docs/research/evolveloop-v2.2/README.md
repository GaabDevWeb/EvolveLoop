# EvolveLoop V2.2 — dossiê de contexto persistente e tokens

**Data da consulta:** 2026-10-21  
**Checkout auditado:** `release/v2.1-freeze-preparation` @ `28ab56ce091fc25edbf67e5106268580becff2b2` (2026-10-11)  
**Escopo V3 lido em:** branch `evolve-v3` @ `556473fb0e7c2172be4eb5da5112a5b2c7e826ce` (não está neste working tree)  
**Implementação V2.2:** não iniciada. Este diretório é pesquisa.

## Grounding Wiki

- **modo:** scout (CLI)
- **projeto:** EvolveLoop
- **confiança:** baixa no vault; alta no código deste checkout e em `git show` da branch `evolve-v3`

### Fontes

1. Código e docs deste checkout — KnowledgeBackend, MemoryStore, ADR-0004, ADR-DR-0005, E-001, freeze V2.1.
2. `evolve-v3:EVOLVELOOP_V3.md` e `docs/architecture/v3/*` — escopo planejado da V3.
3. Skill `wiki-carpaccio` em `~/.agents/skills/wiki-carpaccio/SKILL.md`.
4. Fontes externas listadas em [sources.md](sources.md).

### Contratos / decisões já aceitos

- Knowledge ≠ Memory ≠ Checkpoint. Compaction/reinject está **adiada** até um ADR de ownership (ADR-DR-0005, 2026-09-19).
- RAG não entra no orchestrator TypeScript. O backend default é Wiki via CLI externo (`KNOWLEDGE-ARCHITECTURE.md`, ADR-0012).
- Wiki de projeto em `.ai/` é convenção normativa (ADR-0004), separada do vault `WIKI_ROOT`.
- A V3 é camada aditiva. É proibido um segundo knowledge store competindo com `KnowledgeBackend` (`WORLD-MODEL.md` na branch `evolve-v3`).

### GAPs

- `WIKI_ROOT` / `RAG_REPO_ROOT` não estavam definidos. `ground.sh list-packs` falhou. Nenhum pack da vault foi carregado.
- `agent-browser` não está instalado. Não foi instalado (restrição da pesquisa).
- Firecrawl respondeu HTTP 401. GitHub MCP estava em erro. X/Twitter não foi lido como página primária.
- Nenhum benchmark novo foi executado. Números de terceiros estão classificados em [sources.md](sources.md).

### Pack

- nome: nenhum
- carregado via: n/a (`WIKI_ROOT` ausente)

### Método

- comandos: `bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs` → `WIKI_ROOT is required`
- complemento: leitura direta do checkout, `git show evolve-v3:…`, GitHub API, WebSearch/WebFetch

### Handoff

- repo código: este checkout
- próximo: decidir o ADR de ownership e o protótipo de medição; não implementar a V2.2 a partir deste dossiê sem esse gate
- anti-vibe: este relatório não altera o runtime

---

## Relatório executivo

A V2 já tem as peças que a V2.2 precisa para conhecimento persistente por projeto. Falta operá-las com isolamento, atualização e medição. Não falta um grafo novo, um compressor de prompts nem uma segunda memória.

### O que foi comprovado neste checkout

| Capacidade | Implementação atual | Limitação comprovada | Evolução possível na V2.2 |
|---|---|---|---|
| Conhecimento por projeto | ADR-0004 + skill `wiki-carpaccio` (`.ai/`). O engine não inicializa essa árvore. | Não há detector de raiz, monorepo, repo aninhado ou diretório temporário no orchestrator. | Ritual sob demanda da skill já escrita. Sem novo store. |
| Persistência entre sessões | `MemoryStore` por `feature_id`; `wiki-mem` opt-in (`memory.enabled: false`); checkpoint HMAC da fase 3 do freeze V2.1. | Memória de feature ≠ wiki do projeto. `wiki-mem` não está no `hooks.json` público. | Manter os três separados. Não fundir. |
| Recuperação de contexto | `WikiKnowledgeBackend.search` → `python -m gaabwiki` se `WIKI_ROOT` existir. `KnowledgeStore` filtra substring. | Sem `WIKI_ROOT`: `RAG_REPO_MISSING`. Store TS não é RAG. Excerpt limitado a 500 caracteres no parser. | Consultar `.ai/index.md` e poucas páginas; código continua fonte de verdade. |
| Compressão de tokens | Não há pipeline de compaction (ADR-DR-0005). E-001 mediu `token_estimate` por whitespace, offline. | `task_success` live = `NOT_MEASURED`. ADR-DR-0002 adia budget de catálogo no runtime. | Medir com tokenizer do provedor. Não comprimir contratos. |
| Busca em código | Capabilities `filesystem.*` / `git.*` no provider determinístico; no host Cursor, Instant Grep está documentado e o índice semântico interno é UNKNOWN. | O engine não possui repo map nem grafo de símbolos. | Baseline lexical primeiro. Grafo só como experimento. |
| Atualização incremental | Wiki-carpaccio: update após mudança relevante + lint. Não há hash/git watcher no engine. | Página obsoleta só muda se alguém correr o workflow. | Marcar `status: obsoleto`; não apagar em silêncio. |
| Coordenação entre agentes | Capability IR → Policy → Runtime → Provider → Evidence. Jobs/checkpoint por feature. | Contexto compactado não tem dono. Vários agentes no mesmo `data-dir` não têm cerca de projeto. | Cerca por raiz de projeto antes de qualquer índice compartilhado. |
| Observabilidade e benchmarks | E-001 (offline), E-005 (resume no mesmo processo), freeze V2.1. Baselines longitudinais V1–Vn são snapshots de código, não “produto V3”. | LLM live = `NOT_MEASURED`. Token proxy ≠ fatura. | Protocolo em [08-benchmarks-and-test-plan.md](08-benchmarks-and-test-plan.md). |

### O que oferece maior potencial

1. **Wiki Markdown por repositório (já especificada).** `wiki-carpaccio` implementa o padrão que Karpathy descreveu no gist de 2026-04-04: fontes imutáveis, páginas sintetizadas, índice, log, lint. A skill declara que BM25/vetor/MCP só entram quando a escala justificar, e que consomem a wiki em vez de substituí-la.
2. **Recuperação seletiva com orçamento**, não compressão destrutiva. O ganho plausível vem de não reler o repositório e de não injetar a vault inteira. Não há, nestas fontes, um número honesto de “−60% na sessão de código” que sirva de meta.
3. **Grafo de código local (Graphify OSS) como índice opcional**, atrás de um experimento. O parse de código é tree-sitter, sem LLM. A passagem semântica de docs/PDF/imagem usa modelo. O modo `--wiki` duplicaria a wiki. Não deve ser a fonte de verdade.

### O que priorizar

| Prioridade | Peça | Por quê |
|---|---|---|
| P0 | ADR de ownership do contexto compactado | ADR-DR-0005 bloqueia compaction até isso existir. A V3 também separa Observation de Belief e proíbe segundo KnowledgeBackend. |
| P0 | Cerca por raiz de projeto + harness de tokens | Sem isso, wiki e índice vazam entre projetos e qualquer “economia” continua proxy. |
| P1 | Operar `wiki-carpaccio` de verdade | Init sob demanda, query pelo índice, update/lint, código vence wiki. |
| P1 | Retrieval com orçamento | `index.md` + páginas citadas + trechos de código. Vault org só via `knowledge.search`. |
| P2 | Protótipo Graphify só no código, com `--budget` | Comparar contra `rg` no mesmo harness. Desligar se não ganhar qualidade nem tokens. |
| P2 | Estilo de saída mais curto no host | Teto medido pela JetBrains: cerca de −8,5% de tokens de **saída**, sem queda detectável de nota. Não é alavanca principal. |

### O que não integrar

- Microsoft GraphRAG como dependência nova: o README oficial (consulta 2026-10-21) diz que o projeto está em manutenção e não aceita features.
- Mem0, Letta, claude-mem e o MCP `@modelcontextprotocol/server-memory` como memória do núcleo: duplicam `MemoryStore` / `wiki-mem` e misturam projetos.
- `caveman-compress` em contratos, skills, código, YAML de policy ou evidência: reescreve o arquivo e chama um modelo.
- LLMLingua no caminho quente: compressão por perplexidade pode omitir detalhe; papers de 2023–2025 mostram o trade-off, não uma garantia para patch de código.
- Repomix como contexto padrão: o produto empacota o repositório num arquivo só. Isso aumenta o prompt.
- Serena dentro do repo MIT: a aplicação Serena é GPL-3.0-or-later (LICENSE overview no repo, consulta 2026-10-21). Processo externo é outra decisão; copiar para o core não.
- Qualquer grafo que passe a ser a fonte de verdade ao lado de `.ai/` e do código.

### O que ainda precisa ser medido

Tudo o que seria “a V2.2 gasta menos tokens”. Nesta pesquisa: `NOT_MEASURED` no EvolveLoop. Os números externos não são transferíveis sem o mesmo modelo, tokenizer, harness e tarefa.

### Escopo recomendado da V2.2

Entregar **conhecimento de projeto verificável e recuperação com orçamento**, mais o **ADR que destrava medição de compaction**. Não entregar World Model, Memory Trust em runtime, Agency, sandbox, nem um índice vetorial obrigatório. Isso permanece na V3 ou fora dela, conforme [09-v2.2-proposed-scope.md](09-v2.2-proposed-scope.md).

A recomendação principal é a arquitetura híbrida contida: wiki Markdown existente + busca lexical + medeção. O grafo fica opcional e experimental. A arquitetura “mínima” é o default se o protótipo do grafo não passar no harness. A arquitetura “grafo como plataforma” fica de fora.

## Mapa do dossiê

| Arquivo | Conteúdo |
|---|---|
| [01-current-state-audit.md](01-current-state-audit.md) | V2 real, V3 planejada, contratos |
| [02-research-methodology.md](02-research-methodology.md) | O que foi acessado e o que falhou |
| [03-repositories-and-tools.md](03-repositories-and-tools.md) | Catálogo e matriz de avaliação |
| [04-community-findings.md](04-community-findings.md) | Reddit, JetBrains, limites de alegação |
| [05-knowledge-wiki-architecture.md](05-knowledge-wiki-architecture.md) | Wiki, Graphify, três arquiteturas |
| [06-token-optimization.md](06-token-optimization.md) | Caveman e alternativas |
| [07-compatibility-matrix.md](07-compatibility-matrix.md) | Combinações e fonte de verdade |
| [08-benchmarks-and-test-plan.md](08-benchmarks-and-test-plan.md) | Protocolo; resultados `NOT_MEASURED` |
| [09-v2.2-proposed-scope.md](09-v2.2-proposed-scope.md) | Metas P0/P1/P2 |
| [10-risks-and-open-questions.md](10-risks-and-open-questions.md) | Riscos e o que mudaria a recomendação |
| [sources.md](sources.md) | URLs, datas, classe de evidência |
