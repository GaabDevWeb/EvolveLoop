# Target Report — `claude-code`

| Campo | Valor |
|-------|-------|
| Target | Claude Code + Claude Agent SDK (Anthropic) |
| Category | coding-agent + Agent SDK |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | Docs em `code.claude.com` consultadas 2026-09-18; SDKs tipados `@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk` (versões de runtime **não pinadas** nesta investigação) |
| Access limitations | Só documentação oficial pública; **sem** leitura do source fechado do CLI nativo; **sem** instalação/execução do binário; internals de scheduling/model routing = UNKNOWN |
| Date | 2026-09-18 |
| Epistemic posture | Prefer DOCUMENTED (Anthropic). Fechados → UNKNOWN. Marketing → separado. |

## 1. What exists?

**Claude Code** é o coding agent interactivo (CLI/IDE/Desktop/web) da Anthropic. O **Claude Agent SDK** (Python + TypeScript) embute o **mesmo agent loop, tools e context management** como biblioteca (`query()` / `ClaudeSDKClient`), com binário Claude Code empacotado como dependência opcional.

**DOCUMENTED identity:**

| Peça | Papel |
|------|--------|
| Agent loop | Prompt → evaluate → tool calls → results → repeat até texto sem tools / limites |
| Built-in tools | Read, Edit, Write, Glob, Grep, Bash, WebSearch, WebFetch, ToolSearch, Agent, Skill, AskUserQuestion, TaskCreate/Update, Monitor, … |
| Skills | Pacotes `SKILL.md` (Agent Skills open standard + extensões Claude Code) |
| CLAUDE.md + auto memory | Instruções persistentes + notas que o modelo escreve |
| Subagents | Contextos isolados via tool `Agent`; Explore/Plan/general-purpose built-in |
| Hooks | PreToolUse/PostToolUse/Stop/Session*/PreCompact/… (shell, HTTP, prompt, agent, MCP) |
| Permissions | allow/ask/deny + modes (`default`, `acceptEdits`, `plan`, `auto`, `dontAsk`, `bypassPermissions`) |
| Sandbox | Isolamento OS do Bash (Seatbelt macOS; bubblewrap Linux/WSL2) |
| MCP | Servidores externos; aprovações de projecto; tool search defer schemas |
| Sessions | Transcripts em disco; resume/continue/fork; SessionStore cross-host |

**Não é (neste scope):** um framework genérico de multi-agent graph (tipo LangGraph). É um **harness de coding agent** + SDK de embedding.

## 2. Architecture map

```text
┌──────────────────────────────────────────────────────────────────┐
│ Surface: CLI `claude` | IDE | Desktop | Web | Agent SDK          │
│          (mesmo loop DOCUMENTED)                                 │
└────────────────────────────┬─────────────────────────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │ Context assembly (cada request)       │
         │ system prompt · CLAUDE.md · rules     │
         │ skill descriptions · tool defs        │
         │ history · auto memory (capped)        │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │ Model turn (Claude)                   │
         │ text ± tool_use blocks                │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │ Authorization                         │
         │ deny > ask > allow · permissionMode   │
         │ PreToolUse hooks (can block)          │
         │ Bash ± OS sandbox                     │
         └───────────────────┬───────────────────┘
                             │
         ┌───────────────────▼───────────────────┐
         │ Tool execution                        │
         │ built-in | MCP | custom SDK tools     │
         │ Agent → subagent loop (fresh ctx)     │
         │ Skill → load SKILL.md (± fork)        │
         └───────────────────┬───────────────────┘
                             │
         PostToolUse → feed results → next turn
         compact_boundary quando janela enche
         ResultMessage (success | max_turns | budget | …)
```

**Separação crítica (DOCUMENTED):** CLAUDE.md / prompts = **contexto** (não enforcement). Enforcement = **permissions + hooks + sandbox**.

## 3. Execution flow (DOCUMENTED)

```text
Input (user prompt | SDK query)
  → SessionStart / Setup hooks (se config)
  → SystemMessage init (session_id, metadata)
  → LOOP (turn):
       Model evaluates (system + tools + history)
       → AssistantMessage (text ± tool_use)
       → [se tool_use]:
            PreToolUse hooks
            Permission evaluation (deny/ask/allow + mode)
            Execute tool(s)
              · readonly → pode paralelo
              · mutating (Edit/Write/Bash) → sequencial
              · Agent → sub-loop isolado; só summary volta
              · Skill → inject body (± context:fork)
            PostToolUse hooks
            UserMessage(tool results)
       → até response sem tool_use OU maxTurns / maxBudgetUsd
  → compact se necessário (PreCompact → summary → compact_boundary)
  → ResultMessage + cost/usage/session_id
```

