# Architectural Blockers

Only blockers that require an architecture decision **before** implementation or enablement. Not every BLOCKED experiment appears here.

---

## Blocker A — Security enforceability / sandbox posture

### Experiment

E-002

### Missing Mechanism

OS (or equivalent) sandbox with detectable enforceability attestation; posture enum with refuse-unenforceable.

### Why Existing Runtime Is Insufficient

`allowShell` / `allowWrite` / `allowNetwork` and `assertWithinWorkspace` authorize/confine deterministic ops but do not isolate process, filesystem namespace, or network. Emitting `enforced_sandbox` from those signals would be false security (research forbids faking labels).

### Boundary Affected

Provider execution boundary; host vs engine responsibility for isolation.

### Authority Affected

CapabilityAuthority vs OS enforcement; who may claim “safe.”

### State Affected

RunResult/evidence labels for posture; mutating tool audit trail.

### Security Implications

False-safe labels increase risk more than leaving status UNKNOWN/NOT_IMPLEMENTED.

### What Decision Is Needed

Define: (1) what counts as enforced isolation; (2) refuse-when-unenforceable policy across providers; (3) whether engine or host owns attestation.

### What Must NOT Be Implemented Yet

Posture enum, refuse-unenforceable product behavior, or any “sandbox” label harness that only wraps existing flags.

---

## Blocker B — Definition of semantic stuck

### Experiment

E-003 (full detector form)

### Missing Mechanism

StuckDetector (signature window + progress delta) with false_stuck evaluation.

### Why Existing Runtime Is Insufficient

`maxIterations=500` is an operational ceiling, not a semantic judgment of thrash vs explore. Metrics `false_stuck_rate` are undefined without a detector and stuck definition.

### Boundary Affected

Engine loop control vs provider/tool loop; when to escalate/stop.

### Authority Affected

Who may force-stop a run (engine policy vs orchestrator human).

### State Affected

`blocked_reason`, run lifecycle, cost accounting.

### Security Implications

Indirect (premature stop vs runaway cost); mainly reliability/cost.

### What Decision Is Needed

Operational definition of stuck; acceptable false_stuck; relationship to retries and JOB_PENDING waits.

### What Must NOT Be Implemented Yet

StuckDetector product code; rebranding maxIterations as semantic detection.

---

## Blocker C — Compaction ownership and reinject

### Experiment

E-004

### Missing Mechanism

Context compaction event stream + Policy/skill reinject hook.

### Why Existing Runtime Is Insufficient

Checkpoint/Memory/Knowledge/trace summary do not compress host LLM context or fire compact events. Research baseline assumes host compaction; no hook exists to instrument.

### Boundary Affected

Host chat context vs orchestrator IR/state; skill instruction persistence.

### Authority Affected

Which constraints are mandatory post-compact.

### State Affected

Session context, skill pins, policy pins.

### Security Implications

Lost constraints after compact can drop safety/policy instructions.

### What Decision Is Needed

Where compaction lives (Cursor host vs engine); what must be reinjected; event contract.

### What Must NOT Be Implemented Yet

Ad-hoc “fake compact” by truncating strings inside orchestrator and calling it E-004.

---

## Blocker D — HITL semantic: confirm-wait vs jobs-wait (optional)

### Experiment

E-005 (only if product requires wait_approval = CapabilityAuthority confirm)

### Missing Mechanism

Confirm decision that **waits** for human then continues (today: fail `CONFIRMATION_REQUIRED`).

### Why Existing Runtime Is Insufficient

Jobs path already implements wait/resume. Confirm path fails fast. Research wording “wait_approval” is ambiguous across these two models.

### Boundary Affected

HITL SSOT: jobs external complete vs in-provider confirm loop.

### Authority Affected

CapabilityAuthority lifecycle.

### State Affected

Node `waiting` vs failed-confirm; checkpoint usage.

### Security Implications

Duplicate mutate risk depends on which gate serializes writes.

### What Decision Is Needed

Declare jobs-as-HITL SSOT **or** design confirm-wait. Until then, E-005 completion should use **jobs path** fixtures only.

### What Must NOT Be Implemented Yet

Confirm-wait loop “just for the experiment” without SSOT decision.
