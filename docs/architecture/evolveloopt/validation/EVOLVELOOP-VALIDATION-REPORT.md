# EvolveLoop Independent Validation Report

## 1. Executive Summary

Auditoria independente do EvolveLoop longitudinal em `orchestrator/src/evolveloop/**`.  
**Veredito:** `VALIDATED_WITH_LIMITATIONS`.

O núcleo **lembra** (persistência JSONL + restart de instância) e **usa o histórico** em `analyze()` para padrões cross-run (`unique_executions ≥ 3`) e needs. Três defeitos críticos/altos foram **comprovados e corrigidos** (empty-after→IMPROVED, overwrite de lifecycle, `analyze` sem filtro de user). Limitações restantes: isolamento multi-user incompleto por omissão, adapters não auto-ligados, outcomes não re-lidos no `analyze`, dual-stack episódico/longitudinal, e **zero prova de produção**.

## 2. Starting State

| Item | Estado OBSERVED |
|------|-----------------|
| Package | `@agents/orchestrator` + `src/evolveloop` |
| Docs prior | `SUCCESS_WITH_LIMITATIONS`, claims IMPLEMENTED_* |
| Schemas dir | vazio |
| Baseline V1 | `docs/evals/baseline` checksum OK; `index.ts` DRIFT |
| Baseline V2 | checksum OK; `evolveloop/index.ts` + `index.ts` DRIFT |
| Baseline V3 | checksum OK; fingerprints longitudinais OK **antes** das correções |
| Tests at start | **135/135** executados e PASS |
| Ambiente | Node 24.15 / vitest 2.1.9 / Linux amd64 |

Artefacto: `validation/AUDIT-START-STATE.{md,yaml}`.

## 3. What the Previous Agent Claimed

- Persistência, cross-run, need, RCA, candidates: IMPLEMENTED  
- Core: IMPLEMENTED_HOLD  
- Outcome/closed-loop: IMPLEMENTED_WITH_LIMITATIONS  
- 135/135 · 7/7 · 5/5 · V3 criada  
- Auto-admitiu riscos: empty-after IMPROVED, lifecycle overwrite, `analyze` agrega store  

Estas claims foram tratadas como **hipóteses**, não factos.

## 4. What Was Actually Verified

| Propriedade | Resultado |
|-------------|-----------|
| Código existe | OBSERVED |
| Persistência consumida por `analyze` | MEASURED (sinais + needs) |
| Cross-run real no controller | MEASURED |
| Same-run ≠ 3 execuções | MEASURED |
| Histórico entre instâncias | MEASURED |
| CORE → HOLD | MEASURED |
| Empty-after IMPROVED (pré) | CONTRADICTED → corrigido |
| Lifecycle overwrite (pré) | CONTRADICTED → corrigido |
| Isolamento `analyze` (pré) | CONTRADICTED → API corrigida; default residual |
| Adapters live | PARTIAL (helper JSONL only) |
| Produção | NOT_VALIDATED |

## 5. Stage-by-Stage Audit

### Signal Mining
`SignalMiner` normaliza fingerprint, `synthetic`, scope, timestamp. Dedupe em memória por instância; store garante idempotência por fingerprint. Timestamps futuros rejeitados (`parseTimestamp` + append).

### Persistence
`signals.jsonl` + `fingerprints.json` + `needs.json` + `outcomes.jsonl`. Write/read/query/restart-de-instância **VERIFIED**. Trim 10k signals. Outcomes/needs sem bound.

### Cross-Run
`CrossRunAggregator` exige `unique_executions ≥ 3`. Run A/B/C separados → pattern. Same-execution triple → 0 patterns.

### Need Detection
Consome patterns históricos (não só batch episódico). Lifecycle: OBSERVED/EMERGING/ESTABLISHED/STALE/RESOLVED/REOPENED/REMAINS_ACTIVE/REGRESSED.

### RCA
Tabela determinística `PATTERN_TO_CAUSE` + alternativas + uncertainties. **Não** é diagnóstico causal provado. Registry-aware = inventory injectado.

### Candidates
Geração + validação + cap 20. AGENT exige alternativa SKILL. CORE → HOLD.

### User/Core
Query isolável. `analyze({user_id})` isolável **após correção**. Sem filtro = store inteiro. CORE_CANDIDATE multi-user → HOLD sem mutação.

### Outcome
Before/after caller-supplied. Pós-correção: `afterTotal===0` → INCONCLUSIVE. REGRESSED preservado no re-analyze.

### Closed Loop
```
Run A ingest → disk
Run B ingest → disk
Run C ingest → analyze lê histórico → pattern → need → candidate → request
recordOutcome → needs.lifecycle
analyze seguinte usa sinais (+ lifecycle preservado)
```
Outcomes **não** são lidos de volta. Não ligado ao CLI/engine.

### Adapters
JSONL: função CONNECTED, **não** auto-wire. Evidence/Eval/Feedback: NOT_CONNECTED.

### Authoring
Handoff JSON (`SUBMIT_TO_PROTOTYPE_GATE` / HOLD). Sem runtime paralelo de authoring.

### Security
Autonomia PROPOSE; sem path de mutação core/runtime no package. Flags `unauthorized_mutation`/`mutates_*` são literais. Isolamento FS = quem tem o dir.

### Evals
EV-EVOLVE-001 (episódico) + 002–007 (longitudinal describes). Provam harness, não produção.

### Regression
Pré: 135/135. Pós-correção: **138/138**. Contracts 7, full-cycle 5 intactos.

## 6. Critical Findings

1. **CRITICAL** empty-after → IMPROVED (corrigido)  
2. **HIGH** lifecycle REGRESSED overwrite (corrigido)  
3. **HIGH** `analyze` sem scope (API corrigida; default residual)

