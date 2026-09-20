# Target Report — `cursor`

| Campo | Valor |
|-------|-------|
| Target | Cursor (Anysphere) — coding agent product / IDE harness |
| Category | coding-agent (proprietary product; partially closed) |
| Mode | TARGET_RESEARCH |
| Versions examined | Docs live as of 2026-09-18 (`cursor.com/docs/*`); IDE session OBSERVED in this investigator run |
| Access limitations | No Cursor agent source; no harness internals; no embedding/index schema; product docs + SDK surface + this-session tool/rules injection only. `cursor-guide` skill path requested was ABSENT on disk. |
| Date | 2026-09-18 |
| Epistemic posture | Prefer DOCUMENTED / OBSERVED. Internals → UNKNOWN. Do **not** equate product Cursor with MegaBrain Agent System without evidence. |

## Critical identity separation

| Layer | What it is | Label |
|-------|------------|-------|
| **Product Cursor** | Closed IDE + cloud/local agent harness (instructions + tools + model orchestration) | DOCUMENTED |
| **MegaBrain / CursorSKILLS** | Our Agent System that *runs inside* Cursor as rules, skills, MCP, orchestrator content | OBSERVED (this workspace) |
| Equivalence claim | “MegaBrain ≈ Cursor architecture” | **REJECT as fact** without mechanism-level evidence; compare only via lenses |

Wiki: n/a for product Cursor internals (external product). Baseline used: `research/OUR-SYSTEM-BASELINE.md`.

---

## 1. What exists?

Cursor is a VS Code–fork IDE whose **Agent** can plan, search, edit, run terminal, browse, call MCP, and spawn subagents. Official framing (DOCUMENTED): an **agent harness** = (1) Instructions (system prompt + rules), (2) Tools, (3) Model — with **per-model tuning** of instructions/tools.

Extensibility surfaces (DOCUMENTED):

- **Rules** — static / conditional prompt context (`.cursor/rules/*.mdc`, User/Team rules, `AGENTS.md`)
- **Skills** — Agent Skills standard (`SKILL.md`; progressive load; `/` invoke; Custom Modes)
- **Hooks** — JSON lifecycle scripts over stdio (`hooks.json`)
- **MCP** — external tools/resources/prompts
- **Subagents** — Task/delegation with isolated context (built-in Explore/Bash/Browser + custom `.cursor/agents/`)
- **Cloud Agents** (formerly Background Agents) — VM-isolated remote runs
- **SDK** (`@cursor/sdk`) — same agent programmable locally/cloud
- **Composer 2.5** — first-party Cursor model (not “the UI name” alone)
- **Cursor Router / Auto** — classifier-based model routing (Teams/Enterprise for full Router)

Code discovery: **Instant Grep** (DOCUMENTED); blog still mentions **semantic search** (DOCUMENTED product copy); SDK enumerates tool `semSearch` (DOCUMENTED API surface). Full index/embedding pipeline → **UNKNOWN**.

---

## 2. Architecture map

```text
┌────────────────────────── User surfaces ──────────────────────────┐
│ IDE Agent · Agents Window · CLI · Cloud Web/iOS · Slack/@cursor · SDK │
└────────────────────────────┬──────────────────────────────────────┘
                             ▼
┌──────────────────── Cursor Agent Harness (closed) ────────────────┐
│ System prompt (per-model tuned)  │  Rules / AGENTS.md / Skills meta │
│ Tool catalog (built-in + MCP)    │  Mode: Agent | Plan | Ask | Debug│
│ Model selection / Auto Router    │  Context pack + compaction       │
└──────────────┬───────────────────┴──────────────────┬─────────────┘
               │                                      │
               ▼                                      ▼
     Local workspace tools                    Cloud Agent VM
     (FS, Shell, Grep, Edit, …)               (.cursor/environment.json,
                                              hooks subset, team MCP)
               │
               ├── Task → Subagents (isolated ctx)
               ├── MCP servers (stdio / HTTP / SSE)
               ├── Hooks (policy / format / audit)
               └── Checkpoints (file snapshots ≠ Git)
```