**Coding workflow típico (INFERRED a partir de docs + exemplos oficiais):** explore (Glob/Grep/Read ± Explore subagent) → edit → Bash test → iterate; plan mode bloqueia writes até aprovação.

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| CC-LOOP | Orquestrar plano+acção sem o host implementar tool loop | Autonomous agent loop com turns, streaming messages, caps | DOCUMENTED | USEFUL |
| CC-TOOLS | Acções no filesystem/shell/web | Tool surface fixa + MCP + custom; ToolSearch lazy | DOCUMENTED | USEFUL |
| CC-SKILLS | Procedimentos longos sem encher contexto sempre | Progressive disclosure: description at start, body on invoke | DOCUMENTED | USEFUL |
| CC-CLAUDEMD | Persistência de regras projecto/user/org | Hierarchy CLAUDE.md + `.claude/rules/` + imports `@` | DOCUMENTED | USEFUL |
| CC-AUTOMEM | Aprendizagem entre sessões sem editar CLAUDE.md | Auto memory (`MEMORY.md` capped 200 lines/25KB) | DOCUMENTED | CONDITIONALLY_USEFUL |
| CC-CTX | Janela cresce com tools/history | Prompt cache prefixes estáveis; auto-compaction; `/context` | DOCUMENTED | USEFUL |
| CC-SUBAGENT | Pesquisa/logs inundam contexto pai | Tool `Agent`: fresh window; return summary only | DOCUMENTED | USEFUL |
| CC-DELEGATE | Especialização + restrição de tools/modelo | Frontmatter agents + Explore/Plan readonly | DOCUMENTED | USEFUL |
| CC-HOOKS | Enforcement determinístico além do LLM | Lifecycle hooks (shell/HTTP/prompt/agent) | DOCUMENTED | USEFUL |
| CC-PERM | Controlo fino de autoridade | allow/ask/deny + modes + `canUseTool` SDK | DOCUMENTED | USEFUL |
| CC-RESTRICT | Tool surface mínima por worker | `allowedTools`/`disallowedTools` + subagent `tools` + skill `allowed-tools` | DOCUMENTED | USEFUL |
| CC-SANDBOX | Autonomia Bash sem trust cego do modelo | OS FS/network isolation (Seatbelt/bwrap) | DOCUMENTED | USEFUL |
| CC-MCP | Extensão a serviços externos | MCP servers + project trust + deferred schemas | DOCUMENTED | USEFUL |
| CC-SESSION | Continuidade / recover / branch | Disk transcripts; resume/continue/fork; SessionStore | DOCUMENTED | USEFUL |
| CC-BUDGET | Runaways de custo/latência | `maxTurns`, `maxBudgetUsd`, effort levels | DOCUMENTED | USEFUL |

## 5. Adoption analysis (separated — não ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Harness completo (loop+tools+policy+context) bem documentado; SDK = mesmo motor | DOCUMENTED |
| Product | Coding agent first-party Anthropic; SDK para embed em apps | DOCUMENTED |
| Distribution | npm/pip packages; CLI; IDE extensions; Bedrock/Vertex/Foundry auth paths | DOCUMENTED |
| Ecosystem | Agent Skills standard; MCP; plugins; `.claude/` conventions | DOCUMENTED |
| Timing | Docs reflectem features versionadas (min-version markers frequentes) | DOCUMENTED |
| Community / DX | Docs `code.claude.com` densas; hooks/permissions/sandbox deep | DOCUMENTED |
| Lock-in | Loop acoplado ao binário Claude Code; prompts CLAUDE.md portáveis parcial | INFERRED |

Popularidade ≠ superioridade técnica: **não** usado como argumento de decisão.

## 6. Comparison with MegaBrain (per mechanism)

### CC-LOOP — Agent loop

