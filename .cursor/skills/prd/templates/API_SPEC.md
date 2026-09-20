# API Specification

| Campo | Valor |
|-------|-------|
| Versão | v1 |
| Base URL | |
| Última actualização | YYYY-MM-DD |

## Autenticação

<!-- Bearer JWT, API key, session, etc. -->

## Convenções

- Content-Type: `application/json`
- Datas: ISO 8601 UTC
- IDs: UUID v4 (ou especificar)

## Endpoints

### {{METHOD}} {{PATH}}

**Descrição:**

**Autenticação:** required \| optional \| none

**Request:**

```json
{
}
```

**Response 200:**

```json
{
}
```

**Erros:**

| Status | Code | Descrição |
|--------|------|-----------|
| 400 | VALIDATION_ERROR | |
| 401 | UNAUTHORIZED | |
| 404 | NOT_FOUND | |
| 500 | INTERNAL_ERROR | |

---

<!-- Repetir secção por endpoint -->

## Schemas partilhados

### {{SchemaName}}

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| | | | |

## Webhooks / Eventos (se aplicável)

| Evento | Payload | Trigger |
|--------|---------|---------|
| | | |

## Versionamento e breaking changes

<!-- Política de deprecação -->
