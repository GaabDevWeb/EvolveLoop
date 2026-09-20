# Target Report — `roo-code`

| Campo | Valor |
|-------|-------|
| Target | Roo Code (VS Code extension coding agent) |
| Category | coding-agent |
| Mode | TARGET_RESEARCH |
| Classification | OFFICIAL_EXTERNAL |
| Versions examined | Docs live at docs.roocode.com (post-sunset mirror still serving); source tip `main` @ ~`b867ec914575` (2026-05-15); last release **v3.54.0** (2026-05-15) |
| Lifecycle | **Shut down 2026-05-15**; GitHub repo **archived** (`archived: true`) — `DOCUMENTED` + `OBSERVED` |
| Access limitations | Observational only (docs + public GitHub raw/API). No extension runtime exercised; no install; no untrusted script execution. Marketplace/live Cloud products not probed beyond README claims. |
| Date | 2026-09-18 |
| Investigator | SOLE (external_b / roo-code) |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` |
| Wiki | n/a (external OFFICIAL target; MegaBrain compare via baseline file only) |

## 0. Relationship to Cline (documented only)

| Claim | Label | Evidence |
|-------|-------|----------|
| Roo Code **originated from Cline** | `DOCUMENTED` | Official README disclaimer: alternatives include “Cline (**from where Roo Code originated**)” — https://github.com/RooCodeInc/Roo-Code/blob/main/README.md |
| Marketplace / extension id retains `roo-cline` / publisher `RooVeterinaryInc` | `OBSERVED` | README badge `itemName=RooVeterinaryInc.roo-cline`; auto-approve command id `roo-cline.toggleAutoApprove` in docs |
| Current GitHub API: `fork: false`, `parent: null` | `OBSERVED` | `GET https://api.github.com/repos/RooCodeInc/Roo-Code` (2026-09-18) |
| Historical UI “forked from cline/cline” | `DOCUMENTED` (secondary UI scrape of discussions page) | GitHub Discussions #346 page header historically showed fork provenance — **not** re-verified as live fork edge on API today |
| Community fork ZooCode after sunset | `DOCUMENTED` | Same README disclaimer points to ZooCode as community fork |

**Resolution:** Treat **origin from Cline as official narrative** (`DOCUMENTED`). Do **not** assume continuous GitHub fork graph, shared HEAD, or feature parity with modern Cline — `UNKNOWN` / out of scope for this report’s mechanism inventory. Deep Cline↔Roo diff belongs to the separate `cline` investigator + later CROSS wave.

---

## 1. What exists?

Roo Code was an **open-source (Apache-2.0) VS Code extension** that presents a chat agent with **modes** (personas + tool-group permissions), **HITL approval** (with optional auto-approve), **MCP** client support, **project/global rules**, **context mentions**, optional **semantic codebase indexing**, and **Orchestrator / Boomerang subtasks** for multi-mode delegation.

**Product state as of research date:** extension suite shut down; repo archived; docs site still describes the architecture as it existed at sunset. Successor product marketing (Roomote / roocode.com pivot) is **out of mechanism scope** unless needed for lifecycle — not mined as architecture.

**Identity signals (`OBSERVED` / `DOCUMENTED`):**

- Repo: `RooCodeInc/Roo-Code` — description “whole dev team of AI agents in your code editor”
- Stars ~24.3k, forks ~3.4k (`OBSERVED` API)
- License Apache-2.0 (`OBSERVED`)
- Docs: https://docs.roocode.com/ (+ GitHub Pages mirror referenced in README)

---

## 2. Architecture map

