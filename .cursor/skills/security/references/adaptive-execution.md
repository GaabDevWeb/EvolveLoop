# Execução adaptativa (planeamento iterativo)

Após cada provider, o orquestrador **reavalia** o plano — não é lista fixa.

## Loop

```text
Executar provider
    ↓
Achados ou coverage gap?
    ↓
Sim → activar provider adicional do registry (capability match)
    ↓
Não e domínio crítico no threat model com 0 achados?
    ↓
Mudar estratégia: red-team OU grep alargado OU dynamic (se ✓)
    ↓
Repetir até: cobertura aceitável OU max_providers (modo) OU sem progresso
```

## Triggers de re-planeamento

| Situação | Acção |
|----------|-------|
| Stripe detectado mas business-logic não estava no plano | activar `business-logic-reviewer` |
| Auth OK mas threat model lista pagamentos | forçar business-logic |
| 0 achados em API grande | activar `red-team` (standard+) |
| Suspeita L1 em SSRF | activar `dynamic-pentest` se capabilities ✓ |
| Provider sem progresso (2ª passagem igual) | parar; FN em coverage |

## Registo

```markdown
### Re-planeamentos

| Iteração | Motivo | Provider adicionado |
|----------|--------|---------------------|
| 2 | webhook Stripe encontrado | business-logic-reviewer |
| 3 | 0 findings API | red-team |
```

Máximo **3 iterações** em fast, **5** em standard/deep — evitar loop infinito.
