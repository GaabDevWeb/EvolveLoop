# Target Report — `codex`

| Campo | Valor |
|-------|-------|
| Target | **Codex** (OpenAI coding agent suite: CLI harness, app-server, IDE extension, Cloud) |
| Category | coding-agent |
| Mode | `TARGET_RESEARCH` |
| Classification | `OFFICIAL_EXTERNAL` / **partially closed** |
| Versions examined | Docs live `developers.openai.com/codex` (fetched 2026-09-18); OSS snapshot `openai/codex@7498521d288b` (tree truncated=false, ~9.2k blobs); engineering post 2026-01-23 |
| Access limitations | IDE extension **not** OSS; Codex cloud **not** OSS; model weights / server-side Responses prompt assembly beyond published contract **closed**; DeepWiki treated as non-primary |
| Date | 2026-09-18 |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` (MegaBrain / CursorSKILLS) |
| Wiki | n/a (alvo externo; não é pack KernelBot/OrbitBot) |

## 1. What exists?

**DOCUMENTED:** “Codex” is a suite: local **Codex CLI** (open-source harness), **Codex App / ChatGPT desktop**, **IDE extension**, **Codex cloud**, plus **app-server** for rich clients and an **SDK** for automation/CI ([Open Source page](https://developers.openai.com/codex/open-source); [README](https://github.com/openai/codex)).

**OBSERVED (OSS):** Primary implementation lives under `codex-rs/` (Rust monorepo): `core` (session/tools/compact/MCP/hooks/exec_policy), `cli`, `exec`, `app-server`, `sandboxing` (Seatbelt policies), `linux-sandbox` / `bwrap`, `codex-mcp`, `agent-roles`, `hooks`, etc. Tool dispatch includes `codex-rs/core/src/tools/router.rs` with `ToolRegistry` / collaboration tools (`spawn_agent`, …).

**Partially closed boundary (DOCUMENTED):**

| Component | Open? |
|-----------|-------|
| Codex CLI + core harness | Yes — `openai/codex` |
| App Server | Yes — `codex-rs/app-server` |
| SDK | Yes — in-repo |
| Skills / Plugins catalogs | Yes — `openai/skills`, `openai/plugins` |
| Universal cloud base image | Yes — `openai/codex-universal` |
| IDE extension | **No** |
| Codex cloud product runtime | **No** |

## 2. Architecture map

```text
Clients (TUI CLI | IDE* | Desktop App | custom app-server clients | Cloud UI*)
        │
        ▼
┌─────────────────────── Harness / Runtime ───────────────────────┐
│  Thread → Turn → Items (messages, tool calls, file changes…)     │
│  Agent loop: build Responses payload → SSE stream → tools → …    │
│  ToolRouter / ToolRegistry → built-in tools | MCP | collaboration│
│  Policy: sandbox/permissions ⊕ approval_policy ⊕ exec rules      │
│  Context: AGENTS.md + skills metadata + env + history/compaction │
└───────────────────────┬─────────────────────────────────────────┘
                        │ HTTP Responses API (configurable endpoint)
                        ▼
              Model provider (OpenAI / ChatGPT backend / OSS local / Azure…)

* IDE + Cloud: product surfaces; internals not fully open.
```

**Lenses covered:** agent loop, coding workflow, tool execution, sandbox, approval, permissions, context, skills, MCP, task execution, shell, file ops, validation/recovery (partial), session state, evaluation (mostly UNKNOWN for product eval harness).

## 3. Execution flow

```text
User input (turn)
  → assemble instructions + tools + input items
      (sandbox/permissions developer msg; optional developer_instructions;
       aggregated user instructions: CODEX_HOME AGENTS*, project AGENTS*, skills preamble;
       environment_context cwd/shell; user message)
  → POST Responses API (SSE)
  → stream deltas / output items (reasoning, function_call, assistant text, …)
  → if function_call: route tool → (approval?) → execute under sandbox/permissions
      → append function_call_output (+ prior items) preserving prompt prefix for cache
  → loop until assistant message ends turn
  → optional auto-compact when token threshold exceeded
  → control returns to user; next user message continues thread history
