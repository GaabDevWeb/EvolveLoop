# Target Report — `mattpocock-skills`

| Campo | Valor |
|-------|-------|
| Target | mattpocock-skills (folder corpus: `skills/`) |
| Category | skills-protocol (+ AGENT_METHODOLOGY_PACK) |
| Mode | TARGET_RESEARCH |
| source_type | LOCAL_CORPUS |
| Versions examined | package/plugin `1.2.3`; CHANGELOG through 1.2.3; git tags per `_corpus-audit/VERSION-MAP.md` |
| Access limitations | READ-ONLY: no install, no execute of project scripts, no runtime harness exercise |
| Date | 2026-09-18 |
| Corpus path | `/home/gaab/Documentos/reverseEnginering/skills` |
| Provenance | https://github.com/mattpocock/skills (MIT) — CONFIRMED |

## 1. What exists?

A **curated library of Agent Skills** for engineering and productivity workflows, packaged as:

- **38** `SKILL.md` packages under bucket folders (`engineering/`, `productivity/`, `misc/`, `in-progress/`; `deprecated/` exists as lifecycle sink).
- **25** promoted skills listed in `.claude-plugin/plugin.json` (exact curated ship set).
- Dual-harness metadata: Claude frontmatter + per-skill `agents/openai.yaml` (Codex UI + implicit-invocation policy).
- Contributor contracts in `CLAUDE.md` / `AGENTS.md` (symlink pair — OBSERVED via docs; symlink claim DOCUMENTED in CHANGELOG 1.2.0).
- Human docs mirror at `docs/<bucket>/<skill>.md` (25 pages) with publish template.
- Repo-level ADRs under `.agents/adr/` (distribution + setup-dependency policy).
- Domain self-model: root `CONTEXT.md` + skill `domain-modeling` formats.
- Release tooling: Changesets, `CHANGELOG.md`, `scripts/sync-plugin-version.mjs` (not executed here).
- Dev symlink installer `scripts/link-skills.sh` (maintainer-only; not end-user path).

**Not present (OBSERVED):** automated tests, eval harness, runtime orchestrator, tool registry, MCP servers as first-class artifacts.

**Identity note (OBSERVED):** folder name `skills` ≠ npm/plugin name `mattpocock-skills`.

## 2. Architecture map

```text
                    ┌─────────────────────────────────────┐
                    │  Distribution                       │
                    │  • Claude plugin (curated paths)    │
                    │  • skills.sh / npx skills add       │
                    │  • link-skills.sh (maintainer)      │
                    └─────────────────┬───────────────────┘
                                      │
┌─────────────────────────────────────▼─────────────────────────────────────┐
│  Bucket lifecycle                                                          │
│  promoted: engineering/ + productivity/  → README + plugin.json + docs/    │
│  beta: in-progress/   kept: misc/   sink: deprecated/                      │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   User-invoked                 Model-invoked              Shared reference
   disable-model-               description triggers       (model-invoked so
   invocation: true             + Skill-tool callable      others can Call)
   + openai policy false
          │                           │
          │    Call Skill tool        │
          └──────────►────────────────┘
                                      │
                                      ▼
                         Per-repo config (setup skill)
                         CLAUDE/AGENTS ## Agent skills
                         docs/agents/{issue-tracker,domain,triage-labels}.md
                         CONTEXT.md + docs/adr/
```

**Composition graph (DOCUMENTED in `ask-matt` + OBSERVED wrappers):**

```text
Main flow:  grill-with-docs → (optional prototype/handoff) → to-spec → to-tickets → implement
                                                              implement → tdd + code-review
Wrappers:   grill-me → grilling
            grill-with-docs → grilling + domain-modeling
Router:     ask-matt (human index over user-invoked skills; does not Skill-tool them)
Primitives: grilling, domain-modeling, codebase-design, writing-for-agents, tdd, …
```

## 3. Execution flow (or UNKNOWN)

Harness runtime behaviour is **UNKNOWN** (not executed). Documented intended flow:

