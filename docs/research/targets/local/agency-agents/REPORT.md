# Target Report — `agency-agents`

| Campo | Valor |
|-------|-------|
| Target | agency-agents (The Agency) |
| Category | other (SYSTEM_PROMPT_CORPUS + distribution adapters; **not** an executable multi-agent runtime) |
| Mode | TARGET_RESEARCH |
| source_type | LOCAL_CORPUS |
| Versions examined | Git `HEAD` `ad9264e309bd5e5422c04784372d7841b1e5d604` (2026-09-12); **no semver tags / package version in tree** |
| Access limitations | READ-ONLY; no install/execute of project scripts; `agency-agents-app` **NOT_IN_CORPUS**; generated integration artifacts gitignored (absent from checkout) |
| Date | 2026-09-18 |
| Confidence (identity) | HIGH |

Wiki: n/a (corpus externo / reverseEnginering — fora dos packs Gaab mapeados).

---

## 1. What exists?

**OBSERVED:** A public MIT repository whose *primary deliverable* is a **roster of specialist agent personas** as Markdown files with YAML frontmatter, organized into **18 divisions** (`divisions.json`), plus:

- Shell/Python **distribution tooling** (`scripts/install.sh`, `convert.sh`, lint/check/test-* for install/convert integrity)
- A **tool install contract catalog** (`tools.json`) describing how to render/install into host coding agents
- **NEXUS** strategy docs: playbooks, runbooks, handoff templates, activation prompts (coordination *doctrine*, not a runtime)
- Thin `integrations/*/README.md` stubs; generated per-tool trees are **intentionally not committed**
- Optional MCP-memory *pattern docs* (prompt add-ons + example)

**DOCUMENTED (SECURITY.md):** *“This repository contains Markdown-based agent definitions and shell scripts for installation and conversion.”* Agent `.md` files are *“Non-executable prompt definitions.”*

**DOCUMENTED (README):** Host activation is copy/install into Claude Code / Cursor / Codex / etc., then natural-language activation (“activate Frontend Developer mode…”). A separate native app (`agency-agents-app`) browses/installs the roster — **code absent from this corpus**.

### Critical classification: roster ≠ multi-agent runtime

| Layer | What it is | Evidence |
|-------|------------|----------|
| Roster / catalog | 279 persona `.md` with `name:` frontmatter under division dirs | `OBSERVED` file inventory; Hermes README cites “Generated agent count: 279” |
| Prompt architecture | Identity, mission, rules, deliverables, workflow, metrics sections | `OBSERVED` + `CONTRIBUTING` template |
| Coordination doctrine | NEXUS phases, handoff markdown templates, “spawn X agent” prompt text | `DOCUMENTED` in `strategy/` |
| Distribution | convert → install into host tool formats (`per-agent` / `roster` / `plugin`) | `OBSERVED` `tools.json`, scripts (unread as executed) |
| Host runtime | Whatever Claude Code / Cursor / Hermes / … provides | **Outside this repo** |
| Executable multi-agent system | Shared state machine, scheduler, message bus, agent processes | **ABSENT** in corpus (`package.json`/app runtime absent; SECURITY confirms non-executable agents) |

**INFERRED (premises: SECURITY.md + absence of orchestrator code + orchestrator being itself a persona):** “Multi-agent” behaviour, when it happens, is **host LLM following instructions** to switch persona / ask for subagents — not a first-party agency runtime shipping here.

### `testing/` conflict (audit) — resolved for this report

```text
CONFLICT:
  claim_a: "agency-agents/testing/ is a test suite"
  source_a: directory name
  claim_b: "contents are agent persona markdown files"
  source_b: 9× *.md with frontmatter name:; divisions.json lists "testing" as a division; CONTRIBUTING excludes only strategy/ + integrations/ as non-divisions
  difference: name vs role
  resolution: prefer_primary → PERSONA DIVISION (QA/testing specialists), NOT unit tests
```

**Actual automated tests OBSERVED:** `scripts/test-install.sh`, `test-convert-*.sh`, `test-agent-selection.sh`, `test-hermes-plugin.py` (installer/converter integrity — **not executed** in this investigation).

---

## 2. Architecture map

