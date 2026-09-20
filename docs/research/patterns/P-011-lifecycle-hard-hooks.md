# P-011 — Lifecycle hard hooks (enforce, don’t advise)

```text
PATTERN
Observed in: claude-code, cursor, codex hooks; openai agents hooks; MAF middleware; LOCAL superpowers SessionStart (EXTERNAL+LOCAL)
Differences:
  - Deterministic intercept vs skill prose / Iron Laws (soft)
  - Product harness hooks vs MegaBrain promote-queue hooks
Common mechanism: Run deterministic callbacks on session/tool lifecycle to inject policy, bootstrap, or block
Why it appears repeatedly: Soft instructions do not reliably activate skills or stop unauthorized tools
Evidence: CROSS §3 Hooks→Policy adapters; CROSS-INVESTIGATION-REVIEW §5.7 Iron Laws ≠ Policy; PRINCIPLE-07 harness residual
Applicability: Hooks PARTIAL — ADAPT as Policy adapters + skill bootstrap; soft prompt remains insufficient alone
Decision: ADAPT
Confidence: HIGH (role of hard hooks) / MEDIUM (exact MegaBrain hook surface)
Supports Principle: PRINCIPLE-03, PRINCIPLE-07
```