```text
┌─────────────────────────────────────────────────────────────────┐
│  VS Code Extension Host (Roo Code)                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Chat UI     │  │ Mode selector│  │ Auto-approve / settings │ │
│  │ @mentions   │  │ Sticky model │  │ MCP Servers view        │ │
│  └──────┬──────┘  └──────┬───────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         ▼                ▼                      ▼               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Prompt assembly: roleDefinition + customInstructions +   │   │
│  │ rules (~/.roo, .roo/, .roorules*, AGENTS.md) + tool guide│   │
│  └───────────────────────────┬──────────────────────────────┘   │
│                              ▼                                  │
│  ┌──────────────┐     LLM Provider (BYOK / local)               │
│  │ Task runtime │◄─── Anthropic/OpenAI/OpenRouter/Ollama/…     │
│  │ (parent/sub) │                                               │
│  └──────┬───────┘                                               │
│         │ tool calls gated by mode.groups + approvals           │
│         ▼                                                       │
│  Tool groups: read | edit | command | mcp | modes               │
│  (+ new_task / switch_mode / attempt_completion / …)            │
│         │                                                       │
│         ├── FS / terminal / browser(deprecated group)           │
│         ├── MCP hub (use_mcp_tool, access_mcp_resource)         │
│         └── Optional Qdrant + embedder → codebase_search        │
└─────────────────────────────────────────────────────────────────┘
```

**Specialization model:** Modes = **Agent specialization packages** (role prompt + optional `whenToUse` + tool group ACL + sticky model). Not a separate multi-process agent fleet by default — one chat agent whose **capability surface** changes with mode; Orchestrator adds **hierarchical tasks**.

---

## 3. Execution flow (documented)

```text
User message (+ optional @mentions / slash)
  → Mode selected (dropdown | /mode | sticky persistence | switch_mode)
  → System prompt = roleDefinition + instructions + layered Rules
  → LLM proposes tool use
  → Permission check: mode.groups ∩ tool ∈ group
  → HITL approve | auto-approve (per permission tiles) | .rooignore block
  → Tool result → conversation
  → [Orchestrator path] new_task(mode, message[, todos])
        → parent pauses; child task isolated context
        → child attempt_completion(result summary)
        → parent resumes with summary only
  → attempt_completion / user stop → Final Output (edits, answers, plan)
```

Labels: flow shape `DOCUMENTED` (using-modes, boomerang-tasks, new_task, auto-approving, custom-instructions). Exact internal scheduler / prompt token packing: `UNKNOWN` (not fully reverse-traced in this pass).

---

## 4. Mechanisms (lens-aligned)

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| RC-MODES | One agent too generic / unsafe for planning | Built-in modes: Code, Ask, Architect, Debug, Orchestrator — each with tool ACL | `DOCUMENTED` + `OBSERVED` (`DEFAULT_MODES` in `packages/types/src/mode.ts`) | HIGH for specialization + safety |
| RC-CUSTOM-MODES | Team needs domain agents | `.roomodes` / `custom_modes.yaml` + import/export with rules | `DOCUMENTED` | HIGH DX / distribution of agent packs |
| RC-TOOL-GROUPS | Need coarse capability ACL | Groups `read|edit|command|mcp|modes`; edit can be `fileRegex`-scoped | `DOCUMENTED` + `OBSERVED` (`tool.ts`, mode schema) | HIGH policy surface |
| RC-HITL | Agentic FS/shell is dangerous | Default approve/reject per tool; auto-approve matrix + command allow/deny prefixes | `DOCUMENTED` | HIGH permissions |
| RC-ORCH | Complex workflows clutter one context | Orchestrator mode: `groups: []`; delegates via `new_task`; summary returns via `attempt_completion` | `DOCUMENTED` + `OBSERVED` | HIGH delegation / context hygiene |
| RC-CONTEXT-ISO | Parent context poisoning | Subtasks: isolated history; explicit down/up context transfer only | `DOCUMENTED` | HIGH context management |
| RC-RULES | Persist project/org policy in prompt | Layered rules: global `~/.roo`, workspace `.roo/rules*`, `.roorules*`, AGENTS.md, UI custom instructions | `DOCUMENTED` | HIGH rules / DX |
| RC-ROOIGNORE | Limit agent FS scope | `.rooignore` (gitignore syntax) on tools + mentions (with documented bypass nuances) | `DOCUMENTED` | MEDIUM–HIGH permissions |
| RC-MCP | Extend tools beyond built-ins | MCP client: STDIO / Streamable HTTP / legacy SSE; `use_mcp_tool` + `access_mcp_resource` | `DOCUMENTED` | HIGH extensibility |
| RC-MENTIONS | User-directed context injection | `@file`, `@folder/`, `@problems`, `@terminal`, git, URL, slash commands | `DOCUMENTED` | HIGH context UX |
| RC-INDEX | Keyword search insufficient | Tree-sitter chunks → embeddings → Qdrant; `codebase_search` tool | `DOCUMENTED` | MEDIUM (ops cost / deps) |
| RC-STICKY-MODEL | Different tasks need different models | Per-mode last-used model remembered | `DOCUMENTED` | MEDIUM DX / routing-lite |
| RC-TODOS | Track multi-step work | `update_todo_list` + optional todos on `new_task` | `DOCUMENTED` / `OBSERVED` tool names | MEDIUM workflow |
| RC-CHECKPOINTS | Undo agent edits | Experimental checkpoints (FAQ) | `DOCUMENTED` (thin) | LOW–MEDIUM recovery — depth `UNKNOWN` |

