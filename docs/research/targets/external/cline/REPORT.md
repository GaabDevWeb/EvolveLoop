# Target Report — `cline`

| Campo | Valor |
|-------|-------|
| Target | Cline (cline/cline) |
| Category | coding-agent (+ embeddable Agent SDK) |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | GitHub `main` @ `8f0978111fd5acc1187ae06b472b93c53db36021` (2026-09-18); extension CHANGELOG head `4.1.19`; `@cline/agents` package.json `0.0.83` |
| Access limitations | Read-only via public docs + GitHub raw/API. Sem install de deps, sem executar código do projecto, sem conta Enterprise. Firecrawl MCP indisponível (401) nesta sessão. |
| Date | 2026-09-18 |
| Wiki | n/a (alvo externo; fora do ecossistema Gaab mapeado) |

## 1. What exists?

**DOCUMENTED + OBSERVED:** Cline é um coding agent open-source (Apache-2.0) com vários hosts partilhando um *agent core*:

| Surface | Evidência |
|---------|-----------|
| VS Code / Cursor / Windsurf extension | README + `apps/vscode/` |
| CLI (`cline`) + TUI + headless | README + docs `usage/cli-overview` |
| Desktop app (Tauri) | README + `apps/examples/desktop-app/` |
| JetBrains plugin | DOCUMENTED como produto; **código do plugin NÃO está open-source** (README: "Currently we are not open-sourcing JetBrains plugins") |
| Kanban (agentes paralelos + worktrees) | docs `usage/kanban` |
| ACP clients (Zed, Neovim, Emacs, …) | docs `usage/acp` |
| Embeddable SDK (`@cline/sdk` / `@cline/core` / `@cline/agents` / `@cline/llms` / `@cline/shared`) | `sdk/README.md`, `sdk/ARCHITECTURE.md` |

Capacidades product-facing (README / docs overview): ler/escrever ficheiros, terminal, browser (IDE), Plan & Act, rules/skills, MCP, plugins, multi-agent teams, schedules, connectors (Slack/Telegram/…), checkpoints, multi-provider LLM.

## 2. Architecture map

```text
Host Apps (CLI / VS Code / Desktop / JetBrains* / Kanban / custom)
        │
        ▼
@cline/core  — sessions, SQLite/artifacts, built-in tools, MCP, plugins,
               compaction policy, telemetry, hub daemon, schedules/cron, approvals
        │
        ├── @cline/agents  — AgentRuntime loop (stateless): iterate → model → tools → events
        ├── @cline/llms    — provider gateway / catalogs / handlers
        └── @cline/shared  — types, createTool, HookEngine, remote-config primitives

* JetBrains: client closed-source; talks to shared agent core (DOCUMENTED)
```

**Runtime backends (DOCUMENTED + ARCHITECTURE.md OBSERVED):**

| Mode | Role |
|------|------|
| `local` | In-process `LocalRuntimeHost` |
| `hub` / `auto` | Hub daemon (coordena) + spoke workers (executam loop) + clients WebSocket |
| `remote` | Hub endpoint remoto explícito |

**Regra hub-spoke (docs):** clients *participate*, spokes *execute*, hub *coordinates* — sem overlap de papéis.

## 3. Execution flow (or UNKNOWN)

### 3.1 Loop do agente (`@cline/agents`) — OBSERVED em `agent-runtime.ts`

```text
Input (run/continue)
  → beforeRun hooks
  → while (iteration < maxIterations | unbounded):
       → prepare turn (core may project compacted context)
       → beforeModel → provider stream (retries ≤3 on transient errors)
       → afterModel
       → for each tool call:
            resolve toolPolicies → request approval if needed
            → beforeTool → execute → afterTool
            → feed tool result into transcript
       → stop on completion tool / model done / abort / overflow terminal
  → afterRun hooks
  → AgentRunResult + events
```

Conclusão de tarefa no core: `submit_and_exit` (análogo histórico a `attempt_completion`) → `task.completed` (ARCHITECTURE.md).

### 3.2 Sessão ClineCore / hub (DOCUMENTED)

```text
Host → ClineCore.start(prompt, config)
  → RuntimeHost (local | hub | remote)
  → assemble tools (builtins + MCP + plugins + skills tool)
  → AgentRuntime loop
  → persist messages / compaction artifact / telemetry
  → stream events to attached clients
  → (optional) shadow-git checkpoints after mutating tools (IDE docs)
```

