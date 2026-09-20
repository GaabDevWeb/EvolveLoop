# UNKNOWNS — Cursor product

**Date:** 2026-09-18  
**Rule:** Every gap without primary evidence stays here. Do not fill with guesses in REPORT/MECHANISMS.

## Access / provenance

| ID | Unknown | Why it matters | How it could be resolved |
|----|---------|----------------|--------------------------|
| U-SRC | Agent harness source code, system prompts per model | Cannot verify tool-selection / instruction tuning claims | Official open-sourcing or detailed tech papers — currently ABSENT |
| U-GUIDE | `cursor-guide` skill at `~/.cursor/skills-cursor/cursor-guide/SKILL.md` | Requested secondary source missing on disk | Re-sync Cursor built-in skills; use docs URLs instead |
| U-VER | Exact IDE build / agent version of this OBSERVED session | Reproducibility of tool surface | Read About Cursor / release notes in-product |

## Search / indexing

| ID | Unknown | Notes |
|----|---------|-------|
| U-IDX | Whether a durable **semantic codebase index** still exists, and its schema | Search docs emphasize Instant Grep + Explore; blog still says “semantic search”; SDK has `semSearch` |
| U-EMB | Embedding model, chunking, update cadence, local vs server storage | Privacy docs say paths encrypted / code not plaintext — algorithm UNKNOWN |
| U-ROUTE-SEARCH | Policy choosing Grep vs semSearch vs Explore | Not documented |
| U-KEYS | Operational semantics of `.cursor/keys` path decryption beyond FAQ | Only FAQ snippet observed |

## Context / runtime

| ID | Unknown | Notes |
|----|---------|-------|
| U-COMPACT | Compaction/summary algorithm and loss characteristics | Categories DOCUMENTED; algorithm UNKNOWN |
| U-SYS | Contents of built-in system prompt (per model) | Explicitly closed |
| U-TOOLSEL | How the model is steered to pick tools | Harness tuning claimed; internals UNKNOWN |
| U-LIMIT | Soft limits on wall-clock / tokens / tools despite “no tool call limit” | Docs say no tool-call count limit; other quotas UNKNOWN |

## Model routing

| ID | Unknown | Notes |
|----|---------|-------|
| U-CLF | Router classifier features, training data, per-request model pool | DOCUMENTED that pool changes and is Cursor-managed |
| U-GROK-REQ | Exact “Grok must be enabled” gate versions over time | Docs require cost-efficient Cursor Grok for Router |
| U-AUTO-INDIV | Individual (non-Teams) Auto behavior vs Teams Router | Docs: Router currently Teams/Enterprise; Auto modes also described on Models page — edge cases UNKNOWN |

## Cloud / background

| ID | Unknown | Notes |
|----|---------|-------|
| U-VM | Cloud VM image internals, network default deny rules detail | High-level DOCUMENTED; full matrix in security docs not fully ingested this pass |
| U-BG-LOCAL | Whether any local “background agent” remains distinct from Cloud Agents | Naming history: Background → Cloud; local background Task subagents are different |

## Equivalence traps (explicit non-claims)

| ID | Non-claim |
|----|-----------|
| U-EQ1 | MegaBrain Orchestrator ≠ Cursor harness |
| U-EQ2 | GaabWiki/RAG ≠ Cursor codebase indexing |
| U-EQ3 | Policy Engine ≠ Rules/hooks (may ADAPT as adapters only) |
| U-EQ4 | Evidence Bus ≠ conversation checkpoints / SDK stores |
| U-EQ5 | PDA roles ≠ Cursor built-in Explore/Bash/Browser (pattern only) |

## Conflicts (open)

See REPORT §8: semantic search documentation vs Instant Grep-centric search page; Composer name overload (model vs legacy UI).
