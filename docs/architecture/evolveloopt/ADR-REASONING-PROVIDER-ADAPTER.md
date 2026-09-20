# ADR: Reasoning Provider Adapter

- **Status:** Accepted (implementation)
- **Date:** 2026-09-20
- **Branch:** `evolve-v2`
- **Related:** ADR-AGENT-RUNTIME-BOUNDARY, V2-AGENTEXECUTOR-STATUS, V2-REASONING-PROVIDER

## Context

AgentExecutor contracts were proven with `TestReasoningProvider`. The system needed a real LLM connection for measurement without making any vendor the architectural brain or the global default.

## Decision

1. **Adapter exists** as an isolated `ReasoningProvider` implementation (`OllamaReasoningProvider`), using native `fetch` — no vendor SDK in core.
2. **Core remains provider-neutral** — `ExecutionEngine` / Policy / Authority do not import adapters.
3. **Default remains UNDECIDED** — `createReasoningProvider` never promotes live to implicit default; `REASONING_MODE=live` is required.
4. **Live mode is opt-in** — `npm run eval:llm -- --live`; default `npm test` stays offline.
5. **Runtime remains authoritative** — LLM outputs are proposals; A03/B01/B04 unchanged.

## Consequences

- Live quality is measurable without locking architecture to Ollama/OpenAI/etc.
- Future adapters (OpenAI-compatible HTTP, Anthropic, Cursor) plug the same seam.
- Promotion to default requires separate eval history + explicit ADR — not this milestone.

## Rejected

SDK-in-core, silent live default, LLM-direct tools, reasoning fallback router, LLM-as-judge as sole scorer.