```

**Evidence:** DOCUMENTED in [Unrolling the Codex agent loop](https://openai.com/index/unrolling-the-codex-agent-loop/) (2026-01-23); app-server lifecycle DOCUMENTED in [App Server](https://developers.openai.com/codex/app-server).

**App-server variant (DOCUMENTED):** `initialize` → `thread/start|resume|fork` → `turn/start` → stream `item/*` / `turn/*` notifications; approvals via server→client request methods; interrupt/steer supported.

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Orchestrate model ↔ tools ↔ user | Stateless-ish **agent loop** on Responses API; turn ends on assistant message | DOCUMENTED (+ OBSERVED core modules) | Core |
| M02 | Safe local command execution | **OS sandbox** (Seatbelt / bwrap+seccomp / Windows elevated|unelevated) on spawned commands | DOCUMENTED + OBSERVED `sandboxing/`, `linux-sandbox/` | High |
| M03 | When to pause vs auto-run | Orthogonal **approval_policy** (`on-request`, `never`, granular; `untrusted` retired in newer docs) + optional `approvals_reviewer=auto_review` | DOCUMENTED | High |
| M04 | Reusable FS+network posture | Beta **permission profiles** (`:read-only`, `:workspace`, `:danger-full-access`, custom `extends`) — mutually exclusive with legacy `sandbox_mode` | DOCUMENTED | High |
| M05 | Tool extensibility | Built-in tools (`shell`, `update_plan`, patch/file ops, …) + **MCP** (stdio/HTTP, approvals, tool allow/deny) | DOCUMENTED + OBSERVED `tools/router.rs`, `mcp.rs` | High |
| M06 | Context growth / cache | Exact **prefix preservation** for prompt cache; mid-turn config changes via *appended* messages; avoid `previous_response_id` for ZDR/stateless | DOCUMENTED | High |
| M07 | Context window exhaustion | Manual `/compact` history + **auto compact** via `/responses/compact` + `encrypted_content` compaction item | DOCUMENTED + OBSERVED `compact*.rs` | High |
| M08 | Project / user policy in-prompt | Hierarchical **AGENTS.md** / overrides + size limits | DOCUMENTED | Medium |
| M09 | Reusable workflows without stuffing prompt | **Skills** (Agent Skills standard): progressive disclosure (name/desc/path first; load SKILL.md on use); scopes REPO/USER/ADMIN/SYSTEM; plugins distribute | DOCUMENTED | High |
| M10 | Parallel specialized work | **Multi-agent** tools (`spawn_agent`, `wait_agent`, …) behind `features.multi_agent` | DOCUMENTED (config) + OBSERVED collaboration names in router + community skill notes | Medium–High |
| M11 | Lifecycle automation / enterprise control | **Hooks** (`PreToolUse`, `PermissionRequest`, `PostToolUse`, compact/session/subagent events); managed hooks | DOCUMENTED | Medium |
| M12 | Client embedding | **App-server** JSON-RPC (stdio/ws/unix): threads/turns/items, approvals, permissions requests | DOCUMENTED + OBSERVED protocol schemas | High (integrators) |
| M13 | Cloud isolation | Managed containers; setup phase networked then agent phase offline by default; secrets stripped after setup | DOCUMENTED (product); internals UNKNOWN | High (cloud) |
| M14 | Command allow/deny beyond sandbox | **Rules** / exec policy layers (prefix allow/prompt/forbid); managed `requirements.toml` | DOCUMENTED + OBSERVED `exec_policy` | Medium |

## 5. Adoption analysis (separated — not “merit”)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Mature dual control (sandbox ⊕ approval); cache-aware loop; OS-native enforcement | OPINION on quality; facts DOCUMENTED |
| Product | Bundled with ChatGPT plans; CLI + IDE + Cloud + App | DOCUMENTED distribution |
| Distribution | npm/Homebrew/install scripts; ChatGPT login or API key | DOCUMENTED |
| Ecosystem | MCP, skills, plugins, OSS contributions | DOCUMENTED |
| Timing | CLI launched ~2025-04; deep loop writeup 2026-01; permissions profiles beta | DOCUMENTED dates |
| Community / DX | Public GitHub issues/PRs as design memory; extensive config reference | DOCUMENTED |

## 6. Comparison with MegaBrain (per mechanism)

```text
EXTERNAL_MECHANISM: M01 Agent loop (Responses API harness)
PROBLEM_SOLVED: Bound model sampling to tool execution until turn complete
OUR_CURRENT_MECHANISM: Orchestrator + skill `orquestrar` / PDA Task roles
EQUIVALENCE: SUBSTANTIAL (loop shape) / PARTIAL (API & cache specifics)
GAP: No published MegaBrain equivalent of Responses prefix-cache discipline + compact endpoint
TRADE_OFF: Coupling to OpenAI Responses vs provider-agnostic Cursor runtime
EVIDENCE: DOCUMENTED OpenAI post; baseline orchestrator IMPLEMENTED
APPLICABILITY: Ideas transferable; API pieces only if we speak Responses
DECISION: ADAPT (cache-safe history append; turn termination contract) | Confidence HIGH
```

```text
EXTERNAL_MECHANISM: M02+M03+M04 Sandbox ⊕ Approval ⊕ Permission profiles
PROBLEM_SOLVED: Autonomy without unrestricted host access; reduce approval fatigue
OUR_CURRENT_MECHANISM: Policy Engine (docs+impl); Sandbox UNKNOWN–PARTIAL per baseline
EQUIVALENCE: PARTIAL (policy concepts) / NONE–PARTIAL (OS sandbox)
GAP: MegaBrain lacks Codex-grade OS-enforced command sandbox as first-class runtime
TRADE_OFF: Heavy platform engineering vs relying on Cursor host sandbox
EVIDENCE: DOCUMENTED permissions/sandboxing; baseline Sandbox UNKNOWN
APPLICABILITY: High for any local shell provider we own
DECISION: PROTOTYPE (permission profile model + refuse-if-unenforceable) then ADAPT into Policy | Confidence MEDIUM
```

```text
EXTERNAL_MECHANISM: M05 MCP + built-in tools + ToolRegistry/Router
PROBLEM_SOLVED: Extensible tools with host-enforced vs server-owned guardrails
OUR_CURRENT_MECHANISM: Capability/Provider registries; Cursor MCP
EQUIVALENCE: SUBSTANTIAL for MCP; PARTIAL for unified ToolRegistry semantics
GAP: Explicit “MCP not sandboxed by host” contract must stay visible in our policy UX
TRADE_OFF: Power vs trust boundary leakage via MCP
EVIDENCE: DOCUMENTED agent-loop post; OBSERVED router.rs
APPLICABILITY: ALREADY present for MCP; ADAPT labeling of sandbox scope
DECISION: ALREADY_PRESENT (MCP) + ADAPT (sandbox-scope labeling) | Confidence HIGH
```

```text
EXTERNAL_MECHANISM: M07 Context compaction (/responses/compact + encrypted latent)
PROBLEM_SOLVED: Continue long coding sessions without hard context death
OUR_CURRENT_MECHANISM: Session/episodic memory PARTIAL; no proven compact-API equivalent
EQUIVALENCE: PARTIAL (summarize) / UNKNOWN (encrypted latent item)
GAP: Need provider-native compact or local summarization with evals
TRADE_OFF: Opacity of encrypted compaction vs inspectable summaries
EVIDENCE: DOCUMENTED
APPLICABILITY: Only where Responses compact exists
DECISION: DEFER (provider-tied) / PROTOTYPE local summarize-only fallback | Confidence MEDIUM
```

```text
EXTERNAL_MECHANISM: M09 Skills progressive disclosure (+ 2% list budget)
PROBLEM_SOLVED: Many workflows without prompt bloat
OUR_CURRENT_MECHANISM: `.cursor/skills/**/SKILL.md` IMPLEMENTED
EQUIVALENCE: SUBSTANTIAL–EQUIVALENT (format/idea)
GAP: Explicit token/% budget + shorten-then-omit strategy may be stronger than ours
TRADE_OFF: Truncation may hide skills (Codex warns)
EVIDENCE: DOCUMENTED skills page
APPLICABILITY: Direct
DECISION: ADAPT (progressive load) + PROTOTYPE (2%/8k list budget numbers) | Confidence HIGH / MEDIUM
```

