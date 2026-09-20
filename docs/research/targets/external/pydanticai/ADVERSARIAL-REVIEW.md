# ADVERSARIAL-REVIEW — Pydantic AI

**Target:** pydanticai  
**Mode:** TARGET_RESEARCH  
**Date:** 2026-09-18  
**Reviewer:** same investigator (self-critique before handoff)

## Attacks attempted against this report

### 1. “Stars / FastAPI DX ⇒ adopt the framework”
**Attack:** Treat ~20k stars and FastAPI analogy as proof MegaBrain should run on Pydantic AI.  
**Defense:** Adoption factors isolated in REPORT §5; decision REJECT as runtime replacement. Popularity ≠ merit (evidence.md).  
**Status:** HELD.

### 2. “Structured output is unique — copy Evidence Bus”
**Attack:** Propose a second validation/evidence subsystem mirroring `output_type`.  
**Defense:** Evidence Bus ALREADY_PRESENT for artifact gates; decision ADAPT ModelRetry-style feedback into existing orchestration; REJECT parallel bus.  
**Status:** HELD.

### 3. “They have graphs — we need pydantic-graph”
**Attack:** Equate Task IR with missing typed graph → implement nail-gun graph runtime.  
**Defense:** Docs themselves warn against unnecessary graphs; baseline Task Graph IMPLEMENTED → ALREADY_PRESENT role + DEFER typed-edge DSL.  
**Status:** HELD.

### 4. “Invent how Temporal activities serialize deps”
**Attack:** Fill durable-exec internals for completeness.  
**Defense:** Marked UNKNOWN; only DOCUMENTED constraints (e.g. DynamicToolset IDs) cited.  
**Status:** HELD.

### 5. “Harness Coder == our coding agent — merge architectures”
**Attack:** Collapse Harness filesystem/shell/subagents into MegaBrain without separate research.  
**Defense:** Scope limited to core SDK; Harness flagged as follow-up; no implementation.  
**Status:** HELD (residual risk: README bias toward Harness under-weighted in mechanism table — accepted, logged in CONFLICTS).

### 6. “Logfire is required for real observability”
**Attack:** ADOPT Logfire SaaS as mandatory.  
**Defense:** Docs state OTel-native + optional Logfire; ADAPT portable OTel; REJECT mandatory Logfire.  
**Status:** HELD.

### 7. “deps_type is unused at runtime — so DI is fake”
**Attack:** Misread docs (“deps_type not used at runtime”) as absence of DI.  
**Defense:** Clarified: type parameter for checking; instance passed via `deps=` at run — DOCUMENTED.  
**Status:** HELD.

### 8. Overclaim OBSERVED
**Attack:** Label doc-derived architecture as OBSERVED code execution.  
**Defense:** Labels are DOCUMENTED / MEASURED (PyPI/GitHub meta); no local run.  
**Status:** HELD — residual: Context7 snippets may lag live docs; cross-checked with WebFetch of canonical pages.

### 9. Ranking / score temptation
**Attack:** Emit 0–10 vs LangGraph/CrewAI.  
**Defense:** None emitted; mechanism decisions only.  
**Status:** HELD.

### 10. Duplicate Provider Registry
**Attack:** “Create Model Profile Registry kind”.  
**Defense:** ADAPT flags into existing Provider Registry; no new kind.  
**Status:** HELD.

## Weakest claims (confidence already lowered)

| Claim | Weakness | Mitigation |
|-------|----------|------------|
| ALREADY_PRESENT for model abstraction | Field-level profile parity unaudited | ADAPT + UNKNOWN in UNKNOWNS |
| ADAPT deferred capabilities ≈ skills | Skill loading semantics differ | Confidence MEDIUM; needs skill-authoring review |
| DEFER durable | May undervalue if MegaBrain already plans long jobs | Explicit product gate |

## Checklist (skill close)

- [x] What/Why/How/Evidence/Cost/Fail/Alternatives or UNKNOWN
- [x] Epistemic labels on key claims
- [x] OUR_CURRENT_MECHANISM comparison
- [x] No Agent System implementation
- [x] No ranking / no invented internals
- [x] Decisions ∈ allowed set
- [x] Artifacts: REPORT.md, MECHANISMS.yaml, UNKNOWNS.md, ADVERSARIAL-REVIEW.md

## Verdict

Research is **fit for handoff** as Level-1 TARGET_RESEARCH with explicit UNKNOWNs. Highest-value transfers are **validation/retry budgets**, **typed run-context DI**, **provider capability profiles**, and **OTel span taxonomy** — all as ADAPT into existing MegaBrain contracts, not as framework adoption.
