# EvolveLoop Stabilization & Live Integration Report

## 1. Estado antes

`VALIDATED_WITH_LIMITATIONS`: persistência e cross-run OK; `analyze()` default inseguro; outcomes não reingeridos; registry só injectado; runtime não ligado.

## 2. Problemas encontrados / 3. Correções

| Problema | Correção |
|----------|----------|
| analyze() sem scope | `AnalysisScope` obrigatório → `REQUIRES_SCOPE`; SYSTEM + `authorize_system` |
| empty-after / low-sample | INCONCLUSIVE |
| Outcomes órfãos | `loadOutcomes` + sinais `post_evolution_*` + `lifecycle_history` |
| Inventory injectado | `snapshotInventoryFromRegistry(CapabilityRegistry)` |
| Sem runtime | `attachEvolveLoopObserver` + `ExecutionEngine` opt-in |
| Analysis storm | `AnalysisCadence` |

## 4. Novo fluxo

```
EventBus/JSONL → ingest → PersistentSignalStore
→ analyze(scope) → patterns → needs (outcome-aware)
→ RCA + live inventory → candidates → EvolutionRequest
→ (gate externo) → recordOutcome → outcomes + post_evolution signal
→ next analyze(scope) ↺
```

## 5. Scope

Tipos: USER | PROJECT | WORKSPACE | SYSTEM. Sem scope = bloqueio. SYSTEM exige autorização explícita + nota de audit.

## 6. Histórico

JSONL + fingerprints; restart de instância; `analyze` consome `store.query` filtrado por scope.

## 7. Outcomes retornam

`recordOutcome` persiste + reingere sinal sintético; `analyze` chama `loadOutcomes` e preserva REGRESSED/REMAINS_ACTIVE/RESOLVED.

## 8. Registry lookup

Lê `CapabilityRegistry` real (capabilities/providers). Skills/agents via `agentsRoot` scan ou `skillsHint`. Não cria segundo registry.

## 9. Adapters

| Adapter | Status |
|---------|--------|
| jsonl-events | CONNECTED |
| runtime-eventbus | CONNECTED |
| evidence-bus | NOT_CONNECTED |
| eval-results | NOT_CONNECTED |
| user-feedback | NOT_CONNECTED |

## 10. Runtime dispara observação

Opt-in: `new ExecutionEngine({ evolveLoop, evolveScope })`. Observer non-blocking. CLI default **não** activa.

## 11. Loop fechado

Demonstrado em harness (L-005, L-007, L-008, engine-evolve-hook). Handoff ao gate = ficheiro; implementação/outcome window automático = gap.

## 12–13. Validado vs fixture

**Validado (harness):** scope, history, cross-run, outcome reingest, live registry snapshot, EventBus→signal, cadence, CORE HOLD.  
**Fixture / não produção:** eficácia longitudinal em tráfego real; evidence/eval/feedback.

## 14. Ainda não conectado

Evidence bus, eval adapter, user feedback; CLI auto-wire; scheduler automático de janela pós-evolução.

## 15–17. Segurança / Privacidade / Performance

Autonomia PROPOSE; CORE HOLD; sem mutação silenciosa. Isolamento por scope obrigatório. 1k signals ~OK em auditoria anterior; cadence limita storms.

## 18. Evals

EV-EVOLVE-L-001…008 → **8/8 PASS** (fixture claims documentados nos testes).

## 19. Regressions

**162/162** tests; contracts 7/7; full-cycle 5/5.

## 20. Baseline final

`baseline-v4-2026-09-19` (V1–V3 intactos).

## 21–22. Limitações / gaps

5 gaps abertos (FINDINGS.yaml). Claims proibidas: production proven, fully autonomous, fully self-improving.

### ANTES → DEPOIS (só o comprovado)

| | ANTES | DEPOIS |
|--|-------|--------|
| Scope | opcional perigoso | obrigatório |
| Outcome | persist-only | reingerido |
| Registry | injectado | snapshot live CapabilityRegistry |
| Runtime | não wired | EventBus observer opt-in |
| Closed loop | parcial | harness closed + handoff |

### Claims

| Claim | Status |
|-------|--------|
| persistent | VERIFIED |
| longitudinal | VERIFIED (harness) |
| user-specific | VERIFIED (scoped) |
| adaptive | PARTIALLY_VERIFIED |
| closed-loop | PARTIALLY_VERIFIED |
| autonomous observation | VERIFIED (when hooked) |
| autonomous detection/proposal | VERIFIED (analyze path) |
| registry-aware | VERIFIED (live snapshot) |
| live | PARTIALLY_VERIFIED |
| production | CONTRADICTED / unsupported |
| self-improving | CONTRADICTED / unsupported |

**Final status:** `SUCCESS_WITH_LIMITATIONS`
