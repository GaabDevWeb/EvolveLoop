# Target Report — `superpowers`

| Campo | Valor |
|-------|-------|
| Target | superpowers (obra/superpowers) |
| Category | skills-protocol + coding-agent methodology pack |
| Mode | TARGET_RESEARCH |
| Inventory id | tgt-superpowers |
| Versions examined | **v6.3.0** (HEAD `b36e082`, tag `v6.3.0`); temporal span tags `v3.1.0`→`v6.3.0` (34 tags); 681 commits on examined history |
| Access limitations | READ-ONLY static + git log/read; **no** script/test/binary execution; `evals/` submodule **absent** in this checkout |
| Date | 2026-09-18 |
| Provenance | `source_type: LOCAL_CORPUS` — `/home/gaab/Documentos/reverseEnginering/superpowers` |
| Wiki | n/a (corpus mining; não é pack Gaab mapeado) |

## 1. What exists?

**OBSERVED:** Pacote MIT de **14 skills** (`skills/*/SKILL.md`) + **bootstrap runtime** multi-harness (hooks SessionStart, plugins OpenCode/Pi/Cursor/Claude/Codex/Hermes/Devin/Kimi/…), scripts auxiliares SDD, servidor opcional de brainstorm visual, e bateria grande de testes de infraestrutura em `tests/`.

**DOCUMENTED:** Metodologia completa de desenvolvimento agentic: brainstorm → worktree → plan → subagent-driven-development (ou executing-plans) → TDD → code review → finishing branch; filosofia “evidence over claims”; skills como código de comportamento, não prosa.

**INFERRED (premissa: README + CLAUDE.md + porting guide alinhados com código):** O produto real não é “lista de prompts”, é um **sistema de activação + composição de workflows** onde skills sem bootstrap são “peso morto”.

Identidade (inventory): `SKILL_SYSTEM` primário; secundários AGENT_FRAMEWORK / MULTI_AGENT / ORCHESTRATION / CODING_AGENT — **HIGH** confidence, confirmado.

## 2. Architecture map

```text
┌─────────────────────────────────────────────────────────────┐
│  Harness adapters (thin)                                      │
│  hooks/session-start | .opencode/plugins | .pi/extensions |   │
│  .cursor-plugin | .claude-plugin | .codex-plugin | …          │
└───────────────────────────┬─────────────────────────────────┘
                            │ injects bootstrap
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  using-superpowers (ALWAYS in session context)                │
│  — mandatory skill check before any action                    │
│  — instruction hierarchy: user > skills > defaults            │
│  — platform refs → references/*-tools.md                      │
└───────────────────────────┬─────────────────────────────────┘
                            │ Skill tool / native skill load
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Shared skills/ (harness-agnostic action vocabulary)          │
│  brainstorming │ writing-plans │ SDD │ TDD │ debugging │ …    │
│  progressive disclosure: description triggers; body on load   │
└───────────────────────────┬─────────────────────────────────┘
                            │ SDD path
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  Controller session + fresh subagents per task                │
│  prompts: implementer / task-reviewer / re-review             │
│  artifacts: .superpowers/sdd/<plan>/ (ledger, briefs, diffs)  │
└─────────────────────────────────────────────────────────────┘
```

**Layers (MegaBrain lens mapping — INFERRED labels):**

| MegaBrain role | Superpowers analogue | Equivalence |
|----------------|----------------------|-------------|
| Agent decide | Controller agent + skill routing via descriptions | PARTIAL |
| Capability faz | Skill body as procedure | PARTIAL (skills ≠ Capability IR) |
| Provider implementa | Harness tools via mapping refs | SUBSTANTIAL as adapter pattern |
| Policy autoriza | Soft policy in prompts (Iron Laws, stop conditions); user overrides | PARTIAL (no Policy Engine) |
| Runtime orquestra | Harness + SDD controller loop | PARTIAL |
| Evidence prova | verification-before-completion + TDD red/green + review packages | SUBSTANTIAL (prompt-level) |
| Knowledge grounds | Spec/plan files on disk; not RAG | PARTIAL |
| Telemetry observa | Optional logo ping; token analysis scripts in tests | LOW |
| Evals medem | drill/evals (external; absent here) + pressure scenarios | PARTIAL / UNKNOWN runtime |

