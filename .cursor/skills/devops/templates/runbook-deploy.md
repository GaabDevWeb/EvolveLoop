# Runbook — Deploy

| Campo | Valor |
|-------|-------|
| Ambiente | staging \| production |
| Última actualização | YYYY-MM-DD |

## Pré-requisitos

- [ ] CI verde na branch/tag
- [ ] Secrets configurados: `{{LISTA_NOMES}}`
- [ ] Migrações aplicadas (se aplicável)

## Deploy — Staging

```bash
# Comandos exactos
```

## Deploy — Production

```bash
# Comandos exactos — requer aprovação manual
```

## Rollback

```bash
# Comandos exactos
```

## Verificação pós-deploy

- [ ] Health check: `{{URL}}/health`
- [ ] Smoke test: {{descrição}}
- [ ] Logs sem erros críticos (5 min)

## Contactos de escalada

| Papel | Contacto |
|-------|----------|
| On-call | |
