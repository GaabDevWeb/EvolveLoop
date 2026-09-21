# 09 — B01 Resource policy RED TEAM

**Verdict:** `PARTIAL`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

## Summary

Budgets enforced on Engine; vendor native loops LIMITED. fail_fast defaults false for V1 compat (explicit comment). Accounting corruption via checkpoint bypasses B01.

## Findings tied to harness

_See harness-findings.json and final report._

## Independent tests run

- Existing: `tests/integration/` matching domain
- New: `tests/evals/redteam-adversarial-campaign.test.ts`
