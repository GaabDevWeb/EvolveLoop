# Eval Runner Handoff

**Catalog version:** 1  
**Baseline:** `baseline-v1-2026-09-18`  
**This phase:** SPECIFIED — do not treat as EXECUTED  

## What can be executed now?

| Eval | How |
|------|-----|
| EV-001 | vitest full-cycle + contracts |
| EV-002 | vitest registry + contracts |
| EV-003 | vitest registry* |
| EV-004 | vitest authority + policy-engine |
| EV-005 | vitest evidence |
| EV-007 | `python3 integrity_test.py` + `catalog_harness.py dry` |
| EV-008 | same harness; assert PROXY + token inequalities |
| EV-009 | `npm test` + contracts + full-cycle + baseline checksum |

## What needs fixture formalization first?

| Eval | Need |
|------|------|
| EV-006 | Disposable jobsDir + E-005 mutation instrumentation procedure as Eval runbook |

## What remains blocked?

| Eval | Blocker |
|------|---------|
| EV-F-001 | ENVIRONMENT (live task_success) |
| EV-F-002 | RUNTIME (global exactly-once) |
| EV-F-003 | Prototype Gate / PT-002 |
| EV-F-004…F-006 | ARCHITECTURE |

## Fixtures that exist

- `orchestrator/tests/fixtures/login-dashboard.ts`  
- E-001 `conditions.yaml` + `harness/`  
- E-005 FIXTURE.md / raw pattern (historical)  

## Commands (READY set)

```bash
# EV-009 / invariants
cd orchestrator && npm test
npx vitest run tests/contracts/contract-prototype.test.ts
npx vitest run tests/integration/full-cycle.test.ts
cd ../docs/evals/baseline && sha256sum -c BASELINE-CHECKSUMS.sha256

# EV-001
cd orchestrator
npx vitest run tests/integration/full-cycle.test.ts
npx vitest run tests/contracts/contract-prototype.test.ts

# EV-002 / EV-003
npx vitest run tests/unit/registry.test.ts tests/unit/registry-builder.test.ts tests/unit/registry-contract.test.ts
npx vitest run tests/contracts/contract-prototype.test.ts

# EV-004
npx vitest run tests/unit/authority.test.ts tests/unit/policy-engine.test.ts

# EV-005
npx vitest run tests/unit/evidence.test.ts

# EV-007 / EV-008
cd docs/evals/experiments/E-001/harness
python3 integrity_test.py
python3 catalog_harness.py dry
```

## Outputs to collect

```yaml
eval_result:
  eval_id:
  version: 1
  baseline_id: baseline-v1-2026-09-18
  run_id:
  status: PASS | FAIL | INCONCLUSIVE | BLOCKED
  metrics: []
  observations: []
  evidence_ids: []
  artifacts: []
  limitations: []
```

## Metrics / oracles

See each `specs/EVAL-EV-00X.yaml` `eval_contract.oracle` and success_criteria.

## Baseline invariants must be checked

Always run **EV-009** after any Eval campaign that touches orchestrator/jobs harnesses.

## Safety

- Do not write `docs/evals/baseline/`  
- Do not modify `orchestrator/src` or `.cursor/skills` for Evals  
- Do not upgrade PROXY → DIRECT  
- Do not claim global exactly-once from EV-006  
- Do not treat activation as task_success  

## Next agent

**Eval Runner** — execute READY evals only; leave BLOCKED untouched.
