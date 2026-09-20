# Exemplo — pedidos comuns (comportamento esperado)

## Create Developer Agent

1. DISCOVER encontra `.cursor/skills/backend` (+ Agents/backend.md).
2. Decisão: `EXTEND_EXISTING_AGENT` ou `REFACTOR_EXISTING_AGENT` (ex.: falta `provider.yaml` no skill dir — existe em `orchestrator/providers/backend/`).
3. Completar package gaps; **não** criar `developer` paralelo sem capability distinta.
4. Report: artefacto paths + gates.

## Create Security Agent

1. Encontra `security` skill + capability `security-review`.
2. `REJECT_DUPLICATE` / `EXTEND` — review boundaries, evals, isolation de gate.
3. Nunca segundo orquestrador de security.

## Update Researcher

1. Se não existir Researcher formal: inventário (global-skills / explore role) → `NEW_AGENT` só com DO/DO NOT estreitos **ou** `AGENT_UNNECESSARY` se explore+tools bastam.
2. Se existir: `EXTEND` — capability optional (browser), degradation se MCP down.

## Audit all agents

Tabela: skill | command | Agents mirror | provider | contract | install | status | gaps.

## Detect duplicated agents

Comparar capability ids + DO/DO NOT; emitir `MERGE` / `REJECT` candidates.