### 3.3 Plan → Act (product workflow) — DOCUMENTED

```text
Plan mode: explore/search/read; no file writes / no commands
  → user switches mode (context retained)
Act mode: edits + terminal + remaining tools with approval/auto-approve
```

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Orquestrar tool-using LLM sem acoplar UI/storage | `AgentRuntime` stateless + packages layered | OBSERVED `agent-runtime.ts`; DOCUMENTED sdk architecture | HIGH — separação Agent decide / Runtime orquestra |
| M02 | Sessões que sobrevivem a clients; multi-client | Hub-spoke daemon + WebSocket + spoke workers | DOCUMENTED hub-spoke; ARCHITECTURE hub auth/discovery | HIGH para multi-surface |
| M03 | Controlo humano sobre side-effects | Per-tool `toolPolicies` + `requestToolApproval` capability; product Auto Approve categories; YOLO | DOCUMENTED permission-handling + auto-approve; OBSERVED `resolveToolPolicy` | HIGH — Policy autoriza |
| M04 | Separar planejamento de mutação | Plan mode (read-only tool set) vs Act mode; optional dual models; `/deep-planning` | DOCUMENTED plan-and-act | HIGH UX; MEDIUM como padrão de Policy |
| M05 | Extensão de capabilities | Built-ins + MCP (stdio/SSE/streamableHttp) + plugins + Agent Plugins v1 | DOCUMENTED tools/MCP/sdk README; OBSERVED `extensions/mcp/`, tool defs | HIGH |
| M06 | Progressive instruction loading | Skills: metadata always → `skills`/`use_skill` loads SKILL.md → resources on demand | DOCUMENTED skills.md | HIGH token efficiency |
| M07 | Context window long-running tasks | Compaction owned by `core`; agents keep append-only canonical transcript; overflow recovery in runtime | OBSERVED ARCHITECTURE §9 + agent-runtime overflow messages; CHANGELOG compaction fix | HIGH |
| M08 | Rollback de mutações sem perder chat | Shadow Git checkpoints após tool use; restore files / task / both | DOCUMENTED checkpoints | HIGH recovery UX |
| M09 | Terminal longo / detach | Shell progress events; `run.proceed_while_running`; detached logs capped | OBSERVED ARCHITECTURE hub shell section | MEDIUM–HIGH |
| M10 | Browser automation (IDE) | Puppeteer-core + chrome-launcher `BrowserSession` | OBSERVED `apps/vscode/.../BrowserSession.ts`; DOCUMENTED auto-approve "Use the browser" | MEDIUM — host-specific, não no DefaultToolNames do SDK |
| M11 | Parallel research sem poluir contexto | Subagents read-only (`use_subagents`); costs tracked separately | DOCUMENTED subagents (experimental) | MEDIUM |
| M12 | Multi-agent coordination | Teams / spawn via `@cline/core`; CLI `--team-name` | DOCUMENTED README + ARCHITECTURE team abort rules | MEDIUM |
| M13 | Recovery de falhas de provider / overflow | Transient provider retries (3, backoff); one overflow compact+retry per run | OBSERVED `agent-runtime.ts` constants/comments | HIGH |
| M14 | Observabilidade | Runtime events; OpenTelemetry / Langfuse seams; enterprise monitoring docs | DOCUMENTED events + enterprise OTel; ARCHITECTURE Langfuse ownership | MEDIUM |
| M15 | Rules always-on vs skills on-demand | `.clinerules` / AGENTS.md watchers vs skills | DOCUMENTED rules + skills + ARCHITECTURE config watchers | MEDIUM |
| M16 | Enterprise governance | Remote config, MCP allowlists, YOLO controls, SSO | DOCUMENTED enterprise pages (não verificado em runtime) | MEDIUM product; LOW para MegaBrain core |

### Tool inventory (SDK DefaultToolNames) — OBSERVED

`read_files`, `search_codebase`, `run_commands`, `fetch_web_content`, `apply_patch`, `editor`, `skills`, `ask_question`, `submit_and_exit`.

