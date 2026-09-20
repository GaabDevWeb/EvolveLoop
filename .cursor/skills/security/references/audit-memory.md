# Memória entre auditorias

Persistir estado entre execuções do gate no **mesmo projeto**.

## Path sugerido

`telemetry/security-history/<project_id>/findings-snapshot.json`

`project_id` = hash do repo root ou nome do pacote em `package.json`.

## Snapshot (após cada auditoria)

```json
{
  "audit_id": "2026-07-01T12:00:00Z",
  "verdict": "BLOQUEADO",
  "findings": [
    {
      "fingerprint": "sha256:src/comments.tsx:innerHTML:userContent",
      "sec_id": "SEC-004",
      "title": "Stored XSS",
      "severity": "high",
      "status": "open"
    }
  ]
}
```

**Fingerprint:** `hash(arquivo + sink + categoria)` — estável entre SEC IDs.

## Regressão

Na auditoria N+1, comparar fingerprints:

| Estado | Acção |
|--------|-------|
| Fingerprint existia como **fixed** e reaparece | **REGRESSÃO DETECTADA** — SEC novo ou reabrir |
| Mesmo fingerprint ainda open | referenciar histórico; não duplicar como novo |
| Fingerprint novo | SEC normal |
| Fingerprint ausente (estava open) | marcar **presumed fixed** (não afirmar sem diff) |

```markdown
### Regressões

| ID | Original | Audit anterior | Evidência |
|----|----------|----------------|-----------|
| SEC-019 | SEC-004 XSS comments | 2026-06-15 fixed | innerHTML linha 88 de novo |
```

Regressão crítica/alta L2+ → **bloqueio** mesmo se utilizador ignorou antes.

## Integração

- report-consolidator grava snapshot após veredito
- Orquestrador lê snapshot no início se ficheiro existir
- Evidence JSON: `regressions: [{ ... }]`

Se sem histórico → secção omitida com nota "primeira auditoria".
