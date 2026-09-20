# V2 SE-08 — Cursor Agent Backend Integration

**Status:** IMPLEMENTED (adapter + mock suite; live opt-in)  
**Branch:** `evolve-v2`  
**SDK:** `@cursor/sdk@1.0.31` (Node ≥22.13)  
**Primary:** Cursor TypeScript SDK (`Agent.prompt`)  
**CLI fallback:** not implemented (SDK sufficient)

## Boundary

```text
AgentExecutor
      ↓
CursorReasoningProvider  (ReasoningProvider)
      ↓
@cursor/sdk Agent
```

No CursorRuntime / CursorSupervisor / second AgentExecutor.

## Auth

- `CURSOR_API_KEY` from environment (or options in tests)
- Never logged, never in Evidence/Telemetry/checkpoints
- Missing key → `REASONING_PROVIDER_UNAVAILABLE` (no fake success)

## Execution modes

| Mode | Tools | A03 | Use |
|------|-------|-----|-----|
| `reasoning_only` (default) | `tools: []` + `mode: plan` | **PASS** (effects via Worker/Runtime) | Primary SE-08 path |
| `agentic_workspace` | default toolset + optional Cursor sandbox | **LIMITED** | Documented; Cursor may write cwd directly |

**EvolveLoop Sandbox = NOT_IMPLEMENTED**  
**Cursor Sandbox = optional `local.sandboxOptions.enabled`** (separate)

## Tool authority

- EvolveLoop still owns CapabilityAuthority / A03 / B01 for Runtime effects.
- Cursor-native tools in agentic mode are **outside** full A03 — classified LIMITED, not cosmetically “enforced”.

## Context model

Structured task contract JSON (objective, policy summary, capabilities, budgets, evidence refs).  
Does **not** paste the entire repository into the prompt.

## Observability

Telemetry kinds: `CursorRunStarted|AssistantDelta|ToolActivity|Completed|Failed|Cancelled`  
Correlate with EvolveLoop `execution_id` / `assignment_id` at AgentExecutor layer.

## Tests

- Unit: `tests/unit/cursor-reasoning-se08.test.ts`
- Live (opt-in): `SE08_LIVE=1 npx vitest run tests/evals/se08-cursor-live.test.ts`

## Related

- `V2-SE08-CURSOR-LIVE-EVAL.md`
- `ADR-CURSOR-AGENT-BACKEND.md`
