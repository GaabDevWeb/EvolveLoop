# AP-005 — Uncontrolled auto-approve / authority

```yaml
id: ANTI-005
title: Uncontrolled auto-approve
problem: Speed settings grant shell/FS/MCP without enforceable bounds.
anti_pattern: Auto-approve matrices or YOLO defaults that equate convenience with safety.
observed_in:
  - EXTERNAL/roo-code (AP-AUTOAPPROVE-SHELL)
  - EXTERNAL/codex (AP04_full_access_never)
  - EXTERNAL/swe-agent (REJECT unconstrained bash as MegaBrain default)
evidence:
  - claim: Roo dossier flags auto-approve shell; Codex warns never full_access posture.
    label: DOCUMENTED
    source: targets/external/{roo-code,codex,swe-agent}/REPORT.md
why_it_happens: Prompt fatigue; demo autonomy metrics.
negative_effects:
  - Host compromise
  - Irreversible data loss
failure_modes:
  - Approval⊕sandbox collapsed into one "allow"
  - MCP outside sandbox (Codex AP01)
alternatives:
  - P-005 duality + profiles
  - Refuse-if-unenforceable
our_current_state: Policy PRESENT; sandbox UNKNOWN–PARTIAL — high residual risk if auto-approve copied
applicability: Any shell/MCP policy design
decision: REJECT as default / PROTOTYPE enforceable profiles
confidence: HIGH
```
