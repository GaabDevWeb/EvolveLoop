# PT-001 — Live host skill catalog budget measurement

## Status

HARDENED_PENDING_GATE

## Decision Context

- ADR-DR-0002 ACCEPTED: DEFER production skill budget; KEEP runtime unchanged  
- Prior gate: NEEDS_MORE_EVIDENCE (missing rollback / isolation)  
- Related decision matrix: DR-003  
- Related future experiment: E-001-LIVE  
- `prototype_success ≠ production_adoption`  
- `prototype_failure ≠ global_rejection`  

## Question

Does **controlled live host catalog size/truncation** change **live skill activation** and **live task_success** relative to a full-catalog CONTROL, without modifying orchestrator catalog APIs?

## Hypothesis

Under live host injection conditions, smaller catalogs (and/or description truncation) improve activation precision/recall and reduce context volume **without reducing live task_success** versus CONTROL.

## Scope

| Item | Bound |
|------|--------|
| Surface | Host/Cursor catalog injection only |
| Engine | **No** `max_skills` / budget field in `orchestrator/src` |
| Catalog | Existing `.cursor/skills` packages (read-only sources) |
| Comparison | CONTROL (full) vs treatments aligned with E-001 sizes where feasible |
| Duration | Single gated experiment campaign; ephemeral workspace |

## Non-Goals

- Implementing production `max_skills`  
- Claiming vendor-token cost savings without declared tokenizer policy  
- Modifying baseline, source Skills, or orchestrator semantics  
- Ranking external frameworks  

## Preconditions

- ADR-DR-0002 ACCEPTED  
- Offline E-001 complete (decision input only)  
- Ability to control live catalog injection **or** explicit BLOCKED if host cannot  
- Documented tokenizer policy: vendor API **or** accepted PROXY labeled as PROXY  
- Writable ephemeral workspace outside baseline / source Skills  

## Experimental Surface

Host skill-discovery / catalog prefix presentation path only. Not ExecutionEngine Capability IR.

## Inputs

- Task corpus: prefer live tasks with gold skill labels; if unavailable, document gap and do not invent labels  
- Catalog subsets: deterministic seed (document seed); prefer same seed family as E-001 when applicable  
- Tokenizer policy document (required before run)

## Control

Full available catalog descriptions (host analogue of E-001 CONTROL), same tasks, same model/provider settings when controllable.

## Treatment

At least one of:

- Reduced catalog size (e.g. N=5 and/or N=10)  
- Description truncation budget  

Exact N must be feasible given host inventory; if inventory insufficient → NEEDS_MORE_EVIDENCE / BLOCKED, do not fabricate skills.

## Measurements

| Metric | Unit | Source | Collection | Classification | Interpretation |
|--------|------|--------|------------|----------------|----------------|
| catalog_size | skills | host injection manifest | count IDs | DIRECT | IV check |
| skills_available | skills | same | count | DIRECT | ≠ activated |
| skills_activated | skill_id | host/selection log | recorded selection | DIRECT if log exists else NOT_MEASURED |
| live_task_success | ratio | task harness | pass/fail rubric | DIRECT (required) |
| token_estimate_or_vendor | tokens | tokenizer policy | count | PROXY or MEASURED per policy | never silently upgrade PROXY |
| wall_clock_duration | s | harness clock | OBSERVED LATENCY | DIRECT | not product benchmark |

Expected ranges: document CONTROL baselines from first dry calibration run; treatments compared as deltas — no “works well.”

## Success Criteria

Observable **all** of:

1. Live catalog injection controlled and fingerprint recorded per condition  
2. `live_task_success` MEASURED for CONTROL and each TREATMENT  
3. Tokenizer policy declared (vendor or labeled PROXY)  
4. Activation/selection recorded when host exposes it; else explicitly NOT_MEASURED (does not alone fail if task_success measured — but document observability gap)  
5. No modification of `orchestrator/src/**`, `.cursor/skills/**` sources, or `docs/evals/baseline/**`  
6. Rollback verification PASS  

## Failure Criteria

