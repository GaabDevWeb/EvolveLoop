# UNKNOWNS — SWE-agent

Target: `swe-agent` · Date: 2026-09-18 · Mode: TARGET_RESEARCH

## Access / method limits

| Item | Status |
|------|--------|
| Local clone + offline static analysis of full tree | Not done (remote raw fetch of key files only) |
| Runtime execution / reproduction of SWE-bench scores | Forbidden / not performed |
| GitHub API metadata (stars, latest release tag) | Incomplete (API rate limit mid-pass) |
| Full SWE-ReX internals beyond public docs | Not mapped (separate package) |
| mini-swe-agent deep dive | Out of scope except successor contrast |

---

## Technical UNKNOWNS

1. **Exact MEASURED resolve %** for SWE-agent **1.0 + Claude 3.7** on Verified / Full / Lite as claimed in README news — only DOCUMENTED “SoTA” bullets found; no table captured in this pass.
2. **Which ACI bundle** (classic `windowed`+`search` vs default `edit_anthropic`+filemap) was used for each published SoTA-era run after 1.0 — UNKNOWN without traj/config artifacts from those runs.
3. **Whether lint-gated edit still applies** in default 1.1 `edit_anthropic` str_replace path the same way as paper `edit`+flake8 — paper ACI vs current default.yaml diverge (`OBSERVED` config difference); efficacy transfer **INFERRED/UNKNOWN**.
4. **ClosedWindowHistoryProcessor / LastN** default usage in competitive configs — default.yaml only shows `cache_control`; other processors’ production defaults UNKNOWN.
5. **RetryAgent/Reviewer measured lift** on SWE-bench for official configs — code exists (`OBSERVED`); gain UNKNOWN here.
6. **Autosubmit false-positive rate** (submitted but not resolved) under cost exits — behavior OBSERVED; stats UNKNOWN.
7. **Security boundary** of Modal/AWS deployments and secret propagation (`propagate_env_variables` warns keys appear in debug logs — DOCUMENTED in tools.py comments) — residual risk UNKNOWN for MegaBrain adoption.
8. **Parity claim** “mini matches SWE-agent performance” — DOCUMENTED by maintainers; not independently MEASURED here.
9. **Docs 12.29% vs paper 12.47%** — CONFLICT unresolved (prefer paper for historical MEASURED).
10. **HumanEvalFix 87.7 vs 88.3** wording variance in paper extract (abstract ~87.7 / body “88.3%” in one sentence) — treat Table 2 **87.7 Python** as canonical MEASURED; narrative slip UNKNOWN/typo risk.

---

## MegaBrain comparison UNKNOWNS

| Gap | Why UNKNOWN |
|-----|-------------|
| Equivalence of Cursor native edit/search vs ACI windowing | Need audit of actual coding-agent tool feedback in CursorSKILLS/orchestrator |
| Policy Engine coverage of interactive-command blocklists | Baseline says verify per claim |
| Evidence Bus suitability for `*.traj` / patch artifacts | Not designed in this pass |
| Sandbox options already present outside baseline | Baseline marks Sandbox UNKNOWN–PARTIAL |

---

## What would resolve key UNKNOWNS

| UNKNOWN | Minimal next evidence |
|---------|----------------------|
| Claude 3.7 % | Official leaderboard entry or preds+sb-cli report with config hash |
| Default ACI vs paper ACI | Compare `config/` competitive yamls + published traj |
| Lint in edit_anthropic | Read `tools/edit_anthropic/bin/str_replace_editor` end-to-end |
| Reviewer lift | Paper/docs section or controlled A/B on Lite slice |
| Mini parity | Side-by-side same model/split report from maintainers |

---

## Explicit non-claims

- Did **not** claim SWE-agent is currently SoTA on any leaderboard as of 2026-09-18.
- Did **not** treat marketing “State of the art among open-source” as MEASURED.
- Did **not** reverse-engineer EnIGMA exploit workflows (REJECT for product; architecture-only mention).
