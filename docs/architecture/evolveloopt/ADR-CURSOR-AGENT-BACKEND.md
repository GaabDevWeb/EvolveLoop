# ADR — Cursor Agent Backend

## Status

Accepted on `evolve-v2` (SE-08).

## Context

EvolveLoop has `ReasoningProvider` + `AgentExecutor`. Live LLM quality was `NOT_MEASURED`. Cursor provides an official TypeScript SDK (`@cursor/sdk`) with local/cloud agent loops. We need Cursor as **primary Agent backend** without forking Runtime/Supervisor/Policy.

## Decision

1. Implement `CursorReasoningProvider` as a `ReasoningProvider` adapter only.
2. Prefer **SDK** (`Agent.prompt` / create+send) over CLI; no CLI fallback in SE-08.
3. Default **`reasoning_only`**: `tools: []` so Cursor returns structured JSON; Workspace effects remain Worker → A03 → DeterministicProvider.
4. Document **`agentic_workspace`** as LIMITED for A03/B01 (Cursor tools bypass EvolveLoop Runtime).
5. Auth exclusively via `CURSOR_API_KEY` (never hardcoded).
6. Keep EvolveLoop Sandbox = NOT_IMPLEMENTED; Cursor sandbox optional and separately labeled.

## Consequences

- Positive: same AgentExecutor contract; deterministic SE-07 path unchanged; live Cursor measurable.
- Negative: agentic Cursor cannot claim full A03; knowledge may dual-seam with Cursor-native context (B03 residual).
- Forbidden: MockCursor used to claim live PASS; silent success without auth.

## Alternatives rejected

- CursorRuntime parallel stack — violates SE-08 rule.
- CLI-only integration — weaker typing; SDK available and authenticated in environment.
- Always-agentic Cursor — would invalidate A03 claims.
