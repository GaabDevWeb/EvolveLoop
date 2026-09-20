# UNKNOWNS — mattpocock-skills

Date: 2026-09-18  
Mode: TARGET_RESEARCH  
Constraint: READ-ONLY (no install/execute) — many runtime questions remain open by design.

## From corpus audit (still open)

| ID | Unknown | Status after this investigation |
|----|---------|----------------------------------|
| U-SK-01 | Why no test suite despite skill `tdd` | **STILL UNKNOWN** — no README rationale found; INFERRED possible “skills are prompts, tdd applies to consumer repos” but not evidenced |
| U-SK-02 | Exact map promoted vs in-progress vs plugin.json drift | **PARTIALLY CLOSED** — local `plugin.json` lists 25 paths; in-progress/misc excluded by CLAUDE.md. Live marketplace pin lag vs local = still UNKNOWN without network fetch |
| U-SK-03 | IMPLEMENTATION_STATUS of each skill vs human docs | **STILL UNKNOWN** — no status field in frontmatter; `retro` README marks STUB; others assumed functional without runtime proof |

## New unknowns (this pass)

| ID | Unknown | Why it matters | How to close |
|----|---------|----------------|--------------|
| U-MP-01 | Actual Skill-tool binding success rate for thin wrappers (`grill-me` → `grilling`) across Claude Code vs Codex | Composition is load-bearing; wrappers have no fallback body | Controlled harness runs (out of scope here) |
| U-MP-02 | Description ranking / collision when many model-invoked skills match | Affects false auto-invocation | Harness telemetry or evals |
| U-MP-03 | Whether `AGENTS.md` is still a symlink to `CLAUDE.md` on disk | ~~open~~ **CLOSED** — `AGENTS.md -> CLAUDE.md` (OBSERVED `ls -l`) | — |
| U-MP-04 | Live Claude marketplace sha pin skill count vs local 25 | Distribution freshness | Fetch marketplace listing / `claude plugin details` (execute forbidden this phase) |
| U-MP-05 | Behaviour of `scripts/sync-plugin-version.mjs` edge cases | Release correctness | Read script fully + dry logic review (partial) or run `--check` (execute) |
| U-MP-06 | How issue-tracker templates differ (GitHub/GitLab/local) in operational detail | Hard-dep skills correctness | Read `setup-matt-pocock-skills/issue-tracker-*.md` exhaustively |
| U-MP-07 | In-progress skills graduation criteria beyond “feedback” | Process predictability | Author docs / issues (not in CLAUDE.md) |
| U-MP-08 | Effectiveness claims (token savings from CONTEXT.md, etc.) | Benefit evidence | MEASURED studies absent → benefits remain DOCUMENTED/INFERRED |
| U-MP-09 | Personal bucket referenced in ADR 0002 vs folders present | ~~open~~ **CLOSED as absent** — buckets OBSERVED: engineering, productivity, misc, in-progress, deprecated only; `personal/` not present (ADR text may be stale) | — |
| U-MP-10 | Interaction with Cursor specifically (not Claude/Codex) | MegaBrain host | Not documented as first-class; UNKNOWN |

## Conflicts

```text
CONFLICT:
  claim: Marketplace installed skill count
  source_a: .agents/adr/0002 (historical: pin 22 vs plugin 24)
  source_b: .claude-plugin/plugin.json @1.2.3 (25 skill paths OBSERVED)
  difference: numbers and time differ
  resolution: UNRESOLVED for live marketplace; local ship set = 25
```

```text
CONFLICT:
  claim: Product efficacy vs heavy process frameworks
  source_a: README positioning (DOCUMENTED product)
  source_b: no benchmarks/evals in corpus
  difference: claim without MEASURED evidence
  resolution: treat as Product factor, not Technical proof
```

## Access limitations log

- No `npx skills`, no `claude plugins install`, no script execution.
- No browser fetch of skills.sh or marketplace.
- Git history not re-walked commit-by-commit; TEMPORAL.md uses CHANGELOG + prior VERSION-MAP.
