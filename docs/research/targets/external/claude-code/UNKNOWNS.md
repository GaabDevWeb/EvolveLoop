# UNKNOWNS — Claude Code / Claude Agent SDK

**Target:** `claude-code`  
**Date:** 2026-09-18  
**Rule:** Closed or unverified → UNKNOWN. No invention.

## Access limitations

| Limitation | Impact |
|------------|--------|
| No Claude Code native binary source (closed) | Scheduler, exact prompt assembly, classifier weights = UNKNOWN |
| SDK packages not installed/inspected this run | Exact bundled CLI version mapping = UNKNOWN |
| No runtime traces / OBSERVED sessions | Parallelism heuristics, compaction trigger thresholds = UNKNOWN beyond docs |
| Agent teams / background agents lightly skimmed | Deep coordination protocol = UNKNOWN / out of primary lens depth |

## Mechanism unknowns

| ID | Question | Why unknown |
|----|----------|-------------|
| U-01 | Exact system prompt / “harness” instructions shipped with Claude Code | Not published as authoritative full text in docs consulted |
| U-02 | Model routing algorithm (when to pick Haiku/Sonnet/Opus beyond documented Explore inheritance caps) | Proprietary; docs give rules of thumb, not full router |
| U-03 | Auto mode classifier model, prompts, and false-positive/negative rates | DOCUMENTED that classifier exists; internals UNKNOWN |
| U-04 | Precise compaction trigger (token %, remaining budget, hysteresis) | Docs say “approaches its limit”; numeric thresholds UNKNOWN |
| U-05 | Compactor model vs main model; summarization prompt template | Partially user-influenceable via CLAUDE.md section; template UNKNOWN |
| U-06 | Prompt-cache hit rates / TTLs in production | Behavior DOCUMENTED; metrics UNKNOWN |
| U-07 | Exact parallel tool scheduler (which MCP tools count as readonly beyond annotation) | Annotation `readOnlyHint` DOCUMENTED; edge cases UNKNOWN |
| U-08 | Subagent transcript storage format and resume edge cases across versions | High-level DOCUMENTED; file schema not fully audited |
| U-09 | Agent teams messaging protocol (teammate vs return-result Agent tool) | Mentioned in tools docs; not deep-mined this pass → UNKNOWN detail |
| U-10 | Desktop/web vs CLI behavioral deltas for hooks/permissions | Docs claim same hook events; residual deltas UNKNOWN |
| U-11 | Sandbox seccomp filter exact syscall denylist | Package `@anthropic-ai/sandbox-runtime` referenced; contents not audited |
| U-12 | How `effort` maps to API thinking budgets per model | Levels DOCUMENTED; token mapping UNKNOWN |
| U-13 | Billing/credit accounting after June 15 2026 Agent SDK credit split | Announced in overview; operational detail UNKNOWN here |
| U-14 | MegaBrain: whether OS sandbox exists for target code execution | Baseline says UNKNOWN–PARTIAL — GAP needs CursorSKILLS audit |

## Conflicts

```text
CONFLICT:
  claim: Explore subagent default model
  source_a: Older community/training assumptions — “always Haiku”
  source_b: Official subagents doc — as of v2.1.198 inherits parent model (API capped at Opus)
  difference: Default cost/latency profile changed by version
  resolution: prefer_primary (current official doc); runtime without version pin = UNKNOWN
```

```text
CONFLICT:
  claim: Custom commands vs skills
  source_a: Legacy .claude/commands/
  source_b: Skills doc — commands merged into skills; both work; skill wins on name clash
  difference: Dual paths during migration
  resolution: prefer_primary (skills are current abstraction)
```

## Explicit non-claims

- Não afirmamos superioridade vs Cursor/Codex/OpenHands.
- Não afirmamos internals do binário nativo.
- Não medimos latência/custo (MEASURED ausente).
- Não auditámos código do MegaBrain para fechar U-14 nesta investigação.
