# V22-BENCH — corpus real EvolveLoop

## Classificação por braço

| Braço | Classe | Raw |
|-------|--------|-----|
| **B0** | `OFFICIAL_BASELINE` | `raw/battery-real/` |
| **B1** (pack `evolveloop-project-knowledge`) | `PROVISIONAL_CURATED_PACK` | mesmo raw — **não** gate |
| Sintético | `PROVISIONAL_SYNTHETIC` | `raw/battery/` |

**Limite B1:** páginas com `source_paths` apontando para gabaritos congelados → recall 1.0 é circular.

**Fecho oficial:** `docs/architecture/v2.2/BENCHMARK-PLAN.md` § B1→oficial · dependência **V22-GOAL-003 ← V22-GOAL-005**.

## Tarefas (`tasks-real-frozen.json`)

Ver tabela de gabaritos file:line na versão F3b (R01–R06).

## Mecanismo B1 nesta corrida

- **Usado:** pack `.ai/` em `fixtures/evolveloop-project-knowledge/` (rank keywords).
- **Não usado:** `ground.sh` (`WIKI_ROOT` unset) — `NOT_MEASURED`.

## Continuidade S03/S07

Fixture `fixtures/continuity-s37/` — B1 classificado `PROVISIONAL_CURATED_PACK`.
