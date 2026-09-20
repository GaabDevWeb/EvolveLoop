# Harness Inventory

What already exists that experiments can reuse. No new harnesses created in triage.

## Package test harnesses (`orchestrator/tests`)

| Asset | Supports | Limitations |
|-------|----------|-------------|
| `integration/full-cycle.test.ts` | Pipeline smoke; invariant checks | Not catalog/sandbox/stuck/compact |
| `integration/job-resume.test.ts` | **E-005** control (wait-for-jobs, checkpoint resume) | No mutate duplicate; no OS kill |
| `unit/job-pickup.test.ts` | E-005 pickup prompts | Not full HITL UX |
| `unit/authority.test.ts` | E-002 **related** flag behavior | ≠ sandbox posture enum |
| `unit/deterministic-capabilities.test.ts` | Write/shell/path authority | Unsandboxed spawn; confirm fails fast |
| `unit/discovery.test.ts` | Skill/provider discovery | Not catalog budget injection |
| `unit/cursor-skill-provider.test.ts` | SKILL.md load / JOB_PENDING | Not catalog prefix metrics |
| `unit/execution-trace.test.ts` | Trace summary | Not compaction |
| `evals/engine-scenarios.test.ts` | Discovery / version blocks | Narrow |
| `fixtures/login-dashboard.*` | IR fixture for full-cycle | Not HITL mutate |
| `contracts/contract-prototype.test.ts` | RunState transitions | Invariant only |

## Runtime capabilities (not tests)

| Capability | Can support | Limitations |
|------------|-------------|-------------|
| `JobStore` / checkpoint / resume | E-005 | External complete required |
| `CursorSkillProvider` + JobFileExecutor | E-005 job path | Async human/agent complete |
| `DeterministicProvider` + `filesystem.write` | E-005 mutate counting | Confirm → fail, not wait |
| `assertWithinWorkspace` | E-002 path cases | Not OS isolation |
| `CapabilityAuthority` | Policy/auth experiments | Deterministic path only |
| `discoverAllManifests` | E-001 skill enumeration | Manifest discovery ≠ LLM catalog |
| `summarizeExecutionTrace` | Observability | Not compaction reinject |
| `maxIterations=500` | Operational stop characterization | Not semantic stuck |
| MemoryStore / KnowledgeStore | Persistence | ≠ compaction |

## Host / skill packages

| Asset | Supports | Limitations |
|-------|----------|-------------|
| `.cursor/skills/**/SKILL.md` | E-001 corpus | Host injection uncontrolled |
| `*/evals/evals.json`, `trigger-eval-set.json` | E-001 offline activation labels | Not wired to orchestrator runner |
| `docs/evals/experiments/E-005/harness/` | E-005 resume metrics pattern | Temp copy pattern; mutate missing |

## Gaps relative to experiments

| Experiment | Missing from inventory |
|------------|------------------------|
| E-001 | Catalog subset injector + token/activation scorer |
| E-002 | Real sandbox / attestation (must not fake with inventory) |
| E-003 | Stuck detector; optional thrash transcript set |
| E-004 | Compact event source |
| E-005 | Mutate/duplicate fixture + optional OS-kill wrapper |

## Conclusion

Blockers for E-001 and E-005 completion are largely **reuse + new fixtures**, not missing core runtime. E-002/E-003/E-004 are **missing mechanisms**, not missing awareness of existing harnesses.
