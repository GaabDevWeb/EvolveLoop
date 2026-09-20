# Evidence schema — gate `testing`

Alinhado a `orquestrar/references/specs/evidence.md`.

Quando o orquestrador invoca via PDA, produzir **dois** artefactos:

1. Relatório humano — [templates/test-report.md](../templates/test-report.md)
2. Evidence JSON — `telemetry/evidence/<node_id>.json`

```yaml
kind: Evidence
metadata:
  node_id: test-suite
  capability: testing
spec:
  status: complete
  verdict: passed | rejected    # gate — rejected se VERMELHO irrecuperável no scope
  checks:
    - dod_id: dod-t-1
      result: pass
      verification: automated
      command: "<comando>"
      exit_code: 0
  test_summary:
    total: N
    passed: N
    failed: 0
    command: "..."
    exit_code: 0
```

**Veredito humano → gate:**

| Veredito relatório | `spec.verdict` |
|--------------------|----------------|
| VERDE | `passed` |
| VERMELHO | `rejected` |
| SUBSTITUTO | `passed` com risco residual explícito no relatório |
