---
name: wiki
description: >
  Injeta grounding da Wiki (Obsidian vault karpathyWiki) no agente Cursor via
  ritual obrigatório: ground.sh (scout/search) + pack do projeto, template Fontes/
  Contratos/GAPs/Método/Handoff, e recusa de coding via wiki vibe. Use quando
  mencionar Wiki, karpathyWiki, KernelBot, OrbitBot, ISS, Xray-Spec, /wiki,
  scout da wiki, pack kernelbot/orbitbot, grounding Obsidian, ou implementar no
  ecossistema Gaab com contratos da wiki. Não use para chat genérico, RAG de outros
  projectos, nem como substituto do Agent — só grounding; coding fica no Agent.
metadata:
  version: 1.0.0
  eval_iteration: 2
  last_benchmark: ~/.cursor/skills/wiki-workspace/iteration-2/benchmark.md
---

# Wiki — grounding no Cursor Agent

**Papel:** a wiki é **spec injectada**. O Agent Cursor (skills, MCPs, tools) **implementa**.

**Vault:** `RAG_REPO_ROOT` (default `$WIKI_ROOT`).

## Diferencial (porque não basta grep na vault)

1. **CLI primeiro** — `ground.sh` (BM25/index) antes de varrer notas à mão.
2. **Pack automático** — se o projeto for kernelbot/orbitbot, carregar o pack **no mesmo turno** que o scout.
3. **Template fechado** — Fontes + Contratos + GAPs + Método + Handoff (sempre).
4. **Anti-vibe** — nunca usar `wiki vibe` / Composer CLI como cérebro de coding.

## Quando ler referências

| Ficheiro | Quando |
|----------|--------|
| [references/cli.md](references/cli.md) | Paths CLI, env, troubleshooting |
| [references/ritual.md](references/ritual.md) | Scout → implement → validar |
| [references/packs.md](references/packs.md) | Packs e mapeamento projeto→pack |

## Workflow obrigatório

### 1. Escolher modo

| Pedido | Modo |
|--------|------|
| “onde está…”, gaps, `/wiki scout` | **scout** (+ pack se projeto conhecido) |
| “pack…”, contratos estáveis | **pack** |
| “busca…”, fontes | **search** (+ pack se projeto conhecido) |
| “implementa…”, patch no Kernel/Orbit | **scout curto + pack → implement** |
| “o que a wiki diz?” **sem** projeto/tópico | **clarificar** — **não** scout amplo |

### 2. Underspecified (mínimo de contexto)

Se faltar **projeto** ou **tópico**:

1. Pedir os dois (ou declarar **uma** suposição explícita: `Assumo projeto=X tópico=Y`).
2. **Não** apresentar near-misses BM25 como se fossem a resposta.
3. Só depois correr `ground.sh`.

### 3. Correr grounding

```bash
bash ~/.cursor/skills/wiki/scripts/ground.sh scout "QUERY" [projeto]
bash ~/.cursor/skills/wiki/scripts/ground.sh pack kernelbot-rag   # ou orbitbot-kernel
bash ~/.cursor/skills/wiki/scripts/ground.sh search "QUERY" kernelbot
bash ~/.cursor/skills/wiki/scripts/ground.sh list-packs
```

Ordem típica com projeto conhecido: **`pack` → `scout`/`search`**.  
Se CLI falhar ou `confidence=low` / sem chunks: complementar com leitura directa das notas e declarar isso em **Método** (não esconder o low).

### 4. Formato de saída (obrigatório — todas as secções)

```markdown
## Grounding Wiki
- **modo:** scout|pack|search|clarificar
- **projeto:** … | desconhecido
- **confiança:** … (do CLI; ou n/a se clarificar)

### Fontes
1. `path/relativo.md` — 1 linha
2. …

### Contratos / decisões
- …

### GAPs
- … (o que a wiki NÃO diz; se vazio: "nenhum GAP crítico identificado")

### Pack
- nome: … | nenhum
- carregado via: ground.sh pack | n/a

### Método
- comandos: `ground.sh …` (listar os que correu)
- complemento: leitura directa sim/não (paths)

### Handoff
- repo código: … | n/a
- próximo: só grounding | clarificar | implementar com Agent+tools
- anti-vibe: coding via Agent Cursor, não `wiki vibe`
```

### 5. Implementação (depois do grounding)

1. Tools/skills/MCPs no **repo de código** (não só vault).
2. Não inventar endpoints/APIs ausentes da wiki.
3. Contrato mental:

```text
OBJ: …
CONSTRAINTS: (pack + fontes)
FILES: …
DONE: …
OUT: diff; GAP: se faltar contrato
```

4. Fecho curto: `SOURCES: path1, path2`.

## Regras

- **Não** `wiki vibe` / Composer CLI como substituto do Agent.
- **Não** colar a wiki inteira — pack + top hits + notas chave.
- **Não** inventar arquitectura se grounding vazio → GAP + clarificar.
- CLI = infra; coding = este Agent.

## Defaults

| Projeto | Pack | Repo código |
|---------|------|-------------|
| kernelbot | `kernelbot-rag` | `<KernelBot-repo>` |
| orbitbot | `orbitbot-kernel` | `<OrbitBot-repo>` |

## Exemplos

**Scout** — pack + scout → template completo com Método/Handoff.  
**Vague** — “O que a wiki diz?” → modo clarificar, sem dump.  
**Adversarial vibe** — recusar vibe; oferecer ground → Agent.  
**Orbit** — pack `orbitbot-kernel` + scout → Fontes/GAPs/Handoff.
