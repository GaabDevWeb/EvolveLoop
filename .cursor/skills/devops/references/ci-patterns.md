# Padrões CI — GitHub Actions

## Cache de dependências

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: npm-${{ hashFiles('**/package-lock.json') }}
```

## Matrix (multi-version)

```yaml
strategy:
  matrix:
    node-version: [20, 22]
```

## Reutilização

- `workflow_call` para jobs partilhados
- Composite actions em `.github/actions/`

## Gates

- PR: lint + test obrigatório
- main: lint + test + build
- deploy: só após merge + tag (ou manual workflow_dispatch)

## Anti-patterns

- `continue-on-error: true` em testes
- Secrets em logs
- Deploy sem rollback documentado
