# 07 — A03 Runtime gates RED TEAM

**Verdict:** `FAIL (critical findings)`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

## Summary

Deny-list and path-with-root resist. Grill-me forge, dead fail_closed flag, missing workspaceRoot, symlink leak break A03 universality claim.

## Findings tied to harness

### RT-A03-01 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-A03-01 |
| **Severity** | CRITICAL |
| **Component** | runtime-gates |
| **Attack** | forge grill_me.evidence_status=satisfied without artifact |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | DENY or verify grill-me evidence artifact on disk |
| **Observed** | decision=ALLOW code=ALLOW |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-A03-02 — HIGH

| Field | Value |
|-------|-------|
| **ID** | RT-A03-02 |
| **Severity** | HIGH |
| **Component** | runtime-gates |
| **Attack** | fail_closed_missing_attestation=true with missing grill_me |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | DENY when attestation required but missing |
| **Observed** | decision=ALLOW — flag never read in evaluatePreExecute |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-A03-03 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-A03-03 |
| **Severity** | CRITICAL |
| **Component** | capability-authority |
| **Attack** | path escape check with undefined workspaceRoot |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | treat missing root as deny / escape=true |
| **Observed** | pathEscapesWorkspace=false (escape undetected) |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-A03-04 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-A03-04 |
| **Severity** | CRITICAL |
| **Component** | capability-authority |
| **Attack** | write to absolute path with allowWrite:true and no workspaceRoot |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | DENY escape |
| **Observed** | decision=allow reason=write_allowed_by_context |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-A03-05 — INFO

| Field | Value |
|-------|-------|
| **ID** | RT-A03-05 |
| **Severity** | INFO |
| **Component** | deterministic/filesystem |
| **Attack** | path traversal ../ with workspaceRoot set |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | PathEscapeError + no write |
| **Observed** | blocked=true wrote=false |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | Contained / resisted |
| **Exploitability** | N/A resisted |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | Enforcement held |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-A03-06 — HIGH

| Field | Value |
|-------|-------|
| **ID** | RT-A03-06 |
| **Severity** | HIGH |
| **Component** | deterministic/filesystem |
| **Attack** | symlink to absolute outside path then read |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | DENY symlink escape |
| **Observed** | threw=false leaked=true |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |


## Independent tests run

- Existing: `tests/integration/` matching domain
- New: `tests/evals/redteam-adversarial-campaign.test.ts`