## 3. Execution flow (or UNKNOWN)

```text
SessionStart/plugin → inject using-superpowers (<EXTREMELY_IMPORTANT>)
  → User message
  → Skill check (description match) BEFORE clarifying/explore
  → [creative] brainstorming: classify spike|bounded|architectural
       → HARD-GATE: human approval before implementation
  → [arch] writing-plans → docs/superpowers/plans/…
  → using-git-worktrees (isolated branch)
  → subagent-driven-development OR executing-plans
       → per task: implementer subagent → task reviewer → fix loop ≤5
       → ledger in .superpowers/sdd/<plan>/progress.md (compaction recovery)
       → final branch review → finishing-a-development-branch
  → Cross-cutting: TDD during impl; systematic-debugging on failures;
       verification-before-completion before success claims
  → Final Output: merged/PR/kept/discarded worktree + verified tests
```

**UNKNOWN:** Exact host-side skill discovery ranking algorithms (Claude/Codex/Cursor internals) — only adapter + description conventions are OBSERVED.

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M-BOOTSTRAP | Skills on disk never fire | SessionStart / message-transform inject full `using-superpowers` | OBSERVED | USEFUL |
| M-MANDATORY-INVOKE | Agents skip process | “1% chance → must invoke”; Red Flags table | OBSERVED | USEFUL |
| M-PROG-DISCLOSURE | Context bloat / description-as-workflow | Trigger-only `description`; body via Skill tool; no `@` force-load | OBSERVED+DOCUMENTED | USEFUL |
| M-ACTION-VOCAB | Multi-harness tool dialects | Skills name actions; `references/*-tools.md` maps tools | OBSERVED+DOCUMENTED | USEFUL |
| M-WORKFLOW-PIPE | Jump-to-code | brainstorm→plan→SDD/execute→finish composition | DOCUMENTED+OBSERVED | USEFUL |
| M-PATH-ROUTER | One-size ceremony | brainstorming spike/bounded/architectural + hard approval gate | OBSERVED | USEFUL |
| M-SDD-CONTROLLER | Context pollution / weak review | Fresh subagent/task; file-based briefs; one dual-verdict reviewer; model named | OBSERVED+DOCUMENTED | USEFUL |
| M-SDD-LEDGER | Compaction loses place → redo tasks | Plan-scoped workspace + progress.md ledger + rulings | OBSERVED+DOCUMENTED | USEFUL |
| M-PLAN-CONTRACTS | Isolated implementers lack neighbor APIs | Global Constraints + Interfaces consume/produce in plan tasks | OBSERVED+DOCUMENTED | USEFUL |
| M-TDD-IRON | Impl before tests | NO CODE WITHOUT FAILING TEST; delete-and-rewrite | OBSERVED | CONDITIONALLY_USEFUL |
| M-VERIFY-GATE | Success claims without evidence | Iron Law: run fresh verification before claims | OBSERVED | USEFUL |
| M-RATIONALIZATION | Prompt loopholes | Red Flags / rationalization tables; spirit>letter | OBSERVED | USEFUL |
| M-SKILL-TDD | Untested skill edits | Pressure scenarios RED→GREEN; writing-skills meta | OBSERVED+DOCUMENTED | USEFUL |
| M-INSTR-HIERARCHY | Conflict user vs skill | User instructions override skills; skills override defaults | OBSERVED | USEFUL |
| M-HITL-GATES | Unapproved design / irreversible ops | Approval before impl; SDD stops only on destructive/security/guess | OBSERVED | USEFUL |
| M-WORKTREE | Dirty main / parallel risk | Project-local `.worktrees/` isolation | OBSERVED+DOCUMENTED | USEFUL |
| M-ZERO-DEP | Plugin deps break installs | Zero third-party deps in core (CLAUDE.md) | DOCUMENTED+OBSERVED package | CONDITIONALLY_USEFUL |
| M-CONTRIB-GATE | AI slop PRs | Strict CLAUDE.md / PR template / harness acceptance test | OBSERVED | USEFUL (product) |
| M-EVAL-SPLIT | Mix infra vs behavior tests | `tests/` plugin vs `evals/` drill (submodule absent) | DOCUMENTED | USEFUL / UNPROVEN here |
| M-TELEMETRY-OPTIN | Usage unknown | Logo URL version ping; env disable | DOCUMENTED | NOT_APPLICABLE (MegaBrain) |

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong prompt+adapter architecture; measured token/cost claims in RELEASE-NOTES (not re-run here) | OBSERVED + DOCUMENTED (MEASURED claims external) |
| Product | Full SDLC methodology for coding agents; commercial Prime Radiant | DOCUMENTED |
| Distribution | Many official marketplaces (Claude, Codex, Cursor, xAI, …) | DOCUMENTED |
| Ecosystem | Multi-harness porting guide; community Discord | DOCUMENTED |
| Timing | Started 2025-10; rapid harness race 2026 | OBSERVED (git dates) |
| Community / DX | High PR rejection; contributor friction intentional | OBSERVED (CLAUDE.md) |

