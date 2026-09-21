# Evidence — RED TEAM

**Verdict:** `FAIL integrity`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

Auto-pass DoD; no crypto lineage; tamper still valid.

### RT-EV-01 — CRITICAL

| Field | Value |
|-------|-------|
| **ID** | RT-EV-01 |
| **Severity** | CRITICAL |
| **Component** | evidence/builders |
| **Attack** | buildWorkerEvidence marks DoD pass without verification |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | checks remain unverified until runtime proof |
| **Observed** | status=complete forgedPass=true allPass=true checksField=complete |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |
### RT-EV-02 — HIGH

| Field | Value |
|-------|-------|
| **ID** | RT-EV-02 |
| **Severity** | HIGH |
| **Component** | evidence/validator |
| **Attack** | tamper agent_id/run_id on evidence then validateEvidenceV21 |
| **Precondition** | Disposable fixture / unit import |
| **Expected** | integrity/lineage reject |
| **Observed** | valid=true reason=none |
| **Reproduction** | `npx vitest run tests/evals/redteam-adversarial-campaign.test.ts` |
| **Evidence** | `docs/architecture/evolveloopt/redteam/harness-findings.json` |
| **Impact** | System broken per campaign definition |
| **Exploitability** | HIGH (local/caller) |
| **Detection** | Harness assertion + code inspection |
| **Current Mitigation** | NONE / inadequate |
| **Recommendation** | See final report |
| **Regression Test Needed** | YES — keep redteam harness |

