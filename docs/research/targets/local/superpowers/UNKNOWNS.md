# UNKNOWNS — superpowers

Epistemic gaps after TARGET_RESEARCH on LOCAL_CORPUS `v6.3.0`. Do not fill with inference presented as fact.

## Runtime / host internals

1. **Skill discovery ranking** inside Claude Code, Codex, Cursor, etc. — how descriptions are scored/matched. Only Superpowers conventions OBSERVED.
2. **Whether SessionStart injection is deduplicated** by every harness when both plugin and user hooks fire — partially handled in session-start comments for Claude dual-field issue; full matrix UNKNOWN.
3. **Actual token cost** of bootstrap + SDD on current models — RELEASE-NOTES cite ~2× speed / ~50% fewer tokens for v6.0 SDD rewrite (**DOCUMENTED MEASURED claim**); **not MEASURED** in this investigation (no evals run).

## Missing corpus artifacts

4. **`evals/` submodule** (drill / Quorum) — documented but **absent** from checkout. Scenario YAML contents, judge prompts, pass rates → UNKNOWN here.
5. **Live marketplace packaging** differences (Anthropic official vs obra marketplace) — install docs only.
6. **Commercial Prime Radiant tooling** beyond open repo — DOCUMENTED sales contact only; internals UNKNOWN.

## Behavioral efficacy

7. **Compliance rates** of mandatory skill invoke / TDD Iron Law / verification gate under production pressure across harnesses — tests/explicit-skill-requests and CLAUDE.md assert methodology; aggregate MEASURED results not in-tree without evals.
8. **Whether three-path brainstorming** reduces over-ceremony without increasing unapproved code — design OBSERVED; outcome UNKNOWN without evals.
9. **Hermes post-compaction skill silence** frequency in the wild — caveat DOCUMENTED; incidence UNKNOWN.

## Temporal / branch

10. **v6.4.0+ unreleased mechanisms** (diagnosing-superpowers, movie skill, OpenCode 2.0, Muse, Qwen, native execution) appear in `git log --all` but **not** in HEAD `main` v6.3.0 tree — treat as OUT_OF_SCOPE until checked out.
11. **Exact first introduction dates** of every mechanism at file birth vs behavioral maturity — TEMPORAL.md covers majors; fine-grained line archaeology incomplete.

## Comparison gaps (MegaBrain)

12. Whether CursorSKILLS already ships an equivalent **sessionStart bootstrap** for using-superpowers / orquestrar — baseline says Hooks PARTIAL; **GAP: needs audit of CursorSKILLS hooks** → our_equivalence may shift ALREADY_PRESENT.
13. Whether `plan.ir.yaml` already encodes Interfaces/Global Constraints equivalently — baseline Task IR IMPLEMENTED; structural parity UNKNOWN without side-by-side schema read (not done this pass beyond baseline table).

## Security (not exploited; noted)

14. Historical unauthenticated brainstorm companion — fixed per RELEASE-NOTES v6.0 (**DOCUMENTED**); residual attack surface of companion server on shared hosts → not re-audited statically in depth this pass → residual UNKNOWN.
)