```text
EXTERNAL_MECHANISM: M10 Multi-agent spawn/wait/followup
PROBLEM_SOLVED: Parallel subagents with mailbox/wait semantics
OUR_CURRENT_MECHANISM: Cursor Task tool PDA roles IMPLEMENTED
EQUIVALENCE: SUBSTANTIAL
GAP: Exact mailbox/eviction semantics differ — do not clone blindly
TRADE_OFF: Extra tools vs single Task abstraction
EVIDENCE: DOCUMENTED features.multi_agent; OBSERVED collaboration tool names; tertiary skill docs INFERRED for V1/V2 details
APPLICABILITY: Pattern only
DECISION: ALREADY_PRESENT | Confidence MEDIUM
```

```text
EXTERNAL_MECHANISM: Formal Evidence Bus / gate artifacts
PROBLEM_SOLVED: (ours) prove completion
OUR_CURRENT_MECHANISM: Evidence Bus IMPLEMENTED
EQUIVALENCE: NONE on Codex side (not observed as equivalent product mechanism)
GAP: N/A — do not invent Codex evidence bus
DECISION: ALREADY_PRESENT (ours) — no import | Confidence HIGH
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Agent loop / turn contract | ADAPT | HIGH |
| OS sandbox + refuse-unenforceable | PROTOTYPE → ADAPT into Policy | MEDIUM |
| Approval ⊕ sandbox duality | ADAPT | HIGH |
| Permission profiles | PROTOTYPE | MEDIUM |
| MCP integration | ALREADY_PRESENT | HIGH |
| Sandbox-scope labeling (shell vs MCP) | ADAPT | HIGH |
| Prompt-cache-safe history mutation | ADAPT | HIGH |
| Responses `/compact` | DEFER | MEDIUM |
| Skills progressive disclosure | ADAPT | HIGH |
| Skills list budget (2% / 8k) | PROTOTYPE | MEDIUM |
| AGENTS.md hierarchy | ADAPT / ALREADY_PRESENT (project instructions) | MEDIUM |
| Multi-agent tools | ALREADY_PRESENT | MEDIUM |
| Hooks lifecycle | ADAPT (align event names carefully) | MEDIUM |
| App-server protocol | DEFER (only if embedding Codex) | HIGH |
| Copy cloud container model | DEFER | LOW–MEDIUM |
| Second Tool/Agent registry | REJECT | HIGH |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

**CONFLICT (docs evolution):** Older materials still describe `approval_policy = "untrusted"`; sandboxing concept page (fetched 2026-09-18) states Codex/ChatGPT Work **no longer support `untrusted` as selectable** and points to migration. Resolution: prefer_primary latest docs; treat `untrusted` as **legacy**.

**CONFLICT (surface):** Superpowers empirical notes claim Codex App worktree/Seatbelt behaviors that CLI may not share — do not generalize App MEASURED claims to all Codex without label.

## 9. Sources (primary)

1. https://openai.com/index/unrolling-the-codex-agent-loop/ — DOCUMENTED engineering
2. https://developers.openai.com/codex/open-source — OSS vs closed matrix
3. https://developers.openai.com/codex/sandboxing — sandbox ⊕ approvals
4. https://developers.openai.com/codex/permissions — permission profiles
5. https://developers.openai.com/codex/agent-approvals-security — security ops
6. https://developers.openai.com/codex/skills — skills loading
7. https://developers.openai.com/codex/mcp — MCP host features
8. https://developers.openai.com/codex/app-server — protocol
9. https://developers.openai.com/codex/config-reference — keys (`features.multi_agent`, hooks, compact limits, …)
10. https://github.com/openai/codex @ `7498521d288b` — OBSERVED tree + `tools/router.rs` header
11. Baseline: `research/OUR-SYSTEM-BASELINE.md`

**Non-primary (used only as pointers, not claims):** DeepWiki architecture pages; Superpowers `codex-tools.md` / App compatibility notes (MEASURED/INFERRED for App-specific behavior).

## 10. Handoff

- Para `agent-authoring`: ADAPT dualidade sandbox/approval e budget de skills; PROTOTYPE permission-profile schema mapped to Policy Engine — **sem** clonar app-server.
- Para `architect` / `adr`: ADR candidato “refuse command if OS cannot enforce selected FS/network carveouts”; ADR “MCP tools outside host sandbox”.
- **Não implementado nesta skill.**

## Validation checklist

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN
- [x] Epistemic labels on key claims
- [x] Comparison vs MegaBrain baseline
- [x] No Agent System implementation
- [x] No ranking / no invented closed internals