```text
Human installs (plugin | skills.sh)
  → optional /setup-matt-pocock-skills (writes AGENTS/CLAUDE pointers + docs/agents/*)
  → Human types /skill  OR  model matches description (model-invoked only)
  → Agent loads SKILL.md body
  → If wrapper: Call Skill tool → load primitive(s)
  → Steps with completion criteria; optional subagents / tracker I/O
  → Artifacts: CONTEXT.md, ADRs, issues/tickets, code, handoff md, HTML reports, …
```

Epistemic: flow shape is **DOCUMENTED**; actual tool binding, discovery ranking, and failure recovery inside Claude Code / Codex = **UNKNOWN**.

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M-BUCKETS | Ship only stable skills; keep drafts visible | Bucket folders + plugin explicit path list | OBSERVED | USEFUL |
| M-INVOKE-AXIS | Orchestrators must not auto-fire; primitives must | User- vs model-invoked + dual harness flags | OBSERVED + DOCUMENTED | USEFUL |
| M-SKILL-TOOL-COMPOSE | Reuse discipline without duplicating bodies | Explicit `Call the Skill tool with "name"` | OBSERVED | USEFUL |
| M-THIN-WRAPPER | User entrypoints without context load of primitives | 1-line wrappers (`grill-me`, `grill-with-docs`) | OBSERVED | USEFUL |
| M-ROUTER | Cognitive load of many user-invoked skills | `ask-matt` human router map | OBSERVED | USEFUL |
| M-WRITE-AGENTS | Brittle/verbose agent docs | `writing-for-agents`: pointers, hierarchy, leading words, criteria | OBSERVED | USEFUL |
| M-SETUP-HARD-SOFT | Config needed unevenly | Setup skill + ADR hard vs soft dependency pointers | DOCUMENTED + OBSERVED | USEFUL |
| M-CONTEXT-ADR | Misalignment + verbose jargon | `CONTEXT.md` glossary + minimal ADRs | OBSERVED | USEFUL |
| M-MAIN-FLOW | Idea→ship across sessions | Spec/tickets/implement + phase boundaries | DOCUMENTED | CONDITIONALLY_USEFUL |
| M-DUAL-DISTRO | Subscribe vs fork | Claude plugin curated vs skills.sh editable | DOCUMENTED | USEFUL |
| M-HUMAN-DOCS | Humans forget when to invoke | `docs/` 4-section pages + writing-docs contract | OBSERVED | USEFUL |
| M-RELEASE | Version drift plugin↔package | Changesets + sync-plugin-version | OBSERVED | USEFUL |
| M-AXIS-ISOLATE | Mixed review criteria pollute | Parallel Standards/Spec subagents | OBSERVED | USEFUL |
| M-GRILL-TREE | Premature build / silent assumptions | Design-tree frontier interview rounds | OBSERVED | USEFUL |
| M-HARNESS-NEUTRAL | Claude-specific wording breaks Codex | Drop harness tool names from prompts (1.2.3) | DOCUMENTED | USEFUL |

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Instruction packages + composition conventions; no runtime engine | OBSERVED |
| Product | Positioned against heavy process frameworks (GSD/BMAD/Spec-Kit); “small, composable” | DOCUMENTED (marketing-adjacent; treat as product claim) |
| Distribution | Official Claude marketplace + skills.sh; Codex native plugin deferred (ADR 0002) | DOCUMENTED |
| Ecosystem | Agent Skills standard; newsletter / aihero.dev docs | DOCUMENTED |
| Timing | Semver 1.x through 2026; dual-harness + plugin in 1.2.x | OBSERVED |
| Community / DX | Human docs, ask-matt, explicit setup; no evals | OBSERVED |

## 6. Comparison with MegaBrain (per mechanism)

### M-BUCKETS — promotion lifecycle