**CONFLICT:** docs `tools-reference/all-cline-tools.md` listam aliases (`bash`, `search`, `fetch_web`); código usa os nomes acima. Subagents docs ainda citam nomes legacy (`read_file`, `execute_command`).

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Stack TypeScript modular; loop bem documentado em ARCHITECTURE; browser/MCP maduros no produto | OBSERVED/DOCUMENTED |
| Product | Multi-surface (IDE+CLI+Desktop+SDK); Plan/Act + checkpoints como UX de confiança | DOCUMENTED |
| Distribution | VS Marketplace + npm CLI/SDK + open GitHub; ~68.7k stars (API 2026-09-18) — **popularidade ≠ mérito** | MEASURED count only |
| Ecosystem | MCP, Agent Plugins v1, connectors, many LLM providers | DOCUMENTED |
| Timing | Migração activa VS Code → monorepo/`apps/vscode`; SDK “next-gen” paralelo a extension legacy surfaces | INFERRED from README WIP note + dual tool name eras |
| Community / DX | docs.cline.bot completo (`llms.txt`); Discord; hooks/plugins examples | DOCUMENTED |

## 6. Comparison with MegaBrain (per mechanism)

Baseline: `research/OUR-SYSTEM-BASELINE.md`.

### M01 Stateless agent loop + layered runtime

```text
EXTERNAL_MECHANISM   AgentRuntime (agents) + ClineCore (core)
PROBLEM_SOLVED       Separar loop tool-calling de persistence/host
OUR_CURRENT_MECHANISM Orchestrator + skill orquestrar + PDA Task tool
EQUIVALENCE          PARTIAL
GAP                  MegaBrain tem Capability IR / registries; Cline tem loop LLM+tools genérico embeddable
TRADE_OFF            Cline optimiza coding-agent UX; MegaBrain optimiza pipeline multi-capability com Evidence gates
EVIDENCE             OBSERVED agent-runtime; baseline orchestrator
APPLICABILITY        Ideias de seams (hooks, events), não copiar runtime
DECISION             ALREADY_PRESENT (orquestração) + ADAPT (event/hook seams se faltar DX)
Confidence           MEDIUM
```

### M02 Hub-spoke multi-client session

```text
EXTERNAL_MECHANISM   Hub daemon + spokes + WS clients
PROBLEM_SOLVED       Sessão independente do UI; multi-attach
OUR_CURRENT_MECHANISM Cursor chat/session + jobs/checkpoints PARTIAL; sem hub local partilhado
EQUIVALENCE          NONE–PARTIAL
GAP                  Persistência/attach multi-client de sessão agentic
TRADE_OFF            Complexidade daemon vs simplicidade single-process
EVIDENCE             DOCUMENTED hub-spoke
APPLICABILITY        Só se MegaBrain precisar multi-surface local; fora do núcleo Cursor Agent
DECISION             DEFER
Confidence           MEDIUM
```

### M03 Tool policies + approval capability

```text
EXTERNAL_MECHANISM   toolPolicies + requestToolApproval; Auto Approve categories; YOLO
PROBLEM_SOLVED       Autorizar side-effects por tool/categoria
OUR_CURRENT_MECHANISM Policy Engine (orquestrar) + Cursor approvals
EQUIVALENCE          SUBSTANTIAL
GAP                  Granularidade categoria (read/edit/cmd/browser/MCP) + YOLO explícito como perfil
TRADE_OFF            UX de toggle vs policy declarativa formal
EVIDENCE             DOCUMENTED; baseline Policy
APPLICABILITY        Adaptar modelo de categorias se Policy actual for só coarse
DECISION             ALREADY_PRESENT (+ ADAPT UI categories se audit mostrar gap)
Confidence           MEDIUM — GAP: needs audit of CursorSKILLS policy depth
```

### M04 Plan vs Act mode

```text
EXTERNAL_MECHANISM   Dual mode restringindo tool set; dual models; /deep-planning
PROBLEM_SOLVED       Evitar mutação prematura; separar explore de execute
OUR_CURRENT_MECHANISM PDA roles plan/exec/gate/explore/critic
EQUIVALENCE          SUBSTANTIAL (roles) ≠ product dual-mode
GAP                  Modo product-facing com tool whitelist hard + model switch
TRADE_OFF            Dois modos UX vs grafo de roles
EVIDENCE             DOCUMENTED plan-and-act; baseline PDA
APPLICABILITY        ADAPT: formalizar "plan role = no mutating tools" como policy, não UI clone
DECISION             ADAPT
Confidence           HIGH
```

### M05 MCP + plugins + builtins

