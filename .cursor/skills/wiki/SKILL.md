---
name: wiki
description: >
  Context Engineer EvolveLoop: grounding / context pack da Wiki (vault
  karpathyWiki) via ritual ground.sh (scout/search) + pack do projeto, template
  Fontes/Contratos/GAPs/Método/Handoff, Relevant Context > Maximum Context, e
  recusa de coding via wiki vibe. Use quando /wiki, Context Engineer,
  Wiki, karpathyWiki, KernelBot, OrbitBot, ISS, Xray-Spec, scout/pack wiki,
  ou grounding Obsidian no ecossistema Gaab. Não use para memória episódica /
  promote librarian (wiki-mem), pesquisa web externa (/pesquisar researcher),
  chat genérico, RAG de outros projectos, nem como substituto do Agent coding.
metadata:
  version: 1.2.0
  status: experimental
  capability: context-grounding
  type: upstream
  command: wiki
  pda_roles: [explore, plan]
  eval_iteration: 3
  last_benchmark: ~/.cursor/skills/wiki-workspace/iteration-2/benchmark.md
  specialization: Context Engineer
disable-model-invocation: true
---

# Wiki — Context Engineer (grounding / context pack)

**Specialization:** Context Engineer (Lead matrix Wave C1).  
**Papel:** a wiki é **spec injectada** (Relevant Context). O Agent Cursor **implementa**.  
**Vault:** `$WIKI_ROOT` (alias `$RAG_REPO_ROOT`) — required; no hardcoded user path.

**Template comportamental:** research + orchestration-support (fontes, anti-alucinação; não produto).

**Decisão Wave C1:** `EXTEND_EXISTING_AGENT` — **não** criar package `context-engineer` (mesmo DO).

---

## DO

- Correr ritual CLI (`ground.sh` pack → scout/search) antes de varrer a vault à mão
- Produzir **context pack** mínimo: Fontes + Contratos + GAPs + Método + Handoff
- Preferir pack + top hits + notas chave (**Relevant Context > Maximum Context**)
- Declarar gaps / `confidence=low` / CLI falho sem inventar contratos
- Handoff explícito para implementação (Agent+tools) ou clarificar
- Consumir retrieval via CLI / opcionalmente capabilities determinísticas `knowledge.search` | `knowledge.inspect` (já no orchestrator) — **não** reimplementar RAG

## DO NOT

- Criar segundo agente `context-engineer` / duplicar este DO
- Memória episódica, `LATEST.md`, `promote-queue` → **wiki-mem** (Knowledge / librarian)
- Pesquisa web / literatura externa → `/pesquisar` (`researcher`); não fingir research neste package
- `wiki vibe` / Composer CLI como cérebro de coding
- Colar a wiki inteira ou dump de near-misses BM25 como resposta
- Inventar arquitectura/endpoints ausentes da wiki
- Implementar produto (backend/frontend/testing/…) sob este papel
- Auto-conceder autoridade: listar capability ≠ Policy Engine

---

## Fronteiras

| Skill / papel | Responsabilidade | Handoff |
|---------------|------------------|---------|
| **wiki** (Context Engineer) | Grounding canónico + context pack | → Agent coding / orquestrar Fase 0 |
| **wiki-mem** (Knowledge) | Episódico + promote librarian | continuidade / `log.md` ± `wiki/` |
| Researcher (C2) | Fontes **externas** | ≠ este package |
| Deterministic `knowledge.*` | Bridge RAG subprocess | infra; ritual fica aqui |

---

## Capability scope

| Classe | Capabilities |
|--------|----------------|
| **required** | `context-grounding` (esta skill) |
| **optional** | `knowledge.search`, `knowledge.inspect` (DeterministicProvider — orchestrator) |
| **forbidden** | `knowledge-promote` (wiki-mem); research web; `backend-implementation`; `testing`; `planning` como substituto |

HARD-GATE orquestrar: nó `knowledge-grounding` continua a apontar para esta skill (`/wiki`).

---

## Diferencial (porque não basta grep)

1. **CLI primeiro** — `ground.sh` (BM25/index) antes de varrer notas à mão.
2. **Pack automático** — kernelbot/orbitbot: carregar pack **no mesmo turno** que o scout.
3. **Template fechado** — Fontes + Contratos + GAPs + Método + Handoff (sempre).
4. **Anti-vibe** — nunca `wiki vibe` como substituto do Agent.

## Quando ler referências

| Ficheiro | Quando |
|----------|--------|
| [references/cli.md](references/cli.md) | Paths CLI, env, troubleshooting |
| [references/ritual.md](references/ritual.md) | Scout → implement → validar |
| [references/packs.md](references/packs.md) | Packs e mapeamento projeto→pack |
| [references/boundaries.md](references/boundaries.md) | Context Engineer vs Knowledge vs Researcher |

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

---

## Failure / degradation

| Falha | Classe | Acção |
|-------|--------|-------|
| Projeto/tópico em falta | `context_failure` | clarificar ou 1 SUPOSIÇÃO explícita |
| CLI/RAG indisponível | `knowledge_failure` | leitura directa + Método; ou GAP — não inventar |
| Pedido = mem/promote | `out_of_scope` | redireccionar `/mem` (wiki-mem) |
| Pedido = research web | `out_of_scope` | recusar; redireccionar `/pesquisar` (`researcher`) |
| Pedido = max dump wiki | `agent_failure` | recusar; pack + top hits |

---

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
**Memória** — “o que fizemos ontem?” → `/mem`, não este skill.
