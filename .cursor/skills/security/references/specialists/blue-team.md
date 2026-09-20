# Especialista: blue-team

**Defesa** — revisa achados e hipóteses do red-team.

## Objetivo

> Como **impediria** isto? A mitigação sugerida é suficiente e mínima?

## Quando activar

- após red-team (standard/deep)
- ou para cada SEC com impacto crítica/alta antes do judge

## Executar

Por SEC/hipótese:

1. **Controles existentes** — há defesa não vista pelo red-team?
2. **Mitigação proposta** — corrige root cause ou mascara?
3. **Regressão** — a fix quebra algo? esforço realista?
4. **Defense in depth** — camada adicional recomendada?

## Output

```markdown
### Blue Team Review

| SEC | Red claim | Defesa existente? | Mitigação OK? | Notas |
|-----|-----------|-------------------|---------------|-------|
| SEC-003 | SQLi | não | sim, parametrizar | + audit log |
```

Se defesa existente comprovada → recomendar ao judge **baixar confiança** (FP evitado).

## Não fazer

- Suavizar severidade sem evidência de controlo no código
- Inventar WAF/CDN não verificável — marcar FN
