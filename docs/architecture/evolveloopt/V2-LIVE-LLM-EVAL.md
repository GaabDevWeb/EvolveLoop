# V2 Live LLM Evaluation

**Suite version:** `live-llm-v1.0.0`  
**Prompt version:** `agent-decision-v1.0.0`  
**Branch:** `evolve-v2`  
**Default provider:** UNDECIDED (unchanged)

---

## Environment

- Host: local Linux
- Discovery: Ollama binary + `http://127.0.0.1:11434/api/tags`
- Cloud keys: none observed for OpenAI/Anthropic

## Provider

- Adapter: `ollama` (`OllamaReasoningProvider`)
- Tested provider ≠ default provider

## Model

- `bonsai-64k:latest` (local Ollama)

## Test Suite

Cases in `orchestrator/src/agent/evals/live-cases.ts` (17 total).

```bash
cd orchestrator
REASONING_MODE=live REASONING_PROVIDER=ollama OLLAMA_MODEL=bonsai-64k:latest \
  npm run eval:llm -- --live
# optional: --limit N | --cases id1,id2
```

## Results

### Run 2026-09-20T17:11Z — probe (limit 3)

| Metric | Value |
|--------|-------|
| eval_id | `8e4577b2-aad1-4e24-8a06-3715349a7425` |
| pass/fail | 1/2 |
| note | thinking-only empty content before parse fallback |

Artifact: `orchestrator/eval-artifacts/live-llm-8e4577b2-aad1-4e24-8a06-3715349a7425.json`

### Run 2026-09-20T17:13–17:27Z — planning + capability (limit 8)

| Metric | Value |
|--------|-------|
| eval_id | `18442200-78b7-4354-bfa1-aa88f20f8211` |
| pass/fail | 6/2 |
| schema_valid_rate | 0.75 |
| task_completion_rate | 0.75 |
| capability_selection_accuracy | 0.67 |
| latency_ms_avg | 85615 |
| tokens_total | 9720 |
| cost | unknown |
| failures | 2× HTTP timeout (120s) |

### Run 2026-09-20T17:28–17:39Z — replan / grounding / policy / robust

| Metric | Value |
|--------|-------|
| eval_id | (see newest `eval-artifacts/live-llm-*.json`) |
| cases | 6 |
| pass/fail | 5/1 |
| replan_success_rate | 1.0 |
| grounding_success_rate | 0.5 |
| policy_compliance_rate | 1.0 |
| failures | ground-missing-fact empty content |

**Combined observed (14 distinct cases across runs):** connectivity **AVAILABLE**; sample still **small → INCONCLUSIVE** for ranking.

## Schema Validity

Offline mocked: **PASS**. Live subset: ~0.67–0.75.

## Semantic Validation

Offline: **PASS**. Live unknown-capability timeout once; otherwise executor validation holds.

## Capability Selection

Live partial: ~0.67 on measured subset. **INCONCLUSIVE** for promotion.

## Replanning

`replan-provider-switch` → `REPLAN_PROPOSAL` **PASS**.

## Grounding

known-fact **PASS**; missing-fact **FAIL** (empty model content). **PARTIAL**.

## Policy Compliance

Runtime DENY preserved on forbidden FS / injection cases (**PASS**). LLM never bypasses A03.

## Latency

~34s–180s per case on bonsai-64k local (thinking-heavy).

## Token Usage

Recorded from Ollama eval counts when present.

## Cost

**unknown**

## Failures

Timeouts and empty thinking-only responses on some prompts. Adapter now extracts JSON from thinking for parse only (not stored).

## Known Limitations

- Small sample; do not rank providers
- High latency on large local model
- Full 17-case single-run not required for adapter DoD when connectivity + categories sampled

## Recommendation

Keep **default_provider = UNDECIDED**. Ollama is a viable **tested** local adapter for further evals — not an architectural default.