```text
EXTERNAL_MECHANISM   Autonomous tool-use loop until done / caps
PROBLEM_SOLVED       Host não reimplementa planner+executor
OUR_CURRENT_MECHANISM Orchestrator + skill orquestrar + PDA Task roles
EQUIVALENCE          PARTIAL — nós temos runtime orquestrado por capabilities/gates; CC é LLM-driven tool loop monolítico
GAP                  MegaBrain enfatiza Evidence/Policy gates; CC enfatiza model agency + hooks
TRADE_OFF            Agência vs auditabilidade estruturada
EVIDENCE             DOCUMENTED agent-loop.md + baseline OUR-SYSTEM
APPLICABILITY        Não copiar loop fechado; aprender limites (turns/budget)
DECISION             ALREADY_PRESENT (orquestração) + DEFER (adotar loop “Claude-style” como substituto)
```

### CC-TOOLS / CC-RESTRICT — Tools + restrictions

```text
EXTERNAL_MECHANISM   Named tools + allow/deny lists + parallel readonly
OUR_CURRENT_MECHANISM Capability Registry + Provider Registry + Policy
EQUIVALENCE          SUBSTANTIAL (registo + autorização); surface de coding tools é diferente
GAP                  ToolSearch / lazy MCP schemas
DECISION             ALREADY_PRESENT (registry+policy); PROTOTYPE ToolSearch-like progressive tool loading
```

### CC-SKILLS

```text
EXTERNAL_MECHANISM   SKILL.md progressive load + Skill tool + fork
OUR_CURRENT_MECHANISM `.cursor/skills/**/SKILL.md` instruction packages
EQUIVALENCE          SUBSTANTIAL
GAP                  Formalizar `allowed-tools` / `context:fork` / dynamic `!`cmd`` injection se ausentes
DECISION             ALREADY_PRESENT; ADAPT frontmatter de restrição/fork se gap confirmado em audit CursorSKILLS
```

### CC-CLAUDEMD / Context instructions

```text
EXTERNAL_MECHANISM   Hierarchical CLAUDE.md + path rules + “context not enforcement”
OUR_CURRENT_MECHANISM Rules Cursor + GaabWiki grounding + megabrain rules
EQUIVALENCE          PARTIAL
GAP                  Distinção explícita instrução vs enforcement (hooks/policy) já parcialmente alinhada
DECISION             ADAPT — reforçar “rules ≠ policy”; path-scoped rules
```

### CC-CTX — Compaction + cache

```text
EXTERNAL_MECHANISM   Auto-compact + prompt cache + what survives table
OUR_CURRENT_MECHANISM Memory episódica / sessions PARTIAL; compaction UNKNOWN
EQUIVALENCE          PARTIAL–NONE
GAP                  Compaction policy + re-inject de contratos canónicos
DECISION             PROTOTYPE compact boundary + persist critical contracts outside chat
```

### CC-SUBAGENT / CC-DELEGATE

```text
EXTERNAL_MECHANISM   Fresh context workers; Explore/Plan skip CLAUDE.md
OUR_CURRENT_MECHANISM Task tool PDA roles (plan/exec/gate/explore/critic/librarian)
EQUIVALENCE          SUBSTANTIAL
GAP                  Explicit “parent só vê summary”; tool allowlists por role
DECISION             ALREADY_PRESENT; ADAPT isolation contract + readonly explore defaults
```

### CC-HOOKS

```text
EXTERNAL_MECHANISM   Pre/Post tool hooks, PreCompact, Session*
OUR_CURRENT_MECHANISM Cursor hooks + MegaBrain promote-queue PARTIAL
EQUIVALENCE          PARTIAL
GAP                  PreToolUse as hard gate wired to Policy
DECISION             ADAPT — mapear PreToolUse → Policy Engine; não duplicar bus
```

### CC-PERM

```text
EXTERNAL_MECHANISM   deny>ask>allow + modes + classifier auto
OUR_CURRENT_MECHANISM Policy Engine DOCUMENTED+IMPLEMENTED
EQUIVALENCE          SUBSTANTIAL
GAP                  UX modes (plan/acceptEdits) vs nossos GATE_BUNDLE
DECISION             ALREADY_PRESENT; ADAPT mode vocabulary se útil ao DX
```

### CC-SANDBOX

```text
EXTERNAL_MECHANISM   OS-level Bash sandbox
OUR_CURRENT_MECHANISM UNKNOWN–PARTIAL (baseline)
EQUIVALENCE          NONE–PARTIAL
GAP                  Isolamento real de execução de código alvo
DECISION             PROTOTYPE / DEFER conforme risk_tier — não inventar sem audit
```

