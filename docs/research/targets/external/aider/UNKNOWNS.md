# UNKNOWNS — Aider (OFFICIAL_EXTERNAL)

**Date:** 2026-09-18  
**Rule:** Lacunas sem fonte primária ficam aqui; não inventar internals.

## Access / method gaps

| ID | Unknown | Why blocked | What would resolve |
|----|---------|-------------|-------------------|
| U-01 | Exact behavior of every edit-format coder edge case | Not all `*_coder.py` fully traced line-by-line | Targeted read + unit tests in upstream |
| U-02 | Runtime performance of PageRank on very large repos | No local bench; no MEASURED in this investigation | Profile `repomap.py` on N-file fixtures |
| U-03 | Current production defaults for all models in `models.py` | Metadata large/changing; not fully audited | Diff model settings file at pinned commit |
| U-04 | Streamlit GUI / browser path fidelity vs CLI | Docs mention; code `gui.py` not deep-read | Dedicated pass on GUI entrypoints |
| U-05 | Voice / scrape / copy-paste web-chat paths | Out of primary lens | Optional follow-up TARGET_RESEARCH slice |
| U-06 | Whether fuzzy apply ever applies to wrong locus in wild | Only code paths OBSERVED; no MEASURED error rates | Mine issues + add adversarial apply tests |
| U-07 | Precise ChatSummary prompts and quality | `history.py` structure seen; prompt text not fully extracted | Read summarizer prompts end-to-end |
| U-08 | Shell suggestion extraction heuristics completeness | `run_shell_commands` / `shell.py` not fully mapped | Read shell suggestion parser |
| U-09 | Interaction with `.aiderignore` / ignore rules edge cases | `repo.py` has ignore helpers; not exhaustively tested | Fixtures for ignore patterns |
| U-10 | Security model for `--yes` / unattended scripting | Documented flags exist; threat model not authored by upstream as formal doc | Security review (out of scope here) |

## Architectural UNKNOWNS (internals)

| ID | Question | Current best label |
|----|----------|-------------------|
| U-11 | Exact criteria when repo map **expands beyond** `--map-tokens` | DOCUMENTED qualitatively; formula UNKNOWN without deeper `get_repo_map` trace |
| U-12 | Full list of tree-sitter languages / query files active on `main` | PARTIAL (blog lists historical set; pack may have grown) |
| U-13 | Whether architect editor pass shares file set correctly in all modes | OBSERVED fork kwargs; all edge cases UNKNOWN |
| U-14 | Commit message weak-model failure handling | PARTIAL via `repo.py#get_commit_message` — not fully traced |
| U-15 | Analytics payload schema when opted in | Docs say opt-in anonymous; fields UNKNOWN here |

## Comparison UNKNOWNS (vs MegaBrain)

| ID | Question | Note |
|----|----------|------|
| U-16 | Does any CursorSKILLS coding skill already approximate repo-map? | Baseline says Knowledge/RAG PARTIAL — **GAP: needs audit of CursorSKILLS** before claiming ABSENT forever |
| U-17 | Does orchestrator ever apply SEARCH/REPLACE-like patches? | UNKNOWN without orchestrator code audit |
| U-18 | Equivalence depth of Policy Engine vs Aider confirm_ask | Confirm dialogs ≠ policy engine — treat as PARTIAL pending audit |

## CONFLICTS

```text
CONFLICT:
  claim: Nature of repo-map ranking
  source_a: docs/repomap.html — "graph ranking algorithm"
  source_b: aider/repomap.py — networkx PageRank
  difference: specificity
  resolution: prefer_primary (code) → PageRank OBSERVED

CONFLICT:
  claim: Python scripting API stability
  source_a: scripting.html shows Coder.create examples
  source_b: same page — "not officially supported... could change"
  difference: usable vs supported
  resolution: UNRESOLVED as product promise — treat API as UNSUPPORTED (DOCUMENTED)
```

## Explicit non-claims

- Did **not** claim Aider is “best” coding agent (forbidden ranking).
- Did **not** re-run leaderboard benches (MEASURED only as “upstream publishes numbers”).
- Did **not** execute Aider against a sample repo in this session.