### Tool inventory (names — `OBSERVED` schema)

From `packages/types/src/tool.ts` `toolNames`:  
`execute_command`, `read_file`, `read_command_output`, `write_to_file`, `apply_diff`, `edit`, `search_and_replace`, `search_replace`, `edit_file`, `apply_patch`, `search_files`, `list_files`, `use_mcp_tool`, `access_mcp_resource`, `ask_followup_question`, `attempt_completion`, `switch_mode`, `new_task`, `codebase_search`, `update_todo_list`, `run_slash_command`, `skill`, `generate_image`, `custom_tool`.

Note: group `browser` is **deprecated** and stripped in schema preprocess (`OBSERVED`) — docs FAQ still mention browsing via provider/model capability (`DOCUMENTED`) → minor **CONFLICT** in presentation vs type system.

---

## 5. Adoption analysis (separated — not merit)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Rich mode+ACL+orchestration story; open source at sunset | `OPINION` separated from tech claims above |
| Product | Extension shut down; Cloud/Router refunded/shutdown narrative in third-party writeups — official README confirms shutdown | `DOCUMENTED` shutdown; product successor `OUT_OF_SCOPE` |
| Distribution | VS Marketplace + Open VSX historically; id `RooVeterinaryInc.roo-cline` | `DOCUMENTED` |
| Ecosystem | MCP; marketplace for modes (docs); ZooCode community continuation | `DOCUMENTED` / partial |
| Timing | Archived May 2026; mining is **post-mortem / pattern extract**, not greenfield adopt of dead product | `OBSERVED` |
| Community / DX | Strong docs for modes/rules/auto-approve; sticky models; ask-Roo-to-create-mode | `DOCUMENTED` |

**Prohibition honored:** popularity (stars) ≠ technical superiority.

---

## 6. Comparison with MegaBrain (per mechanism)

### RC-MODES / RC-CUSTOM-MODES — Agent specialization

```text
EXTERNAL_MECHANISM   Mode packages (role + groups + whenToUse + sticky model)
PROBLEM_SOLVED       Specialize behavior + constrain tools per persona
OUR_CURRENT_MECHANISM PDA roles + skills (SKILL.md) + Task tool roles
EQUIVALENCE          PARTIAL
GAP                  MegaBrain: Capability/Provider registries + IR; Roo: UX-first mode YAML without Capability IR
TRADE_OFF            Roo: faster user-facing specialization; MegaBrain: stronger contracts/evidence
EVIDENCE             DOCUMENTED modes vs baseline Multi-agent PDA / Skills
APPLICABILITY        ADAPT ideas for “mode-like” skill packs with tool ACL — not copy YAML runtime
DECISION             ADAPT
Confidence           MEDIUM
```

