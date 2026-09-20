# GAP-007 — Prompt-cache-safe history packing

```text
EXTERNAL_MECHANISM   Codex exact-prefix cache discipline; Aider ChatChunks + cache_control
PROBLEM_SOLVED       Avoid quadratic cost as conversations grow; keep static prefix stable
OUR_CURRENT_MECHANISM UNKNOWN whether orchestrator/skill assembly preserves cache prefixes
EQUIVALENCE          UNKNOWN
GAP                  Audit message assembly; append-only history rules; measure cache hit rates
TRADE_OFF            Flexibility of mid-prompt mutation vs cost
EVIDENCE             codex M07; aider AIDER-PROMPT-CACHE / CONTEXT-CHUNKS; Codex AP02 cache-break
APPLICABILITY        High-volume agent turns
DECISION             ADAPT after audit (or PROTOTYPE metrics first)
```

**Provenance:** EXTERNAL codex, aider.
**Confidence:** MEDIUM (gap may be host-owned).