```text
┌─────────────────────────────────────────────────────────────────┐
│ SOURCE OF TRUTH                                                  │
│  divisions.json  → 18 division dirs                              │
│  <division>/**/*.md  → persona prompts + YAML frontmatter        │
│  tools.json → install/render contracts for host tools            │
└────────────────────────────┬────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   lint/check CI        convert.sh           strategy/NEXUS
   (schema/div sync)    (format renderers)   (playbooks, handoffs,
         │                   │                activation prompts)
         │                   ▼
         │            integrations/*  (GENERATED, gitignored)
         │                   │
         ▼                   ▼
   scripts/test-*      install.sh → ~/.claude/agents, .cursor/rules,
                       Hermes plugin, CONVENTIONS.md, …
                             │
                             ▼
                    HOST CODING AGENT RUNTIME
                    (Claude Code, Cursor, Codex, Hermes, …)
                             │
                             ▼
                    Optional: agency-agents-app (NOT IN CORPUS)
```

**Non-divisions (explicit):** `strategy/`, `integrations/`, `examples/`, `scripts/` — `DOCUMENTED` in `divisions.json` `_note` and CONTRIBUTING.

### Prompt package structure (canonical agent)

Frontmatter (required by lint: `name`, `description`, `color`; recommended: `emoji`, `vibe`; optional `services`).

Body sections (template + lint recommended Identity / Core Mission / Critical Rules):

- Identity & Memory (role, personality, “memory”, experience) — **prompt-claimed memory**, not a store
- Core Mission / Critical Rules (boundaries)
- Technical Deliverables / Workflow Process
- Communication Style / Learning & Memory / Success Metrics
- OpenClaw-oriented semantic split Persona vs Operational (`CONTRIBUTING`)

### Closest thing to “composition runtime” in-repo

**Hermes lazy-router plugin** (`scripts/build-hermes-plugin.py` + `integrations/hermes/README.md`):

- Fixed tool surface: `agency_agents_search | inspect | load | delegate`
- Full roster in on-disk `data/agents.json` (generated; **not present** in clean checkout)
- Avoids dumping 279 skills into Hermes’ initial catalog

This is still an **adapter for Hermes**, not a standalone agency OS.

---

## 3. Execution flow (host-mediated)

```text
User intent
  → (optional) App / install.sh / convert.sh places persona files in host paths
  → Host session loads selected agent file(s) OR user @-mentions / activates by name
  → Model interprets persona instructions as system/developer context
  → Reasoning / tool use = HOST capabilities (UNKNOWN internals per host)
  → (optional) NEXUS: human or “Agents Orchestrator” persona pastes handoff markdown
       / instructs “Please spawn <agent> …”
  → (optional) Hermes: search → inspect → load|delegate tools compose specialist prompt
  → (optional) MCP memory server: remember/recall/rollback (external; pattern-only here)
  → Final Output in host chat / diffs
```

**No in-repo path:** Input → AgencyScheduler → AgentProcess pool → shared Evidence bus.

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M-AA-01 | Generic chatbot lacks domain depth | Large **specialist persona roster** (279) with identity/rules/deliverables | OBSERVED | CONDITIONALLY_USEFUL |
| M-AA-02 | Discoverability of specialists | `divisions.json` + README tables + Hermes search tools | OBSERVED / DOCUMENTED | USEFUL |
| M-AA-03 | Consistent agent authoring | Frontmatter + section template + `lint-agents.sh` | OBSERVED | USEFUL |
| M-AA-04 | Same roster → many hosts | `tools.json` formats + `installKind` (`per-agent`/`roster`/`plugin`) + convert/install | OBSERVED | USEFUL |
| M-AA-05 | Context explosion if all agents loaded | Hermes **lazy router**; install `--division`/`--agent` filters; OpenCode ~119 limit warning | DOCUMENTED | USEFUL |
| M-AA-06 | Cross-agent coordination without runtime | NEXUS playbooks + handoff templates + activation prompts | DOCUMENTED | CONDITIONALLY_USEFUL |
| M-AA-07 | Pipeline leadership | `agents-orchestrator` **persona** that narrates spawn/QA loops | OBSERVED | UNPROVEN (as autonomous system) |
| M-AA-08 | Multi-agent design guidance | `engineering-multi-agent-systems-architect` persona (topology/HITL/evals *as advice*) | OBSERVED | CONDITIONALLY_USEFUL |
| M-AA-09 | Session amnesia / handoff loss | MCP memory prompt pattern (`remember`/`recall`/`rollback`) | DOCUMENTED | CONDITIONALLY_USEFUL |
| M-AA-10 | Catalog/app presentation | Frontmatter color/emoji/vibe + divisions icon/color for app | OBSERVED / DOCUMENTED | NOT_APPLICABLE (to MegaBrain core) |
| M-AA-11 | QA skepticism / evidence culture | testing division personas (Reality Checker, Evidence Collector, …) | OBSERVED | CONDITIONALLY_USEFUL |
| M-AA-12 | Distribution integrity | check-tools/divisions, convert output sha256, originality check | OBSERVED (scripts present; not run) | USEFUL (for packaging) |