**Proibido:** popularidade ≠ superioridade técnica. Distribuição ampla **não** prova que cada skill melhora outcomes em todos os domains.

## 6. Comparison with MegaBrain (per mechanism)

### M-BOOTSTRAP

```text
EXTERNAL_MECHANISM: SessionStart hook / plugin transform injects full using-superpowers
PROBLEM_SOLVED: Dead skills without mandatory activation
OUR_CURRENT_MECHANISM: Cursor hooks + MegaBrain promote-queue (PARTIAL); skills exist but no single forced bootstrap of a meta-skill at every session
EQUIVALENCE: PARTIAL
GAP: No canonical “must check skills before any response” injector equivalent across our Agent System entrypoints
TRADE_OFF: Token cost every session vs reliability of skill use
EVIDENCE: hooks/session-start; .opencode/plugins/superpowers.js; .pi/extensions/superpowers.ts [OBSERVED]
APPLICABILITY: High for coding-agent sessions; lower for non-interactive orchestrator jobs
DECISION: ADAPT
```

### M-PROG-DISCLOSURE

```text
EXTERNAL_MECHANISM: description = trigger only; body loaded on demand; forbid workflow summary in description; avoid @ force-load
PROBLEM_SOLVED: Agents follow short description instead of full skill; context explosion
OUR_CURRENT_MECHANISM: .cursor/skills/**/SKILL.md with descriptions; progressive disclosure varies by skill
EQUIVALENCE: SUBSTANTIAL
GAP: Explicit anti-pattern “don’t summarize workflow in description” + measured failure case may not be uniformly enforced
TRADE_OFF: Weaker discoverability text vs correct procedure following
EVIDENCE: writing-skills/SKILL.md lines on description testing [OBSERVED]
APPLICABILITY: Direct to skill-authoring
DECISION: ADAPT
```

### M-ACTION-VOCAB + multi-harness

```text
EXTERNAL_MECHANISM: Action-named skills + per-harness tool maps + bootstrap-only porting
PROBLEM_SOLVED: One skill library across Claude/Codex/Cursor/Pi/…
OUR_CURRENT_MECHANISM: Provider Registry + Cursor-centric skills; Capability/Provider split
EQUIVALENCE: PARTIAL (Provider≈tool mapping; not same packaging)
GAP: We do not ship a harness-neutral action vocabulary with thin adapters as first-class product pattern for third-party runtimes
TRADE_OFF: Abstraction cost vs multi-runtime reach
EVIDENCE: docs/porting-to-a-new-harness.md [DOCUMENTED]; references/*-tools.md [OBSERVED]
APPLICABILITY: Medium — MegaBrain is Cursor/orchestrator-first
DECISION: DEFER (multi-harness product); ADAPT (action vocabulary inside skills)
```

### M-WORKFLOW-PIPE / M-PATH-ROUTER

