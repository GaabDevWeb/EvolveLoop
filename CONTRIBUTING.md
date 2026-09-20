# Contributing to EvolveLoop

Thanks for contributing. EvolveLoop is a **modular agent architecture** with contracts, hard gates, and an observation-first evolution subsystem. Contributions should strengthen that architecture — not replace it with an arbitrary new framework.

## Principles

1. **Preserve contracts** — Capability IR, Policy/PDA, Evidence, KnowledgeBackend seams.
2. **Preserve hard gates** — `grill-me` (conditional), `image-to-code`, `knowledge-grounding`.
3. **No arbitrary frameworks** — do not add agent frameworks, second runtimes, or duplicate registries/schedulers.
4. **Skill discipline** — essential pack only; do not reintroduce pruned decorative skills without an ADR.
5. **Local-first & portable** — no personal absolute paths in `main`; use env/profile.
6. **Honest docs** — no claims of fully autonomous production self-modification.

## Tests

- Prefer unit/integration tests under `orchestrator/tests/`.
- Evals live under `orchestrator/tests/evals/` — extend carefully; do not weaken freeze constraints on EvolveLoop V1 without an ADR.
- Do not claim regression pass without running the suite.

## Contracts & ADRs

- Behavioral changes to IR, policy, knowledge, or evolution → update contracts and consider an ADR under `docs/adr/` or `docs/architecture/`.
- Document GAPs instead of inventing contracts.

## Documentation

- User-facing changes → update `README.md` and/or `docs/getting-started/`.
- Architecture changes → `docs/architecture/public/` and relevant deep docs.
- Keep personal profile material out of `main` (belongs in GaabType overlay).

## Pull requests

- Small, focused diffs.
- Explain *why*.
- Note impact on profiles, hooks, and gates.

## Code of Conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
