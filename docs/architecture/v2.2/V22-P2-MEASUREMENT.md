# V22 P2 measurement (GOAL-009 / GOAL-010)

## Evidence class

| Report | Class | Path |
|--------|-------|------|
| Caveman B0 vs B4 | `FIXTURE_PICKUP_INVOKE` | Full `buildPickupPrompt` (same as `run-jobs invoke`) |
| Prompt cache prefix | `FIXTURE_PREFIX_STABILITY` | Split cacheable template vs dynamic briefing |

## Tokenizer

Orchestrator measure calls `orchestrator/scripts/bench_tokenizer_probe.py` (same logic as harness): **`tiktoken:cl100k_base`** when `pip install tiktoken` in the bench Python env, else **`PROXY:whitespace_split`**. Not a Node production dependency.

Pickup **run_id** and complete/fail commands live under `## Briefing` (dynamic), not in the cacheable prefix template.

## GOAL-009 acceptance

- Tasks: **R01–R06** + **H07–H12** frozen queries.
- **B0:** `buildPickupPrompt(..., { caveman: false })`.
- **B4:** `buildPickupPrompt(..., { caveman: true })` / `EVOLVELOOP_BREVITY_CAVEMAN=on`.
- **Fidelity:** suffix from `## Definition of Done` byte-identical between B0 and B4.
- API: `measurePickupPromptsForBench()` / `measureV22Goals009010()`.

## GOAL-010 acceptance

- **No** tautological in-process “hit rate” on identical prefix replay.
- Reports **cacheable_prefix_tokens / full_prompt_tokens** (%), prefix SHA-256, stability across jobs/features (normalized).
- **`vendor_http_cache_hit: NOT_MEASURED`** until a real HTTP LLM adapter is wired.
- API: `measurePromptCachePrefixStability()`.

## agent-setup wiki CONFLICT (resolved)

`wiki` / `wiki-mem` install from `repo:${AGENTS_ROOT}/.cursor/skills/...` via **symlink** (fallback `bundled:skills/*`) so `~/.cursor/skills/wiki` is not copied over the repo checkout (prior `CONFLICT` when dest equalled project tree).