---

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Prompt corpus + adapters; little novel runtime science | OBSERVED |
| Product | “Complete AI agency” branding; desktop app separate | DOCUMENTED (marketing-heavy) |
| Distribution | Multi-harness install + brew cask / GitHub releases for app | DOCUMENTED |
| Ecosystem | Couples to Claude Code, Cursor, Codex, Gemini, OpenCode, Hermes, … | OBSERVED |
| Timing | TEMPORAL_RESEARCH_CANDIDATE (416 commits, 0 tags per audit) | DOCUMENTED (audit) |
| Community / DX | CONTRIBUTING, Discussions, originality CI, interactive install | DOCUMENTED |

**Proibido:** tratar stars/marketing como superioridade técnica.

---

## 6. Comparison with MegaBrain (per mechanism)

### M-AA-01 Specialist persona roster

```text
EXTERNAL_MECHANISM   Domain persona Markdown library (279)
PROBLEM_SOLVED       Role specialization / voice / deliverable framing
OUR_CURRENT_MECHANISM Skills (.cursor/skills) + PDA roles + agent contracts
EQUIVALENCE          PARTIAL
GAP                  MegaBrain emphasizes capability/provider/policy; Agency emphasizes
                     personality + domain narrative without capability IR
TRADE_OFF            Breadth of personas vs contract/testability
EVIDENCE             OBSERVED both trees
APPLICABILITY        Domain-prompt patterns only; do not import 279 agents
DECISION             DEFER (catalog growth) / REJECT (bulk roster import)
```

### M-AA-03 Authoring schema (frontmatter + sections)

```text
EXTERNAL_MECHANISM   name/description/color + Identity/Mission/Rules template + lint
PROBLEM_SOLVED       Consistent agent packages
OUR_CURRENT_MECHANISM SKILL.md frontmatter + PDA / capability contracts
EQUIVALENCE          SUBSTANTIAL (same class of artifact)
GAP                  Agency lacks MegaBrain capability/provider/policy wiring
TRADE_OFF            vibe/emoji UX vs gate bundles
EVIDENCE             OBSERVED lint-agents.sh vs CursorSKILLS skills
APPLICABILITY        Optional section ideas (Success Metrics, Critical Rules)
DECISION             ALREADY_PRESENT (+ minor ADAPT of section checklist if desired)
```

### M-AA-04 Multi-host convert/install matrix

```text
EXTERNAL_MECHANISM   tools.json + convert/install per format/installKind
PROBLEM_SOLVED       One source → many coding-agent file layouts
OUR_CURRENT_MECHANISM Cursor-centric skills/hooks; no multi-harness publisher
EQUIVALENCE          NONE–PARTIAL
GAP                  MegaBrain not a multi-tool distribution product
TRADE_OFF            Packaging complexity vs reach
EVIDENCE             OBSERVED tools.json
APPLICABILITY        Only if shipping MegaBrain skills to foreign hosts
DECISION             DEFER
```

### M-AA-05 Lazy discovery (Hermes router)

```text
EXTERNAL_MECHANISM   search/inspect/load/delegate over agents.json
PROBLEM_SOLVED       Large roster without startup skill explosion
OUR_CURRENT_MECHANISM Skill discovery + Task tool roles; no equivalent lazy agent DB
EQUIVALENCE          PARTIAL (problem class: catalog scale)
GAP                  No first-class “search specialists then load body” capability
TRADE_OFF            Extra indirection vs always-on skills
EVIDENCE             DOCUMENTED hermes README; generated plugin ABSENT in checkout
APPLICABILITY        If skill count grows large
DECISION             PROTOTYPE (small router over skills/capabilities — via agent-authoring later)
```

### M-AA-06 NEXUS handoffs / quality gates (docs)

```text
EXTERNAL_MECHANISM   Markdown handoff + QA PASS/FAIL templates; phase playbooks
PROBLEM_SOLVED       Context loss and phase skipping in multi-persona workflows
OUR_CURRENT_MECHANISM Evidence Bus + PDA plan/exec/gate + orquestrar policy
EQUIVALENCE          SUBSTANTIAL (intent) / PARTIAL (machine enforcement)
GAP                  NEXUS gates are prompt-social; MegaBrain gates are file/JSON contracts
TRADE_OFF            Human-readable handoffs vs enforceable evidence schemas
EVIDENCE             DOCUMENTED strategy/; OBSERVED MegaBrain baseline
APPLICABILITY        Template language for human handoffs; not replace Evidence Bus
DECISION             ADAPT (handoff prose templates only) | ALREADY_PRESENT (gates)
```

