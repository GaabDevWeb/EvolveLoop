# Target Report — `swe-agent`

| Campo | Valor |
|-------|-------|
| Target | SWE-agent (Princeton/Stanford; org `SWE-agent`) |
| Category | coding-agent |
| Mode | TARGET_RESEARCH |
| Provenance | OFFICIAL_EXTERNAL |
| Versions examined | Package `__version__ = "1.1.0"` (`OBSERVED` in `sweagent/__init__.py` on `main`); architecture docs for **SWE-agent 1.0** + NeurIPS 2024 paper arXiv:2405.15793; current docs mark project **maintenance-only**, superseded by **mini-swe-agent** (`DOCUMENTED`) |
| Access limitations | No local clone; no install/execution of untrusted code. Evidence from official docs (`swe-agent.com`), raw GitHub files, arXiv/NeurIPS PDF text extract. GitHub API rate-limited mid-investigation (stars/tags via API incomplete). EnIGMA/CTF capabilities noted only at architecture level (no offensive procedures). |
| Date | 2026-09-18 |
| Baseline | `research/OUR-SYSTEM-BASELINE.md` |
| Wiki | n/a beyond baseline SSOT (pedido TARGET_RESEARCH externo) |

---

## 1. What exists?

SWE-agent is an open-source **LM software-engineering agent** that takes a problem statement (typically a GitHub issue / SWE-bench instance) and iteratively uses tools inside a **sandboxed shell** to browse, edit, run code, and emit a **git patch**. Core research claim: performance depends heavily on an **Agent-Computer Interface (ACI)** — LM-centric commands and feedback formats — not only on the base model (`DOCUMENTED` paper + docs).

**Product / lifecycle status (`DOCUMENTED`):** Official site and README recommend **mini-swe-agent** as successor; SWE-agent itself is **maintenance-only**. mini-swe-agent drops custom tools for bash-only + independent subprocess execution; SWE-agent remains the configurable ACI / history-processor / tool-bundle research scaffold.

**Related ecosystem (`DOCUMENTED`, not fully reverse-engineered here):** SWE-ReX (runtime), SWE-bench / sb-cli (eval), SWE-smith / SWE-agent-LM (open-weights models), EnIGMA mode (CTF; pinned to v0.7 for full features).

---

## 2. Architecture map

```text
CLI `sweagent` (run | run-batch)
        │
        ├─► SWEEnv ──thin wrapper──► SWE-ReX Deployment
        │         (Docker local | Modal | AWS | …)
        │              └─► container + stateful bash session
        │              └─► install tool bundles (ACI) into PATH
        │
        └─► Agent (yaml-configured)
                 ├─ templates (system / instance / next_step / demos)
                 ├─ ToolHandler (bundles + bash + parsers + blocklist)
                 ├─ HistoryProcessor(s)
                 ├─ Model (litellm; cost/call limits)
                 └─ optional RetryAgent / Reviewer loops
```

Sources: `docs/background/architecture.md`, `sweagent/environment/swe_env.py`, `sweagent/agent/agents.py`, `pyproject.toml` (`swe-rex>=1.4.0`, `litellm`) — labels `DOCUMENTED` + `OBSERVED`.

**Default tool surface (1.x `config/default.yaml`, `OBSERVED`):** bash enabled; bundles `tools/registry`, `tools/edit_anthropic` (str_replace editor + filemap), `tools/review_on_submit_m`; parse via `function_calling`; history `cache_control` last_n=2. Classical paper ACI (`windowed` viewer, `search_*`, linting `edit`) still ships as alternate bundles under `tools/` (`OBSERVED` tree).

---

## 3. Execution flow

```text
Input: problem_statement + repo + deployment image/config
  → SWEEnv.start: deploy runtime, create bash session, copy/reset repo
  → Agent.setup: install tools, load templates/demos, init history
  → LOOP:
       HistoryProcessors(history) → model.query
       → parse thought+action (function_calling | thought_action | …)
       → blocklist / bash -n checks → requery up to max_requeries
       → execute in shell session (SWE-ReX) → observation (+ state JSON)
       → append history + trajectory step
       → until submit token / done / cost|context|timeout|format exit
  → On many exits: autosubmit `git add -A && git diff --cached > /root/model.patch`
  → Output: trajectory (*.traj), model.patch / preds.json (batch), optional local apply / PR
```

