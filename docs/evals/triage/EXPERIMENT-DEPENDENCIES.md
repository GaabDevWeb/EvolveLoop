# Experiment Dependency Graph

Verified against baseline V1 + orchestrator source (2026-09-18). Only edges supported by evidence.

```text
E-005  (completion)
 ├── EXISTING: Jobs / JobStore / checkpoint / job-resume / pickup
 ├── EXISTING: ExecutionEngine resume + wait_for_jobs
 ├── EXISTING: Deterministic filesystem.write (for mutate count)
 ├── GAP: mutate/duplicate FIXTURE + write OBSERVABILITY
 └── OPTIONAL ARCH: confirm-wait vs jobs-as-HITL SSOT
         (not required if fixture uses jobs wait path)

E-001  (enable offline)
 ├── EXISTING: .cursor/skills/**/SKILL.md + evals/*.json
 ├── EXISTING: provider-discovery scans skills (manifests; not catalog budget)
 ├── GAP: catalog CONTROL/TREATMENT HARNESS + token/activation OBSERVABILITY
 └── NOT REQUIRED: orchestrator max_skills primitive (research: no new runtime)

E-002  (remain blocked)
 ├── EXISTING: CapabilityAuthority allowShell/Write/Network
 ├── EXISTING: assertWithinWorkspace path confinement
 ├── MISSING: OS sandbox / enforceability attestation
 └── REQUIRES: ARCHITECTURAL security model decision
         └── then RUNTIME sandbox primitive
         └── then posture-label experiment
     (label-only path = DOES_NOT_PROVE_SANDBOX — do not enable)

E-003  (full detector — remain blocked)
 ├── EXISTING: maxIterations=500 operational stop
 ├── MISSING: semantic StuckDetector
 └── REQUIRES: ARCHITECTURAL definition of stuck
         └── then NEW_RUNTIME_PRIMITIVE
         └── then false_stuck metrics

E-003' (optional characterization — not full E-003)
 └── EXISTING: maxIterations + telemetry hooks
     └── MINIMAL thrash FIXTURE harness only
         (must not be reported as detector SUPPORTED)

E-004  (remain blocked)
 ├── EXISTING: Memory / Knowledge / Checkpoint / execution-trace summary
 ├── NOT EQUIVALENT: those ≠ context compaction
 ├── MISSING: compact event + reinject hook
 └── REQUIRES: ARCHITECTURAL ownership (host vs engine)
         └── then RUNTIME compaction/reinject
         └── then survival metrics
```

## Independence

- E-001 offline harness does **not** depend on E-005.
- E-005 fixture completion does **not** unlock E-002/E-003/E-004.
- E-002/E-003/E-004 share no enablement path with harness-only experiments.