### M-AA-07 Prompt-orchestrator persona

```text
EXTERNAL_MECHANISM   Agents Orchestrator instructs host to “spawn” agents in a loop
PROBLEM_SOLVED       Single-chat pipeline theatre without infrastructure
OUR_CURRENT_MECHANISM Orchestrator runtime + Task PDA roles
EQUIVALENCE          NONE (different mechanism class)
GAP                  N/A — MegaBrain already has real orchestration
TRADE_OFF            Zero infra cost vs non-determinism / no real process isolation
EVIDENCE             OBSERVED agents-orchestrator.md spawn strings
APPLICABILITY        Harmful if mistaken for architecture to copy
DECISION             REJECT (as runtime pattern)
```

### M-AA-09 MCP memory prompt pattern

```text
EXTERNAL_MECHANISM   Instruct persona to call MCP remember/recall/rollback
PROBLEM_SOLVED       Cross-session / cross-agent continuity
OUR_CURRENT_MECHANISM gaabwiki-mem / sessions; Evidence Bus artifacts
EQUIVALENCE          PARTIAL
GAP                  Agency pattern assumes external MCP memory server (UNSPECIFIED impl)
TRADE_OFF            Tool-coupled memory vs vault/session files
EVIDENCE             DOCUMENTED integrations/mcp-memory
APPLICABILITY        Low — already have episodic/wiki paths
DECISION             ALREADY_PRESENT / DEFER
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| M-AA-01 Roster bulk import | REJECT | HIGH |
| M-AA-02 Division catalog UX | DEFER | MEDIUM |
| M-AA-03 Authoring template/lint | ALREADY_PRESENT | HIGH |
| M-AA-04 Multi-harness distributor | DEFER | HIGH |
| M-AA-05 Lazy specialist router | PROTOTYPE | MEDIUM |
| M-AA-06 NEXUS handoff docs | ADAPT (templates) / ALREADY_PRESENT (gates) | HIGH |
| M-AA-07 Prompt-only orchestrator | REJECT | HIGH |
| M-AA-08 Multi-agent design persona content | DEFER (read as literature) | MEDIUM |
| M-AA-09 MCP memory pattern | ALREADY_PRESENT | MEDIUM |
| M-AA-10 App presentation metadata | REJECT (core) | HIGH |
| M-AA-11 Evidence-skeptic QA personas | ALREADY_PRESENT (Evidence Bus ethos) | MEDIUM |
| M-AA-12 Packaging CI checks | DEFER | LOW |

**No ranking of “best framework.”**

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`. Key: app contracts; generated Hermes plugin behaviour at runtime; whether hosts enforce agent boundaries; authoritative marketing counts vs 279 OBSERVED.

---

## 9. Sources

| Source | Role |
|--------|------|
| `/home/gaab/Documentos/reverseEnginering/agency-agents/` @ `ad9264e…` | Primary LOCAL_CORPUS |
| `README.md`, `SECURITY.md`, `CONTRIBUTING.md` | Product + security claims |
| `divisions.json`, `tools.json` | Catalog SSOT |
| Division `*.md` samples (frontend, orchestrator, multi-agent architect, reality-checker) | Persona architecture |
| `strategy/nexus-strategy.md`, `coordination/*` | Coordination doctrine |
| `integrations/hermes/README.md`, `mcp-memory/README.md`, `cursor/README.md` | Adapter contracts |
| `scripts/lint-agents.sh`, `build-hermes-plugin.py` (read) | Schema + router design |
| `_corpus-audit/*` | Prior inventory / conflicts |
| `research/OUR-SYSTEM-BASELINE.md` | Comparison baseline |

---

## 10. Handoff

- Para `agent-authoring`: only if product asks for **lazy skill/capability search** inspired by Hermes tools — prototype against Capability Registry, do not clone roster.
- Para `architect` / `adr`: document anti-pattern **over-agentization via persona count without runtime contracts**.
- **Não implementado nesta skill.**

---

## Validation checklist

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN
- [x] Epistemic labels on key claims
- [x] OUR_CURRENT_MECHANISM comparisons
- [x] No MegaBrain implementation
- [x] No ranking
- [x] Explicit roster vs multi-agent runtime distinction
- [x] `testing/` conflict addressed
