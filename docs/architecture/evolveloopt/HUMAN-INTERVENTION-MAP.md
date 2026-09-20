# Human Intervention Map

**Date:** 2026-09-20  
**Branch:** `evolve-v2`

| Benchmark / Path | Required | Optional | Fallback | Provider limitation | Policy gate | Infra |
|------------------|----------|----------|----------|-------------------|-------------|--------|
| A MiniCRM deterministic | none | — | SE-07 suite | — | A03/B01 | local FS |
| B–J deterministic | none | — | harness suite | — | scope | tmp workspace |
| Live Cursor | CURSOR_API_KEY | model pick | BLOCKED | SDK Public Beta | reasoning_only | network |
| Live Codex | CODEX/OPENAI key + SDK | — | BLOCKED | CLI/SDK install | LIMITED agentic | network |
| Live Claude Code | ANTHROPIC_API_KEY + SDK | — | BLOCKED | SDK install | LIMITED agentic | network |
| Live Antigravity | `agy` + login | — | BLOCKED_BY_INTERFACE if no CLI | Preview cloud | LIMITED agentic | binary |
| Live Ollama | ollama daemon + model | model id | UNAVAILABLE | local GPU/CPU | reasoning only | localhost |
| Grill-me / sensitive policy | human ACK | — | blocked transition | — | grill-me gate | — |
| Production deploy | human | — | N/A V2 | — | — | CI/CD |
| A06 self-evolution promote | human (PROPOSE only) | — | forbidden auto | — | A06 | — |

Long-horizon Tier 3–4: human may stop early → `NOT_MEASURED` / `LIMITED` acceptable (ACK Q7).
