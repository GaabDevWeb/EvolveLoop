# Implementation Audit — Executive Report

**Date:** 2026-09-18  
**Auditor:** Implementation Auditor  
**System under audit:** CursorSKILLS Agent System (`@agents/orchestrator` + `.cursor/skills` + MegaBrain skill contracts)  
**Code root:** `/home/gaab/Downloads/CursorSKILLS`  
**Research input:** `docs/research/*` (decisions treated as claims, not proof)  
**Constraint:** no Agent System source changes; audit docs only; `npm ci` used solely to run existing tests

---

## Executive Summary

The **Capability IR → Scheduler → Registry → Provider → Evidence accumulation** pipeline is **real code** with **unit/contract test evidence**. Several research-era `ALREADY_PRESENT` claims are **fragile**:

1. **This workspace’s orchestrator tree is incomplete:** `src/jobs/` is **missing**, while `ExecutionEngine`, CLIs, and tests import it. Sibling tree `AGENTS/Cursor/orchestrator/src/jobs/` has the four modules. **Full-cycle integration tests cannot load** here.
2. **MegaBrain “Evidence Bus” (`memory/<feature>/evidence/*.json`)** is primarily a **skill/orchestrator-process convention**, not the same primitive as in-engine `Evidence[]` + `telemetry/events/*.jsonl`.
3. **CapabilityAuthority deny/confirm enforcement** is proven on **DeterministicProvider only**; Mock/CursorSkill/JobFile paths do **not** call it.
4. **OS sandbox** is **not** implemented; path confinement + authority flags ≠ sandbox.
5. **Model routing** and **stuck detector** (semantic) are **NOT_IMPLEMENTED** / bound-only.

Measured test slice (2026-09-18): **43 passed / 2 failed** (evidence validator drift) among selected unit tests; **contract-prototype 7/7 passed**; **full-cycle FAIL** (missing `jobs/`).

---

## What Is Actually Implemented

| Primitive | Status | Proof sketch |
|-----------|--------|--------------|
| Capability IR + validateIR | IMPLEMENTED | `src/ir/`, `tests/unit/ir.test.ts` |
| Graph + Scheduler | IMPLEMENTED | `src/graph/`, `src/scheduler/` |
| Capability Registry + selectWithEvidence | IMPLEMENTED | `registry-client.ts:63`, registry tests |
| ProviderRouter + Mock/SmartMock | IMPLEMENTED | `providers/`, `executors/` |
| CursorSkillProvider + JobFileExecutor | IMPLEMENTED | `plugins/cursor-skill-provider.ts` |
| DeterministicProvider + CapabilityAuthority | IMPLEMENTED | deny → `AUTHORITY_DENIED` (tests) |
| ExecutionPolicy (gates/retries/strategy) | IMPLEMENTED | `policy-engine.ts` + YAML policies |
| Evidence builders/validators (in-run) | PARTIALLY_IMPLEMENTED | builders + tests; 2 evidence tests failing |
| Filesystem MemoryStore | IMPLEMENTED | `memory/` + tests |
| Filesystem KnowledgeStore + wiki search cap | PARTIALLY_IMPLEMENTED | store + deterministic knowledge.* |
| MetricsAccumulator / JSONL events | IMPLEMENTED | persistence tests |
| Skills as SKILL.md packages | IMPLEMENTED | `.cursor/skills/**` (host-loaded; not Orchestrator Agent class) |
| Cursor hooks → run-jobs pickup | PARTIALLY_IMPLEMENTED | `.cursor/hooks*` outside package |

---

## What Is Only Documented

