# Evidence schema — gate `security-review` v2

```yaml
kind: Evidence
metadata:
  node_id: security-gate
  capability: security-review
  provider_id: security
  framework_version: "2.1.0"
spec:
  status: complete
  verdict: passed | rejected
  security_summary:
    executive: SEGURO PARA RELEASE | BLOQUEADO - RISCO DETECTADO
    security_score: 72
    security_grade: C
    critical_count: 0
    high_count: 0
    attack_chains:
      - id: CHAIN-01
        severity: critical
        path: [SEC-004, SEC-012]
    gate_phase_5: LIBERADO | BLOQUEADO
  capabilities:
    source_code: true
    docker: true
    internet: false
    browser: false
  threat_coverage:
    authentication: 0.8
    authorization: 0.7
    payments: 0.3
    dynamic: 0.0
  security_debt:
    total_items: 12
    critical: 3
    estimated_hours: 27
    blocking_ids: [SEC-003]
  findings:
    - id: SEC-001
      severity: critical
      confidence: confirmed
      evidence_level: L2
      effort: trivial
      priority: P0
      cwe: [CWE-89]
      owasp: ["A03:2021"]
      mitre: [T1190]
  artifacts:
    markdown: security-report.md
    json: security-findings.json
    sarif: security-results.sarif
  false_negatives: []
  needs_dynamic_test: [SEC-011]
```

Schema: `Cursor/orchestrator/schemas/evidence/security-review@2.0.0.json` (quando existir).

Artefactos CI: [ci-artifacts.md](ci-artifacts.md).
