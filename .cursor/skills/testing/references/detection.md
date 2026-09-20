# Detecção de verificadores

Ordem de leitura (parar no primeiro match válido):

| Fonte | O que procurar |
|-------|----------------|
| `package.json` → `scripts.test` | `vitest`, `jest`, `mocha`, `playwright test` |
| `pyproject.toml` / `pytest.ini` | `pytest` |
| `go.mod` | `go test` |
| `Cargo.toml` | `cargo test` |
| CI (`.github/workflows/`) | comando de teste em pipeline |

## Comando por runner

| Runner | Comando típico | Scope |
|--------|----------------|-------|
| Vitest | `npx vitest run <path>` | ficheiro ou pasta |
| Jest | `npm test -- --runInBand <path>` | pattern ou path |
| pytest | `pytest <path> -v` | módulo ou teste |
| Playwright | `npx playwright test <spec>` | spec E2E |

**Regra:** scope **mínimo** que prova o DoD do brief — não correr suite completa salvo pedido explícito ou gate final.

## Sem testes no repo

1. Declarar **SUBSTITUTO** (nunca VERDE)
2. Executar verificação substituta: `build`, `lint`, ou checklist manual mínimo
3. Documentar **risco residual** obrigatoriamente
