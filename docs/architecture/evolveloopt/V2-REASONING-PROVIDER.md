# V2 Reasoning Provider

**Status:** IMPLEMENTED (Ollama adapter) — default remains **UNDECIDED**  
**Branch:** `evolve-v2`  
**Date:** 2026-09-20  

---

## Provider Contract

Core knows only `ReasoningProvider`:

```ts
invoke(request: ReasoningRequest): Promise<ReasoningResponse>
```

- Produces structured payload → `AgentExecutor` validates → `AgentDecision`
- Never executes capabilities, authorizes, or mutates checkpoints
- Errors normalized to `ReasoningErrorCode`

---

## Selected Adapter

| Adapter | Location | Transport |
|---------|----------|-----------|
| `OllamaReasoningProvider` | `orchestrator/src/agent/providers/ollama-reasoning-provider.ts` | Native `fetch` → `/api/chat` + `format: json` |

No OpenAI / Anthropic / Cursor SDK in core.  
HTTP helper is isolated (`providers/http-transport.ts`), not a runtime-wide client framework.

Discovery (this environment): local **Ollama** at `127.0.0.1:11434` with models including `bonsai-64k:latest`. No cloud API keys present.

---

## Configuration

| Env | Purpose |
|-----|---------|
| `REASONING_MODE` | `deterministic` (default) \| `live` |
| `REASONING_PROVIDER` | Adapter id when live (e.g. `ollama`) |
| `OLLAMA_HOST` / `OLLAMA_BASE_URL` | Endpoint (default `http://127.0.0.1:11434`) |
| `OLLAMA_MODEL` / `REASONING_MODEL` | Model name |
| `REASONING_TIMEOUT_MS` | Provider timeout |
| `REASONING_TEMPERATURE` | Sampling |
| `REASONING_MAX_OUTPUT_TOKENS` | `num_predict` |

Factory: `createReasoningProvider` / `readReasoningConfigFromEnv`.  
`default_provider` field is always `"UNDECIDED"`.

---

## Authentication

Ollama local: no secret.  
Future cloud adapters: secrets **only** from environment / credential provider — never Git, YAML, logs, telemetry, or `AgentExecutionRequest`.

---

## Structured Output

1. System+user messages from `prompt-builder.ts` (`prompt_version=agent-decision-v1.0.0`)
2. Ollama `format: "json"`
3. Parse `message.content` JSON → payload
4. Empty content / thinking-only → `REASONING_MALFORMED_OUTPUT` (CoT not stored)
5. `DefaultAgentExecutor` schema + semantic validation

---

## Error Normalization

| Condition | Code |
|-----------|------|
| Network / 5xx / unknown provider | `REASONING_PROVIDER_UNAVAILABLE` |
| 401/403 | `REASONING_PROVIDER_UNAVAILABLE` (auth) |
| Timeout / abort | `REASONING_TIMEOUT` |
| 429 | `REASONING_PROVIDER_UNAVAILABLE` (rate limit) |
| Context overflow | `REASONING_CONTEXT_TOO_LARGE` |
| Bad JSON / empty | `REASONING_MALFORMED_OUTPUT` |

---

## Usage Accounting

When Ollama returns `prompt_eval_count` / `eval_count`, map to `input_tokens` / `output_tokens` / `total_tokens` and feed B01 via `applyReasoningUsageToAccounting`.  
Otherwise `tokens_unknown`. Cost: **unknown** (not estimated).

---

## Timeout

`REASONING_TIMEOUT_MS` / executor `timeout_ms` → AbortController on fetch. Aligns with B01 soft budgets; no parallel AgentBudget type.

---

## Security

- Context redaction / forbidden keys unchanged
- Retrieved text = data (`context_authority: none`)
- A03/B01 still apply to proposals
- LLM never gets capability execute path

---

## Live Mode

```bash
REASONING_MODE=live REASONING_PROVIDER=ollama OLLAMA_MODEL=bonsai-64k:latest \
  npm run eval:llm -- --live
```

Without `--live` / without provider → `NOT_MEASURED`.  
`npm test` stays offline (live suite excluded in `vitest.config.ts`).

---

## Offline Mode

`REASONING_MODE=deterministic` (default) → `TestReasoningProvider`. No network.

---

## Provider Availability

| Backend | Status (dev machine) |
|---------|----------------------|
| Ollama | AVAILABLE (local) |
| OpenAI / Anthropic | No keys → not wired |
| Cursor SDK | Not installed |

---

## Known Limitations

- Default provider **UNDECIDED** — live adapter is opt-in only
- No model router / reasoning fallback
- Small live eval sample → treat strong rankings as INCONCLUSIVE
- Thinking models may burn tokens before JSON content; raise `REASONING_MAX_OUTPUT_TOKENS`
- Process sandbox still NOT IMPLEMENTED
