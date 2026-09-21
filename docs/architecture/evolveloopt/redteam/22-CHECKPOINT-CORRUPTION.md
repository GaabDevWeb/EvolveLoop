# 22 — Checkpoint Corruption

**Verdict:** `CRITICAL_FAILURES_FOUND` (integrity) / crash-resume operationally works

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


## Matrix

| Corruption | Expected | Observed |
|------------|----------|----------|
| Truncated JSON | fail closed | CORRUPT — RESISTED |
| Negative accounting | reject | ACCEPTED — BROKEN |
| FS overwrite terminal | reject | ACCEPTED — BROKEN |
| Dual lease claim | one owner | RESISTED |
| Wrong schema | reject | RESISTED |
| HMAC missing | N/A | **NO INTEGRITY LAYER** |

## Process-kill

Existing B04 SIGKILL mid-B resume: **PASS** (suite). Semantics remain **AT_LEAST_ONCE**.
