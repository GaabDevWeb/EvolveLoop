# UNKNOWNS — CrewAI TARGET_RESEARCH

**Date:** 2026-09-18  
**Rule:** Prefer `UNKNOWN` over invented internals. Resolve only with primary sources.

## Access limitations

- No package install / no runtime execution of CrewAI.
- No Enterprise / AMP / Visual Agent Builder backend inspection.
- GitHub `/commits` and some API list calls rate-limited or incomplete → **no pinned commit SHA**.
- `https://docs.crewai.com/llms.txt` fetch timed out once (partial doc crawl).
- Flow runtime is ~3988 LOC in a single `__init__.py` — only kickoff/API/decorators deeply read; full condition-evaluation / parallel-listen scheduling not exhaustively traced.

---

## UNKNOWN items

| ID | Question | Why unknown | How to resolve |
|----|----------|-------------|----------------|
| U01 | Exact Flow method scheduling (fairness, parallel `@listen`, router priority) | Large runtime not fully walked | Line-trace `flow/runtime/__init__.py` + tests under `lib/crewai/tests` |
| U02 | Default tracing behavior when `tracing=None` (env / login / grants) | Only saw flags + TraceGrantError import | Read `events/listeners/tracing/*` + `telemetry/tracing/grants` |
| U03 | What `share_crew=True` transmits (payload schema, endpoint) | Field docstring only | Trace telemetry emitters when flag true |
| U04 | Safe code-execution sandbox strength (Docker image, mounts, network) | Docs claim Docker; tool implementation not audited | Read code-execution tool in `crewai` / `crewai-tools` |
| U05 | Memory storage durability defaults (path, retention, multi-process safety) | Unified Memory large; storage backends skimmed | Read `memory/storage/*` |
| U06 | Knowledge vector backend defaults vs Chroma dependency usage | Knowledge + rag packages not fully mapped | Trace `KnowledgeStorage` + rag factory |
| U07 | Whether hierarchical manager performs any automatic output QA beyond tools | Docs claim validation; code shows manager-as-executor | Dynamic tests + prompt inspection for manager i18n strings |
| U08 | Agent `max_iter` vs `AgentExecutor.max_iter` effective default after wiring | Field defaults differ (20 vs 25) | Trace `create_agent_executor` assignment + BaseAgent default |
| U09 | ConditionalTask / async_execution interaction edge cases | Partially seen in `_execute_tasks` | Read `tasks/conditional_task.py` + async tests |
| U10 | Training (`train`) / replay / checkpoint fork semantics completeness | Symbols present; not investigated | Dedicated pass on training_handler + checkpoint modules |
| U11 | A2A / experimental packages maturity | `a2a/`, `experimental/` present | Inventory + docs |
| U12 | Production cost claims (“cost-efficient”, token optimization) | Marketing on intro | MEASURED benchmarks only — none collected |
| U13 | MegaBrain hard iteration / tool-loop caps equivalence | Baseline marks Policy present but depth unverified | Audit CursorSKILLS orchestrator + orquestrar policy |

---

## CONFLICTS

```text
CONFLICT:
  claim: Crew memory model
  source_a: docs edge/concepts/crews attribute table — short-term, long-term, entity memory
  source_b: docs edge/concepts/memory + unified_memory.py — single unified Memory replacing those types
  difference: Taxonomy and API
  resolution: prefer_primary (code + current memory docs); treat crews table as stale
```

```text
CONFLICT:
  claim: Crew.cache default
  source_a: docs crews attributes — Defaults to True
  source_b: crew.py Field(default=False) opt-in description
  difference: Default enabled vs disabled
  resolution: prefer_primary (code OBSERVED False)
```

```text
CONFLICT:
  claim: Hierarchical process semantics
  source_a: docs — manager coordinates, delegates, validates outcomes before proceeding
  source_b: code — manager_agent executes every task; workers only via delegation tools
  difference: Validation gate vs tool-mediated execution
  resolution: prefer_primary (code); docs narrative UNRESOLVED as marketing gloss
```

```text
CONFLICT:
  claim: max_iter default
  source_a: docs agents — Default is 20
  source_b: AgentExecutor Field default=25
  difference: Numeric default
  resolution: UNRESOLVED until U08 wiring traced; do not assert a single default
```

```text
CONFLICT:
  claim: Project config style “recommended”
  source_a: docs crews — JSONC recommended for new crews
  source_b: docs agents v1.13 — YAML recommended
  difference: Scaffolding guidance across doc versions
  resolution: prefer newer edge/crews for scaffolding; note version skew
```

---

## Explicit non-claims

- Did **not** verify security posture of Enterprise product.
- Did **not** measure latency, token use, or quality vs LangGraph/OpenAI Agents/etc. (no rankings).
- Did **not** treat GitHub star count as architectural evidence.
