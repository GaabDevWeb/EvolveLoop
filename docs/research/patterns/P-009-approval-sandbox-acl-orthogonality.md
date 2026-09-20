# P-009 — Approval × sandbox × tool-ACL orthogonality

```text
PATTERN
Observed in: codex approval ⊕ OS sandbox ⊕ profiles (clearest); partial echoes in claude permissions, roo HITL matrix, openhands confirmation (EXTERNAL)
Differences:
  - OS-enforced sandbox (seatbelt/Docker/SWE-ReX) vs UX approval vs tool-group ACL — often mislabeled as one “permissions” feature
Common mechanism: Separate axes — (a) who may approve, (b) what OS allows, (c) which tool groups a mode/role may call — compose rather than collapse
Why it appears repeatedly: Safety requires defense in depth; single soft gate fails
Evidence: CROSS-INVESTIGATION-REVIEW §1.3, §7.1; CROSS matrix “Approval ⊕ sandbox duality”
Applicability: Baseline sandbox UNKNOWN–PARTIAL — PROTOTYPE OS sandbox after audit; ADAPT orthogonality into Policy design; not yet a Principle
Decision: PROTOTYPE (sandbox) | ADAPT (orthogonality model)
Confidence: MEDIUM (pattern) / LOW–MEDIUM as Principle (blocked on audit)
Supports Principle: related PRINCIPLE-03 (Policy SSOT) — sandbox depth deferred
```
