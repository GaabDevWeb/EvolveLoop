# Evidence

**Normativo.** Schema de evidência — prova verificável de que um nó cumpriu DoD.

Relacionado: [runtime.md](runtime.md), [contracts.md](contracts.md), [capability-ir.md](capability-ir.md)

---

## 1. Propósito

Sem evidence, gates são teatro. Evidence liga **output** a **DoD** de forma auditável.

```
Provider execute → Evidence → validate(evidence, dod) → satisfied | failed
```

---

## 2. Schema base

```yaml
# telemetry/evidence/<node_id>.json
apiVersion: capability-orchestrator.io/v2
kind: Evidence
metadata:
  node_id: fe-login
  run_id: "run-uuid"
  provider_id: frontend-pro
  capability: frontend-ui
  submitted_at: "2026-06-30T10:30:00Z"

spec:
  status: complete                    # complete | partial | failed
  verdict: null                       # gates only: passed | rejected | conditional

  artifacts:
    - id: ui-login
      path: "src/pages/login/"
      type: directory
      checksum: "sha256:..."
    - id: screenshot
      path: ".frontend-review/2026-06-30-login/desktop-light.png"
      type: image
      mime: image/png

  checks:
    - dod_id: dod-fe-1
      result: pass                      # pass | fail | skip | manual
      verification: evidence
      details: "Screenshot capturado desktop + mobile"
    - dod_id: dod-fe-2
      result: pass
      verification: automated
      command: "npm run lint"
      exit_code: 0

  outputs:
    - ref: ui-login
      schema: artifacts/frontend-pages@1.0.0
      validated: true

  logs:
    - path: "telemetry/logs/fe-login.stdout"
      excerpt: "Build completed in 45s"

  duration_ms: 720000
  provider_version: "1.1.0"
```

---

## 3. Evidence por tipo

### Worker

```yaml
spec:
  status: complete
  verdict: null
  artifacts: [...]
  checks: [...]                       # cada dod_id do IR
```

### Gate

```yaml
spec:
  status: complete
  verdict: passed                       # passed | rejected | conditional
  findings: []                          # se rejected
  artifacts:
    - path: ".frontend-review/report.md"
  checks:
    - dod_id: dod-fr-1
      result: pass
```

### Gate rejected

```yaml
spec:
  status: complete
  verdict: rejected
  findings:
    - id: VIS-001
      severity: major
      location: "src/pages/login/"
      description: "Contraste insuficiente no botão submit"
  artifacts:
    - path: ".frontend-review/report.md"
```

---

## 4. Validação

```python
def validate_evidence(evidence, dod_list, contract) -> ValidationResult:
    if evidence.status != "complete":
        return fail("evidence_incomplete")

    for check in dod_list:
        matching = find_check(evidence.checks, check.id)
        if not matching or matching.result != "pass":
            return fail(f"dod_failed:{check.id}")

    if contract.type == "gate" and evidence.verdict is None:
        return fail("gate_verdict_missing")

    for artifact in evidence.artifacts:
        if not file_exists(artifact.path):
            return fail(f"artifact_missing:{artifact.path}")

    return ok()
```

| Falha | Runtime acção |
|-------|---------------|
| `evidence_incomplete` | Tratar como NodeFailed |
| `dod_failed:*` | NodeFailed ou GateRejected |
| `gate_verdict_missing` | NodeFailed |
| `artifact_missing` | NodeFailed |

---

## 5. Schemas especializados

### test-report

```yaml
kind: Evidence
metadata:
  capability: testing
spec:
  verdict: passed
  artifacts:
    - path: "telemetry/evidence/test-report.json"
  checks:
    - dod_id: dod-t-1
      result: pass
  test_summary:
    total: 142
    passed: 142
    failed: 0
    skipped: 3
    duration_ms: 45000
    command: "npm test"
    exit_code: 0
```

### visual-review

```yaml
spec:
  verdict: passed
  artifacts:
    - path: ".frontend-review/2026-06-30-login/desktop-light.png"
    - path: ".frontend-review/2026-06-30-login/mobile-dark.png"
  visual_matrix:
    viewports: [desktop, mobile]
    themes: [light, dark]
    states: [default, error, loading]
  findings: []
```

### po-acceptance

```yaml
spec:
  verdict: rejected
  isolation: true
  findings:
    - id: PO-001
      severity: major
      requirement_ref: "PRD §3.2"
      description: "Empty state ausente no dashboard"
  reviewer:
    type: subagent
    isolated: true
```

---

## 6. Partial evidence

Permitido **só** com policy explícita:

```yaml
spec:
  status: partial
  missing:
    - "screenshot mobile-dark — ambiente indisponível"
  checks:
    - dod_id: dod-fr-1
      result: skip
      details: "Documented limitation"
```

Orchestrator decide se `continuar` com limitação documentada.

---

## 7. Retenção

| Artefacto | Path | Retenção |
|-----------|------|----------|
| Evidence JSON | `telemetry/evidence/` | Permanente por feature |
| Screenshots | `.frontend-review/` | Permanente |
| Logs | `telemetry/logs/` | 30 dias default |

---

## 8. Ligação a eventos

`NodeCompleted` referencia `evidence_ref`. Bus carrega evidence para subscribers.
