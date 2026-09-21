# 26 — Test Suite Audit

## Strengths

- Broad Vitest coverage: **723 passed / 2 skipped** after campaign harness.
- Real process-kill B04; SE05/SE07 workspace effects; adversarial V1 audit exists.
- SE08 live correctly skipped without key (not fake PASS).

## Weaknesses

| Issue | Impact |
|-------|--------|
| Mocks generate success evidence | Hides provider malice |
| AGENT_ATTESTED gates trust caller | False security |
| Few integrity assertions on checkpoints | Coverage gap |
| No symlink escape tests before RT | Gap |
| fail_closed_missing_attestation untested because unimplemented | Dead flag |
| Live tests opt-in | Easy to claim backend portability without live |
| Identity-flow-matrix large shape tests | May overcount confidence |
| fail_fast disabled for suite compatibility | Policy realism gap |

**Test Suite Strength:** `WEAK` on integrity/attestation; `PASS` on many deterministic happy/negative Engine paths → overall **PARTIAL / WEAK**.
