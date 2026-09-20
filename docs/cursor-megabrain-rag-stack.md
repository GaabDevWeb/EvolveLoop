---
id: cursor-megabrain-rag-stack
tipo: documento
status: atual
projeto: wiki
dominio: knowledge-map
escopo: meta
atualizado: 2026-08-25T20:40:00-03:00
confianca: alta
snapshot_de: karpathyWiki/.ai/wiki/cursor-megabrain-rag-stack.md
aliases:
  - Stack Cursor MegaBrain RAG
  - Dossier sessão Cursor 2026-08-24
fontes:
  - ~/.cursor/skills/orquestrar/SKILL.md
  - ~/.cursor/skills/wiki/SKILL.md
  - ~/.cursor/skills/wiki-mem/SKILL.md
  - ~/.cursor/skills/skill-authoring/SKILL.md
  - rag/README.md
  - rag/PLAYBOOK.md
  - ~/.cursor/rules/wiki-agent.mdc
  - transcrição sessão Cursor 40ec19de-5102-4959-8560-dbeb57b2e4ae
relacionados:
  - wiki-rag
  - wiki-agent
  - wiki-skill
  - wiki-memory
tags:
  - cursor
  - megabrain
  - rag
  - lancedb
  - skills
---

# Stack Cursor + MegaBrain + Wiki RAG

Dossier da sessão **2026-08-24 17:50 → 2026-08-25 20:32** (UTC−3): o que foi criado ou actualizado no Cursor (skills, rules, hooks, comandos), no pipeline RAG (`rag/`, BM25 + LanceDB), no fluxo MegaBrain e nos loops de agentes.

**Precedência:** código e contratos nos paths abaixo > este resumo. Se divergirem, actualizar esta página.

**Vault:** `/home/gaab/Documentos/karpathyWiki`  
**Skills globais:** `~/.cursor/skills/` (symlink típico em `~/.agents/skills/`)  
**Transcrição:** [sessão Cursor 24–25 Ago](40ec19de-5102-4959-8560-dbeb57b2e4ae)

**Segredo:** nesta sessão foi colada uma `CURSOR_API_KEY` no chat e gravada em `rag/.env` (gitignored). **Rodar a chave** no painel Cursor. Este documento **não** reproduz o valor.

---

## Índice

