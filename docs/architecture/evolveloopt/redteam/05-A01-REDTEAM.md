# 05 — A01 Intent→IR RED TEAM

**Verdict:** `PASS with limitations`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

## Summary

IR builder deterministic; adversarial malformed IR rejected in schema tests. Claim PROVEN in docs treated as PARTIAL until mutation suite proves DENY removal caught.

## Findings tied to harness

_See harness-findings.json and final report._

## Independent tests run

- Existing: `tests/integration/` matching domain
- New: `tests/evals/redteam-adversarial-campaign.test.ts`
