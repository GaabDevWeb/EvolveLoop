# Padrões de migração

## Naming

```
NNNN_descricao_curta_snake_case.sql
```

Exemplo: `0001_create_users_table.sql`

## Template up/down (SQL)

```sql
-- Up
BEGIN;
-- DDL aqui
COMMIT;

-- Down
BEGIN;
-- Reverter DDL
COMMIT;
```

## Regras

1. **Transacções** em DDL quando SGBD suporta
2. **Backfill** em migrações separadas de ADD COLUMN NOT NULL
3. **Lock time** — evitar ALTER pesado em tabelas grandes sem estratégia online
4. **Seeds** em ficheiros separados (`seeds/`), não em migrações estruturais

## ORM-specific

| ORM | Comando gerar | Comando aplicar |
|-----|---------------|-----------------|
| Prisma | `prisma migrate dev --name X` | `prisma migrate deploy` |
| Alembic | `alembic revision -m "X"` | `alembic upgrade head` |
| Django | `makemigrations` | `migrate` |
| TypeORM | `migration:generate` | `migration:run` |
