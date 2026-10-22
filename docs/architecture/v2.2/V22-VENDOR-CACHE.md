# V22-GOAL-010-vendor — cache hit do provedor

## Adapter

`orchestrator/src/providers/llm/llm-http-provider-adapter.ts`

- Prefixo estável com `cache_control: { type: "ephemeral" }` (Anthropic system block).
- Parse de usage real na resposta (sem simular hit).
- Evidência: `memory/<feature_id>/evidence/vendor-cache-telemetry.json` (JSON sanitizado).

## Campos

| Vendor | Hit quando | Campos |
|--------|------------|--------|
| Anthropic | `cache_read_input_tokens > 0` | `cache_creation_input_tokens`, `cache_read_input_tokens` |
| OpenAI | `prompt_tokens_details.cached_tokens > 0` | `cached_tokens` |

## Live

`probeVendorCacheLive()` — duas chamadas mínimas com o mesmo prefixo se `ANTHROPIC_API_KEY` ou `OPENAI_API_KEY` já existir no ambiente (sem logar segredos). Caso contrário: `status: NOT_MEASURED`, `reason: no_vendor_api_key_in_environment`.

## Testes

Fixtures em `orchestrator/tests/fixtures/vendor-cache/` (formas alinhadas à documentação oficial).