Labels: loop/autosubmit `OBSERVED` in `agents.py`; env communicate `OBSERVED` in `swe_env.py`; batch preds `DOCUMENTED` batch_mode docs.

**Planning:** Not a separate planner graph. Planning is **in-prompt** (instance template steps: localize → reproduce → edit → re-run → edge cases) + free-form LM thought each turn (`DOCUMENTED`/`OBSERVED` default.yaml). Optional `RetryAgent` + reviewer/chooser for multi-attempt selection (`OBSERVED` `reviewer.py` symbols).

**Validation:** (1) edit-time lint reject (paper ACI / flake8 helper) (`DOCUMENTED`/`OBSERVED`); (2) agent-authored reproduce scripts + tests in env (`DOCUMENTED` prompt); (3) SWE-bench harness via sb-cli / `--evaluate` (`DOCUMENTED`); (4) submit-time review messages asking revert of test edits (`OBSERVED` default.yaml). **No** MegaBrain-style Evidence Bus gates.

---

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Shell UIs confuse LMs (flooded context, silent edits, interactive tools) | **ACI**: curated commands + feedback formats | DOCUMENTED (paper principles) | High for coding agents |
| M02 | Need closed-loop fix issues in real repos | **ReAct-style agent loop** `forward`→action→obs | OBSERVED | Core |
| M03 | Safe, parallel, portable execution | **SWEEnv + SWE-ReX** containerized stateful shell | DOCUMENTED+OBSERVED | High; MegaBrain sandbox GAP |
| M04 | Tool extensibility without rewriting agent | **Tool bundles** (bin/ + config.yaml + install.sh) | DOCUMENTED+OBSERVED | High for research |
| M05 | Context blow-up / cache inefficiency | **HistoryProcessor** pipeline (LastN, ClosedWindow, CacheControl, ImageParsing, …) | OBSERVED | High |
| M06 | Syntax-error edit loops | **Lint-gated edit** (reject bad edits; show before/after) | MEASURED (paper ablations) + DOCUMENTED | High |
| M07 | Search result exhaustion | **Summarized search** (file-level matches) vs iterative next/prev | MEASURED (Lite ablations) | High |
| M08 | Wrong viewer window size | **~100-line file viewer** (not full file / not 30) | MEASURED | Medium–High |
| M09 | Empty stdout confuses models | **Explicit empty-output message** | DOCUMENTED+OBSERVED default template | Medium |
| M10 | Patch delivery for eval | **submit → `/root/model.patch`**; batch `preds.json` | OBSERVED+DOCUMENTED | High for benches |
| M11 | Hard failures waste partial work | **Autosubmit on cost/context/timeout/format exit** | OBSERVED | High |
| M12 | Budget / runaway loops | **per_instance_cost_limit**, call limits, execution timeouts | OBSERVED models.py / agents.py | High |
| M13 | Teach workflow without fine-tune | **Demonstration trajectories** in prompt/history | DOCUMENTED FAQ + paper | Medium–High |
| M14 | Interactive CLIs hang session | **Command blocklist** (vim, bare python, etc.) | OBSERVED ToolFilterConfig | Medium |
| M15 | Multi-attempt competitive runs | **RetryAgent / Reviewer / Chooser** | OBSERVED (config surface); efficacy UNKNOWN without measured runs here | Medium |
| M16 | Benchmark coupling | **run-batch + SWE-bench instance types + sb-cli evaluate** | DOCUMENTED | High for eval culture |

---

## 5. Adoption analysis (separated — not merit ranking)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong separation agent↔runtime (SWE-ReX); yaml ACI; litellm models | DOCUMENTED+OBSERVED |
| Product | Research/benchmark tool; now maintenance-only vs mini | DOCUMENTED |
| Distribution | PyPI package `sweagent`, MIT, docs site, Codespaces | DOCUMENTED |
| Ecosystem | SWE-bench family, sb-cli, SWE-smith, EnIGMA | DOCUMENTED |
| Timing | Paper era ~12% full SWE-bench; later news claim SoTA with Claude 3.7 (exact % not verified here) | CONFLICT / UNKNOWN below |
| Community / DX | Configurable but complex union-type CLI; authors push mini for simplicity | DOCUMENTED |

