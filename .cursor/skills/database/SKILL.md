---
name: database
description: >
  Engenharia de schema e persistência (PDA exec): modelagem, migrações versionadas,
  índices, constraints e optimização de queries. Use quando /database, schema,
  migrações SQL/ORM, ER, índices, normalização, ou EvolveLoop nó database-schema /
  DBA pesado delegado de backend. Não use para API/endpoints (backend), UI
  (frontend-pro), CI/deploy (devops), PRD (prd), planeamento (planner), gates
  testing/security/po.
metadata:
  version: "1.1.0"
  status: experimental
  capability: database-schema
  type: worker
  command: database
  pda_roles: [exec]
  non_responsibilities:
    - backend-implementation
    - frontend-ui
    - devops-deploy
    - testing-gate
    - security-gate
    - po-acceptance
disable-model-invocation: true
---

# Database — Schema & Migrações

Provider da capability **`database-schema`** (tipo **worker**, PDA **`exec`**) no EvolveLoop. Produz schema, migrações e índices alinhados a `docs/DATA-MODEL.md` e `docs/API_SPEC.md`.

**Contrato ascendente:** Fase 2 do EvolveLoop — nó Worker `database-schema` ou delegação do `backend`.

**Policy:** listar capabilities **≠** autorização. Policy Engine medeia; Database **não** auto-concede write em prod nem authority de gate.

**Handoff:** `[ENTREGA CONSOLIDADA]` com paths de migrações + nota de rollback.

---

## Boundaries — DO / DO NOT

### DO

- Schema, migrações up/down, índices, constraints alinhados a DATA-MODEL/API_SPEC/ADR
- Seguir convenção ORM/SQL do repo; marcar SUPOSIÇÃO se docs ausentes
- Flag migrações destrutivas + plano seguro; documentar rollback
- Relevant Context: só docs de dados + paths de migração existentes

### DO NOT

- Endpoints HTTP / lógica de API (`backend-implementation`)
- UI (`frontend-ui`) ou pipelines CI/deploy (`devops-deploy`)
- Alterar DATA-MODEL.md sem pedido; inventar SGBD novo sem ADR
- Veredictos testing/security/po; bypass de Policy Engine
- Commitar dados sensíveis ou secrets em seeds

---

## Capability scope

| Classe | Capabilities | Motivo |
|--------|--------------|--------|
| **required** | `database-schema` | Identidade — schema/migrações |
| **optional** | `filesystem.read/list/search/write` (migrations/schema), `project.inspect`, `git.inspect`, `shell.execute` (migrate/EXPLAIN local) | Execução mínima |
| **forbidden** | `backend-implementation`, `frontend-ui`, `frontend-visual-review`, `devops-deploy`, `testing`, `security-review`, `po-acceptance` | Least authority |

---

## Failure / degradation

| Classe | Se… | Então… |
|--------|-----|--------|
| `context_failure` | Sem DATA-MODEL | Modelo mínimo + SUPOSIÇÕES ou ≤3 perguntas |
| `context_failure` | Stack ORM ambígua | Não introduzir ORM novo; perguntar ou seguir evidência repo |
| `policy_denial` | Write negado | Respeitar; não bypass via shell |
| `agent_failure` | Pedido = API/CI/UI | Redireccionar skill irmã |

## Inputs obrigatórios (se existirem)

| Documento | Path | Uso |
|-----------|------|-----|
| DATA-MODEL | `docs/DATA-MODEL.md` | Entidades, relações, índices propostos |
| API_SPEC | `docs/API_SPEC.md` | Campos expostos, queries previstas |
| ADR | `docs/adr/*.md` | Decisões SGBD, ORM, sharding |

Sem docs upstream: **derivar** modelo mínimo e marcar **SUPOSIÇÃO** no handoff.

---

## Fluxo de trabalho

```

Capturar stack → Ler DATA-MODEL → Desenhar schema → Migrações up/down
→ Índices → Seeds (se pedido) → Validar → Handoff
```

### 1. Detectar stack

| Stack | Migrações típicas |
|-------|-------------------|
| PostgreSQL + Prisma | `prisma/migrations/` |
| PostgreSQL + raw | `migrations/NNNN_*.sql` |
| MySQL | `db/migrate/` ou Alembic |
| Django | `*/migrations/` |
| TypeORM | `src/migrations/` |

**Seguir** convenção existente no repo — não introduzir ORM novo sem ADR.

### 2. Schema

- PKs explícitas (UUID ou serial — alinhar ADR)
- FKs com `ON DELETE` documentado
- `created_at` / `updated_at` onde padrão do repo
- Constraints: UNIQUE, CHECK, NOT NULL
- Naming: snake_case tabelas/colunas (salvo convenção repo)

### 3. Migrações

- **Idempotentes** quando possível
- **Up + down** (rollback testável)
- Uma migração = uma intenção lógica
- Nunca editar migração já aplicada em prod — criar nova

### 4. Índices

- FKs indexadas
- Colunas em WHERE/ORDER BY frequentes
- Compostos quando query pattern conhecido
- Documentar em comentário ou DATA-MODEL delta

### 5. Validação

```bash
# Exemplos — adaptar ao repo
# prisma migrate dev / alembic upgrade head / django migrate
# EXPLAIN ANALYZE em queries críticas
```

---

## Regras normativas

- **Não** implementa endpoints HTTP — só persistência
- **Não** altera DATA-MODEL.md sem pedido — reportar divergências
- Migrações **destrutivas** (DROP, ALTER tipo) → flag no handoff + ADR se irreversível
- Dados sensíveis: encriptação at-rest conforme ADR/security

---

## Output esperado

```text
[ENTREGA CONSOLIDADA]
Schema: <paths>
Migrações: <paths>
Índices novos: <lista>
Comandos aplicar: <comandos>
Rollback: <comando down>
Suposições: <lista ou "nenhuma">
[ENCERRAMENTO] concluído
```

---

## Referências

| Ficheiro | Quando ler |
|----------|------------|
| [references/migration-patterns.md](references/migration-patterns.md) | Padrões up/down |
| [references/index-guide.md](references/index-guide.md) | Decisões de índice |
| [templates/migration.sql](templates/migration.sql) | SQL raw |
