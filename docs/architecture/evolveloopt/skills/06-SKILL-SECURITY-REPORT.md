# 06 — Skill Security Report

**Branch:** `evolve-v2`  
**Post-remediation:** see `11-REMEDIATION-REPORT.md`

## Attack classes attempted

| Class | Attempted | Contained | Finding |
|-------|-----------|-----------|---------|
| Forged grill-me status | Y | Y | remediated; retested PASS |
| Wrong-task attestation | Y | Y | PASS |
| Stale execution attestation | Y | Y | PASS |
| Symlink FS escape | Y | Y | PASS |
| Path traversal | Y | Y | PASS |
| .env secret read | Y | Y | PASS |
| Evidence auto-PASS | Y | Y | PASS |
| Grounding status forge (wiki) | Y | Y | **CLOSED** — artifact-verified only |
| Autonomous provider.yaml import | Y | Y (path) | Path confinement PASS; `SANDBOX_NOT_IMPLEMENTED` residual |
| Registry poison execution | partial (discovery) | Engine skips non-yaml | LIMITATION |
| Live Agent escalation | N | — | BLOCKED no API key |

## Residual gaps
1. Attestation plantable by workspace writer (no HMAC) — MEDIUM  
2. Autonomous in-process privileges (`SANDBOX_NOT_IMPLEMENTED`) — not path bypass  
3. Agentic Cursor workspace outside EvolveLoop A03  
4. LLM skill behavioral safety NOT_MEASURED  