```text
EXTERNAL_MECHANISM   Bucket folders; only engineering+productivity in plugin.json
PROBLEM_SOLVED       Draft/retired skills must not ship to subscribers
OUR_CURRENT_MECHANISM Flat/grouped `.cursor/skills/**` without promoted-vs-beta ship gate
EQUIVALENCE          PARTIAL
GAP                  No explicit non-promoted bucket + curated plugin manifest invariant
TRADE_OFF            Clarity of ship set vs more contributor process
EVIDENCE             OBSERVED plugin.json vs in-progress/README
APPLICABILITY        Skill catalog hygiene for CursorSKILLS
DECISION             ADAPT
```

### M-INVOKE-AXIS — user vs model invocation

```text
EXTERNAL_MECHANISM   disable-model-invocation + Codex policy.allow_implicit_invocation:false
PROBLEM_SOLVED       Orchestrators stay human-gated; primitives discoverable/composable
OUR_CURRENT_MECHANISM Many skills set disable-model-invocation: true; Codex yaml rare/absent
EQUIVALENCE          PARTIAL
GAP                  Dual-harness sync contract; model-invoked shared primitives as deliberate pattern
TRADE_OFF            Context load of descriptions vs cognitive load on human
EVIDENCE             OBSERVED MegaBrain skills + target .agents/invocation.md
APPLICABILITY        High for skill-authoring / registries
DECISION             ADAPT
```

### M-SKILL-TOOL-COMPOSE + M-THIN-WRAPPER

```text
EXTERNAL_MECHANISM   Operative “Call the Skill tool with X”; wrappers are one line
PROBLEM_SOLVED       DRY primitives; high hit-rate invocation vs /name prose
OUR_CURRENT_MECHANISM Skills often self-contained; some mention peer skills by name
EQUIVALENCE          PARTIAL
GAP                  Convention for Skill-tool composition + invariant “user-invoked never callable”
TRADE_OFF            Harness must expose Skill tool; wrappers become opaque without it
EVIDENCE             OBSERVED grill-me / grill-with-docs; DOCUMENTED invocation.md
APPLICABILITY        High where Cursor Skill tool exists
DECISION             ADAPT
```

### M-ROUTER (`ask-matt`)

```text
EXTERNAL_MECHANISM   Single user-invoked map of flows / on-ramps / phase boundaries
PROBLEM_SOLVED       Index for many slash skills without auto-invocation
OUR_CURRENT_MECHANISM orquestrar / multiple meta-skills; no single human flow router of this density
EQUIVALENCE          PARTIAL
GAP                  Living “flow map” skill kept in sync with catalog
TRADE_OFF            Router drift risk (explicitly warned in CLAUDE.md)
EVIDENCE             OBSERVED ask-matt/SKILL.md
APPLICABILITY        Medium–high for MegaBrain skill surface
DECISION             ADAPT
```

### M-WRITE-AGENTS

```text
EXTERNAL_MECHANISM   Methodology: context pointers, two loads, hierarchy, leading words, criteria, anti-negation
PROBLEM_SOLVED       Variance, sprawl, premature completion, stale sediment in agent docs
OUR_CURRENT_MECHANISM skill-authoring + agent-architecture-mining writing conventions (partial overlap)
EQUIVALENCE          PARTIAL
GAP                  Codified “two loads” + completion-criterion / leading-word discipline as shared reference skill
TRADE_OFF            Meta-skill itself is long (attention cost); benefits authors not end users directly
EVIDENCE             OBSERVED writing-for-agents/SKILL.md + SKILL-MECHANICS.md
APPLICABILITY        High for skill/authoring quality
DECISION             ADAPT  (consider PROTOTYPE: adopt as reference skill / eval checklist)
```

### M-SETUP-HARD-SOFT

```text
EXTERNAL_MECHANISM   One setup skill; hard deps get explicit pointer, soft deps degrade
PROBLEM_SOLVED       Cargo-cult setup noise vs silent wrong tracker writes
OUR_CURRENT_MECHANISM gaabwiki grounding / setup varies by skill; hard/soft not systematized this way
EQUIVALENCE          PARTIAL
GAP                  Explicit hard vs soft dependency policy for skills that need repo config
TRADE_OFF            Extra setup session vs wrong outputs
EVIDENCE             DOCUMENTED ADR 0001; OBSERVED setup + code-review pointer
APPLICABILITY        Medium (MegaBrain has wiki/orchestrator config)
DECISION             ADAPT
```

### M-CONTEXT-ADR

```text
EXTERNAL_MECHANISM   Ubiquitous language in CONTEXT.md; ultra-minimal ADR template; lazy create
PROBLEM_SOLVED       Agent verbosity + lost decisions; glossary ≠ implementation dump
OUR_CURRENT_MECHANISM GaabWiki + adr skill + .ai wiki carpaccio (richer, heavier)
EQUIVALENCE          SUBSTANTIAL (same problem class; different artifact system)
GAP                  Optional lightweight CONTEXT.md habit for small repos alongside wiki
TRADE_OFF            Dual systems risk if both CONTEXT and wiki used without map
EVIDENCE             OBSERVED domain-modeling + ADR-FORMAT + repo CONTEXT.md
APPLICABILITY        Medium — avoid duplicating GaabWiki; may ADAPT glossary rules only
DECISION             ADAPT (glossary discipline) / DEFER (second doc system)
```

### M-MAIN-FLOW

```text
EXTERNAL_MECHANISM   Documented idea→ship path with smart-zone / clear / handoff / compact
PROBLEM_SOLVED       Multi-session agent work without process framework lock-in
OUR_CURRENT_MECHANISM orquestrar + PDA roles + Evidence Bus + plan.ir (heavier runtime)
EQUIVALENCE          PARTIAL (workflow intent vs orchestrated IR)
GAP                  Phase-boundary decision tree as portable skill content (not new runtime)
TRADE_OFF            Prompt-only flows lack evidence gates MegaBrain already has
EVIDENCE             DOCUMENTED ask-matt; MegaBrain baseline DOCUMENTED
APPLICABILITY        Steal phase-boundary / context hygiene language; do not replace orchestrator
DECISION             ADAPT (content) / REJECT (as replacement runtime)
```

### M-DUAL-DISTRO

```text
EXTERNAL_MECHANISM   Plugin subscribe + skills.sh fork; ADR explains Codex plugin deferral
PROBLEM_SOLVED       Read-only updates vs editable ownership
OUR_CURRENT_MECHANISM Local `.cursor/skills` + CursorSKILLS repo; no dual marketplace story
EQUIVALENCE          NONE–PARTIAL
GAP                  Distribution product problem, not Agent System core
TRADE_OFF            Manifest format constraints force layout choices
EVIDENCE             DOCUMENTED ADR 0002
APPLICABILITY        Low for MegaBrain runtime; medium if publishing skills packages
DECISION             DEFER
```

### M-HUMAN-DOCS

```text
EXTERNAL_MECHANISM   Parallel human docs with fixed sections; absolute URLs; no install duplication
PROBLEM_SOLVED       Cognitive load for user-invoked skills
OUR_CURRENT_MECHANISM Skill descriptions + occasional docs; no mirrored docs/<skill> contract
EQUIVALENCE          PARTIAL
GAP                  Human-facing “when to reach / working if” pages for promoted skills
TRADE_OFF            Sync cost (CLAUDE.md already requires re-sync)
EVIDENCE             OBSERVED docs/ + writing-docs.md
APPLICABILITY        Medium for public skill packages
DECISION             DEFER (internal) / ADAPT if publishing skills externally
```

### M-AXIS-ISOLATE

```text
EXTERNAL_MECHANISM   Parallel subagents Standards vs Spec; no cross-rerank
PROBLEM_SOLVED       Criterion pollution in reviews
OUR_CURRENT_MECHANISM code-reviewer skill + PDA critic; axis split less explicit
EQUIVALENCE          PARTIAL
GAP                  Forced dual-axis review with isolation invariant
TRADE_OFF            2× subagent cost
EVIDENCE             OBSERVED code-review/SKILL.md
APPLICABILITY        High for review quality
DECISION             ADAPT
```

### M-GRILL-TREE

```text
EXTERNAL_MECHANISM   Frontier rounds; facts via subagent; decisions via human; recommended answers
PROBLEM_SOLVED       Misalignment before build
OUR_CURRENT_MECHANISM Optional grill-me mentions in orquestrar/prd; no shared grilling primitive
EQUIVALENCE          PARTIAL
GAP                  Reusable grilling primitive + user wrappers
TRADE_OFF            Interview latency vs rework
EVIDENCE             OBSERVED grilling/SKILL.md
APPLICABILITY        High
DECISION             ADAPT
```

### M-RELEASE / M-HARNESS-NEUTRAL

```text
EXTERNAL_MECHANISM   Changesets + version sync; purge harness-specific tool names
PROBLEM_SOLVED       Drift and broken cross-harness instructions
OUR_CURRENT_MECHANISM Ad-hoc skill versioning; Cursor-centric wording common
EQUIVALENCE          PARTIAL
GAP                  Cross-harness neutrality checklist in skill-authoring
TRADE_OFF            Slightly less precise Cursor tips
EVIDENCE             OBSERVED package scripts; DOCUMENTED CHANGELOG 1.2.3
APPLICABILITY        Medium
DECISION             ADAPT (neutrality) / DEFER (changesets for skills monorepo)
```

### Evals / tests

```text
EXTERNAL_MECHANISM   ABSENT in corpus
PROBLEM_SOLVED       n/a
OUR_CURRENT_MECHANISM skill evals JSON + gaabwiki pytest (PARTIAL)
EQUIVALENCE          NONE (target weaker)
GAP                  Target has methodology but no measurement
EVIDENCE             OBSERVED _corpus-audit EVALUATION-INVENTORY
APPLICABILITY        Do not adopt absence
DECISION             REJECT (adopting “no evals”)
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| M-BUCKETS | ADAPT | HIGH |
| M-INVOKE-AXIS | ADAPT | HIGH |
| M-SKILL-TOOL-COMPOSE / M-THIN-WRAPPER | ADAPT | HIGH |
| M-ROUTER | ADAPT | MEDIUM |
| M-WRITE-AGENTS | ADAPT (+ optional PROTOTYPE checklist) | HIGH |
| M-SETUP-HARD-SOFT | ADAPT | MEDIUM |
| M-CONTEXT-ADR glossary rules | ADAPT | MEDIUM |
| M-CONTEXT-ADR as second wiki | DEFER | MEDIUM |
| M-MAIN-FLOW content | ADAPT | MEDIUM |
| M-MAIN-FLOW as orchestrator replacement | REJECT | HIGH |
| M-DUAL-DISTRO | DEFER | HIGH |
| M-HUMAN-DOCS | DEFER / ADAPT if publishing | MEDIUM |
| M-AXIS-ISOLATE | ADAPT | HIGH |
| M-GRILL-TREE | ADAPT | HIGH |
| M-HARNESS-NEUTRAL | ADAPT | HIGH |
| M-RELEASE changesets | DEFER | MEDIUM |
| No-evals pattern | REJECT | HIGH |
| Basic SKILL.md packages | ALREADY_PRESENT | HIGH |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

```text
CONFLICT:
  claim: Official marketplace skill count vs plugin.json
  source_a: ADR 0002 update (pin lists 22 skills; plugin had 24 at writing)
  source_b: local plugin.json skills array length 25 (version 1.2.3)
  difference: marketplace pin lag vs local manifest
  resolution: prefer_primary local OBSERVED count=25; marketplace lag DOCUMENTED as historical note — UNRESOLVED for live marketplace today (not re-fetched)
```

## 9. Sources

| Source | Label |
|--------|-------|
| `/home/gaab/Documentos/reverseEnginering/skills/**` | OBSERVED |
| `README.md`, `CLAUDE.md`, `.agents/*`, `CHANGELOG.md` | DOCUMENTED / OBSERVED |
| `_corpus-audit/{CORPUS-MAP,TARGET-INVENTORY,VERSION-MAP,UNKNOWN-CATALOG}.md|yaml` | DOCUMENTED (prior audit) |
| `research/OUR-SYSTEM-BASELINE.md` | DOCUMENTED baseline |

## 10. Handoff

- Para `agent-authoring` / `skill-authoring`: dual invocation axis; Skill-tool composition; thin wrappers; writing-for-agents levers; harness-neutral wording; hard/soft setup pointers; dual-axis review pattern; grilling primitive.
- Para `architect` / `adr`: do **not** replace Evidence Bus / Orchestrator with prompt-only main flow; optional bucket promotion policy if publishing skills.
- Para Lead CROSS_SYSTEM later: skill-system comparison reserved (this report avoids joint analysis).
- **Não implementado nesta skill.**

## Checklist (methodology)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives answered or UNKNOWN
- [x] Epistemic labels on key claims
- [x] Comparison OUR_CURRENT_MECHANISM per major mechanism
- [x] No implementation
- [x] No ranking / no superpowers joint analysis