---

## 6. Comparison with MegaBrain (per mechanism)

```text
EXTERNAL_MECHANISM: ACI + tool bundles (M01/M04)
PROBLEM_SOLVED: LM-friendly repo interaction
OUR_CURRENT_MECHANISM: Skills + Capability/Provider registries; Cursor tools; no SWE-style ACI pack
EQUIVALENCE: PARTIAL
GAP: No first-class lint-gated editor / summarized search / windowed viewer contracts
TRADE_OFF: ACI couples tools to shell UX; MegaBrain prefers Capability IR
EVIDENCE: baseline + SWE docs/code
APPLICABILITY: coding execution path
DECISION: ADAPT
```

```text
EXTERNAL_MECHANISM: Agent ReAct loop with cost exits + autosubmit (M02/M11/M12)
PROBLEM_SOLVED: bounded autonomous repair attempts
OUR_CURRENT_MECHANISM: Orchestrator + PDA roles + Evidence gates
EQUIVALENCE: PARTIAL
GAP: MegaBrain stronger on evidence/policy; weaker documented code-sandbox loop
TRADE_OFF: free-flow LM agency vs gated capability graph
EVIDENCE: agents.py vs OUR-SYSTEM-BASELINE
APPLICABILITY: runtime orchestration for coding tasks
DECISION: ADAPT (limits + recovery); REJECT cloning unconstrained loop as default
```

```text
EXTERNAL_MECHANISM: SWE-ReX sandboxed execution (M03)
PROBLEM_SOLVED: isolate agent commands; parallel instances
OUR_CURRENT_MECHANISM: Sandbox UNKNOWN–PARTIAL
EQUIVALENCE: NONE–PARTIAL
GAP: durable containerized command execution for target repos
TRADE_OFF: infra cost vs safety
EVIDENCE: swe-rex.com + baseline Sandbox row
APPLICABILITY: any agent that runs untrusted/generated code
DECISION: PROTOTYPE (pattern); not ADOPT whole SWE-ReX without security review
```

```text
EXTERNAL_MECHANISM: HistoryProcessor stack (M05)
PROBLEM_SOLVED: context window / prompt cache control
OUR_CURRENT_MECHANISM: Knowledge/RAG partial; episodic mem; no equivalent processor pipeline OBSERVED in baseline
EQUIVALENCE: PARTIAL / UNKNOWN (needs CursorSKILLS audit)
GAP: explicit observation truncation & tool-output shaping policies
DECISION: ADAPT
```

```text
EXTERNAL_MECHANISM: Lint-on-edit + summarized search + 100-line viewer (M06–M08)
PROBLEM_SOLVED: reduce edit/search failure modes (MEASURED on Lite)
OUR_CURRENT_MECHANISM: editor/search via host IDE agent tools (different UX)
EQUIVALENCE: PARTIAL
GAP: principled ACI metrics for our tool feedback
DECISION: ADAPT (principles); DEFER reimplementing classic windowed ACI if host tools already superior
```

```text
EXTERNAL_MECHANISM: Trajectory + preds.json + SWE-bench batch (M10/M16)
PROBLEM_SOLVED: reproducible coding-agent evaluation
OUR_CURRENT_MECHANISM: skill evals JSON; gaabwiki pytest — PARTIAL
EQUIVALENCE: PARTIAL
GAP: no SWE-bench-class harness in baseline
DECISION: DEFER (eval product choice) / ADAPT (traj as evidence artifact)
```

```text
EXTERNAL_MECHANISM: EnIGMA offensive CTF ACI
PROBLEM_SOLVED: interactive debugger tools for CTF
OUR_CURRENT_MECHANISM: n/a
EQUIVALENCE: NONE
GAP: n/a (out of scope / policy)
DECISION: REJECT for MegaBrain Agent System
```

