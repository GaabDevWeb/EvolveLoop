# 25 — Mutation Testing

## Operators considered (disposable / mental+probe)

| Operator | Detected by existing suite? | Campaign probe |
|----------|----------------------------|----------------|
| Remove path escape deny when root set | YES (authority/FS tests) | RESISTED path still throws |
| Accept inflated checkpoint accounting | **NO** — suite does not reject | RT-B04-02 ACCEPTED → **TEST COVERAGE GAP** |
| Forge grill-me satisfied | **NO** strong artifact check | RT-A03-01 → **TEST COVERAGE GAP** |
| Auto-pass evidence DoD | Suite may rely on same builder | RT-EV-01 → **TEST COVERAGE GAP** for integrity |
| Remove shell deny | YES (authority tests) | deny still works |
| Symlink follow | **NO** prior test found | RT-A03-06 → **TEST COVERAGE GAP** |

**Mutation Operators:** 6  
**Mutation Detection Rate:** **~33%** (2/6 clearly caught by prior suite without new harness); with new harness detection of bad mutations = documented gaps.

Production source **not** mutated to hide gaps.
