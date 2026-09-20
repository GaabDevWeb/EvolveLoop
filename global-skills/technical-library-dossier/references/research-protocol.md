# Protocolo de Pesquisa — agent-browser + Puppeteer

Ler quando iniciar a Fase 1 do dossiê. Complementa as ferramentas obrigatórias em `SKILL.md`.

## Setup agent-browser

```bash
# Se não instalado
npm i -g agent-browser && agent-browser install

# Carregar workflows da versão instalada
agent-browser skills get core
```

Antes de navegar em sites novos: `agent-browser skills get core --full` para referência de comandos.

## Divisão de responsabilidades

| Tarefa | Ferramenta preferida | Motivo |
|--------|---------------------|--------|
| Mapear site de docs (sidebar, versões) | agent-browser | Snapshots de accessibility tree, navegação fiável |
| Ler README, changelog, issues no GitHub | agent-browser | Scroll, cliques em tabs, paginação |
| Capturar diagrama/arquitectura da doc | MCP Puppeteer `puppeteer_screenshot` | Imagem embutida no dossiê |
| Páginas com renderização JS pesada | Puppeteer `puppeteer_evaluate` | Extrair conteúdo pós-hydration |
| Autenticação / sessão persistente | agent-browser sessions | Reutilizar entre fases |

**Regra:** usar **ambas** em cada sessão de pesquisa — mínimo 3 navegações agent-browser + 1 screenshot Puppeteer por dossiê (mais se a doc for rica em diagramas).

## Sequência de navegação recomendada

### Documentação oficial

1. `agent-browser` → URL base da doc
2. Snapshot da sidebar / índice → listar todas as secções
3. Visitar **cada** secção relevante ao template (não só Getting Started)
4. Registar URL canónica por tópico

### GitHub

1. README completo
2. `/examples` ou `/packages`
3. Releases + CHANGELOG.md
4. Issues: labels `bug`, `documentation`, `breaking-change` (top por reactions)
5. Discussions pinned

### Fontes complementares

Só após esgotar oficial + repo:

- Blog oficial / dev.to oficial
- RFCs no repo ou site dedicado
- Benchmarks citados pela própria equipa do projecto

## Registo de fontes

Manter ficheiro temporário `sources-log.md` durante a pesquisa:

```markdown
| # | Tipo | URL | Tópicos cobertos | Data |
|---|------|-----|------------------|------|
| 1 | docs | https://... | Instalação, Config | 2026-07-05 |
```

Converter para secção 38 do dossiê na entrega.

## Screenshots com Puppeteer

Quando capturar:

- Diagramas de arquitectura oficiais
- DevTools ou extensões oficiais
- Comparativos visuais da doc

Workflow:

1. `puppeteer_navigate` → URL
2. `puppeteer_screenshot` → guardar em `docs/dossiers/assets/[lib-name]/`
3. Referenciar no Markdown: `![Descrição](./assets/[lib-name]/arch.png)` + fonte

## Critérios de profundidade

Parar de pesquisar um tópico **só** quando:

- Documentação oficial cobre o assunto, **ou**
- Fontes 1–9 esgotadas e lacuna declarada explicitamente no dossiê

Sinais de pesquisa insuficiente (voltar a navegar):

- Secção com menos de 2 parágrafos técnicos
- API sem exemplos
- Comparação sem fonte
- "Provavelmente" ou "geralmente" sem citação

## Anti-patterns de pesquisa

| Evitar | Fazer em vez disso |
|--------|-------------------|
| Uma única página "Getting Started" | Percorrer índice completo da doc |
| StackOverflow como fonte primária | Issues/discussions oficiais primeiro |
| Resumir changelog numa frase | Tabela de versões com breaking changes |
| Inventar API não encontrada | Marcar como "não documentado publicamente" |
| Só web search sem navegação | agent-browser na URL oficial |