| Claim | Where documented | Code reality |
|-------|------------------|--------------|
| MegaBrain Evidence Bus as engine FS bus | `orquestrar` references/evidence-bus.md | Engine does **not** write `memory/*/evidence/gate.*.json` |
| Full pause/resume product UX | IMPLEMENTATION-STATUS / research HITL | `pause()`/`resume()` flags exist; no CLI/tests; job resume module **missing here** |
| 103 tests green / jobs resume | IMPLEMENTATION-STATUS.md | Not reproducible on this tree without `src/jobs/` |
| Agent Registry as executable Agent objects | architecture docs / Agents/*.md | Agents are Markdown prompts; engine schedules **capabilities**, not Agent instances |

---

## What Is Partial

- Policy **decision** (ExecutionPolicy) vs Authority **enforcement** (only deterministic path)
- JOB_PENDING → waiting (engine code present; job store/checkpoint **ABSENT in this tree**)
- Evidence: runtime array OK; gate artefact validation tests drifting; bus path split
- Knowledge: local store OK; RAG via external `wiki` subprocess
- Sandbox: path escape + confirm flags only
- HITL: confirm fails fast; external job pickup is the real wait path
- Telemetry: summarizeExecutionTrace **not** on hot path
- Stuck: `maxIterations=500` only

---

## What Could Not Be Proven

- End-to-end `run-engine` with job resume/checkpoint on **this** workspace tree  
- Authority enforcement on CursorSkillProvider path  
- OS-level sandbox  
- Model/LLM routing  
- Semantic stuck detection  
- Skill catalog token budgets inside MegaBrain (host concern)

---

## Fragile ALREADY_PRESENT Claims

See `FRAGILE-ALREADY-PRESENT.md`. Highest risk: treating **Evidence Bus**, **HITL RunState**, **Sandbox**, and **complete Orchestrator** as proven operational on this tree.

---

## Critical Implementation Gaps

| Gap | Severity |
|-----|----------|
| Missing `orchestrator/src/jobs/` in CursorSKILLS tree | CRITICAL (breaks engine import / full-cycle) |
| Authority not wired to Mock/CursorSkill providers | HIGH |
| No OS sandbox | HIGH (security primitive) |
| Evidence Bus dual-meaning (skill vs engine) | HIGH (false ASSURANCE) |
| Evidence validator tests failing | MEDIUM |
| summarizeExecutionTrace unused in engine.run | MEDIUM (observability) |

---

## Documentation Drift

See `DOCUMENTATION-DRIFT.md`. IMPLEMENTATION-STATUS claims jobs/resume/103 tests that this tree cannot satisfy as-is.

---

## Test/Evidence Gaps

| Area | Gap |
|------|-----|
| Jobs/checkpoint | Module missing → tests unloadable |
| Evidence gate artefacts | 2 unit failures OBSERVED |
| Hooks | No automated tests |
| pause/resume/abort | No dedicated tests |
| Model routing | N/A |

---

## Experiment Readiness

See `EXPERIMENT-READINESS.md`. E-001 mostly host-blocked; E-002/E-003 blocked by missing primitives; E-005 blocked by missing `jobs/` here; E-004 blocked (no compaction).

---

## Architectural Implications (factual)

1. Research `ALREADY_PRESENT` for **Capability/Provider/Orchestrator core loop** is **largely confirmed** in source + unit tests — **CONFIRMS** DO-NOT-CHANGE on registries/runtime *conceptually*.
2. Research assumptions about **Evidence Bus = MegaBrain JSON gates** and **HITL = durable RunState** are **WEAKened** by split implementations and missing jobs module.
3. Syncing or restoring `src/jobs/` is a **prerequisite** before claiming PROVEN resume/HITL experiments on this package copy.
4. Next phase must treat **Authority coverage** and **sandbox** as implementation workstreams, not documentation polish.

---

## Recommended Next Investigation

1. Diff/sync `src/jobs/` from `AGENTS/Cursor/orchestrator` (or document intentional split).  
2. Re-run full `npm test` after sync.  
3. Trace one real `run-engine` with `--jobs-dir` + DeterministicProvider authority.  
4. Map MegaBrain skill Evidence Bus writers (orquestrar PDA) vs engine evidence types.  
5. Only then authorize E-005 / sandbox prototypes.
