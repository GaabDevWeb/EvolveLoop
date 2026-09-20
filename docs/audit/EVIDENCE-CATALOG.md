# EVIDENCE-CATALOG

**Date:** 2026-09-18

```yaml
evidence:
  - id: EA-0001
    claim: "ExecutionEngine.run implements Capability IR orchestration loop"
    status: PARTIALLY_IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/engine/execution-engine.ts
    symbol: ExecutionEngine.run
    lines: "59, 100"
    execution_evidence: "Source OBSERVED; full-cycle blocked by missing jobs/"
    test_evidence: "ir/registry/policy unit PASS; full-cycle FAIL load"
    confidence: HIGH
    notes: "Import of JobStore at lines 36-38 requires missing module"

  - id: EA-0002
    claim: "RegistryClient.selectWithEvidence performs capability→provider selection"
    status: IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/registry/registry-client.ts
    symbol: selectWithEvidence
    lines: "63"
    execution_evidence: "Called from execution-engine.ts:416,441"
    test_evidence: "tests/unit/registry.test.ts PASSED"
    confidence: HIGH
    notes: ""

  - id: EA-0003
    claim: "src/jobs/ is required by engine but ABSENT in CursorSKILLS tree"
    status: DEAD_OR_UNREACHABLE
    source_type: COMMAND_OUTPUT
    path: orchestrator/src/jobs
    symbol: null
    lines: null
    execution_evidence: "ls ENOENT; vitest full-cycle Failed to load url ../jobs/job-store.js"
    test_evidence: "job-resume/job-pickup cannot run"
    confidence: HIGH
    notes: "Sibling AGENTS/Cursor/orchestrator/src/jobs has 4 files OBSERVED"

  - id: EA-0004
    claim: "PolicyEngine resolves ExecutionPolicy and can skip gates"
    status: IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/policies/policy-engine.ts
    symbol: PolicyEngine
    lines: null
    execution_evidence: "Scheduler uses gateEnabled"
    test_evidence: "tests/unit/policy-engine.test.ts PASSED (6)"
    confidence: HIGH
    notes: "Decision/scheduling — not side-effect deny"

  - id: EA-0005
    claim: "CapabilityAuthority deny blocks DeterministicProvider"
    status: IMPLEMENTED
    source_type: TEST
    path: orchestrator/src/providers/deterministic/index.ts
    symbol: AUTHORITY_DENIED
    lines: "184, 197"
    execution_evidence: "authorize() then fail on deny"
    test_evidence: "authority.test.ts + deterministic-capabilities.test.ts PASSED"
    confidence: HIGH
    notes: "NOT wired to Mock/CursorSkill"

  - id: EA-0006
    claim: "Evidence validators exist but gate artefact tests currently fail"
    status: PARTIALLY_IMPLEMENTED
    source_type: TEST
    path: orchestrator/tests/unit/evidence.test.ts
    symbol: validateEvidence
    lines: "40, 49"
    execution_evidence: "2 FAILED assertions 2026-09-18"
    test_evidence: "same"
    confidence: HIGH
    notes: "DOCUMENTED vs behavior drift"

  - id: EA-0007
    claim: "MegaBrain Evidence Bus FS path is not written by ExecutionEngine"
    status: DOCUMENTED_ONLY
    source_type: SOURCE
    path: orchestrator/src/persistence/paths.ts
    symbol: DataPaths.memoryDir
    lines: null
    execution_evidence: "memory layout preferences/decisions/context — no evidence/ subdir in engine paths"
    test_evidence: "persistence tests cover memory yaml not gate JSON"
    confidence: HIGH
    notes: "Skill docs describe memory/*/evidence/"

  - id: EA-0008
    claim: "SKILL.md packages exist under .cursor/skills"
    status: IMPLEMENTED
    source_type: SOURCE
    path: .cursor/skills/
    symbol: null
    lines: null
    execution_evidence: "directory listing OBSERVED"
    test_evidence: "NO_TEST at package level for all skills"
    confidence: HIGH
    notes: "Not engine Agent registry"

  - id: EA-0009
    claim: "KnowledgeStore + optional wiki search exist"
    status: PARTIALLY_IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/knowledge/; providers/deterministic/knowledge.ts
    symbol: FilesystemKnowledgeStore / knowledgeSearch
    lines: null
    execution_evidence: "deterministic knowledge UNAVAILABLE path tested"
    test_evidence: "knowledge-memory.test.ts"
    confidence: MEDIUM
    notes: ""

  - id: EA-0010
    claim: "CursorSkillProvider and JobFileExecutor are implemented"
    status: IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/plugins/cursor-skill-provider.ts
    symbol: JobFileExecutor / JOB_PENDING
    lines: "39"
    execution_evidence: "code OBSERVED"
    test_evidence: "cursor-skill-provider unit tests (when loadable)"
    confidence: HIGH
    notes: "Resume path needs jobs/"

  - id: EA-0011
    claim: "No ModelRouter / MCP transport in orchestrator"
    status: NOT_IMPLEMENTED
    source_type: INFERENCE
    path: orchestrator/src
    symbol: null
    lines: null
    execution_evidence: "rg finds no ModelRouter; MCP not in package"
    test_evidence: "NO_TEST"
    confidence: HIGH
    notes: "CONFIRMS research REJECT reimplement MCP"

  - id: EA-0012
    claim: "No OS sandbox; shell uses spawn shell:true"
    status: NOT_IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/providers/deterministic/
    symbol: shellExecute
    lines: null
    execution_evidence: "SmartMock sandbox:false; authority path checks only"
    test_evidence: "path escape tests PASS"
    confidence: HIGH
    notes: ""

  - id: EA-0013
    claim: "Stuck detection is maxIterations only"
    status: PARTIALLY_IMPLEMENTED
    source_type: SOURCE
    path: orchestrator/src/engine/execution-engine.ts
    symbol: maxIterations
    lines: null
    execution_evidence: "blocked_reason includes max_iterations"
    test_evidence: "NO dedicated stuck test"
    confidence: HIGH
    notes: ""

  - id: EA-0014
    claim: "HITL durable resume not proven on this tree"
    status: DEAD_OR_UNREACHABLE
    source_type: COMMAND_OUTPUT
    path: orchestrator/src/jobs
    symbol: checkpoint
    lines: null
    execution_evidence: "module missing; confirm fails fast without wait loop"
    test_evidence: "job-resume unloadable"
    confidence: HIGH
    notes: "Blocks E-005"
```