**Provenance note:** Box interiors labeled “closed” are **INFERRED structure from docs**, not reverse-engineered source.

---

## 3. Execution flow (or UNKNOWN)

```text
User prompt (+ optional @mentions / /skill / mode)
  → Context assembly: system + tools defs + rules + skill descriptions + MCP catalog
       + conversation (+ summaries if near window full)     [DOCUMENTED categories]
  → Model turn (selected model or Auto/Router classifier)   [DOCUMENTED]
  → Tool loop: search/read/edit/shell/MCP/Task/…             [DOCUMENTED; no call limit]
       ↳ optional: Plan Mode (research → plan file → human approve → build)
       ↳ optional: subagent (Explore/Bash/Browser/custom) → summary to parent
       ↳ optional: hooks gate/observe (preToolUse, beforeShellExecution, …)
  → Checkpoints before significant edits                     [DOCUMENTED]
  → Steer/queue follow-ups mid-run                           [DOCUMENTED]
  → Final output (edits, PR in cloud, artifacts)
```

**UNKNOWN:** exact prompt templates per model; tool-selection policy; compaction algorithm; when Instant Grep vs `semSearch` is chosen; classifier features for Router.

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| CUR-HARNESS | Models differ; need stable agent UX | Per-model tuned instructions + tools (“harness”) | DOCUMENTED | High (product) |
| CUR-RULES | No memory across completions; need persistent guidance | Rules / Team Rules / nested AGENTS.md injected into context | DOCUMENTED + OBSERVED | High |
| CUR-SKILLS | Always-on rules burn context; need on-demand workflows | Skills discovery + progressive load + `/` + Custom Mode | DOCUMENTED + OBSERVED | High |
| CUR-TOOLS | Agent must act on repo | Built-in tools: FS, Grep/Instant Grep, edit, shell, browser, web, Task, … | DOCUMENTED + OBSERVED | High |
| CUR-SEARCH | Find code without dumping whole repo | Instant Grep + Explore subagent; semantic search claimed; `semSearch` in SDK | DOCUMENTED (mixed specificity) | High |
| CUR-CTX | Finite context window | Context ring categories; compaction/summary of older turns | DOCUMENTED | High |
| CUR-SUBAGENT | Noisy intermediate tool output | Isolated subagent windows; parent gets summary | DOCUMENTED + OBSERVED | High |
| CUR-PLAN | Ambiguous/large tasks | Plan Mode: questions → research → editable plan → build | DOCUMENTED | Medium–High |
| CUR-MCP | External systems | MCP tools/resources/prompts; approval/Run Modes | DOCUMENTED + OBSERVED | High |
| CUR-HOOKS | Policy/format/audit around agent loop | hooks.json command hooks over stdio | DOCUMENTED | Medium–High |
| CUR-CLOUD | Long/parallel work off laptop | Cloud Agents in VMs (ex-Background Agents) | DOCUMENTED | High (ops) |
| CUR-ROUTER | Model choice cost/quality tradeoff | Auto + Cost/Balance/Intelligence; Teams Router classifier | DOCUMENTED | Medium–High |
| CUR-COMPOSER | First-party agent model | Composer 2.5 (+ Fast) in Cursor Models pool | DOCUMENTED | Product |
| CUR-CKPT | Safe rollback of agent file edits | Local checkpoints ≠ Git | DOCUMENTED | Medium |
| CUR-STEER | Redirect without killing turn | Queue vs immediate steer at tool boundary | DOCUMENTED | Medium |
| CUR-AUTOREVIEW | Gate shell/MCP/fetch | Run Mode / Auto-review classifier | DOCUMENTED | Medium |
| CUR-SDK | Embed agent in apps/CI | `@cursor/sdk` Agent/Run/local+cloud | DOCUMENTED | Medium |

