# ACTUAL-ARCHITECTURE

**Date:** 2026-09-18  
**Rule:** Only what was proven in code/tests on CursorSKILLS (plus noted sibling for missing jobs).

## Repository map (observed)

```text
CursorSKILLS/
├── orchestrator/          # @agents/orchestrator TypeScript Execution Engine
│   ├── src/{engine,scheduler,registry,policies,authority,evidence,
│   │         providers,plugins,executors,ir,graph,state,knowledge,
│   │         memory,persistence,telemetry,cli,contracts,discovery,…}
│   ├── src/jobs/          # ABSENT HERE — present in AGENTS/Cursor/orchestrator
│   ├── policies/*.yaml
│   ├── schemas/
│   ├── tests/
│   └── package.json
├── .cursor/skills/        # SKILL.md packages (MegaBrain / domain skills)
├── .cursor/hooks/         # Cursor hooks → run-jobs pickup (outside package)
├── Agents/                # Markdown agent prompts (not engine Agent class)
├── memory/                # MegaBrain feature memory (episodic/context; not jobs/)
├── docs/research/         # Prior reverse-engineering (claims)
└── docs/audit/            # This audit
```

## Proven execution path (Capability IR)

```text
CLI run-engine --ir plan.ir.yaml
        ↓
validateIR
        ↓
GraphStore + PolicyEngine.resolve
        ↓
Scheduler.readyNodes / schedule
        ↓
RegistryClient.selectWithEvidence
        ↓
ProviderRouter.get(provider).execute
   ┌────┴────────────────────────────┐
   │ MockProvider / SmartMock        │
   │ CursorSkillProvider             │
   │   └─ JobFileExecutor → JOB_PENDING
   │ DeterministicProvider           │
   │   └─ CapabilityAuthority.authorize
   │        deny → AUTHORITY_DENIED  │
   │        confirm → CONFIRMATION_REQUIRED
   └─────────────────────────────────┘
        ↓
processRunResult (evidence[], retries, knowledge/memory learns)
        ↓
RunResult { success, evidence, blocked_reason, … }
```

**Optional persistence (`--data-dir`):** JSONL events + `memory/{feature}/*.yaml` + knowledge md store.

**Not observed in engine:** Agent instance selection; MegaBrain `gate.testing.json` writer; OS sandbox; model router.

## Agent / Capability / Provider (observed semantics)

```text
Markdown Agent (Agents/*.md / skills)     # instruction package — host
        ≠
Capability node in Capability IR          # scheduled unit — engine
        ↓
ProviderManifest / Plugin                 # Mock | cursor-skill | deterministic
        ↓
Executor (SmartMock | JobFile | Callback | Deterministic ops)
```

## Dual Evidence worlds (observed)

| World | Location | Writer |
|-------|----------|--------|
| Engine Evidence | `RunResult.evidence[]` (+ builders) | ExecutionEngine / providers |
| Event telemetry | `{data-dir}/telemetry/events/*.jsonl` | JsonlEventPersister |
| MegaBrain Evidence Bus | `memory/<feature>/evidence/*.json` (skill convention) | orquestrar PDA / humans — **not** ExecutionEngine |

## Sibling note

Job checkpoint/resume implementation exists at:

`/home/gaab/Documentos/gitHub/AGENTS/Cursor/orchestrator/src/jobs/{job-store,job-pickup,job-resume,checkpoint}.ts`

**Not copied** into CursorSKILLS in this audit (read-only; no sync performed).
