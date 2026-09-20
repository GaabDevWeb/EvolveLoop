# Data Model

| Campo | Valor |
|-------|-------|
| SGBD | PostgreSQL \| MySQL \| MongoDB \| etc. |
| Última actualização | YYYY-MM-DD |

## Diagrama ER (descrição)

```
EntidadeA 1──N EntidadeB
EntidadeB N──M EntidadeC
```

## Entidades

### {{Entidade}}

| Campo | Tipo | Null | Default | Descrição |
|-------|------|------|---------|-----------|
| id | UUID | NO | gen | PK |
| created_at | timestamptz | NO | now() | |

**Índices:**

- `idx_{{entidade}}_{{campo}}` — {{justificação}}

**Regras:**

- 

---

<!-- Repetir por entidade -->

## Relações

| De | Para | Cardinalidade | FK |
|----|------|---------------|-----|
| | | 1:N | |

## Migrações previstas

| Ordem | Descrição | Breaking? |
|-------|-----------|-----------|
| 001 | | |

## Considerações de performance

- Hot paths:
- Particionamento:
- Cache:

## Referências

- API: `docs/API_SPEC.md`
- ADR: `docs/adr/NNNN-*.md`