---

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong productization of harness, tools, skills, MCP, cloud; internals closed | DOCUMENTED / OBSERVED |
| Product | IDE-native agent + multi-surface (web/mobile/Slack) | DOCUMENTED |
| Distribution | Commercial SaaS; plans gate Cloud/Router/Team features | DOCUMENTED |
| Ecosystem | Marketplace plugins, MCP directory, Agent Skills standard, Claude/Codex skill path compat | DOCUMENTED |
| Timing | Skills/hooks/subagents/cloud evolving quickly; docs rename Background→Cloud | DOCUMENTED |
| Community / DX | Rich docs; Customize UI; context ring; built-in `/create-*` skills | DOCUMENTED |
| Lock-in | Harness + index + cloud env proprietary; skills/rules/MCP more portable | INFERRED |

Popular ≠ superior for MegaBrain design. No ranking.

---

## 6. Comparison with MegaBrain (per mechanism)

### CUR-HARNESS

```text
EXTERNAL_MECHANISM   Per-model agent harness (instructions+tools+model)
PROBLEM_SOLVED       Consistent agent behavior across frontier models
OUR_CURRENT_MECHANISM Orchestrator + skills + PDA roles; no first-party model tuning layer
EQUIVALENCE          PARTIAL
GAP                  We author skills/rules; we do not own Cursor’s system prompt / tool schema tuning
TRADE_OFF            Product opacity vs our control of MegaBrain contracts
EVIDENCE             DOCUMENTED (cursor.com/docs/agent/overview; blog agent-best-practices)
APPLICABILITY        Learn separation of concerns; do not reimplement Cursor harness
DECISION             ALREADY_PRESENT (orchestration intent) + DEFER (copying proprietary harness)
Confidence           HIGH on separation; MEDIUM on “already present” grain
```

### CUR-RULES

```text
EXTERNAL_MECHANISM   alwaysApply / globs / intelligent / @mention rules + Team precedence
PROBLEM_SOLVED       Persistent prompt-level policy & conventions
OUR_CURRENT_MECHANISM .cursor/rules + user rules + Policy Engine docs in orquestrar
EQUIVALENCE          SUBSTANTIAL (as delivery channel) / PARTIAL (as Policy Engine)
GAP                  MegaBrain Policy is contract/capability-oriented; Cursor Rules are prompt blobs
TRADE_OFF            Prompt rules = fast DX; Policy Engine = auditable authority
EVIDENCE             DOCUMENTED + OBSERVED (this session always_applied rules)
APPLICABILITY        Keep Rules for Cursor DX; keep Policy for Agent System truth
DECISION             ALREADY_PRESENT (rules channel) · ADAPT (clearer Rules vs Policy boundary)
Confidence           HIGH
```

### CUR-SKILLS

```text
EXTERNAL_MECHANISM   Agent Skills (SKILL.md, paths, disable-model-invocation, progressive refs)
PROBLEM_SOLVED       Dynamic specialized workflows without always-on context
OUR_CURRENT_MECHANISM .cursor/skills/** + skill-authoring; MegaBrain capabilities ≠ skills
EQUIVALENCE          EQUIVALENT for instruction packages; NONE for Capability Registry
GAP                  Do not treat Skills as Capability/Provider replacements
TRADE_OFF            Skills portable; Capabilities typed/gated
EVIDENCE             DOCUMENTED + OBSERVED
APPLICABILITY        Continue skills as Cursor packaging; map to capabilities only via authoring
DECISION             ALREADY_PRESENT
Confidence           HIGH
```

### CUR-TOOLS / CUR-SEARCH / CUR-CTX

```text
EXTERNAL_MECHANISM   Built-in tool loop + Instant Grep + (claimed) semantic search + compaction
PROBLEM_SOLVED       Grounded coding without full-repo dump
OUR_CURRENT_MECHANISM Uses Cursor tools as host; GaabWiki/RAG for domain knowledge
EQUIVALENCE          NONE as owned implementation (host-provided)
GAP                  Our Knowledge/RAG ≠ Cursor codebase index; do not conflate
TRADE_OFF            Host search is free to us; opaque and non-portable
EVIDENCE             DOCUMENTED + OBSERVED tools in this session
APPLICABILITY        Consume host tools; document GAPs for anything we need to own
DECISION             DEFER (owning search/index) · ALREADY_PRESENT (consumption pattern)
Confidence           HIGH
```

