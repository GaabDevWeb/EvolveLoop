# Runtime Baseline

## Baseline Identity

```yaml
id: baseline-v1-2026-09-18
version: V1
created_at: "2026-09-18T23:29:22Z"
measured_at: "2026-09-18T23:29:33Z"
repository: CursorSKILLS
source_tree: /home/gaab/Downloads/CursorSKILLS
runtime_path: /home/gaab/Downloads/CursorSKILLS/orchestrator
package: "@agents/orchestrator@2.0.0"
prior_phases:
  - Implementation Audit
  - Repository Reconciliation
  - Controlled Runtime Sync (SYNC_SUCCESS_WITH_KNOWN_DRIFT)
```

## Source Revision

- Git: **ABSENT** (no `.git` on CursorSKILLS)
- Tree content fingerprint (sorted file hashes of `src`+`tests`+`policies`+`contracts`+`schemas`+package manifests+vitest/tsconfig):  
  `5600f9df2c99dde25771567faeaaa25d39c55575c046e36b55fb965149813795`
- Critical file SHA256: see `CRITICAL-FINGERPRINTS.sha256`
- Jobs module hashes match Runtime Sync audit (e.g. job-store `a4045771…`)

## Environment

| Item | Observed |
|------|----------|
| OS | Linux 6.12.88+deb13-amd64 (Debian) |
| Arch | x86_64 |
| Node | v24.15.0 |
| npm | 11.12.1 |
| Python | 3.13.5 (host; not required for orchestrator npm test) |
| TypeScript (tsc) | 5.9.3 (local toolchain); package.json `^5.7.0` |
| Vitest | 2.1.9 |
| Package manager | npm (lockfile present) |
| Sensitive env vars matched | none reported as PRESENT in scan |

## Runtime State

```yaml
runtime_baseline:
  load:
    status: PASS
    command: "npm test  # Vitest transforms/loads src including jobs"
    result: "27 files / 103 tests collected and executed"
    evidence: measurement-npm-test.log
  full_cycle:
    status: PASS
    command: "npx vitest run tests/integration/full-cycle.test.ts"
    result: "5 passed / 5"
    evidence: measurement-full-cycle.log
  jobs:
    status: OBSERVED
    command: "npx vitest run tests/integration/job-resume.test.ts tests/unit/job-pickup.test.ts"
    result: "5 passed / 5"
    evidence: measurement-jobs-tests.log
  resume:
    status: OBSERVED
    command: "tests/integration/job-resume.test.ts"
    result: "checkpoint + --resume path passes"
  pickup:
    status: OBSERVED
    command: "tests/unit/job-pickup.test.ts"
    result: "3/3"
  hitl:
    status: PARTIALLY_OBSERVED
    result: "external job pickup/complete/resume only; no full approval UX proven"
```

## Test State

```yaml
tests:
  command: npm test
  framework: vitest@2.1.9
  total: 103
  passed: 103
  failed: 0
  skipped: 0
  duration: "1.34s"
  test_files: 27
  named_cases_listed: 103  # TEST-NAMES.txt
```

## Contract State

```yaml
contracts:
  command: "npx vitest run tests/contracts/contract-prototype.test.ts"
  total: 7
  passed: 7
  failed: 0
  cases:
    - state machine allows valid node transitions
    - derives run state from nodes
    - planner emits planning evidence
    - scheduler emits scheduling evidence
    - registry emits selection evidence
    - worker evidence validates with confidence
    - smart mock executor supports cancel
```

## Full-Cycle State

```yaml
full_cycle:
  total: 5
  passed: 5
  failed: 0
  skipped: 0
  duration: "17ms tests / ~503ms wall"
  cases:
    - id: FC-1
      purpose: completes login dashboard feature end-to-end
      status: PASS
    - id: FC-2
      purpose: executes nodes in dependency order
      status: PASS
    - id: FC-3
      purpose: emits ProviderSelected events
      status: PASS
    - id: FC-4
      purpose: retries failed node and completes
      status: PASS
    - id: FC-5
      purpose: handles gate rejection with orchestrator corrigir flow
      status: PASS
```

