# UNKNOWNS — Roo Code

**Date:** 2026-09-18  
**Rule:** Prefer `UNKNOWN` over invention. Labels: OBSERVED | DOCUMENTED | INFERRED | HYPOTHESIS.

## Access / lifecycle

| ID | Unknown | Why open | Impact |
|----|---------|----------|--------|
| U-01 | Exact runtime behavior of archived marketplace build vs `main` tip | Extension not installed/run in this investigation | Medium — mechanisms may differ by patch |
| U-02 | Whether docs.roocode.com tracks last release or drifted after sunset | Docs still live; no docs commit pin verified against v3.54.0 | Low–Medium |
| U-03 | Roo Code Cloud / Router internals and shutdown economics | Out of coding-agent architecture scope; only README billing pointer | Low for MegaBrain mechanisms |
| U-04 | ZooCode divergence from Roo at fork point | Pointed by README only; not mined | Medium for CROSS/community continuity |

## Cline lineage

| ID | Unknown | Why open | Impact |
|----|---------|----------|--------|
| U-10 | Precise git ancestry (which Cline commit / when fork diverged) | API today: `fork=false`, `parent=null`; README only asserts origin | High for CROSS with `cline` target |
| U-11 | Which mechanisms are Roo-original vs inherited from Cline | Requires systematic diff — deferred to CROSS / cline investigator | High |
| U-12 | Whether “formerly Roo Cline” rename timeline is complete | Secondary sources exist; not fully primary-sourced here | Low |

## Internals (not fully traced)

| ID | Unknown | Why open | Impact |
|----|---------|----------|--------|
| U-20 | Exact system-prompt assembly code path & token budgets | Docs describe instruction *order*; packing/truncation algorithm not audited in src this pass | Medium |
| U-21 | Task stack implementation details (`finishSubTask`, persistence format) | new_task docs describe behavior; persistence schema not OBSERVED here | Medium |
| U-22 | Telemetry events schema / destinations | Docs mention telemetry capture; privacy/endpoints not mapped | Medium (security) |
| U-23 | How `skill` and `custom_tool` tools are registered/loaded | Names OBSERVED in `toolNames`; behavior/docs not fully fetched | Medium |
| U-24 | Checkpoint format and restore guarantees | FAQ mentions experimental checkpoints only | Medium |
| U-25 | Browser/web fetch path after `browser` group deprecation | CONFLICT docs vs types | Medium |
| U-26 | Model provider adapter matrix completeness | FAQ points to provider list; not inventoried | Low |
| U-27 | Concurrency / parallel subtasks | Docs imply sequential parent-pause model; parallel `UNKNOWN` | Medium |
| U-28 | Eval / benchmark suite for modes or Boomerang quality | Not found in this research pass | Medium for PRINCIPLE_EXTRACTION |
| U-29 | Sandbox beyond `.rooignore` + approvals | Docs state not a full OS sandbox | Confirm residual risks: `UNKNOWN` depth |

## Conflicts (unresolved)

```text
CONFLICT:
  claim: Roo Code is a GitHub fork of cline/cline
  source_a: README — originated from Cline (DOCUMENTED narrative)
  source_b: GitHub API 2026-09-18 — fork=false, parent=null (OBSERVED)
  difference: narrative origin vs current fork metadata
  resolution: UNRESOLVED — prefer narrative for "originated from"; UNKNOWN for live fork edge

CONFLICT:
  claim: Browser tool group availability
  source_a: FAQ / auto-approve still discuss browser permission (DOCUMENTED)
  source_b: tool.ts deprecatedToolGroups includes "browser"; stripped in preprocess (OBSERVED)
  difference: product docs vs type-system deprecation
  resolution: UNRESOLVED — treat browser as legacy/partial

CONFLICT:
  claim: Built-in mode set
  source_a: FAQ lists Code, Architect, Ask, Debug (omits Orchestrator)
  source_b: using-modes + mode.ts include Orchestrator
  difference: incomplete FAQ list
  resolution: prefer_primary — using-modes + mode.ts
```

## What would close gaps

1. Cross-read with `cline` TARGET_RESEARCH + selective `git log` ancestry study (read-only).
2. Spot-read `src/core` task/prompt modules at tag `v3.54.0` for U-20–U-24 (still observational).
3. One controlled install of archived VSIX **only if** Lead authorizes — currently forbidden by investigator constraints (no untrusted install).
