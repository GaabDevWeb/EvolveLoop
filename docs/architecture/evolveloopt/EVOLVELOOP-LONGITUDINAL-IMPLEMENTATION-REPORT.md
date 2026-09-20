# EvolveLoop — Longitudinal Evolution Report

## 1. Executive Summary

**Antes:** o EvolveLoop detectava padrões sobretudo numa única chamada `run(observations)` — episódico.

**Problema:** sem memória entre execuções, não havia recorrência longitudinal real nem feedback pós-evolução.

**Construído:** store persistente (JSONL), agregação cross-run (`unique_executions`), needs com lifecycle, outcomes pós-mudança, adapter JSONL (outros NOT_CONNECTED), controller `ingest` → `analyze` → `recordOutcome`.

**Agora possível:** Run1/2/3 separados → histórico → pattern → need → candidate → HOLD/SUBMIT → outcome → RESOLVED/REMAINS_ACTIVE/REGRESSED/INCONCLUSIVE.

**Ainda não:** telemetria live completa, Evidence/Eval adapters, autonomia de implementação, promoção automática ao Core.

## 2. What Changed

- `PersistentSignalStore` em `evolution/` (separado de knowledge/memory/telemetry)
- `CrossRunAggregator` exige ≥3 execuções distintas
- `LongitudinalNeedDetector` + lifecycle
- `OutcomeTracker` (nunca SUCCESS sem critério)
- `LongitudinalEvolveLoop`
- `resolveDataPaths.evolutionDir`
- Evals EV-EVOLVE-002…007 em testes
- Diagnóstico registry-aware (inventário injectado)

## 3. How EvolveLoop Works Now

```text
Usage → Observation (+ adapter)
  → ingest (persist signal)
  → [restart ok]
  → analyze (window 7d default)
  → Pattern (unique_executions)
  → Need (lifecycle)
  → RCA + inventory advice
  → Candidate → EvolutionRequest
  → Prototype Gate path (USER submit / CORE HOLD)
  → (later) recordOutcome → Need lifecycle update
  → LOOP
```

## 4. Before vs After

| | Before | After |
|--|--------|-------|
| Persistence | optional snapshot | append JSONL + restart-safe |
| Pattern rule | frequency ≥ 3 signals | unique_executions ≥ 3 |
| Cross-run | one batch | multiple ingest then analyze |
| Outcome | none | IMPROVED/UNCHANGED/REGRESSED/INCONCLUSIVE |
| Core | HOLD | HOLD (unchanged policy, now longitudinal) |

## 5. Real Capabilities

- Persistent signals with query/filter/window  
- Cross-run / cross-session detection (same dir)  
- User isolation queries  
- CORE_CANDIDATE aggregation + HOLD  
- Outcome tracking  
- JSONL NodeFailed adapter CONNECTED  
- False positive: same-execution triple ≠ pattern  

## 6. User-Specific Evolution

USER_LOCAL needs stay scoped; User A signals não misturam com User B nas queries.

## 7. Core Evolution

≥3 users ou ≥2 projects → CORE_CANDIDATE → `requested_action=HOLD` (sem auto Core).

## 8. Detection

Recorrência = execuções independentes na janela (24h/7d/30d). Timestamps futuros rejeitados.

## 9. Persistence

`{dataRoot}/evolution/signals.jsonl`, `needs.json`, `outcomes.jsonl`, `fingerprints.json`.

## 10. Post-Evolution Feedback

`recordOutcome` compara failure rates before/after; só IMPROVED → RESOLVED. Implementação sozinha não resolve.

## 11. Safety and Autonomy

Autonomous: observe/ingest/analyze/propose. Gated: prototype/implement/core. `unauthorized_mutation=false` (control plane).

## 12. Testing

- Unit episodic: 17  
- Longitudinal: 15 (EV-002…007)  
- Full suite: **135/135**  
- Contracts 7 · full-cycle 5 (dentro da suite)

## 13. Evidence

| Class | Examples |
|-------|----------|
| OBSERVED | 135 tests pass; V1/V2 checksums OK |
| MEASURED | unique_executions patterns in harness |
| SYNTHETIC | dayObs / longitudinalFailureArc |
| INFERRED | RCA table mapping |
| UNKNOWN | production live effectiveness |

## 14. Architecture

Reusa paths/telemetry/events; não cria segundo registry/RAG/evidence bus. Evolution state semanticamente separado.

## 15. Performance

Não há benchmark de produção; retention trim em 10k signals; max 20 candidates/ciclo.

## 16. Security / Privacy

Scope isolation por user_id; CORE não auto-aplica; adapters não inventam sinais quando NOT_CONNECTED.

## 17. Remaining Limitations

- Evidence/Eval/user-feedback adapters NOT_CONNECTED  
- PatternAggregator in-run ainda não composto  
- Outcome heuristic simples (rates); auditoria independente: risco de IMPROVED com `afterTotal=0` e lifecycle REGRESSED/REMAINS_ACTIVE reescrito no próximo `analyze`  
- `analyze()` agrega o store inteiro salvo filtro explícito do caller (isolamento forte só nas queries por user)  
- Retention: trim só em `signals.jsonl` (10k); `outcomes`/`needs` sem bound  
- Flags de não-mutação declarativos  
- Independent audit: **PASS_WITH_LIMITATIONS** (persistência e `unique_executions≥3` reais; outcome/provenance/bounds fracos)

## 18. Unsupported Claims

Ver `docs/architecture/evolution/UNSUPPORTED-CLAIMS.yaml` (incl. “fully self-improving”, “production longitudinal proven”).

## 19. Future Work

- Wire Evidence[] / eval runs adapters  
- Compose PatternAggregator → SignalMiner  
- Stronger outcome metrics  

## 20. Final Status

| Item | Status |
|------|--------|
| Implementation | COMPLETE_WITH_LIMITATIONS |
| Validation | 135/135 + EV-002…007 |
| Baseline | V1/V2 intact; **V3** created |
| Architecture | reconciled to docs |

**Final:** `SUCCESS_WITH_LIMITATIONS`
