# Architecture Baseline

**Baseline:** V1 (`baseline-v1-2026-09-18`)  
**Rule:** Document what exists, not what should exist.  
**Source:** Validated against CursorSKILLS/`orchestrator` after Controlled Runtime Sync + live measurements 2026-09-18T23:29Z.

## Scope

- Tree: `/home/gaab/Downloads/CursorSKILLS`
- Runtime package: `@agents/orchestrator@2.0.0` at `orchestrator/`
- Host packages: `.cursor/skills/`, `Agents/*.md`, hooks — observed as adjacent, not as engine Agent classes

## Runtime Pipeline

```text
CLI run-engine --ir
  → validateIR
  → GraphStore + PolicyEngine.resolve
  → Scheduler.readyNodes / schedule
  → RegistryClient.selectWithEvidence
  → ProviderRouter.execute
       Mock / SmartMock / CursorSkill(+JobFile→JOB_PENDING) / Deterministic(+Authority)
  → processRunResult (evidence, retries, optional memory/knowledge)
  → RunResult
```

Optional: `--jobs-dir`, `--resume`, `--wait-for-jobs`, `--data-dir` (JSONL telemetry + FS stores).

## Agent Model

- **Engine:** schedules **capabilities** (IR nodes), not Agent class instances.
- **Host:** `Agents/*.md` and `.cursor/skills/**/SKILL.md` are instruction packages.
- **Boundary:** Skill ≠ Agent ≠ Role (roles are docs/prompts).

## Capability Model

- Capability IR YAML validated in `src/ir/`.
- Nodes: worker / gate types with `definition_of_done`, dependencies.
- Status: IMPLEMENTED (unit + contract tests).

## Provider Model

- Registry of provider manifests + plugins: Mock, SmartMock, CursorSkill, Deterministic (+ shell alias).
- JobFileExecutor used when jobs-dir path engaged.
- Status: IMPLEMENTED for listed providers; browser.* not observed as complete product surface.

## Registry

- `RegistryClient.selectWithEvidence` emits selection evidence.
- Status: IMPLEMENTED (unit/contract).

## Scheduler

- Topological ready-node scheduling + scheduling evidence.
- Status: IMPLEMENTED.

## Policy / Authority

| Concern | Mechanism | Where |
|---------|-----------|-------|
| ExecutionPolicy | gates, retries, strategy YAML | `PolicyEngine` — decision |
| CapabilityAuthority | allow/deny/confirm + allowShell/Write/Network | `CapabilityAuthority` — enforcement on **DeterministicProvider** path |
| Mock/CursorSkill/JobFile | | Authority **not** observed wired on these paths (audit still holds) |

**Boundary:** Policy Decision ≠ Policy Enforcement.

## Evidence

| World | What | Writer |
|-------|------|--------|
| Engine Evidence[] | In-run structured Evidence docs | Engine / builders / validators |
| Telemetry JSONL | Event envelopes | JsonlEventPersister when `--data-dir` |
| MegaBrain Evidence Bus | `memory/<feature>/evidence/*.json` convention | Skills/host — **not** ExecutionEngine |

**Boundary:** Evidence ≠ Telemetry; MegaBrain Evidence Bus ≠ engine Evidence[].  
Gate artefact path enforcement (`artifact_path_missing`): **NOT_IMPLEMENTED** (deferred asserts archived in runtime-sync).

## Knowledge

- `FilesystemKnowledgeStore` + deterministic `knowledge.*` caps (incl. gaabwiki search path).
- **Boundary:** Knowledge ≠ Memory ≠ Checkpoint.

## Memory

- `FilesystemMemoryStore` under data-dir feature paths.
- Distinct from jobs checkpoints and MegaBrain vault memory.

## Jobs

- `src/jobs/{job-store,job-pickup,job-resume,checkpoint}.ts` **present** (restored in Runtime Sync).
- FS SkillJob + result JSON; EngineCheckpoint under `jobsDir/checkpoints/`.
- Status: IMPLEMENTED + OBSERVED via tests (see Runtime Baseline).

## RunState

- `deriveRunState` / node transitions in `src/state/run-state.ts`.
- FeatureRunState derived from node statuses (active/blocked/completed/cancelled).
- Status: IMPLEMENTED (contract tests); not a separate durable product DB.

## Resume

- `--resume` + `loadCheckpoint` / `saveCheckpoint` / `clearCheckpoint`.
- Status: OBSERVED (`job-resume.test.ts`).

## HITL

- Observed: external job pickup (`job-pickup` / `run-jobs`) + waiting nodes + complete/resume.
- Not observed: full product approval UX, pause CLI productization.
- Status: PARTIALLY_IMPLEMENTED / OBSERVED (job path only).

## Telemetry

- `summarizeExecutionTrace` exists; JSONL event persistence when enabled.
- Hot-path always-on OTel-style export: not claimed.

## Validation

- Evidence validators (`validateEvidenceV21`), IR validation, schema validators, contract prototype suite.
- Status: IMPLEMENTED within current rules (no gate artefact path rule).

## Known Missing Primitives

- OS Sandbox (NOT_IMPLEMENTED) — flags/path checks ≠ sandbox
- Model routing (NOT_IMPLEMENTED)
- Semantic stuck detection (NOT_IMPLEMENTED) — only `maxIterations=500`
- Gate artefact path requirement (NOT_IMPLEMENTED)

## Known Drift

- `tsc` (`npm run build`) FAIL on this tree (same class of errors documented on AGENTS sibling) — Vitest runtime OK
- CursorSKILLS `run-jobs.ts` retains evidence-file guard vs AGENTS (legitimate delta)
- Documentation may still say AGENTS-only SSOT for 103 tests; this baseline measures CursorSKILLS post-sync at 103/103
- ACTUAL-ARCHITECTURE.md still notes jobs ABSENT in one line — **superseded by sync**; this baseline is authoritative for post-sync state
