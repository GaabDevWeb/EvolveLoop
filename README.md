# CursorSKILLS — MegaBrain Setup Portátil

**Repo:** [GaabDevWeb/CursorSKILLS](https://github.com/GaabDevWeb/CursorSKILLS)  
**Objectivo:** clonar noutro PC e ter o mesmo setup Cursor (skills, agents, commands, rules, hooks, MCPs, MegaBrain).

Documento técnico profundo do fluxo: [`docs/MegaBrain-Ecosystem.md`](docs/MegaBrain-Ecosystem.md)  
Stack Wiki + RAG + loops (2026-08): [`docs/cursor-megabrain-rag-stack.md`](docs/cursor-megabrain-rag-stack.md)

---

## O que vem neste repositório

| Pasta / ficheiro | Conteúdo |
|------------------|----------|
| `.cursor/skills/` | Pipeline MegaBrain + `wiki` + `wiki-mem` |
| `.cursor/commands/` | `/MegaBrain`, `/wiki`, `/mem`, `/prd`, `/planejar`, … |
| `.cursor/hooks/` + `hooks.json` | Pickup do orchestrator + memória episódica |
| `Agents/` | Espelhos Markdown dos agentes |
| `Rules/` | `Rules.md` (MegaBrain) + `wiki-agent.mdc` (wiki always-on) |
| `global-skills/` | Skills Tier 3 (`brainstorming`, `image-to-code`, `grill-me`, …) |
| `mcp/` | `mcp.json` pré-configurado + `mcp.env.example` |
| `orchestrator/` | Runtime TypeScript (sem `node_modules`) |
| `agent-setup/` | Instalador declarativo (`agent install --profile …`) |
| `scripts/install-agents-global.sh` | Instalação global num PC novo |
| `docs/` | Ecossistema MegaBrain + dossier stack Wiki/RAG |

**Não inclui** (de propósito, pacote lean): `*-workspace/`, `.tools/codeql`, `.venv-*`, `node_modules`, runs de eval gigantes, índice LanceDB da vault (`karpathyWiki/rag/.data/`).

---

## Instalação noutro PC (do zero)

### Pré-requisitos

- [Cursor](https://cursor.com/) instalado
- Git + SSH com acesso ao GitHub
- Node.js 20+ (MCPs via `npx`, orchestrator opcional)
- Docker (só se fores usar o MCP `docker`)

### 1. Clonar

```bash
git clone git@github.com:GaabDevWeb/CursorSKILLS.git ~/CursorSKILLS
cd ~/CursorSKILLS
```

### 2. Secrets dos MCPs

```bash
cp mcp/mcp.env.example ~/.cursor/mcp.env
# Editar: GITHUB_PAT, FIRECRAWL_API_KEY, FILESYSTEM_ROOT
nano ~/.cursor/mcp.env
```

### 3. Instalar globalmente

```bash
bash scripts/install-agents-global.sh
```

Isto cria/actualiza:

- `~/.cursor/skills/` → symlinks para este clone
- `~/.agents/skills/` → pipeline + Tier 3
- `~/.cursor/commands/` → todos os `/comandos`
- `~/.cursor/rules/megabrain.mdc` + `wiki-agent.mdc`
- `~/.cursor/hooks.json` (orchestrator + `wiki-mem`)
- `~/.cursor/commands/` incluindo `/wiki` e `/mem`
- `~/.cursor/agents.env`
- `~/.cursor/mcp.json` (com secrets materializados)
- `~/.local/bin/agents-orch`

### 4. Reiniciar o Cursor

Fecha e abre o Cursor para carregar commands, hooks, rules e MCPs.

### 5. Autenticar MCPs OAuth

Na primeira utilização no Cursor (Settings → MCP):

- **Sentry** — Authenticate
- **Linear** — fluxo mcp-remote
- **Railway** — Authenticate
- **Figma** — instalar plugin oficial *Figma* (não está no `mcp.json`)

### 6. Testar

Abre **qualquer** pasta de projeto e no chat:

```text
/MegaBrain — cria um endpoint de health check com testes
```

---

## Fluxo MegaBrain (100%)

```text
/MegaBrain
    │
    ├─ Fase 0    /wiki         → HARD-GATE Wiki + RAG (packs, BM25, LanceDB)
    ├─ [opcional] brainstorming / grill-me   (Tier 3)
    ├─ Fase 0.5  /prd          → docs/ (HARD-GATE: aprovação humana)
    ├─ Fase 1    /planejar     → Task Graph + DoD
    ├─ Fase 2    /backend ∥ /frontend-pro ∥ /database
    ├─ Fase 2.5  /frontend-review (modo Review/Audit)
    ├─ Fase 3    /testes       → VERDE | VERMELHO
    ├─ Fase 4    /seguranca    → SEGURO | BLOQUEADO
    ├─ Fase 4b   /devops       (opcional)
    ├─ Fase 5    /validar      → OK | Ajustes (subagente ISOLADO)
    └─ Fase 6    /documentar   → README / docs finais
```

**Decisão após cada gate:** `continuar` | `corrigir` | `replanejar`

**HARD-GATES:**

1. Trabalho técnico → grounding Wiki + RAG (`/wiki`, skill `wiki`) **antes** de planear/implementar
2. Imagem anexada → obrigatório `image-to-code` + Vision no `frontend-pro`
3. Feature nova → `/prd` aprovado antes de `/planejar`

Outer loop: erro → `partial` | `plan_reset` | `full_ground` (não reboot cego). PDA: `plan|exec|gate|explore|critic|librarian` com `GATE_BUNDLE` herdado.

Detalhe fase a fase: [`docs/MegaBrain-Ecosystem.md`](docs/MegaBrain-Ecosystem.md) · stack actual: [`docs/cursor-megabrain-rag-stack.md`](docs/cursor-megabrain-rag-stack.md)

---

## Comandos `/` (mapa completo)

| Comando | Skill | Papel |
|---------|-------|-------|
| `/MegaBrain` | `orquestrar` | Raiz — SSOT, PDA, ciclo completo |
| `/wiki` | `wiki` | Grounding vault + RAG (packs, scout/search) |
| `/mem` | `wiki-mem` | Memória episódica (`.ai/sessions/`) |
| `/prd` | `prd` | Product-spec upstream (docs/) |
| `/adr` | `adr` | Architecture Decision Record |
| `/planejar` | `planner` | Task Graph |
| `/backend` | `backend` | Worker API/servidor |
| `/frontend` / `/frontend-pro` | `frontend-pro` | UI Build / Review / Vision |
| `/database` | `database` | Schema & migrações |
| `/testes` | `testing` | Gate testes |
| `/seguranca` | `security` | Gate segurança v2.1 |
| `/devops` | `devops` | CI/CD & deploy |
| `/validar` | `po-review` | Aceite PO (isolado) |
| `/documentar` | `documentation` | Docs finais |
| `/skill-authoring` | `skill-authoring` | Criar/melhorar skills |

---

## Skills incluídas

### Tier 1 — pipeline (`.cursor/skills/`)

`orquestrar` · `wiki` · `wiki-mem` · `prd` · `planner` · `backend` · `frontend-pro` · `testing` · `security` · `po-review` · `documentation`

### Tier 2 — condicionais

`database` · `adr` · `devops` · `skill-authoring`

### Tier 3 — globais (`global-skills/` → `~/.agents/skills/`)

`brainstorming` · `grill-me` · `image-to-code` · `find-skills` · `executing-plans` · `writing-plans` · `systematic-debugging` · `subagent-driven-development` · `finishing-a-development-branch` · `agent-browser` · `frontend-design` · `ui-ux-pro-max` · `technical-library-dossier`

---

## Agents espelho (`Agents/`)

Atalhos Markdown (não substituem `SKILL.md`):

- `Orquestrador-v2.md` → MegaBrain  
- `Prd.md` · `Planner.md` · `backend.md` · `Security.md` · `Po-review.md` · `DocumentationAgent.md` · `Skill-authoring.md`

---

## Rules

- `Rules/Rules.md` → `~/.cursor/rules/megabrain.mdc` (`alwaysApply: true`)
- `Rules/wiki-agent.mdc` → `~/.cursor/rules/wiki-agent.mdc` (`alwaysApply: true`)

Princípios MegaBrain: não inventar, analisar antes de agir, plano em tarefas complexas, DRY, validar edge cases.

Wiki: grounding em toda interação técnica; após editar código, append `{Projeto}/log.md` no vault. Vault canónico: [GaabDevWeb/karpathyWiki](https://github.com/GaabDevWeb/karpathyWiki) (não vive neste repo).

---

## MCPs pré-configurados

Ver [`mcp/README.md`](mcp/README.md).

| MCP | Auth |
|-----|------|
| context7, playwright, browsermcp, puppeteer, sequential-thinking, memory | nenhuma |
| filesystem | `FILESYSTEM_ROOT` em `mcp.env` |
| github | `GITHUB_PAT` |
| firecrawl | `FIRECRAWL_API_KEY` |
| docker | Docker Desktop/Engine + gateway |
| sentry, linear, railway | OAuth no Cursor |
| Figma | Plugin Cursor (separado) |

---

## Subagentes (PDA)

O MegaBrain **delega** via Protocolo de Delegação Autónoma:

1. Briefing (estrutura + objectivo + impedimentos)
2. Subagente (`generalPurpose` / isolado para PO)
3. Filho devolve `[ENTREGA CONSOLIDADA]` + `[ENCERRAMENTO]`
4. Raiz decide pela matriz e actualiza `.agent_history.md` **no projeto alvo**

Persistência por projeto (não no CursorSKILLS):

- `.agent_history.md`
- `docs/` (PRD, ADR, …)
- `memory/<feature_id>/`
- `telemetry/evidence/`
- `.frontend-review/`

---

## Agent Setup (instalador declarativo)

Além de `scripts/install-agents-global.sh`, o pacote `agent-setup/` instala por perfil:

```bash
cd agent-setup && ./bootstrap.sh
agent doctor
agent install --profile standard   # minimal | standard | full
```

`full` liga PATH do RAG da vault e systemd `wiki-watch` (índice always-on). O código do RAG continua na vault `karpathyWiki/rag/`.

---

## Orchestrator TypeScript (opcional)

```bash
cd orchestrator
npm install
npm run build
# CLI global (após install-agents-global.sh):
agents-orch test
agents-orch engine -- --ir path.ir.yaml --discovery --jobs-dir ./jobs
```

Variáveis em `~/.cursor/agents.env`:

```bash
export AGENTS_ROOT="/caminho/para/CursorSKILLS"
export ORCHESTRATOR_ROOT="$AGENTS_ROOT/orchestrator"
```

---

## Actualizar noutro PC

```bash
cd ~/CursorSKILLS
git pull
bash scripts/install-agents-global.sh
# reiniciar Cursor
```

---

## Checklist “setup igual ao PC original”

- [ ] Clone SSH feito
- [ ] `~/.cursor/mcp.env` preenchido
- [ ] `install-agents-global.sh` corrido sem erros
- [ ] Cursor reiniciado
- [ ] `/MegaBrain` aparece nos commands
- [ ] MCPs listados em Settings → MCP (verdes / autenticados)
- [ ] Plugin Figma instalado (se usares design-to-code)
- [ ] Teste num projeto dummy com `/planejar` ou `/MegaBrain`

---

## Estrutura do repo

```text
CursorSKILLS/
├── README.md                 ← este ficheiro
├── GLOBAL-SETUP.md
├── Agents/
├── agent-setup/              ← CLI `agent install` (perfis)
├── Rules/                    ← megabrain + wiki-agent
├── docs/MegaBrain-Ecosystem.md
├── docs/cursor-megabrain-rag-stack.md
├── mcp/
│   ├── mcp.json
│   ├── mcp.env.example
│   └── README.md
├── global-skills/            ← Tier 3
├── orchestrator/             ← engine TS
├── scripts/install-agents-global.sh
└── .cursor/
    ├── skills/               ← MegaBrain + pipeline
    ├── commands/
    ├── hooks/
    └── hooks.json
```

---

## Licença / uso

Setup pessoal de skills Cursor. Ajusta secrets e paths ao teu ambiente. Não commits `~/.cursor/mcp.env` nem tokens.