### RC-TOOL-GROUPS + RC-HITL + RC-ROOIGNORE — Permissions / Policy

```text
EXTERNAL_MECHANISM   Coarse tool groups + auto-approve tiles + .rooignore + command allow/deny
PROBLEM_SOLVED       Bound agent authority with human gates
OUR_CURRENT_MECHANISM Policy Engine + GATE_BUNDLE + Cursor hooks (PARTIAL sandbox)
EQUIVALENCE          PARTIAL–SUBSTANTIAL (intent); implementation differs
GAP                  Roo’s allow/deny command prefixes + dual MCP always-allow is DX-polished; MegaBrain sandbox UNKNOWN–PARTIAL
TRADE_OFF            Fine UX vs formal policy provenance
EVIDENCE             auto-approving docs; baseline Policy Engine
APPLICABILITY        Steal UX patterns for approval matrices; keep Policy as SSOT
DECISION             ADAPT
Confidence           MEDIUM
```

### RC-ORCH / RC-CONTEXT-ISO — Delegation / Task execution

```text
EXTERNAL_MECHANISM   Orchestrator with empty groups; new_task; summary-only return
PROBLEM_SOLVED       Multi-step work without poisoning orchestrator context
OUR_CURRENT_MECHANISM Orchestrator + Task IR / plan.ir.yaml + PDA roles + Evidence Bus
EQUIVALENCE          PARTIAL (same problem class)
GAP                  Roo returns free-text summary; MegaBrain prefers Evidence artefacts / gates
TRADE_OFF            Roo simpler UX; MegaBrain stronger auditability
EVIDENCE             boomerang-tasks docs; baseline Orchestrator / Evidence
APPLICABILITY        Prototype “summary contract” schemas for sub-agent handoffs
DECISION             ADAPT (handoff contract) / ALREADY_PRESENT (orchestration role)
Confidence           MEDIUM
```

### RC-RULES — Rules / Context grounding

```text
EXTERNAL_MECHANISM   Layered .roo rules + AGENTS.md + mode-specific dirs
PROBLEM_SOLVED       Persistent behavioral constraints in prompt
OUR_CURRENT_MECHANISM Skills + GaabWiki grounding + .cursor/rules
EQUIVALENCE          PARTIAL
GAP                  Roo’s global+project+mode directory aggregation is very explicit
TRADE_OFF            Prompt stuffing risk vs consistency
EVIDENCE             custom-instructions docs; baseline Knowledge PARTIAL
APPLICABILITY        ADAPT loading order clarity; avoid duplicating wiki SSOT
DECISION             ADAPT
Confidence           MEDIUM
```

### RC-MCP — Extensibility

```text
EXTERNAL_MECHANISM   MCP client + tool/resource approval
PROBLEM_SOLVED       External tools without forking extension
OUR_CURRENT_MECHANISM MCP usage in Cursor ecosystem; Provider Registry for implementations
EQUIVALENCE          SUBSTANTIAL (protocol-level)
GAP                  None requiring new registry kind
TRADE_OFF            —
EVIDENCE             MCP overview docs; baseline Providers
APPLICABILITY        ALREADY_PRESENT at protocol layer
DECISION             ALREADY_PRESENT
Confidence           HIGH
```

### RC-INDEX — Knowledge / RAG

```text
EXTERNAL_MECHANISM   Embeddings + Qdrant + codebase_search
PROBLEM_SOLVED       Semantic code retrieval
OUR_CURRENT_MECHANISM GaabWiki + RAG (wiki notes BM25 degraded)
EQUIVALENCE          PARTIAL (different corpora: code vs wiki)
GAP                  Code-index stack not MegaBrain core
TRADE_OFF            External Qdrant/embedder ops cost
EVIDENCE             codebase-indexing docs
APPLICABILITY        DEFER for MegaBrain coding-agent path; not Agent System core
DECISION             DEFER
Confidence           MEDIUM
```

