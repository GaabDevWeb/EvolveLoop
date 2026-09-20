# Quality gates — Agent Package

Antes de `ACTIVATE` / `status: stable`:

## Críticos (falha → `NOT_READY`)

- [ ] Responsabilidade única e DO/DO NOT explícitos
- [ ] Sem duplicação material (`REJECT_DUPLICATE` não aplicável, ou justificado)
- [ ] Pacote mínimo: `SKILL.md` + command `/`
- [ ] `description` com triggers + exclusões de irmãs
- [ ] Capability scope declarado (required/optional/forbidden ou equivalente em DO NOT)
- [ ] PDA role(s) coerentes com o tipo (worker/gate/…)
- [ ] Output/handoff estruturado (não prosa solta)
- [ ] Evals existem com casos de boundary + ≥1 negativo/adversarial se agente pipeline
- [ ] Policy: skill **não** auto-concede autoridade; respeita Policy Engine / isolation de gates
- [ ] Integração: install list e/ou provider+contract **ou** `DEFERRED` explícito no relatório

## Importantes (falha → `NOT_READY` para Tier 1–2; `DEFERRED` ok para meta/experimental)

- [ ] `provider.yaml` válido (`kind: Provider`)
- [ ] Contract YAML se capability nova
- [ ] Evidence alinhada a Evidence Bus / schemas
- [ ] Telemetry key no provider
- [ ] Agents espelho sincronizado com skill (versão/status)
- [ ] Context contract (inputs) — Relevant Context > Maximum Context
- [ ] Degradation / failure model documentados
- [ ] Evals passam em runners isolados (with_skill > baseline em ≥50% — protocolo skill-authoring)

## Observabilidade (quando runtime aplicável)

Declarar que o provider/engine deve poder correlacionar: `agent/provider id`, version, task/feature, capabilities pedidas/executadas, policy decisions, evidence paths, status — **via telemetria existente**, sem bus paralelo.

## Relatório de validação

```text
status: READY | NOT_READY
gates_failed: []
decision: NEW_AGENT | EXTEND_... | ...
artifacts: []
deferred: []
```