```text
EXTERNAL_MECHANISM: Composed mandatory workflow + three-path brainstorming with hard approval
PROBLEM_SOLVED: Premature coding; ceremony mismatch to task size
OUR_CURRENT_MECHANISM: orquestrar + PDA roles + brainstorming/writing-plans skills (local copies in ~/.agents and CursorSKILLS)
EQUIVALENCE: SUBSTANTIAL for methodology skills; PARTIAL for hard gates
GAP: Path classification + ratchet upgrade mid-task less explicit as a single router
TRADE_OFF: Latency to first code vs reduced rework
EVIDENCE: README workflow; brainstorming/SKILL.md [OBSERVED]
APPLICABILITY: High for feature work sessions
DECISION: ADAPT
```

### M-SDD-CONTROLLER / M-SDD-LEDGER / M-PLAN-CONTRACTS

```text
EXTERNAL_MECHANISM: Fresh subagent/task; file handoff; dual-verdict reviewer; plan-scoped ledger; Interfaces/Global Constraints
PROBLEM_SOLVED: Context pollution, review gaming, compaction redo, neighbor-contract ignorance
OUR_CURRENT_MECHANISM: Task tool multi-agent PDA; Evidence Bus; plan.ir.yaml / Task IR; jobs/checkpoints PARTIAL; subagent-driven-development skill present in agent skills tree
EQUIVALENCE: SUBSTANTIAL (multi-agent + plans); PARTIAL (ledger durability / anti-coaching review)
GAP: Plan-scoped durable ledger + ban on controller coaching reviewers; file-based review packages as default
TRADE_OFF: More files/process vs cheaper/safer long runs
EVIDENCE: SDD SKILL.md; RELEASE-NOTES v6.0.0; scripts/sdd-workspace [OBSERVED/DOCUMENTED]
APPLICABILITY: High for long autonomous implementation
DECISION: ADAPT (ledger + review packaging); ALREADY_PRESENT (subagent-per-task idea)
```

### M-VERIFY-GATE / M-TDD-IRON

```text
EXTERNAL_MECHANISM: Evidence-before-claims; failing-test-first Iron Laws
PROBLEM_SOLVED: Hallucinated success; untested code
OUR_CURRENT_MECHANISM: Evidence Bus gates; verification/eval skills; TDD skill variants
EQUIVALENCE: SUBSTANTIAL–EQUIVALENT at policy intent; PARTIAL at enforcement (ours more registry/file gate; theirs prompt Iron Law)
GAP: Ours may lack the same “no satisfaction language before fresh run” rhetorical enforcement in all agents
TRADE_OFF: Strict TDD can reject valid spike/throwaway paths (they handle via brainstorming spike path)
EVIDENCE: verification-before-completion; test-driven-development [OBSERVED]
APPLICABILITY: High
DECISION: ALREADY_PRESENT (Evidence Bus + verify skills) with residual ADAPT for rhetorical Iron Law patterns; TDD Iron Law → ADAPT (not blanket ADOPT)
```

### M-SKILL-TDD / M-RATIONALIZATION

```text
EXTERNAL_MECHANISM: Pressure-scenario TDD for skills; Red Flags tables
PROBLEM_SOLVED: Skills that don’t change agent behavior under pressure
OUR_CURRENT_MECHANISM: skill evals JSON; gaabwiki pytest; skill-authoring partial
EQUIVALENCE: PARTIAL
GAP: Adversarial multi-session pressure loops as default skill change gate
TRADE_OFF: Expensive evals vs brittle prose
EVIDENCE: writing-skills; CLAUDE.md skill-change rules; tests/explicit-skill-requests [OBSERVED/DOCUMENTED]
APPLICABILITY: High for meta-skills
DECISION: ADAPT
```

### M-INSTR-HIERARCHY

```text
EXTERNAL_MECHANISM: User > skills > defaults (explicit)
PROBLEM_SOLVED: Skill absolutism vs partner control
OUR_CURRENT_MECHANISM: Policy Engine + user rules + skill disable-model-invocation patterns
EQUIVALENCE: EQUIVALENT intent
GAP: Minor wording/consistency
DECISION: ALREADY_PRESENT
```

### M-ZERO-DEP / M-TELEMETRY / M-CONTRIB-GATE

