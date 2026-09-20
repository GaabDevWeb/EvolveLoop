# UNKNOWNS — Codex (`OFFICIAL_EXTERNAL` / partially closed)

**Date:** 2026-09-18  
**Rule:** Prefer `UNKNOWN` over invention. Labels: UNKNOWN | INFERRED | CONFLICT.

## Access boundary

| Area | Status | Notes |
|------|--------|-------|
| Codex CLI / `codex-rs` core harness | Partially **KNOWN** via OSS | Snapshot `7498521d288b`; not a full line-by-line audit |
| App-server protocol & schemas | **DOCUMENTED** + OSS | |
| IDE extension | **UNKNOWN** internals | Explicitly not open source |
| Codex cloud control plane & scheduler | **UNKNOWN** | Product behavior DOCUMENTED at high level only |
| Model weights / training / system prompts (server-owned) | **UNKNOWN** | Client sends `instructions` / bundled model prompt files; server may still wrap |
| Proprietary `encrypted_content` / compaction latent format | **UNKNOWN** | Existence DOCUMENTED; crypto/format not specified for third parties |
| Product evaluation harness / online evals | **UNKNOWN** | Cookbooks mention traces/evals; no SSOT audited here |
| Billing / rate-limit enforcement internals | **UNKNOWN** | |

## Lens-specific unknowns

### Agent loop
- Exact scheduling when multiple tool calls arrive in one model output (parallel vs serial) — **UNKNOWN** (not asserted in agent-loop post beyond “iterations”).
- Full enumeration of built-in tool specs per model preset — **UNKNOWN** (partial examples DOCUMENTED; OSS has more — not fully inventoried this pass).

### Tool execution / validation / recovery
- Retry/backoff policy on Responses HTTP failures — **UNKNOWN**.
- Structured validation of tool args beyond schema `strict:false` examples — **UNKNOWN** depth.
- Automatic repair loops after failing tests — **HYPOTHESIS** only (product may do via model; no dedicated harness claim verified).

### Sandbox / permissions
- Exact `:minimal` path set per OS — **UNKNOWN** (concept DOCUMENTED; concrete lists not fully published in permissions page body fetched).
- Landlock fallback trigger conditions — **UNKNOWN** detail (existence DOCUMENTED).
- Whether App and CLI share identical Seatbelt profiles — **UNKNOWN** / possible **CONFLICT** with tertiary App MEASURED notes.

### Approval
- `auto_review` reviewer agent prompt, model, and deny semantics — **DOCUMENTED** at overview level; full algorithm **UNKNOWN** (docs point to “automatic review” page — not deep-audited here).
- Granular approval category complete matrix vs runtime — **PARTIAL** from config-reference only.

### Multi-agent
- Official V1 vs V2 tool surface, eviction, mailbox wake semantics — **UNKNOWN** in primary docs audited; community/skill text = **INFERRED** only.
- Whether subagents share filesystem always — **INFERRED** from tertiary App test notes; not generalized.

### Skills / MCP
- Ranking/scoring function for implicit skill selection — **UNKNOWN** (description matching DOCUMENTED; model decides).
- Exact MCP tool serialization / 20% output allowance implementation — **PARTIAL** DOCUMENTED config keys only.

### Session state
- On-disk thread store schema & retention — **PARTIAL** (APIs DOCUMENTED; storage layout not audited).
- Cross-device sync for ChatGPT-linked sessions — **UNKNOWN**.

### Context
- Precise token accounting for auto_compact threshold defaults per model — **UNKNOWN** when unset (“model defaults”).
- Whether images/attachments participate in compact the same way — OSS has image budget modules; behavior **not verified** here.

### Evaluation
- Production eval suites, golden tasks, regression gates for Codex releases — **UNKNOWN**.

## Conflicts to track

```text
CONFLICT:
  claim: approval_policy value "untrusted" is valid
  source_a: Older agent-approvals / sample configs mentioning untrusted
  source_b: sandboxing concept page (2026-09-18 fetch) — untrusted no longer selectable
  difference: retired vs still documented elsewhere
  resolution: prefer_primary latest sandboxing + migration guidance; treat as legacy
```

```text
CONFLICT:
  claim: Codex always manages git worktrees / blocks git checkout -b
  source_a: Superpowers Codex App compatibility notes (MEASURED App)
  source_b: Same notes — Codex CLI does NOT have built-in worktree management
  difference: App vs CLI surfaces
  resolution: UNRESOLVED as universal Codex claim — label by surface
```

## What would promote UNKNOWN → KNOWN

1. Read official multi-agent + automatic-review docs end-to-end; cite.
2. Targeted OBSERVED audit of `codex-rs/core/src/tools/handlers/*` tool inventory.
3. Run controlled MEASURED experiments on CLI sandbox (not App) for FS/network matrix.
4. OpenAI publishes IDE/cloud architecture posts (promised series after agent-loop).

## Explicit non-claims

- No claim about undisclosed model routing weights.
- No claim that DeepWiki diagrams are authoritative (secondary).
- No claim MegaBrain “has” or “lacks” features without baseline citation.