## 7. Confirmed Defects

Ver `FINDINGS.yaml`. Defeitos comprovados por execução adversarial (`vite-node` harness fora da árvore).

## 8. False Claims / Overclaims

- `user_scope: IMPLEMENTED` sem qualificar default unscoped  
- `jsonl CONNECTED` como live pipeline  
- `registry_aware: true` como consulta a registry live  
- `tests: 135/135` após novas regressões  
- Qualquer claim de eficácia em produção  
- Closed-loop “completo” se incluir consumo de `outcomes.jsonl`

## 9. Corrective Changes

Três correções locais (`CORRECTIONS.yaml`):

1. `outcome-tracker.ts` — empty-after  
2. `need-lifecycle.ts` — preservar REGRESSED/REMAINS_ACTIVE  
3. `longitudinal-controller.ts` — `user_id`/`project_id` em `analyze`  

Baselines V1/V2 **não** alteradas. V3 ficou em drift pós-fix (documentado; v4 não criada automaticamente).

## 10. Test Results

```
Environment: Node v24.15.0, vitest 2.1.9, linux x86_64
Before: 135 passed / 135
After:  138 passed / 138 (29 files)
EvolveLoop: 17 episodic + 18 longitudinal
Contracts: 7/7 · Full-cycle: 5/5
```

## 11. Eval Results

| Eval | Prova | Não prova |
|------|-------|-----------|
| 001 | Pipeline episódico sintético | Longitudinal |
| 002 | Persistência entre instâncias + idempotência | Crash/fsync real |
| 003 | unique_executions + false positive same-run | Produção |
| 004 | query user isolation | analyze default / needs partition |
| 005 | CORE HOLD | Gate downstream |
| 006 | Outcomes + lifecycle + empty-after + analyze filter | Eficácia real |
| 007 | Future ts + storm bound | DoS/retention real |

## 12. Security

Sem mutação silenciosa de core/runtime neste package. HOLD para CORE. Residual: store partilhado, paths caller-controlled, metadata sem redaction, flags não medidas.

## 13. Privacy / Isolation

| Mecanismo | Estado |
|-----------|--------|
| `query({user_id})` | VERIFIED |
| `analyze({user_id})` | VERIFIED pós-fix |
| `analyze()` default | Agrega todos |
| `needs.json` | Global no dir |
| `replayAnalyze` | Sem user filter |

## 14. Architecture Integrity

Dual-stack: `EvolveLoopController` (episódico) + `LongitudinalEvolveLoop`. Stores/detectors duplicados; RCA/candidates partilhados. Sem segundo Policy Engine. Path `evolution/` separado de knowledge/memory/telemetry.

## 15. Longitudinal Behavior

**Sim — no harness:**

```
Run A → persisted signal
Run B → persisted signal (nova instância OK)
Run C → historical retrieval via store.query
     → CrossRunAggregator → Pattern
     → LongitudinalNeedDetector → Need
```

O histórico **influencia** ciclos futuros. Isto **não** é só array in-memory do mesmo `run()`.

## 16. Post-Evolution Feedback

`recordOutcome` actualiza lifecycle da need. Pós-correção, REGRESSED/REMAINS_ACTIVE sobrevivem ao próximo `analyze`.  
`outcomes.jsonl` é append-only e **não** alimenta a agregação seguinte — fecho é **lifecycle-mediated**, não outcome-reingestion.

## 17. What EvolveLoop Can Do Now

- Persistir sinais com dedupe e rejeição de timestamps futuros  
- Agregar cross-run / cross-instância no mesmo `evolutionDir`  
- Detectar needs longitudinais e propor candidates  
- HOLD em CORE_CANDIDATE  
- Avaliar outcomes com empty-after seguro  
- Isolar análise **quando** o caller passa `user_id`/`project_id`  
- Adaptar ficheiros JSONL NodeFailed/FeatureBlocked (manual)

## 18. What It Still Cannot Do

- Isolamento multi-tenant por omissão  
- Consumir outcomes no próximo `analyze`  
- Ligar telemetria/Evidence/Eval/Feedback automaticamente  
- Consultar registries live sem inventory injectado  
- Mutar/implementar evolução (só PROPOSE/handoff)  
- Provar eficácia em produção  
- Garantir `unauthorized_mutation=false` como medição runtime

## 19. Unsupported Claims

Ver `CLAIM-VERIFICATION.yaml` `unsupported_remaining` e `docs/architecture/evolution/UNSUPPORTED-CLAIMS.yaml`.

## 20. Open Questions

1. Deve `analyze()` **exigir** `user_id` em vez de optar?  
2. Particionar `needs.json` / outcomes por user?  
3. Quando wire JSONL→ingest no engine?  
4. Baseline-v4 após estas correções?  
5. Consolidar stack episódico vs longitudinal?

## 21. Final Verdict

**VALIDATED_WITH_LIMITATIONS**

Diferenciação obrigatória:

| Afirmação | Valor |
|-----------|-------|
| The code exists | **true** |
| The behavior works (harness) | **true** |
| The behavior was experimentally validated | **true** (fixtures + adversarial) |
| The behavior works in production | **false / UNKNOWN** |

---

### Artifact index

- `AUDIT-START-STATE.md` / `.yaml`  
- `AUDIT-MATRIX.yaml`  
- `FINDINGS.yaml`  
- `CORRECTIONS.yaml`  
- `CLAIM-VERIFICATION.yaml`  
- `FINAL-AUDIT-MATRIX.yaml`  
- `VALIDATION-VERDICT.yaml`  
- `EVOLVELOOP-VALIDATION-REPORT.md` (este ficheiro)
