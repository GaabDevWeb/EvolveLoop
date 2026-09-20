# Rubrica de revisão humana — evals

Use após grading automático ou para evals subjetivos. Copiar e preencher por eval.

## Eval: `<nome-descritivo>`

**Prompt:** <reproduzir prompt do eval>

### Outputs

| Config | Path | Resumo (1–2 frases) |
|--------|------|---------------------|
| with_skill | `.../with_skill/outputs/` | |
| baseline | `.../without_skill/outputs/` | |

### Assertions automáticas

| Assertion | with_skill | baseline |
|-----------|------------|----------|
| | pass/fail | pass/fail |

### Critérios qualitativos

| Critério | with_skill (1–5) | baseline (1–5) | Notas |
|----------|------------------|----------------|-------|
| Segue formato da skill | | | |
| Completude | | | |
| Utilidade para o utilizador | | | |
| Sem violações explícitas da skill | | | |

### Discriminador

A skill **melhora** o output face ao baseline?

- [ ] Sim — diferença clara e positiva
- [ ] Marginal — pouca diferença; skill pode estar redundante
- [ ] Não — baseline equivalente ou melhor; rever SKILL.md

### Feedback do utilizador

```
(Espaço para comentários livres — o que mudar na skill?)
```

---

## Agregação da iteração

| Eval | Discriminador | Bloqueia ship? | Acção |
|------|---------------|----------------|-------|
| | Sim/Não/Marginal | sim/não | iterar / aceitar |

**Ship desta iteração:** sim / não — motivo:
