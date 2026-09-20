# CI Artifacts e Integração Pipeline

A revisão **termina em artifacts**, não só Markdown.

## Outputs obrigatórios

| Artefacto | Path sugerido | Uso |
|-----------|---------------|-----|
| **Markdown** | `security-report.md` ou no chat | humanos, PR body |
| **JSON** | `security-findings.json` | pipelines, dashboards |
| **Evidence gate** | `telemetry/evidence/<node_id>.json` | EvolveLoop Orquestrador |
| **SARIF** | `security-results.sarif` | GitHub/GitLab code scanning |

## JSON schema (mínimo)

```json
{
  "version": "2.0.0",
  "verdict": "BLOQUEADO - RISCO DETECTADO",
  "security_score": 58,
  "security_grade": "E",
  "findings": [
    {
      "id": "SEC-001",
      "severity": "critical",
      "confidence": "confirmed",
      "evidence_level": "L2",
      "effort": "trivial",
      "priority": "P0",
      "location": { "file": "src/api/users.ts", "line": 42 },
      "cwe": ["CWE-89"],
      "owasp": ["A03:2021"],
      "mitre": ["T1190"],
      "message": "SQL concatenation in user lookup"
    }
  ],
  "attack_chains": [
    { "id": "CHAIN-01", "severity": "critical", "path": ["SEC-004", "SEC-012"] }
  ],
  "threat_coverage": { "authentication": 0.8, "payments": 0.3 },
  "security_debt": { "total_items": 12, "estimated_hours": 27 },
  "capabilities": { "source_code": true, "browser": false }
}
```

## SARIF 2.1.0 (subset)

Gerar quando: pedido explícito, CI, ou `gh pr` integration.

```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [{
    "tool": {
      "driver": {
        "name": "agents-security-review",
        "version": "2.0.0",
        "rules": [{
          "id": "SEC-001",
          "shortDescription": { "text": "SQL Injection" },
          "properties": { "cwe": ["CWE-89"], "security-severity": "9.0" }
        }]
      }
    },
    "results": [{
      "ruleId": "SEC-001",
      "level": "error",
      "message": { "text": "SQL concatenation in user lookup" },
      "locations": [{
        "physicalLocation": {
          "artifactLocation": { "uri": "src/api/users.ts" },
          "region": { "startLine": 42 }
        }
      }]
    }]
  }]
}
```

`level`: `error` = crítica/alta, `warning` = média, `note` = baixa/informativa.

## PR Comments / GitHub Annotations

Se `gh` disponível e PR conhecido, formato sugestão:

```markdown
## 🔒 Security Gate — BLOQUEADO

**Score:** 58/100 (E) | **Bloqueantes:** SEC-001, CHAIN-01

### P0 — corrigir agora
- **SEC-001** (CWE-89, L2) `src/api/users.ts:42` — SQLi — ~30min
```

Para annotations: cada finding vira linha `::error file=path,line=N::SEC-001 message` (GitHub Actions workflow).

## Handoff checklist

- [ ] `security-findings.json` gerado
- [ ] SARIF se CI
- [ ] Evidence JSON com score, coverage, debt
- [ ] Markdown relatório completo [output-contract.md](output-contract.md)
