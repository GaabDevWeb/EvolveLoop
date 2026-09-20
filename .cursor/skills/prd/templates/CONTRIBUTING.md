# Contributing Guide

## Style & Git Workflow

### Código

| Área | Convenção |
|------|-----------|
| Formatação | |
| Lint | |
| Naming | |
| Testes | |

### Git

**Branches:**

```
feature/<ticket>-<descricao-curta>
fix/<ticket>-<descricao>
docs/<descricao>
```

**Commits (Conventional Commits):**

```
feat: descrição curta
fix: descrição
docs: descrição
refactor: descrição
test: descrição
chore: descrição
```

**Pull Requests:**

- [ ] Testes passam localmente
- [ ] Lint/format OK
- [ ] PRD/ADR actualizados se comportamento mudou
- [ ] Descrição com contexto e screenshots (UI)

### Comandos locais

```bash
# Instalar dependências
# ...

# Desenvolvimento
# ...

# Testes
# ...

# Lint
# ...
```

### Revisão de código

- Mínimo 1 aprovação
- CI verde obrigatório
- Sem merge directo em `main`/`master`

## Documentação

- PRD: `docs/prd/`
- ADR: `docs/adr/`
- Specs: `docs/API_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/DATA-MODEL.md`

## Contacto / dúvidas

<!-- Canal, maintainer -->
