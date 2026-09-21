# 10 — B04 Checkpoint recovery RED TEAM

**Verdict:** `FAIL integrity / PASS crash-resume`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

## Summary

Process-kill resume works (suite). Schema-valid forgery & FS tamper accepted. AT_LEAST_ONCE duplicate effects residual. Lease mutex resists single-host dual claim.

## Findings tied to harness

### RT-B04-01 — INFO

| Field | Value |
|-------|-------|
| **ID** | RT-B04-01 |
| **Severity** | INFO |
| **Component** | checkpoint |
| **Attack** | truncated JSON |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | ok:false |
| **Observed** | ok=false code=CORRUPT |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | Contained / resisted |
| **Exploitability** | N/A resisted |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | Enforcement held |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-B04-02 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-B04-02 |
| **Severity** | CRITICAL |
| **Component** | checkpoint |
| **Attack** | negative/inflated accounting with valid schema |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | reject impossible accounting |
| **Observed** | ok=true |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-B04-03 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-B04-03 |
| **Severity** | CRITICAL |
| **Component** | checkpoint |
| **Attack** | direct FS tamper of checkpoint after save |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | integrity failure / signature reject |
| **Observed** | accepted tampered terminal+nodes_completed=1000 |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-B04-04 — INFO

| Field | Value |
|-------|-------|
| **ID** | RT-B04-04 |
| **Severity** | INFO |
| **Component** | checkpoint-lease |
| **Attack** | two workers claim same recovery |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | exactly one ok:true |
| **Observed** | a.ok=true b.ok=false |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | Contained / resisted |
| **Exploitability** | N/A resisted |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | Enforcement held |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |


## Independent tests run

- Existing: `tests/integration/` matching domain
- New: `tests/evals/redteam-adversarial-campaign.test.ts`