| Class | Condition |
|-------|-----------|
| functional failure | Host cannot control catalog → campaign BLOCKED |
| measurement failure | Cannot measure live_task_success |
| isolation violation | Writes detected under `.cursor/skills`, `orchestrator/src`, or baseline |
| rollback failure | Ephemeral workspace / host config not restored |
| unexpected side effect | Engine gains budget API or Skills mutated |
| baseline contamination | Baseline files or checksums change |

## Safety Constraints

- PRODUCTION_STATUS: NOT_IMPLEMENTED  
- execution_authorized: false until Prototype Gate APPROVED*  
- Offline E-001 alone insufficient to start engine feature  

## Isolation

```yaml
isolation:
  runtime_isolation: "No orchestrator/src changes; no engine budget feature"
  filesystem_isolation: "Ephemeral workspace under docs/architecture/finalization/prototypes/workspaces/PT-001/ (or /tmp/pt-001-*); source Skills read-only"
  network_isolation: "NOT_REQUIRED for catalog shaping; if live model calls needed, document provider and forbid new analytics sinks"
  state_isolation: "No writes to baseline, production jobsDir defaults, or shared memory SSOT"
  process_isolation: "Dedicated process/session for campaign; do not reuse production data-dir"
  data_isolation: "All manifests/metrics under ephemeral path; promote only redacted evidence copies"
```

Do not claim stronger isolation than provided.

## Rollback

```yaml
rollback:
  strategy: "Delete ephemeral workspace; restore any temporary host catalog pointer/env to pre-run snapshot"
  scope: "Ephemeral files + host config pointers only — never baseline/skills/orchestrator"
  verification: "Hash snapshot of .cursor/skills/**/SKILL.md and docs/evals/baseline checksums equal pre-run; env pointer restored"
  failure_handling: "STOP campaign; mark INVALID; do not continue treatments; escalate contamination"
```

## Cleanup

- Remove ephemeral workspace after evidence promotion  
- Retain only redacted metrics/manifests under `docs/evals/experiments/` **if and when** a future experiment runner phase authorizes; until then keep under finalization evidence draft area  
- Do not edit historical E-001 raw  

## Data Handling

| Data | Lives | Survives | Deleted |
|------|-------|----------|---------|
| Catalog fingerprints | ephemeral | promote as evidence | ephemeral copies |
| Task transcripts | ephemeral | redacted excerpts only | raw PII if any |
| Source Skills | read-only | unchanged | n/a |

## Runtime Boundaries

- Must not add `max_skills` to engine  
- Must not alter Capability Registry / Provider semantics  
- Host injection adapters only, disposable  

## Must Not Change

- `orchestrator/src/**`  
- `.cursor/skills/**` (sources)  
- `docs/evals/baseline/**`  
- ADR-DR-0002 decision (DEFER production budget)  

## Reproducibility

Record: seed, skill_ids, fingerprints, tokenizer policy, task set fingerprint, host version, model/provider ids (no secrets).

## Evaluation

Compare CONTROL vs TREATMENT on live_task_success and available activation metrics. Do not call PROXY tokens “exact.”

## Expected Evidence

- Per-condition catalogs + fingerprints  
- live_task_success table  
- Isolation/rollback verification logs  
- Explicit NOT_MEASURED list  

## Known Limitations

- Host may not allow catalog control → BLOCKED  
- Live variance may exceed offline determinism  
- Sample may be INITIAL only  

## Open Questions

- Exact host injection API available?  
- Gold labels for live tasks?  

## Related ADRs

ADR-DR-0002

## Related Experiments

E-001 (offline); E-001-LIVE

## Prototype Gate Readiness

| Dimension | Assessment |
|-----------|------------|
| Question | clear |
| Hypothesis | clear |
| Scope | bounded |
| Success | measurable |
| Failure | defined |
| Isolation | adequate (declared honestly) |
| Rollback | defined |
| Measurement | adequate |
| Baseline protection | yes |
| Runtime contamination risk | low (if must_not_change enforced) |

## Hardening Decision

```text
READY_FOR_GATE
```

Not APPROVED. Next Prototype Gate decides APPROVED / APPROVED_WITH_CONSTRAINTS / NEEDS_MORE_EVIDENCE.