### CC-MCP

```text
EXTERNAL_MECHANISM   MCP + trust dialog + deferred tool schemas
OUR_CURRENT_MECHANISM MCP clients no Cursor; Provider manifests
EQUIVALENCE          PARTIAL–SUBSTANTIAL
DECISION             ALREADY_PRESENT (protocolo); ADAPT trust/approval patterns
```

### CC-SESSION

```text
EXTERNAL_MECHANISM   Transcripts, resume/fork, SessionStore
OUR_CURRENT_MECHANISM jobs/checkpoints PARTIAL; gaabwiki-mem PARTIAL
EQUIVALENCE          PARTIAL
DECISION             ADAPT resume/fork semantics para jobs; REJECT segunda “session registry”
```

### CC-AUTOMEM

```text
EXTERNAL_MECHANISM   Model-written MEMORY.md
OUR_CURRENT_MECHANISM gaabwiki-mem + Evidence Bus (diferente)
EQUIVALENCE          NONE–PARTIAL (ambos “memória”, contratos distintos)
DECISION             DEFER auto-memory LLM-written; prefer Evidence/Knowledge canónicos
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Agent loop | ALREADY_PRESENT (+ DEFER substitute) | HIGH |
| Tools + restrictions | ALREADY_PRESENT; PROTOTYPE lazy tool load | MEDIUM |
| Skills progressive load | ALREADY_PRESENT; ADAPT restrict/fork | HIGH |
| CLAUDE.md hierarchy | ADAPT | HIGH |
| Auto memory | DEFER | MEDIUM |
| Context compaction | PROTOTYPE | MEDIUM |
| Subagents / delegation | ALREADY_PRESENT; ADAPT isolation | HIGH |
| Hooks as enforcement | ADAPT | HIGH |
| Permissions | ALREADY_PRESENT; ADAPT modes | HIGH |
| Sandbox | PROTOTYPE / DEFER | LOW (our side UNKNOWN) |
| MCP | ALREADY_PRESENT; ADAPT trust | HIGH |
| Sessions | ADAPT | MEDIUM |
| Budget/turns caps | ADAPT | HIGH |

## 8. UNKNOWN / CONFLICTS

Ver `UNKNOWNS.md`.

**CONFLICT (menor, docs):** Explore model default — docs notam mudança em v2.1.198 (herda modelo do pai, capped). Resolver: prefer versão documentada mais recente; runtime exact = UNKNOWN sem binário.

## 9. Sources (primary — official)

| Source | URL |
|--------|-----|
| Agent SDK overview | https://code.claude.com/docs/en/agent-sdk/overview |
| Agent loop | https://code.claude.com/docs/en/agent-sdk/agent-loop |
| Tools reference | https://code.claude.com/docs/en/tools |
| Skills | https://code.claude.com/docs/en/skills |
| Memory / CLAUDE.md | https://code.claude.com/docs/en/memory · https://code.claude.com/docs/en/claude-md |
| Context window | https://code.claude.com/docs/en/context-window |
| Subagents | https://code.claude.com/docs/en/sub-agents · https://code.claude.com/docs/en/agent-sdk/subagents |
| Hooks | https://code.claude.com/docs/en/hooks · https://code.claude.com/docs/en/hooks-guide |
| Permissions | https://code.claude.com/docs/en/permissions |
| Sandboxing | https://code.claude.com/docs/en/sandboxing |
| MCP | https://code.claude.com/docs/en/mcp |
| Sessions (CLI) | https://code.claude.com/docs/en/sessions |
| Sessions (SDK) | https://code.claude.com/docs/en/agent-sdk/sessions |
| Docs index | https://code.claude.com/docs/llms.txt |
| Baseline | `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md` |

## 10. Handoff

- Para `agent-authoring`: **não** implementar agora. Candidatos: (1) PreToolUse→Policy wiring, (2) compaction + re-inject de contratos, (3) subagent isolation contract explícito, (4) turn/budget caps nos jobs.
- Para `architect` / ADR: sandbox OS-level vs containers; auto-memory vs Evidence Bus.
- **Investigação relacionada:** target `anthropic-agent-skills` (standard SKILL.md) e `mcp` (protocolo) — não fundir claims.
- **Não implementado nesta skill.**