```text
EXTERNAL_MECHANISM   MCP manager + plugin sandbox + default tools
PROBLEM_SOLVED       Extensibilidade de tools
OUR_CURRENT_MECHANISM Cursor MCP + skills + Provider/Capability registries
EQUIVALENCE          PARTIAL–SUBSTANTIAL
GAP                  Plugin sandbox idle eviction / Agent Plugins discovery rules (hub-owned)
TRADE_OFF            Sandbox overhead vs trust
EVIDENCE             DOCUMENTED MCP; OBSERVED extensions/mcp
APPLICABILITY        Não duplicar MCP stack; estudar sandbox isolation se plugins locais crescerem
DECISION             ALREADY_PRESENT (MCP/skills) ; DEFER (plugin sandbox patterns)
Confidence           MEDIUM
```

### M06 Progressive skills loading

```text
EXTERNAL_MECHANISM   Skill metadata → on-demand body → resources
PROBLEM_SOLVED       Context explosion de muitas skills
OUR_CURRENT_MECHANISM Cursor skills / SKILL.md packages (carregamento tipicamente por invocação/regra)
EQUIVALENCE          PARTIAL
GAP                  Catálogo sempre-visível (~100 tok) + tool `skills` para activar
TRADE_OFF            Descoberta automática vs carga explícita
EVIDENCE             DOCUMENTED skills.md progressive loading table
APPLICABILITY        Vale PROTOTYPE se corpus de skills MegaBrain crescer
DECISION             PROTOTYPE
Confidence           MEDIUM
```

### M07 Context compaction + overflow recovery

```text
EXTERNAL_MECHANISM   core compaction strategies + runtime overflow compact-once
PROBLEM_SOLVED       Long tasks / context overflow
OUR_CURRENT_MECHANISM Telemetry/summarizeExecutionTrace PARTIAL; compaction UNKNOWN
EQUIVALENCE          NONE–PARTIAL
GAP                  Compaction artifact separado do transcript canónico + recovery loop
TRADE_OFF            Custo de sumarização vs perda de detalhe
EVIDENCE             ARCHITECTURE §9 OBSERVED; CHANGELOG compaction trigger fix
APPLICABILITY        Alta para sessions longas
DECISION             PROTOTYPE (hypothesis + experiment required before adopt)
Confidence           MEDIUM
```

### M08 Shadow-git checkpoints

```text
EXTERNAL_MECHANISM   Shadow git snapshot per tool mutation; restore triad
PROBLEM_SOLVED       Undo seguro sob auto-approve
OUR_CURRENT_MECHANISM Persistence jobs/checkpoints PARTIAL (não shadow-git product)
EQUIVALENCE          PARTIAL
GAP                  Checkpoint de workspace files acoplado a tool steps
TRADE_OFF            I/O em repos grandes (docs avisam)
EVIDENCE             DOCUMENTED checkpoints
APPLICABILITY        Útil se MegaBrain mutar repos sob autonomia
DECISION             DEFER (product Cursor já tem undo/checkpoints próprios — não inventar segundo)
Confidence           LOW–MEDIUM — GAP: needs audit of Cursor checkpoint vs need
```

### M10 Browser (Puppeteer session)

```text
EXTERNAL_MECHANISM   IDE BrowserSession (puppeteer-core)
PROBLEM_SOLVED       UI web verification / fetch interactive
OUR_CURRENT_MECHANISM MCP browser/playwright tools disponíveis no Cursor
EQUIVALENCE          PARTIAL (via MCP, não built-in Cline-like)
GAP                  UNKNOWN se queremos browser first-party
DECISION             ALREADY_PRESENT via MCP tooling; REJECT built-in duplicate
Confidence           MEDIUM
```

### M11 Subagents read-only fan-out