## Core Mechanisms

| Mechanism | Status | Confidence |
|-----------|--------|------------|
| Agent (engine class) | NOT_IMPLEMENTED as engine object; host Markdown/skills EXIST | HIGH |
| Capability | IMPLEMENTED | HIGH |
| Provider | IMPLEMENTED | HIGH |
| Scheduler | IMPLEMENTED | HIGH |
| Registry | IMPLEMENTED | HIGH |
| Policy (ExecutionPolicy) | IMPLEMENTED | HIGH |
| Authority | PARTIALLY_IMPLEMENTED (Deterministic path) | HIGH |
| Evidence (engine) | IMPLEMENTED | HIGH |
| Knowledge | PARTIALLY_IMPLEMENTED / IMPLEMENTED store | MEDIUM–HIGH |
| Memory | IMPLEMENTED (FS store) | HIGH |
| Telemetry | PARTIALLY_IMPLEMENTED | MEDIUM |
| Validation | IMPLEMENTED (current rules) | HIGH |
| Jobs | IMPLEMENTED + OBSERVED | HIGH |
| RunState | IMPLEMENTED | HIGH |
| Resume | OBSERVED | HIGH |
| HITL | PARTIALLY_OBSERVED (jobs path) | HIGH |
| Sandbox | NOT_IMPLEMENTED | HIGH |
| Model routing | NOT_IMPLEMENTED | HIGH |
| Stuck detection (semantic) | NOT_IMPLEMENTED | HIGH |

## Evidence / Policy State

- Engine Evidence[] + builders/validators present; 3 evidence unit tests pass.
- MegaBrain Evidence Bus ≠ engine Evidence[] (unchanged).
- ExecutionPolicy evaluated in engine; CapabilityAuthority enforced on DeterministicProvider (allow/deny/confirm + shell/write/network flags).
- Path restriction / authority flags ≠ Sandbox.

## Jobs / RunState / Resume / HITL

- `src/jobs/` present (4 files) post Runtime Sync.
- JobStore / pickup / resume / checkpoint **exercised by tests** — not merely present on disk.
- RunState: derive + transitions OBSERVED in contract tests.
- HITL: job waiting + external complete + resume OBSERVED; product HITL incomplete.

## Build State

```yaml
build:
  command: npm run build  # tsc
  status: FAIL
  preexisting: true
  reproducible: true
  errors:
    - Duplicate identifier PolicyEngine (execution-engine.ts)
    - readonly EventEnvelope[] assignability
    - EvidenceFinding severity "info" vs union
    - unused execEvidence / unused Evidence import
    - read-only featureId assign in graph-store
  evidence: measurement-build.log
```

Vitest execution does not require successful `tsc` emit for the measured suites.

## Known Gaps

- Sandbox OS isolation
- Model routing
- Semantic stuck detection
- Gate artefact path validation
- Authority not on Mock/CursorSkill/JobFile paths
- `tsc` clean build

## Known Drift

- Docs (`ACTUAL-ARCHITECTURE.md` jobs ABSENT line) lag post-sync reality — baseline supersedes for jobs presence
- AGENTS vs CS: `run-jobs.ts` evidence guard delta remains
- Deferred aspirational evidence tests archived under runtime-sync, not in suite

## Performance Observations

```yaml
performance:
  kind: OBSERVED_BASELINE
  test_duration: "1.34s (npm test wall)"
  full_cycle_duration: "17ms test time / 503ms vitest wall"
  jobs_suites_duration: "172ms tests / 678ms wall"
```

Single-run measurements; not statistical benchmarks.

## Reproduction Procedure

See `REPRODUCE-BASELINE.md`.

## Integrity Manifest

See `BASELINE-MANIFEST.yaml` + `BASELINE-CHECKSUMS.sha256`.