### RC-STICKY-MODEL — Model routing lite

```text
EXTERNAL_MECHANISM   Per-mode remembered model
PROBLEM_SOLVED       Cheap task→model affinity without full router
OUR_CURRENT_MECHANISM Provider Registry; routing internals UNKNOWN
EQUIVALENCE          PARTIAL / UNKNOWN
GAP                  Need audit of MegaBrain model selection
TRADE_OFF            Sticky UX vs explicit policy routing
EVIDENCE             using-modes sticky models
APPLICABILITY        PROTOTYPE only if product wants per-role model prefs
DECISION             PROTOTYPE
Confidence           LOW
```

### Dead-product adopt

```text
EXTERNAL_MECHANISM   Roo Code as product dependency
DECISION             REJECT (lifecycle: archived/shutdown)
Confidence           HIGH
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Mode specialization packs | ADAPT | MEDIUM |
| Tool-group ACL + HITL matrix | ADAPT | MEDIUM |
| Orchestrator + isolated subtasks + summary handoff | ADAPT (handoff) / ALREADY_PRESENT (orch role) | MEDIUM |
| Layered rules / AGENTS.md | ADAPT | MEDIUM |
| MCP client | ALREADY_PRESENT | HIGH |
| Codebase indexing (Qdrant) | DEFER | MEDIUM |
| Sticky per-mode models | PROTOTYPE | LOW |
| Adopt Roo as runtime/product | REJECT | HIGH |
| Invent “Agent Registry” kind because modes exist | REJECT | HIGH (anti-duplication vs Capability/Provider Registry) |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Key CONFLICTS:

1. **Fork graph vs origin narrative:** README says originated from Cline; API `fork=false`/`parent=null` today.
2. **Browser capability:** FAQ/docs mention browsing; `browser` tool group deprecated in types.
3. **FAQ modes list** omits Orchestrator in one FAQ bullet list; dedicated modes page includes it — doc inconsistency (`DOCUMENTED` both).

---

## 9. Sources

### Primary

- https://github.com/RooCodeInc/Roo-Code/blob/main/README.md
- https://api.github.com/repos/RooCodeInc/Roo-Code
- https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/packages/types/src/mode.ts
- https://raw.githubusercontent.com/RooCodeInc/Roo-Code/main/packages/types/src/tool.ts
- https://docs.roocode.com/faq
- https://docs.roocode.com/basic-usage/using-modes
- https://docs.roocode.com/features/custom-modes
- https://docs.roocode.com/features/boomerang-tasks
- https://docs.roocode.com/advanced-usage/available-tools/new-task
- https://docs.roocode.com/features/custom-instructions
- https://docs.roocode.com/features/auto-approving-actions
- https://docs.roocode.com/features/rooignore
- https://docs.roocode.com/basic-usage/context-mentions
- https://docs.roocode.com/features/mcp/overview
- https://docs.roocode.com/features/codebase-indexing
- https://docs.roocode.com/update-notes/v3.15 (Orchestrator tool lockdown)

### Secondary (used only for historical fork UI / not for mechanism truth)

- GitHub Discussions pages historically labeling fork from `cline/cline`

### Explicitly not used as technical evidence

- Marketing star counts as quality proof
- Unofficial blogs claiming internals without code/docs

---

## 10. Handoff

- Para `agent-authoring`: considerar **mode-like skill packs** (role + allowed capabilities) e **subtask handoff summary schema** — não portar YAML Roo.
- Para `architect` / ADR: eventual ADR sobre **permission matrix UX** (auto-approve tiles + command allow/deny) mapeada ao Policy Engine existente.
- Para CROSS wave: alinhar com investigator `cline` (shared lineage) e `mcp` (protocol).
- **Não implementado nesta skill.**
