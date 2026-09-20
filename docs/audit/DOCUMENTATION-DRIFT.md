# DOCUMENTATION-DRIFT

**Date:** 2026-09-18

```yaml
drift:
  - mechanism: Orchestrator jobs / checkpoint / resume
    documented_as: "JOB_PENDING → waiting; checkpoint; run-jobs; 103 tests (IMPLEMENTATION-STATUS.md)"
    actually: "Engine imports src/jobs/* but directory ABSENT in CursorSKILLS; full-cycle cannot load; sibling AGENTS tree has jobs/"
    severity: CRITICAL

  - mechanism: Evidence Bus
    documented_as: "memory/<feature>/evidence/ JSON gates required to continuar (orquestrar evidence-bus.md)"
    actually: "ExecutionEngine accumulates Evidence[] in memory; optional JSONL events under data-dir; does not implement MegaBrain gate file bus"
    severity: HIGH

  - mechanism: Policy Engine enforcement
    documented_as: "Policy autoriza / Policy Engine (research ALREADY_PRESENT)"
    actually: "ExecutionPolicy steers scheduling/retries/gates; CapabilityAuthority blocks only DeterministicProvider"
    severity: HIGH

  - mechanism: Sandbox
    documented_as: "UNKNOWN–PARTIAL / PROTOTYPE in research; some docs imply execution safety"
    actually: "No OS sandbox; shell.execute uses spawn({shell:true}); path escape checks only"
    severity: HIGH

  - mechanism: Agent model
    documented_as: "Agent decide · Capability faz (architectural lens)"
    actually: "Engine schedules capabilities; Agents/*.md are prompts; no Agent registry runtime"
    severity: MEDIUM

  - mechanism: Evidence validator gate artefacts
    documented_as: "Evidence validation (tests expected)"
    actually: "tests/unit/evidence.test.ts — 2 failures OBSERVED (artifact_path_missing expectation drift)"
    severity: MEDIUM

  - mechanism: Telemetry / execution trace
    documented_as: "summarizeExecutionTrace + replay (IMPLEMENTATION-STATUS F5)"
    actually: "Function exists and unit-tested; not invoked from ExecutionEngine.run"
    severity: MEDIUM

  - mechanism: Test count 103 passed
    documented_as: "AGENTS npm test 103 passed"
    actually: "Cannot reproduce full suite here; selected units 43 pass/2 fail; contracts 7 pass; full-cycle blocked"
    severity: HIGH

  - mechanism: HITL
    documented_as: "jobs waiting / confirm as HITL control flow"
    actually: "confirm returns fail immediately; durable wait depends on missing jobs module + external Cursor pickup"
    severity: HIGH
```