```text
DECISION: DEFER / REJECT / DEFER respectively for MegaBrain core product
  — zero-dep is a distribution constraint, not our architecture need
  — logo telemetry REJECT for our system
  — contrib gate is their repo governance, not a MegaBrain runtime mechanism
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| M-BOOTSTRAP | ADAPT | HIGH |
| M-MANDATORY-INVOKE | ADAPT | HIGH |
| M-PROG-DISCLOSURE | ADAPT | HIGH |
| M-ACTION-VOCAB (skill prose) | ADAPT | HIGH |
| Multi-harness product ports | DEFER | MEDIUM |
| M-WORKFLOW-PIPE / M-PATH-ROUTER | ADAPT | HIGH |
| M-SDD-CONTROLLER (fresh subagent) | ALREADY_PRESENT | HIGH |
| M-SDD-LEDGER / review packages | ADAPT | HIGH |
| M-PLAN-CONTRACTS | ADAPT | HIGH |
| M-VERIFY-GATE | ALREADY_PRESENT (+ residual ADAPT) | HIGH |
| M-TDD-IRON | ADAPT | MEDIUM |
| M-RATIONALIZATION / M-SKILL-TDD | ADAPT | HIGH |
| M-INSTR-HIERARCHY | ALREADY_PRESENT | HIGH |
| M-HITL-GATES | ADAPT | MEDIUM |
| M-WORKTREE | ADAPT | MEDIUM |
| M-ZERO-DEP | DEFER | MEDIUM |
| M-TELEMETRY-OPTIN | REJECT | HIGH |
| M-CONTRIB-GATE | DEFER | HIGH |
| M-EVAL-SPLIT | ADAPT | MEDIUM |

**No ADOPT tal-qual** — fit MegaBrain contracts requires adaptation. **No PROTOTYPE** forced without experiment design; several ADAPT items could become PROTOTYPE at handoff (ledger, pressure-eval gate).

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

**CONFLICT (resolved prefer_primary):**

```text
CONFLICT:
  claim: Skill-behavior eval harness name/location
  source_a: docs/testing.md + CLAUDE.md → evals/ + drill (Quorum rename mentioned in later commits)
  source_b: working tree → evals/ directory missing
  difference: documentation assumes submodule; corpus checkout lacks it
  resolution: prefer_primary code tree for availability; DOCUMENTED for design; MEASURED claims in RELEASE-NOTES not revalidated
```

**CONFLICT:**

```text
CONFLICT:
  claim: Current tip includes v6.4.0 work
  source_a: git log --all shows Release v6.4.0 commits
  source_b: HEAD main = v6.3.0 package.json
  difference: unreleased/other-branch history beyond examined tree
  resolution: report scoped to v6.3.0 working tree; later commits = TEMPORAL note only
```

## 9. Sources

| Source | Type | Label |
|--------|------|-------|
| `superpowers/README.md` | docs | DOCUMENTED |
| `superpowers/CLAUDE.md` | docs/policy | OBSERVED |
| `superpowers/package.json` | meta | OBSERVED |
| `skills/*/SKILL.md` | prompts | OBSERVED |
| `hooks/session-start`, `hooks.json`, `hooks-cursor.json` | runtime | OBSERVED |
| `.opencode/plugins/superpowers.js`, `.pi/extensions/superpowers.ts` | runtime | OBSERVED |
| `docs/porting-to-a-new-harness.md`, `docs/testing.md` | docs | DOCUMENTED |
| `RELEASE-NOTES.md` (esp. v6.0.0, v6.3.0) | docs | DOCUMENTED (some MEASURED claims) |
| `docs/superpowers/specs/*`, `plans/*` | design | DOCUMENTED |
| git tags/commits | temporal | OBSERVED |
| `research/OUR-SYSTEM-BASELINE.md` | baseline | DOCUMENTED |

## 10. Handoff

- Para `agent-authoring`: ADAPT bootstrap meta-skill injection; description-only triggers; rationalization tables; plan Interfaces/Global Constraints; SDD ledger pattern mapped onto Evidence Bus / checkpoints — **não** clonar 14 skills blindly.
- Para `architect` / `adr`: decisão sobre session-start mandatory skill check vs Policy Engine; multi-harness DEFER.
- Para evals: considerar pressure-scenario skill gates (PROTOTYPE se adoptarem writing-skills TDD).
- **Não implementado nesta skill.**
)
