# Guia de índices

## Quando indexar

| Cenário | Tipo |
|---------|------|
| FK | B-tree automático ou explícito |
| WHERE equality | B-tree simples |
| WHERE range / ORDER BY | B-tree composto (ordem colunas importa) |
| Full-text search | GIN/GiST (Postgres) ou FULLTEXT (MySQL) |
| JSON field query | GIN em path específico |

## Quando NÃO indexar

- Tabelas pequenas (<1000 rows estáveis)
- Colunas com baixa cardinalidade sem filtro combinado
- Write-heavy sem read pattern claro

## Compostos — ordem das colunas

```
Índice (a, b, c) serve:
  WHERE a = ?
  WHERE a = ? AND b = ?
  WHERE a = ? AND b = ? AND c = ?

NÃO serve eficientemente:
  WHERE b = ? (sem a)
```

## Documentar

No handoff ou DATA-MODEL delta:

```
idx_orders_user_created ON orders(user_id, created_at DESC)
  — listagem paginada por utilizador
```