```text
EXTERNAL_MECHANISM   Parallel research agents; restricted tools
PROBLEM_SOLVED       Broad explore sem encher contexto lead
OUR_CURRENT_MECHANISM Task tool explore/PDA multi-agent
EQUIVALENCE          SUBSTANTIAL
GAP                  Defaults read-only + cost rollup UX
DECISION             ALREADY_PRESENT ; ADAPT restrições read-only explícitas se faltar
Confidence           MEDIUM
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| M01 Layered AgentRuntime | ALREADY_PRESENT (+ ADAPT hooks/events DX) | MEDIUM |
| M02 Hub-spoke | DEFER | MEDIUM |
| M03 Tool approval policies | ALREADY_PRESENT (+ ADAPT categories se audit) | MEDIUM |
| M04 Plan/Act tool whitelist | ADAPT | HIGH |
| M05 MCP/plugins | ALREADY_PRESENT ; DEFER sandbox | MEDIUM |
| M06 Progressive skills | PROTOTYPE | MEDIUM |
| M07 Compaction + overflow recovery | PROTOTYPE | MEDIUM |
| M08 Shadow checkpoints | DEFER | LOW–MEDIUM |
| M09 Detachable long commands | DEFER | MEDIUM |
| M10 Browser built-in | REJECT (duplicate of MCP browser) | MEDIUM |
| M11 Subagents | ALREADY_PRESENT (+ ADAPT) | MEDIUM |
| M12 Teams | DEFER | MEDIUM |
| M13 Provider retry / overflow | ADAPT | HIGH |
| M14 OTel events | ALREADY_PRESENT (PARTIAL telemetry) ; DEFER full OTel | MEDIUM |
| M15 Rules vs skills split | ALREADY_PRESENT | HIGH |
| M16 Enterprise remote config | REJECT (product-specific) | HIGH |

**Não implementar nesta skill.** Handoff apenas.

## 8. UNKNOWN / CONFLICTS

Ver `UNKNOWNS.md`. Conflitos principais:

1. Marketing/overview: “Every action requires your explicit approval” vs Auto Approve / YOLO / SDK default `autoApprove` quando policy omitida.
2. Nomes de tools: docs `bash`/`fetch_web` vs código `run_commands`/`fetch_web_content`.
3. Browser: product Auto Approve + VS Code Puppeteer vs ausência em `DefaultToolNames` do SDK.
4. Subagents docs usam tool names legacy.
5. Agenda/`tasks` tool parcialmente disabled por flags (`AGENDA_TODO_TOOL_ENABLED`) — ARCHITECTURE.

## 9. Sources

### Primary — docs

- https://docs.cline.bot/llms.txt
- https://docs.cline.bot/cline-overview.md
- https://docs.cline.bot/core-workflows/plan-and-act.md
- https://docs.cline.bot/features/auto-approve.md
- https://docs.cline.bot/tools-reference/all-cline-tools.md
- https://docs.cline.bot/mcp/mcp-overview.md
- https://docs.cline.bot/sdk/guides/permission-handling.md
- https://docs.cline.bot/sdk/architecture/hub-spoke.md
- https://docs.cline.bot/sdk/architecture/overview.md
- https://docs.cline.bot/core-workflows/checkpoints.md
- https://docs.cline.bot/customization/skills.md
- https://docs.cline.bot/features/subagents.md
- https://docs.cline.bot/sdk/events.md

### Primary — code / repo

- https://github.com/cline/cline (Apache-2.0)
- `sdk/ARCHITECTURE.md` (raw main)
- `sdk/README.md`, `sdk/packages/agents/README.md`
- `sdk/packages/agents/src/agent-runtime.ts`
- `sdk/packages/core/src/extensions/tools/{definitions,constants}.ts`
- `apps/vscode/src/services/browser/BrowserSession.ts`
- `CHANGELOG.md` (4.1.19)
- GitHub API metadata (stars, commit SHA)

### Baseline

- `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

## 10. Handoff

- Para `agent-authoring`: se PROTOTYPE M06/M07 forem aprovados pelo Lead — escrever hypothesis/experiment; **não** criar Agent Package aqui.
- Para `architect` / `adr`: ADAPT M04 (plan role = no mutating tools) e ADAPT M13 (retry/overflow policy) como candidatos a ADR.
- **Não implementado nesta skill.**

---

## Lens checklist (pedido)

| Lens | Finding breve |
|------|----------------|
| Agent loop | Stateless `AgentRuntime` while-iterations; completion via `submit_and_exit` |
| Tools | DefaultToolNames acima + MCP + plugins; approval gated |
| Browser | IDE Puppeteer session; SDK usa `fetch_web_content` (HTTP), não browser full |
| Terminal | `run_commands` + progress streaming + detach proceed |
| File system | `read_files` / `editor` / `apply_patch` / `search_codebase` |
| MCP | Config JSON; stdio + streamableHttp + legacy SSE; per-tool autoApprove |
| Approval | toolPolicies + host capability; product Auto Approve / YOLO |
| Permissions | Workspace vs outside; safe vs requires_approval commands (model-flagged) |
| Context | Skills progressive; core compaction; overflow recovery |
| Planning | Plan mode + `/deep-planning` |
| Execution | Act mode + hub/local runtimes |
| Recovery | Checkpoints; provider retry; compaction; abort boundaries |
| DX | Rich docs, SDK examples, multi-host; tool-name migration friction |