### CUR-SUBAGENT

```text
EXTERNAL_MECHANISM   Explore/Bash/Browser + custom agents; Task tool; context isolation
PROBLEM_SOLVED       Parallelism + context hygiene
OUR_CURRENT_MECHANISM PDA Task roles (plan/exec/gate/explore/critic/librarian)
EQUIVALENCE          SUBSTANTIAL (pattern) / PARTIAL (contracts/evals)
GAP                  Our PDA has Evidence/Policy roles; Cursor built-ins are product-tuned
TRADE_OFF            Product subagents vs our typed PDA
EVIDENCE             DOCUMENTED + OBSERVED (Task tool / subagent types in session)
APPLICABILITY        Keep PDA; optionally align naming with Cursor explore patterns
DECISION             ALREADY_PRESENT (multi-agent PDA) · ADAPT (context-isolation discipline)
Confidence           HIGH
```

### CUR-PLAN

```text
EXTERNAL_MECHANISM   Plan Mode + editable markdown plans
PROBLEM_SOLVED       Human review before large edits
OUR_CURRENT_MECHANISM writing-plans / SwitchMode plan + Capability IR plan.ir.yaml
EQUIVALENCE          PARTIAL
GAP                  Cursor plan is UX; our plan.ir.yaml is structured IR
TRADE_OFF            UX speed vs IR rigor
EVIDENCE             DOCUMENTED
APPLICABILITY        Use Plan Mode as host UX; keep IR for orchestrator
DECISION             ALREADY_PRESENT (planning) · DEFER (merging into one format)
Confidence           MEDIUM
```

### CUR-MCP / CUR-HOOKS

```text
EXTERNAL_MECHANISM   MCP + hooks as extension/policy surfaces
PROBLEM_SOLVED       External tools + lifecycle control
OUR_CURRENT_MECHANISM MCP servers + Cursor hooks + MegaBrain promote-queue (PARTIAL)
EQUIVALENCE          SUBSTANTIAL (MCP) / PARTIAL (hooks vs Policy)
GAP                  Hooks ≠ Policy Engine; enterprise allowlists are product-side
EVIDENCE             DOCUMENTED + OBSERVED MCP in session
APPLICABILITY        Prefer Policy for authorization truth; hooks for host integration
DECISION             ALREADY_PRESENT (MCP) · ADAPT (hooks as Policy enforcement adapters)
Confidence           HIGH
```

### CUR-CLOUD / CUR-ROUTER / CUR-COMPOSER

```text
EXTERNAL_MECHANISM   Cloud VMs; Auto Router; Composer model
PROBLEM_SOLVED       Parallel remote work; cost/quality routing; first-party model
OUR_CURRENT_MECHANISM Local-first MegaBrain; no owned router/model
EQUIVALENCE          NONE
GAP                  Product features we consume, not replicate
TRADE_OFF            Convenience vs lock-in/cost opacity
EVIDENCE             DOCUMENTED
APPLICABILITY        Operational use only unless building our own router later
DECISION             DEFER (router/cloud as patterns) · REJECT (reimplement Composer/Router)
Confidence           HIGH
```

### CUR-CKPT / CUR-STEER / CUR-AUTOREVIEW / CUR-SDK

