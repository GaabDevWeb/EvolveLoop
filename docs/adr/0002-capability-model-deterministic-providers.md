# ADR-0002: Capability Model e Deterministic providers

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Status | accepted |
| Deciders | EvolveLoop / platform evolution |

## Contexto

A auditoria (`docs/architecture-audit-2026-09-17.md`) mostrou um Execution Engine v2 real (registry, scheduler, policy de execução, evidence, jobs) com capabilities de produto LLM (`backend-implementation`, `testing`, …), mas **sem** primitivas operacionais (`filesystem.*`, `git.*`, `shell.*`, …). A missão pedia capabilities operacionais sem criar segundo registry nem segundo evidence bus.

## Decisão

1. Estender o **mesmo** Capability Registry / Contract YAML com campos opcionais (`permissions`, `deterministic`, `cost`, `evidence.schema`, `provider_requirements.plugin`).
2. Introduzir plugin **`deterministic`** (alias `shell` no loader) — handlers Node locais, resultados JSON normalizados, **sem LLM**.
3. Naming dotted por domínio: `filesystem.*`, `git.*`, `shell.execute`, `system.*`, `project.inspect`, `knowledge.*` (+ compostas como `repository.inspect`).
4. Manter `cursor-skill` e `mock` inalterados para workers/gates LLM.

## Alternativas consideradas

### Alternativa A — Registry / runtime paralelo só para “tools”

- Prós: isolamento claro tools vs workers
- Contras: viola SSOT da auditoria; duplica discovery, evidence e policy wiring

### Alternativa B — Embutir tudo como shell genérico

- Prós: um provider
- Contras: sem contratos tipados; authority e evidence pobres; difícil eval

### Alternativa C — Deterministic plugin no registry existente (escolhida)

- Prós: zero fork arquitectural; contratos/manifests reutilizados; testes unitários por handler
- Contras: dualidade LLM vs deterministic no mesmo registry — mitigada por `plugin.type` e profiles

## Consequências

### Positivas

- Primitivas operacionais no mesmo IR/DAG do Planner
- Evidence + normalized results reutilizam builders v2.1
- Evolução incremental (browser.* depois)

### Negativas / trade-offs

- Registry mistura semânticas LLM e tool — documentação e profiles são obrigatórios
- Knowledge via subprocess Python (wiki), não LanceDB embutido no TS

## Referências

- Plano: `docs/architecture-plan-platform-evolution.md`
- Relacionado: ADR-0001, ADR-0003
