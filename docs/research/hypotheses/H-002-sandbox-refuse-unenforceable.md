# H-002 — Refuse-if-unenforceable reduces false safety

```yaml
id: HYP-002
hypothesis: >
  Se Policy recusar posturas "full access" quando o host não consegue aplicar sandbox equivalente,
  sob condição de ferramentas shell/MCP, esperamos observar menos execuções com isolamento declarado
  mas falso, medido por auditoria de posture labels vs capacidade real.
based_on:
  - P-005
  - GAP-001
  - targets/external/codex M02/M04 AP04
expected_effect: Fewer falsely labeled safe runs; clearer user prompts when enforcement missing
assumptions:
  - We can detect enforceability signals from host
risks:
  - UX friction; users disable Policy
experiment: E-002
success_criteria:
  - 100% of runs labeled sandboxed have verified enforcement signal OR are refused
failure_criteria:
  - Labels remain claim-only
  - Refusals block all legitimate local work without alternative posture
```