---

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| ACI design principles (concise feedback, guardrails, window sizing) | ADAPT | HIGH |
| Tool-bundle packaging pattern | ADAPT | MEDIUM |
| Full SWE-agent 1.x stack as product dependency | DEFER / REJECT (maintenance-only; mini preferred upstream) | HIGH |
| SWE-ReX-like sandbox abstraction | PROTOTYPE | MEDIUM |
| History processors | ADAPT | MEDIUM |
| Cost/time limits + autosubmit | ADAPT | HIGH |
| Demonstration trajectories | ADAPT | MEDIUM |
| Retry/reviewer ensemble | DEFER | LOW–MEDIUM |
| Unconstrained bash agency as default MegaBrain policy | REJECT | HIGH |
| EnIGMA offensive tooling | REJECT | HIGH |
| SWE-bench as MegaBrain SSOT eval | DEFER | MEDIUM |

---

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

```text
CONFLICT:
  claim: resolve rate on full SWE-bench (paper-era GPT-4 Turbo)
  source_a: NeurIPS/arXiv paper → 12.47% (286/2294) MEASURED-in-paper
  source_b: docs/background/index.md → "12.29%" DOCUMENTED
  difference: 0.18 pp absolute
  resolution: UNRESOLVED — prefer paper for MEASURED historical claim; treat docs % as stale/rounded DOCUMENTED
```

```text
CONFLICT:
  claim: "SoTA" SWE-bench verified/full with SWE-agent 1.0 + Claude 3.7
  source_a: README news bullets (Twitter links) DOCUMENTED marketing/news
  source_b: independent exact % on official leaderboard for that config
  difference: exact resolve % not verified in this investigation
  resolution: UNKNOWN for MEASURED %; keep as DOCUMENTED claim only
```

---

## 9. Sources

1. https://github.com/SWE-agent/SWE-agent (README, tree, raw sources)
2. https://swe-agent.com/latest/ (architecture, ACI, config, tools, batch, FAQ, hello world)
3. https://swe-rex.com/
4. https://mini-swe-agent.com/latest/faq/ (successor contrast)
5. arXiv:2405.15793 / NeurIPS 2024 PDF text extract
6. Package files: `sweagent/agent/agents.py`, `history_processors.py`, `environment/swe_env.py`, `tools/tools.py`, `config/default.yaml`, `pyproject.toml`
7. Baseline: `research/OUR-SYSTEM-BASELINE.md`

---

## 10. Handoff

- Para `agent-authoring`: considerar ADAPT de (a) observation shaping / empty-output policy, (b) lint-or-syntax gate before accepting edits, (c) cost/step exit with artifact salvage (patch/diff), (d) traj as Evidence-shaped record — **sem** copiar stack SWE-agent.
- Para `architect` / `adr`: PROTOTYPE sandbox provider (SWE-ReX-like) vs Cursor-native execution; DEFER SWE-bench harness unless eval roadmap demands it.
- **Não implementado nesta skill.**

### Benchmark claims (epistemic firewall)

| Claim | Label |
|-------|-------|
| Paper: 12.47% full SWE-bench, 18.00% Lite, GPT-4 Turbo; HumanEvalFix Python 87.7% pass@1 | MEASURED (paper tables) |
| Docs site background: 12.29% full | DOCUMENTED (conflicts with paper) |
| Ablations Lite: linting 18.0 vs 15.0; search summarized 18.0 vs iterative 12.0; viewer 100 lines 18.0 vs full 12.7 | MEASURED (paper Table 3) |
| Shell-only 11.00% Lite GPT-4 Turbo | MEASURED (paper) |
| Mini-SWE-Agent “65% SWE-bench verified” (news) | DOCUMENTED (README/news); not re-measured here; **not** SWE-agent 1.x |
| SWE-agent 1.0 + Claude 3.7 “SoTA” | DOCUMENTED (news); exact % UNKNOWN here |
| EnIGMA 13.5% NYU CTF | DOCUMENTED (project overview); separate paper |

---

## Adversarial summary (see also `ADVERSARIAL-REVIEW.md`)

Strongest transferable insight is **interface design for LMs** (ACI), backed by ablations — not the longevity of the SWE-agent codebase (now superseded). MegaBrain should **not** import unconstrained shell loops; should **adapt** guardrails, observation hygiene, sandboxing, and traj/evidence salvage. Several “SoTA” headlines are **DOCUMENTED news**, not re-verified MEASURED numbers in this pass.
