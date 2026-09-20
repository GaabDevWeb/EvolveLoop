# Auto-planeamento (via Capability Registry)

Após [capability-matrix.md](capability-matrix.md) e **modo** ([cost-modes.md](cost-modes.md)).

## Algoritmo

```text
1. Ler capability-registry.yaml
2. mode = fast | standard | deep (default standard)
3. Para cada provider no registry:
   - skip se mode não listado
   - skip se requires_capabilities falham na matrix
   - include se always: true
   - include se qualquer signal match no repo (grep/ler ficheiros chave)
4. Merge stack_profiles (knowledge-base) → boost suggested_capabilities
5. Aplicar max_providers se fast
6. Ordenar: always primeiro → tier low → signals count desc
```

**Não** manter tabela hardcoded de especialistas aqui — fonte única: [capability-registry.yaml](../capability-registry.yaml).

## Scanners

Se terminal ✓, providers com `tools` no registry podem executar (npm audit, gitleaks, etc.) — ver [dynamic-pentest.md](specialists/dynamic-pentest.md).

## Plano no relatório

```markdown
### Plano de Auditoria

**Modo:** standard | **Registry v:** 2.1.0

| Provider | Capabilities | Motivo (signal) | Tier |
|----------|--------------|-----------------|------|
| auth-reviewer | auth-review | jwt no src/ | medium |
```

## Iteração

Após execução → [adaptive-execution.md](adaptive-execution.md) pode adicionar providers do registry.

## Obrigatórios (via registry always: true)

- threat-modeler
- judge
- report-consolidator

Trust boundaries / never-trust-client: executados pelo orquestrador ou api/auth providers — ver [trust-boundaries.md](trust-boundaries.md).
