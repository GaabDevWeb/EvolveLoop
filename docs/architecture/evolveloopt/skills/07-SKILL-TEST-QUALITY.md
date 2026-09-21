# 07 — Skill Test Quality

| Suite / area | Quality | Notes |
|--------------|---------|-------|
| skill-certification-campaign.test.ts | ADEQUATE | Real effects for deterministic + gates |
| redteam-adversarial-campaign.test.ts | STRONG | Integrity regressions |
| .cursor/skills/*/evals | WEAK→ADEQUATE | Often trigger/shape; not side-effect certification |
| SE07 E2E | STRONG | Composition with Worker |
| MockProvider-heavy unit | WEAK if used alone for CERTIFIED | Not used as sole CERTIFIED evidence |

**Skills that would be falsely CERTIFIED by evals-only:** most LLM skills — correctly left NOT_MEASURED.
