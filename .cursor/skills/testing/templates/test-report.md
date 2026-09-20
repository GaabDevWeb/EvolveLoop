# Test Report — {{scope}}

**Data:** {{date}}  
**Capability:** `testing` (gate)  
**Veredito:** VERDE | VERMELHO | SUBSTITUTO

## Boot sequence (obrigatório)

| # | Passo | Evidência |
|---|-------|-----------|
| 1 | Detectar verificadores | … |
| 2 | Definir scope | … |
| 3 | Executar comando | … |
| 4 | Validar DoD | … |

## Comando executado

```bash
{{command}}
```

**Exit code:** {{exit_code}}  
**Duração:** {{duration}}

## Scope

- …

## Detecção de stack

| Fonte | Valor |
|-------|-------|
| package.json | … |
| Runner | … |

## Resultado

| Métrica | Valor |
|---------|-------|
| Passou | … |
| Falhou | … |
| Ignorado/skipped | … |

## Falhas (se VERMELHO)

| Teste | Mensagem | Hipótese | Fix aplicado |
|-------|----------|----------|--------------|

## Correcções aplicadas

…

## Risco residual

…

## Evidence (Orquestrador v2)

Path sugerido: `telemetry/evidence/{{node_id}}.json` — schema [evidence.md](../orquestrar/references/specs/evidence.md)

## Recomendação ao orquestrador

| Veredito | DECISÃO sugerida |
|----------|------------------|
| VERDE | `continuar` |
| VERMELHO (corrigível) | `corrigir` |
| VERMELHO (scope) | `replanejar` |
| SUBSTITUTO | `continuar` com risco documentado |