```text
EXTERNAL_MECHANISM   Checkpoints; mid-run steer; Auto-review; SDK Agent API
PROBLEM_SOLVED       Safety, interactivity, embeddability
OUR_CURRENT_MECHANISM Persistence PARTIAL; Policy PARTIAL; no SDK wrap of MegaBrain
EQUIVALENCE          PARTIAL (persistence/safety ideas) / NONE (SDK product)
GAP                  Evidence Bus ≠ conversation checkpoints
DECISION             PROTOTYPE only if we need portable checkpoint/evidence UX · DEFER SDK wrap
Confidence           MEDIUM
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Harness (as product layer) | DEFER / do not clone | HIGH |
| Rules channel | ALREADY_PRESENT · ADAPT vs Policy | HIGH |
| Skills | ALREADY_PRESENT | HIGH |
| Host tools / search / context | ALREADY_PRESENT (consume) · DEFER (own index) | HIGH |
| Subagents / Task | ALREADY_PRESENT · ADAPT isolation discipline | HIGH |
| Plan Mode | ALREADY_PRESENT (planning) · DEFER IR merge | MEDIUM |
| MCP | ALREADY_PRESENT | HIGH |
| Hooks | ADAPT as Policy adapters | HIGH |
| Cloud Agents | DEFER (ops pattern) | HIGH |
| Cursor Router / Composer | REJECT reimplementation · DEFER study of routing *idea* | HIGH |
| Checkpoints / steer / Auto-review | DEFER / PROTOTYPE selectively | MEDIUM |
| Equating MegaBrain ≡ Cursor | REJECT | HIGH |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

```text
CONFLICT:
  claim: How does Cursor “index” / semantically search codebases?
  source_a: docs/agent/tools/search — Instant Grep + Explore; path encryption note
  source_b: blog agent-best-practices — “grep and semantic search”
  source_c: SDK ToolCall — includes semSearch
  difference: Public search doc no longer describes embedding index pipeline; semantic tool still exists in SDK enum
  resolution: UNRESOLVED — treat semantic index internals as UNKNOWN; assert only Instant Grep + Explore + semSearch-exists
```

```text
CONFLICT:
  claim: What is “Composer”?
  source_a: Historical UX name for agent/edit surfaces (community/older docs — not re-fetched as primary here)
  source_b: Models & Pricing — Composer 2.5 first-party model
  difference: Name overloaded (UI legacy vs model id)
  resolution: prefer_primary docs 2026-09 — Composer 2.5 = model; Agent = assistant surface
```

---

## 9. Sources

### Primary (official docs / product)

- https://cursor.com/docs/agent/overview
- https://cursor.com/docs/agent/modes (Plan Mode)
- https://cursor.com/docs/agent/tools/search
- https://cursor.com/docs/context/rules
- https://cursor.com/docs/skills
- https://cursor.com/docs/mcp
- https://cursor.com/docs/agent/hooks
- https://cursor.com/docs/subagents
- https://cursor.com/docs/cloud-agent
- https://cursor.com/docs/models (Models & Pricing)
- https://cursor.com/docs/cursor-router
- https://cursor.com/docs/sdk/typescript
- https://prod.cursor.com/docs/agent/prompting (context ring / compaction)
- https://cursor.com/blog/agent-best-practices (Jan 9, 2026) — product engineering narrative; not source code

### Observed (this investigator session)

- Injected tools: Shell, Grep, Read/Write/Edit, Glob, Task, MCP CallMcpTool, WebSearch/WebFetch, SwitchMode, UpdateCurrentStep, …
- Always-applied workspace/user rules; agent_skills list; MCP server descriptors under project `mcps/`
- Built-in skills under `~/.cursor/skills-cursor/` (create-rule, create-skill, …); **no** `cursor-guide/SKILL.md` present

### Baseline

- `/home/gaab/Documentos/reverseEnginering/research/OUR-SYSTEM-BASELINE.md`

### Not used as internals evidence

- Marketing claims without mechanism detail
- Community reverse-engineering of Electron bundles (not performed; out of scope / untrusted)

---

## 10. Handoff

- Para `agent-authoring`: preserve Rules≠Policy, Skills≠Capabilities; document host dependencies (Grep/Task/MCP) as **providers** of the host, not MegaBrain registries.
- Para `architect` / `adr`: if any ADR claims “we are Cursor-like,” require mechanism IDs from `MECHANISMS.yaml` + evidence labels; default REJECT identity equivalence.
- Para Cloud/Router: ops playbooks only; no MegaBrain reimplementation without PROTOTYPE charter.
- **Não implementado nesta skill.**