1. [Decisão de arquitectura](#1-decisão-de-arquitectura-o-ideal)
2. [Mapa do sistema](#2-mapa-do-sistema)
3. [Cronologia completa da sessão](#3-cronologia-completa-da-sessão)
4. [Skills — detalhe individual](#4-skills--detalhe-individual)
5. [Loops de agentes](#5-loops-de-agentes)
6. [RAG, índice e LanceDB](#6-rag-índice-e-lancedb)
7. [CLI terminal (`wiki run` / `vibe`)](#7-cli-terminal-wiki-run--vibe)
8. [Hooks Cursor](#8-hooks-cursor)
9. [Camadas de memória](#9-camadas-de-memória)
10. [Evals](#10-evals)
11. [GAPs abertos](#11-gaps-abertos)
12. [Como usar no dia-a-dia](#12-como-usar-no-dia-a-dia)
13. [Inventário de paths](#13-inventário-de-paths)

---

## 1. Decisão de arquitectura (o “ideal”)

O utilizador desenvolve **só no Cursor** (skills + MCPs). Papéis acordados a meio da sessão (após um primeiro acto em que se construiu um CLI tipo Ollama):

| Camada | Papel | Não é |
|--------|--------|--------|
| **Cursor Agent** | Cérebro: skills, MCPs, coding | Um segundo Composer no terminal |
| **Wiki RAG** | Grounding: search, packs, scout | IDE / vibecoding CLI como cérebro |
| **Wiki canónica** | Contratos, arquitectura, `log.md` | Dump de sessão |
| **Memória episódica** | Continuidade entre chats (`.ai/sessions`) | SSOT de domínio |

Anti-padrão explícito (skill `wiki` v1.0.0): **`wiki vibe` / Composer CLI** como substituto do Agent Cursor. O CLI continua a existir (Acto 1) e serve para chat/scout no terminal; **não** é o fluxo de desenvolvimento.

Provedores LLM acordados para o CLI: **Cursor via API** e **Ollama** (local ou remoto via SSH/`servidor-ia`). OpenRouter/Claude-como-adapter **não** foram o alvo desta sessão.

---

## 2. Mapa do sistema

```text
Utilizador
    │
    ├─ /wiki ──────────► skill wiki ──► ground.sh ──► wiki-ingest
    │                                              │         │
    │                                              │    BM25 + híbrido RRF
    │                                              │    LanceDB (rag/.data/lancedb)
    │                                              └──► packs/*.md
    │
    ├─ /mem ───────────► skill wiki-mem ──► .ai/sessions/ (LATEST, promote-queue)
    │
    ├─ /MegaBrain ─────► skill orquestrar (raiz)
    │                         │
    │                         ├─ Fase 0  HARD-GATE wiki+RAG
    │                         ├─ Policy Engine (risk_tier, budget, topologia)
    │                         ├─ PDA: plan | exec | gate | explore | critic | librarian
    │                         │         └─ GATE_BUNDLE herdado (depth ≤ 3)
    │                         ├─ Outer loop: partial | plan_reset | full_ground
    │                         ├─ Evidence Bus: memory/<feature>/evidence/*.json
    │                         └─ (opcional) Execution Engine run-engine
    │
    ├─ Agent genérico ─► rule wiki-agent.mdc (alwaysApply)
    │                         grounding + log.md pós-edit
    │
    └─ Terminal (opcional) ► wiki run | wiki vibe
                                  mesmo índice; anti-padrão como cérebro de coding

systemd --user (linger):
    wiki-watch     → reindex quando a wiki muda
    wiki-health    → probe search + Ollama + digest mem
```

---

## 3. Cronologia completa da sessão

Duas fases distintas. A segunda **redefine** o papel do CLI da primeira.

### Acto 1 — Pipeline RAG + agente de terminal (17:50–20:47)

Contexto de partida (relatório do utilizador): infra Debian 13, GPU AMD RX 7600 no desktop remoto, Tailscale, Ollama, vault Obsidian, objectivo de RAG híbrido sobre a Wiki.

| Hora | Pedido | Entrega |
|------|--------|---------|
| 17:50 | Relatório de infra + RAG híbrido | Contexto; sem código ainda |
| 17:51 | `/MegaBrain` item 3: auditoria KernelBot — portar vs reescrever | Mapa do RAG KernelBot (BM25 MySQL) vs o que portar para a vault |
| 17:54–17:56 | Item 2 / continuar MegaBrain | Plano de port: parser Obsidian, chunking, BM25, gates de retrieval |
| 18:01 | Provedores só **Cursor API + Ollama** (remoto via `ssh servidor-ia`; PC remoto desligado nessa altura) | Adapter LLM agnóstico no package `wiki-rag` |
| 18:04 | Melhorar RAG com **banco vetorial** (Cursor e Ollama) | LanceDB embedded em `rag/.data/lancedb/` + híbrido RRF |
| 18:07 | “O que falta?” → `/MegaBrain` fases A, B… até fechar | Implementação do package `rag/` (ingest, search, chat, watch) |
| 18:43 | Tudo automático: pergunta no terminal, RAG+vector em fundo | REPL `wiki run` + watch |
| 18:45 | Meter API Cursor no `.env`, deps, arrancar | `.env` (gitignored) + venv + PATH |
| 18:48 | Como `ollama run`, de qualquer directório, sessão com últimas N mensagens | CLI global + histórico de sessão |
| 18:53 | Loading + streaming | Spinner + stream de tokens |
| 18:57 | Streaming não “dactilografava” | Ajuste de UX de typing no terminal |
| 19:00 | Aprofundar UX do agente no terminal | Propostas (slash commands, sources, debug) |
| 19:02 | `/MegaBrain` implementar as propostas | Comandos `/sources`, `/debug`, `/projeto`, `/provider`, … |
| 19:13–19:15 | Experiência ideal → “faz isso” | PLAYBOOK + atalhos |
| 19:17 | Optimizar para **vibecoding** (Composer 2.5, só código, tokens) | Perfil `code`, packs, contrato OBJ/CONSTRAINTS |
| 19:19 | `/MegaBrain` implementar | `wiki vibe`, scripts `vibe-kernelbot.sh` / `vibe-orbitbot.sh` |
| 19:23–19:28 | Mais vibecoding / `/MegaBrain` “faz tudo” | Compact, scout, pack grounding |

**Artefacto deste acto:** package Python `wiki-rag` em `karpathyWiki/rag/` — ver §6 e §7.

### Acto 2 — Pivot Cursor-native + MegaBrain (20:47–22:27 + 25 Ago)

O utilizador esclarece: **só usa o Cursor** para desenvolver; o agente do terminal **não** deve ser o cérebro; quer skills + MCPs no fluxo diário.

| Hora | Pedido | Entrega |
|------|--------|---------|
| 20:47–20:49 | Integrar o agente no dia-a-dia Cursor; “o que seria o ideal?” | Arquitectura: Agent = cérebro; RAG = spec injectada |
| 20:50 | Implementar via `/skill-authoring` | Skill `wiki` + evals isolados |
| (evals) | Iter-1 ship fail (baseline empatou) → Iter-2 | Skill **v1.0.0**, comando `/wiki` |
| 21:08 | Rule **global**: toda interação usa wiki; toda edição de código regista wiki | `~/.cursor/rules/wiki-agent.mdc` (`alwaysApply: true`) |
| 21:11 | HARD-GATE wiki+RAG **no `/MegaBrain`** (não só a skill) | `orquestrar` **v2.1** + `wiki-grounding-gate.md` |
| 21:17–21:18 | Algo como **claude-mem** | Skill `wiki-mem` + hooks + `.ai/sessions/` |
| 21:21 | Always-on mesmo após reboot: RAG, vector, tudo | systemd `--user` + linger (`wiki-watch`, `wiki-health.timer`) |
| 21:29–21:30 | Outer loop: erro na última fase → reentrada, não reboot cego | `orquestrar` **v2.2** + `outer-loop.md` |
| 21:34–21:35 | Subagentes por etapa + sub-subagentes com os mesmos hard-gates; raiz só orquestra | **v2.3** + `gate-bundle.md` + `pda-roles.md` |
| 21:39 | Arquitectura de **altíssimo nível** | Policy Engine, Evidence Bus, critic, librarian |
| 21:40 | Implementar A+B+C em **subchats isolados**; validar com `/skill-authoring` | **v2.4 / 2.4.1** + evals iter-24 |
| 21:54 | “Ok, faça isso” (follow-up evals) | Iter-25 cega |
| 22:10 | O que concluir? | Contrato seguido; ship gate skill-authoring **não** 100 vs baseline |
| 22:11–22:17 | Como deixar **100/100** → “faz tudo” | Pacote runtime **v2.5.0** + evals iter-26 |
| 25 Ago 20:32 | Resumir tudo num `.md` | **Esta página** |

### Versões MegaBrain nesta sessão

| Versão | Tema |
|--------|------|
| (prévia) | Orquestrador CursorSKILLS já existia |
| **2.1** | HARD-GATE Wiki+RAG na Fase 0 |
| **2.2** | Outer loop `partial` / `plan_reset` / `full_ground` |
| **2.3** | PDA + `GATE_BUNDLE` + `max_spawn_depth=3` |
| **2.4 / 2.4.1** | Policy Engine, Evidence Bus, critic, librarian |
| **2.5.0** | `continuar` exige JSON de gate; librarian só enfileira; engine default; `max_spawns`; `model-routing.md` |

**Veredicto dos evals (honesto):** com a skill, o MegaBrain cumpre o contrato (**100% with_skill**). O *ship gate* skill-authoring (skill tem de **ganhar** ao baseline) **não passou** nas rondas cegas. Valor real: **policy, pasta de evidência, herança PDA**. Tratar MegaBrain como SOP, não como truque de prompting.

---

## 4. Skills — detalhe individual

### 4.1 `wiki` (v1.0.0) — grounding

| | |
|--|--|
| Path | `~/.cursor/skills/wiki/SKILL.md` |
| Comando | `/wiki` → `~/.cursor/commands/wiki.md` |
| Papel | Injectar **spec** da vault via RAG; o Agent **implementa** |
| Quando dispara | Wiki, karpathyWiki, KernelBot, OrbitBot, ISS, Xray-Spec, `/wiki`, pack, grounding Obsidian |
| Evals | `~/.cursor/skills/wiki-workspace/iteration-2/` — ship **pass** |

**Fluxo obrigatório:** pack (se projeto conhecido) → `ground.sh scout|search` → template Fontes / Contratos / GAPs / Método / Handoff → só depois código. Pedido vago (“o que a wiki diz?”) → **clarificar**, não dump BM25.

**Script:** `~/.cursor/skills/wiki/scripts/ground.sh` → `wiki-ingest search --bm25-only` + `format_hits.py`, ou `cat` do pack.

**Packs:** `rag/packs/kernelbot-rag.md`, `rag/packs/orbitbot-kernel.md`.

**Não faz:** chat genérico; RAG de outros projectos; coding via `wiki vibe`.

Referências da skill: `references/cli.md`, `ritual.md`, `packs.md`.

---

### 4.2 `wiki-mem` — memória episódica

| | |
|--|--|
| Path | `~/.cursor/skills/wiki-mem/SKILL.md` |
| Comando | `/mem` |
| Papel | Memória **episódica** (o que o Agent fez nesta e em sessões recentes) |
| Store | `karpathyWiki/.ai/sessions/` |

**CLI:** `python3 ~/.cursor/hooks/wiki-mem/mem.py` — `search`, `promote`, `digest`, hooks `session-start` / `after-edit` / `stop` / `session-end`.

Ficheiros típicos: `index.jsonl`, `current.json`, `LATEST.md`, `promote-queue.md`, JSON por sessão.

**Regras:** não mistura com `wiki/` sintetizado nem `raw/`. `promote` e o hook de fecho só escrevem **`promote-queue.md`**. Promoção canónica = papel `librarian` ou Agent → `{Projeto}/log.md` ± `wiki/`.

**GAP conhecido:** `sessionStart.additional_context` pode ser dropado pelo Cursor; fallback `LATEST.md`.

---

### 4.3 `orquestrar` / MegaBrain (v2.5.0) — raiz

| | |
|--|--|
| Path | `~/.cursor/skills/orquestrar/SKILL.md` |
| Comando | `/MegaBrain` |
| Papel | Orquestrador **raiz**: SSOT, Matriz, PDA, outer loop, policy, evidence |
| `disable-model-invocation` | true (só via `/MegaBrain` ou menção explícita) |
| `eval_iteration` no metadata | 24 (última ronda *with tokens*; evals cegas 25/26 em workspace) |

**Raiz não é** plan/exec/gate: **orquestra**. Silêncio do utilizador = consentimento para continuar até bloqueio documentado.

**Fases (ciclo feliz):**

```text
0    Wiki+RAG (HARD-GATE)
0.5  PRD (HARD-GATE humano, se feature formal)
1    Planear          → role plan
2    Executar         → role exec (+ explore aninhado)
     Critic           → após exec, antes de testing (obrigatório se sensitive)
3    Testing + auto-correção (inner loop, máx. 3 + PDA)
4    Segurança        → role gate
4b   DevOps (opcional)
5    PO-review        → role gate
6    Documentar + librarian (wiki)
```

**Matriz:** exactamente uma de `continuar | corrigir | replanejar` (ou `bloqueado` no outer loop / budget).

**Referências normativas criadas/actualizadas nesta sessão:**

| Ficheiro | Função |
|----------|--------|
| `wiki-grounding-gate.md` | HARD-GATE wiki + RAG |
| `image-attachment-gate.md` | HARD-GATE imagem → image-to-code (já existia; integrado) |
| `gate-bundle.md` | Secção zero portátil; spawn sem bundle = inválido |
| `pda-roles.md` | plan/exec/gate/explore/critic/librarian |
| `outer-loop.md` | Reentrada e teto de ciclos |
| `policy-engine.md` | Risco, topologia, budget, `require[]` |
| `evidence-bus.md` | `memory/<id>/evidence/` |
| `model-routing.md` | Plan/critic forte; exec rápido; gate estrito (qualitativo) |
| `ecosystem-v2.md` | Arquitectura v2 + anti-padrões |

**Workers do pipeline (já existiam; o raiz mapeia comando → skill):**

| Comando | Capability | Skill típica |
|---------|------------|----------------|
| `/planejar` | planning | planner |
| `/backend` | backend-implementation | backend |
| `/frontend` | frontend-ui | frontend-pro |
| `/testes` | testing | testing |
| `/seguranca` | security-review | security |
| `/validar` | po-acceptance | po-review |
| `/documentar` | documentation | documentation |
| `/prd` `/adr` `/database` `/devops` | upstream/workers | respectivos |
| `/wiki` | wiki-grounding | wiki |
| `/skill-authoring` | evals / criação de skills | skill-authoring |

Estas skills de worker **não foram criadas nesta sessão**; o MegaBrain passou a **obrigá-las** a herdar o `GATE_BUNDLE`.

---

### 4.4 `skill-authoring` (já existia; usada nesta sessão)

Path: `~/.cursor/skills/skill-authoring/SKILL.md` (v1.2.0).

Usada para **criar/validar** `wiki` e para **evals** do MegaBrain. Regra: quem escreve a skill **não** executa evals `with_skill` na mesma instância — spawna runners isolados + grader.

Ship gate: with_skill ≥80% evals com todas as críticas; **fail** se baseline ≥ with em ≥50% dos casos (skill redundante).

---

### 4.5 Rule `wiki-agent.mdc`

Path: `~/.cursor/rules/wiki-agent.mdc` — `alwaysApply: true` (global neste Cursor, **todos** os workspaces).

1. Interação técnica → grounding wiki (ou `Wiki: n/a` trivial).
2. Edit de código → append `{Projeto}/log.md`; contratos/estado → `wiki/`; **nunca** `raw/`.
3. Ordem: grounding → código → registo wiki.
4. Memória episódica é complemento, não substituto.

Ao lado de `megabrain.mdc` (análise/execução genérica MegaBrain) e das rules do workspace (`megabrain.mdc` em `.cursor/rules/`).

---

### 4.6 HARD-GATE imagem (`image-to-code`)

Não foi criada nesta sessão; **já existia**. Qualquer imagem anexada no MegaBrain → skill `~/.agents/skills/image-to-code/SKILL.md`. Workers não-UI não implementam UI “a olho”.

---

### 4.7 Comandos Cursor criados/actualizados

| Comando | Ficheiro | Liga a |
|---------|----------|--------|
| `/MegaBrain` | `~/.cursor/commands/MegaBrain.md` | skill `orquestrar` |
| `/wiki` | `~/.cursor/commands/wiki.md` | skill `wiki` |
| `/mem` | `~/.cursor/commands/mem.md` | skill `wiki-mem` |

---

## 5. Loops de agentes

### 5.1 Inner loop (Fase 3)

Após implementação → gate `testing`:

- Passa → `continuar`.
- Falha → ler logs → hipótese → patch mínimo → **mesmo** teste. Máx. **3** tentativas na mesma instância.
- Ainda vermelho → PDA diagnóstico (`explore`/`exec`) → revalidar → `replanejar` ou `bloqueado`.

### 5.2 Outer loop (missão)

Erro na “última fase” **não** reinicia sempre na Fase 0. Pedido explícito do utilizador (21:29): se falhar, o ciclo **reentra** no sítio certo.

| Modo | Quando | Reentrada |
|------|--------|-----------|
| `partial` | Teste/build/lint/PO ajustável | Fase 2/3, nós afectados |
| `plan_reset` | Hipótese/arquitectura/RF errados | Fase 1 → novo plano → Fase 2 |
| `full_ground` | Contratos wiki falharam | Fase 0 |

`max_outer_cycles` default **5**. Excedido → `bloqueado` + handoff humano.

SSOT: `cycle_id`, `attempt`, `outer_cycle`, `last_gate`, `last_decision`, `reentry_phase`, `reentry_mode`.

### 5.3 Árvore PDA (sub e sub-sub)

Pedido (21:34): um agente por etapa; sub-subagente (ex. “entender a estrutura do repo”) **com os mesmos hard-gates**; um único raiz orquestra.

```text
raiz (depth 0)  — SSOT, Matriz, policy, spawns
 ├─ plan (1)
 ├─ exec (1)
 │   └─ explore (2)     ← mapa repo + wiki (ex.: “onde está o endpoint”)
 ├─ critic (1)          ← após exec, ANTES de testing (sensitive = obrigatório)
 ├─ gate (1)            ← testing / security / PO / docs
 └─ librarian (1)       ← fecho wiki (promove fila)

max_spawn_depth = 3
spawn sem GATE_BUNDLE → filho recusa (missing_gate_bundle)
pda_spawns >= max_spawns → bloqueado
  hotfix 4 / standard 8 / sensitive 12 / audit 6
```

**GATE_BUNDLE** propaga: Fontes/Contratos/GAPs, `wiki_grounding`, image-to-code, outer loop, anti-vibe, `wiki_register`, `role`, `spawn_depth`, `parent_cycle_id`.

### 5.4 Policy Engine (antes de spawn)

Algoritmo: classificar `risk_tier` (`hotfix|standard|sensitive|audit`) → topologia (`pipeline|fan-out|debate|swarm-explore|supervisor-loop`) → gravar `budget` + `require[]` no SSOT → **só então** spawn.

`standard`|`sensitive` + `ORCHESTRATOR_ROOT` + `plan.ir.yaml` → **tentar** `run-engine`. Engine down → fallback PDA, **sem fingir sucesso**.

### 5.5 Evidence Bus

Pasta no **repo de trabalho** (não no vault): `memory/<feature_id>/evidence/`.

Gates gravam JSON (`gate.testing.json`, etc.). **`continuar` exige o ficheiro do gate activo no disco**, não um parágrafo no chat.

Não misturar com `.ai/sessions` (episódico) nem com `wiki/` (canónico).

### 5.6 Critic e librarian

- **critic:** adversarial; obrigatório em `sensitive`; corre **depois** de exec e **antes** de testing.
- **librarian:** não escreve `wiki/` à cega; **enfileira** em `promote-queue.md`; promoção canónica é passo explícito.

---

## 6. RAG, índice e LanceDB

### 6.1 Três RAGs (não fundir)

| # | Nome | Onde | Store | Consumidor |
|---|------|------|-------|------------|
| 1 | KernelBot RAG | código KernelBot `kernel/rag/` | MySQL + BM25 RAM | chat WhatsApp / `/v1/chat` |
| 2 | **Wiki RAG** (esta sessão) | `karpathyWiki/rag/` | `chunks.json` + **LanceDB** ficheiros | Agent Cursor + CLI `wiki` |
| 3 | (legado documental) | `corpus.yaml` + `schema.md` | — | spec do corpus que o (2) ingere |

Antes de 2026-08-24, a meta-wiki dizia que retrieval sobre a Wiki **não** estava implementado. Isso deixou de ser verdade para o nível (2). O nível (1) **não** mudou nesta sessão (auditoria “portar vs reescrever”: portar *lógica* de gates/chunking, **não** o MySQL de produção).

### 6.2 Package `wiki-rag`

Path: `karpathyWiki/rag/` (`pyproject.toml`, venv `rag/.venv`, CLI `wiki` / `wiki-ingest` em `~/.local/bin`).

Módulos principais (`rag/src/wiki_rag/`):

| Módulo | Função |
|--------|--------|
| `parser.py` / `chunker.py` / `corpus.py` | Obsidian, headers, `corpus.yaml` |
| `wikilinks.py` / `graph.py` | Grafo 1-hop |
| `bm25.py` / `hybrid.py` / `reranker.py` | Léxico + RRF + rerank leve |
| `retrieval.py` / `query.py` | Gates portados do KernelBot, calibrados à wiki |
| `vector/lancedb_store.py` | Vectores em ficheiros |
| `ingest.py` / `index_manager.py` / `watch.py` | Build + poll do fingerprint |
| `chat.py` / `chat_cli.py` / `terminal_*.py` | REPL, sessão, slash commands |
| `providers/cursor_chat.py` / `ollama*.py` | LLM Cursor API e Ollama |
| `packs.py` / `context.py` / `session.py` | Packs e histórico |
| `runtime.py` | Health / stack status |

Índice: `rag/.data/` (`chunks.json`, `manifest.json`, `lancedb/`, `runtime/`). Gitignored.

Embeddings: Ollama **ou** fallback determinístico (testes/offline). Chat: Cursor API **ou** Ollama. BM25 **não** depende de embeddings.

### 6.3 Always-on (systemd --user)

**Não há daemon LanceDB.** O store é embedded. O processo always-on é o **watch**.

| Unit | Função |
|------|--------|
| `wiki-watch.service` | `wiki --root … watch --watch-interval 10` |
| `wiki-health.timer` | A cada 5 min: `rag/scripts/stack-health.sh` |
| `wiki-stack.target` | Agrupa no boot |

Instalação: `bash rag/scripts/install-systemd-user.sh`  
Linger: `loginctl enable-linger gaab` (serviços user após reboot sem login gráfico).

Status: `rag/.data/runtime/stack-status.json`  
Logs: `rag/.data/runtime/logs/watch.log`

**Ollama:** neste host pode estar `ok_ollama=false` (binário local ausente / remoto unreachable). Search BM25 continua. Embeddings/chat Ollama ficam degradados até o endpoint responder.

---

## 7. CLI terminal (`wiki run` / `vibe`)

Construído no Acto 1; **despromovido** no Acto 2 como cérebro de coding.

```bash
wiki run                 # REPL tipo ollama
wiki "pergunta"          # one-shot com sessão
wiki vibe kernelbot      # vibecoding — anti-padrão no Cursor Agent
wiki watch               # se não houver systemd
```

Slash commands (não exaustivo): `/help`, `/sources`, `/debug`, `/projeto`, `/provider`, `/model`, `/fast`, `/code`, `/scout`, `/pack`, `/expand`, `/reindex`, `/compact`, `/open N`, `/clear`, `/exit`.

PLAYBOOK: `rag/PLAYBOOK.md` (ritual diário, auditoria KernelBot em 10 min, always-on).

A skill `wiki` **recusa** usar este CLI como implementador. O Agent Cursor implementa; o CLI no máximo **scouts**.

---

## 8. Hooks Cursor

Global `~/.cursor/hooks.json`:

| Evento | Script |
|--------|--------|
| `sessionStart` | `wiki-mem/session-start.sh` |
| `afterFileEdit` | `wiki-mem/after-edit.sh` |
| `stop` | `orchestrator-job-pickup.sh` **e** `wiki-mem/stop.sh` |
| `sessionEnd` | `wiki-mem/session-end.sh` |
| `afterShellExecution` (`run-engine`) | `orchestrator-after-engine.sh` |

Edits em secrets (`.env`, keys) são ignorados no mem.

`ORCHESTRATOR_ROOT` em `~/.cursor/agents.env` aponta para o orchestrator CursorSKILLS.

---

## 9. Camadas de memória (não fundir)

| Camada | Onde | Quem escreve | HARD-GATE? |
|--------|------|--------------|------------|
| Canónica | `{Projeto}/wiki/`, `log.md` | librarian / Agent | **Sim** (contratos) |
| Bruta | `{Projeto}/raw/` | Humanos / import | **Imutável** |
| RAG index | `rag/.data/` | watch / ingest | Retrieve |
| Episódica | `.ai/sessions/` | hooks mem | Complemento |
| Working/evidence | `memory/<feature>/` no repo de código | raiz / gates | Matriz `continuar` |
| Histórico MegaBrain | `.agent_history.md` no repo de trabalho | raiz | Reidratar chat |

---

## 10. Evals

### Skill `wiki`

| Ronda | Resultado |
|-------|-----------|
| Iter-1 | with_skill 6/6; baseline empatou happy-path → ship **fail** (redundância) |
| Iter-2 | Ritual CLI+pack+template+anti-vibe → ship **pass** → **v1.0.0** |

### Skill `orquestrar`

| Ronda | with_skill | Baseline empata | Discriminadores | Ship |
|-------|------------|-----------------|-----------------|------|
| 24 (tokens no prompt) | 6/6 | 5/6 | 1 | fail |
| 25 (cega) | 6/6 (19/19 críticas) | 3/6 | 3 | fail (50%) |
| 26 (só eixos “duros”) | 6/6 (18/18) | 4/6 | 2 | fail (67% empate) |

**Conclusão registada:** contrato **utilizável**; a skill **não** substitui um agente que já lê a vault nos casos de senso comum. Wins estáveis: **policy `sensitive`** e **prova em `evidence/`**. Iter-26 **piorou** discriminação vs 25 — não overfittar `SKILL.md` a evals.

Artefactos: `~/.cursor/skills/orquestrar-workspace/iteration-{24,25,26}/`.

---

## 11. GAPs abertos

- Execution Engine: neste checkout `src/jobs/` / `dist/` podem faltar → **fallback PDA** obrigatório e honesto.
- Ollama local/remoto: health pode reportar unreachable.
- `sessionStart.additional_context` Cursor: fallback `LATEST.md`.
- Multi-model: contrato qualitativo (`model-routing.md`), não um router Cursor obrigatório.
- Ship gate MegaBrain vs baseline: **não** está “100/100” no critério skill-authoring.
- Path dos repos de código na meta-wiki: `/home/gaab/Documentos/gitHub` (G minúsculo) vs `GitHub` noutro sítio — **verificar no disco**, não inventar.
- Chave Cursor colada no chat desta sessão: **rodar**.
- Freeze V1 da meta-wiki (pré-sessão): continua pendente de gate externo; este dossier **não** é freeze.

---

## 12. Como usar no dia-a-dia

```text
Feature no Cursor:
  /MegaBrain
    → Policy (tier)
    → Fase 0 /wiki (ground.sh ou ingest)
    → plan → exec (+ explore) → critic? → testes (JSON em evidence/)
    → se falhar: outer loop partial
    → security / PO
    → librarian promove promote-queue → log.md
```

```bash
# Índice always-on
systemctl --user status wiki-watch wiki-health.timer
cat rag/.data/runtime/stack-status.json

# Scout manual (Agent ou humano)
bash ~/.cursor/skills/wiki/scripts/ground.sh scout "BM25" kernelbot

# Memória de sessão
python3 ~/.cursor/hooks/wiki-mem/mem.py search "…"

# Chat terminal (opcional; não é o cérebro de coding)
wiki run
```

---

## 13. Inventário de paths (sessão)

| Recurso | Path |
|---------|------|
| Skill MegaBrain | `~/.cursor/skills/orquestrar/` |
| Skill wiki | `~/.cursor/skills/wiki/` |
| Skill mem | `~/.cursor/skills/wiki-mem/` |
| Skill-authoring | `~/.cursor/skills/skill-authoring/` |
| Rule global | `~/.cursor/rules/wiki-agent.mdc` |
| Comandos | `~/.cursor/commands/{MegaBrain,wiki,mem}.md` |
| Hooks | `~/.cursor/hooks.json`, `~/.cursor/hooks/wiki-mem/` |
| RAG package | `karpathyWiki/rag/` |
| Índice/LanceDB | `rag/.data/` (gitignored) |
| Packs | `rag/packs/` |
| Watch systemd | `~/.config/systemd/user/wiki-*.service` |
| Sessões episódicas | `karpathyWiki/.ai/sessions/` |
| Evals MegaBrain | `~/.cursor/skills/orquestrar-workspace/iteration-{24,25,26}/` |
| Evals wiki | `~/.cursor/skills/wiki-workspace/iteration-2/` |
| Este dossier | `.ai/wiki/cursor-megabrain-rag-stack.md` |
