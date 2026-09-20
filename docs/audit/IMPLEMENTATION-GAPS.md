# IMPLEMENTATION-GAPS

**Date:** 2026-09-18

## A. REAL GAP

| Gap | Severity | Notes |
|-----|----------|-------|
| `orchestrator/src/jobs/` missing from CursorSKILLS tree | CRITICAL | Imports present; sibling AGENTS tree has modules |
| OS sandbox / refuse-if-unenforceable | HIGH | Only path confinement + authority flags |
| Model / LLM routing | HIGH (if claimed) | Provider strategy ≠ model routing |
| Semantic stuck detector | MEDIUM | Only maxIterations / deadlock reasons |
| Authority on Mock + CursorSkillProvider | HIGH | Deny can be bypassed on those providers |
| Context compaction / skill reinject | MEDIUM | No engine primitive |
| Skill catalog budget in EvolveLoop | MEDIUM | Host catalog; no orchestrator control |

## B. PARTIAL GAP

| Gap | Severity |
|-----|----------|
| Evidence: in-run OK; EvolveLoop FS bus separate; 2 validator tests failing | HIGH |
| Knowledge: filesystem store + external wiki | MEDIUM |
| HITL: confirm=fail; waiting=external job (when jobs present) | HIGH |
| Telemetry: events JSONL OK; summarizeExecutionTrace not in run() | MEDIUM |
| pause/resume/abort flags without CLI/tests | LOW–MEDIUM |
| DeterministicProvider not default in run-engine CLI | MEDIUM |

## C. FALSE GAP

| Seemed absent | Actually present | Evidence |
|---------------|------------------|----------|
| Capability IR | Present | `src/ir/`, tests |
| Registry selectWithEvidence | Present | `registry-client.ts` |
| PolicyEngine YAML | Present | `policies/`, tests |
| CapabilityAuthority | Present (deterministic path) | authority + deterministic tests |
| MemoryStore filesystem | Present | memory tests |
| CursorSkill / JobFileExecutor | Present | plugin source + unit tests |

## D. DOCUMENTATION GAP

| Topic | Issue |
|-------|-------|
| IMPLEMENTATION-STATUS “103 tests / jobs resume” | Not true for this incomplete tree |
| Evidence Bus docs | Describe EvolveLoop `memory/*/evidence/` not engine accumulation |
| “Agent System has Agents” | Markdown agents + capabilities; no Agent instance registry in engine |

## E. TEST GAP

| Area | Issue |
|------|-------|
| full-cycle / job-resume / job-pickup | Cannot load without jobs/ |
| evidence gate validator | 2 failures OBSERVED 2026-09-18 |
| hooks | No package tests |
| pause/resume/abort | No dedicated tests |
| summarizeExecutionTrace | Unit only; not integration with engine.run |

## F. OBSERVABILITY GAP

| Area | Issue |
|------|-------|
| Post-hoc run reconstruction | Partial via JSONL events if `--data-dir`; no automatic evidence dir dump from engine |
| Authority decisions | On deterministic path only; not all providers emit authority evidence |
| Skill PDA runs | Depend on Cursor session + memory/evidence convention; not engine RunResult |
