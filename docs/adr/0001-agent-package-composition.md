# ADR-0001: Agent Package composto (sem Agent Registry paralelo)

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Status | accepted |
| Deciders | EvolveLoop / agent-authoring |

## Contexto

A missão de Agent Authoring pedia um contrato formal `agent:` (YAML) e lifecycle de agentes. O runtime e as specs já modelam **Capability → Provider → Skill**, com Contracts, Policy Engines (missão + execução), Evidence e PDA roles. Uma auditoria do mesmo dia (`docs/architecture-audit-2026-09-17.md`) proíbe segundo registry / evidence bus.

Criar `kind: Agent` + Agent Registry duplicaria discovery já feita pelo Capability Registry e desalinharia o Planner (que emite IR de capabilities, não nomes de agentes).

## Decisão

1. **Agent** no EvolveLoop = **Agent Package**: composição versionada de `SKILL.md` (+ metadata), command `/`, opcionalmente `provider.yaml`, Contract YAML, evals, Agents espelho, install wiring.
2. **Não** introduzir `kind: Agent` nem Agent Registry nesta fase.
3. **Routing** futuro continua Capability IR → Registry → Provider; hints só em `provider.yaml` (`constraints` / signals), sem Agent Router paralelo.
4. A skill **`agent-authoring`** é a fábrica/manutenção deste package; **`skill-authoring`** permanece dona do ciclo de evals/description do corpo da skill.
5. Authority continua fora do prompt: listar capability ≠ autorização (CapabilityAuthority planeada em `docs/architecture-plan-platform-evolution.md`).

## Alternativas consideradas

### Alternativa A — YAML monolítico `agent:` + registry novo

- Prós: um ficheiro legível; discovery explícita por agente
- Contras: paralelo ao Provider/Contract; Planner e engine não consomem; viola princípio da auditoria

### Alternativa B — Só Agents/*.md como SSOT

- Prós: simples para humanos
- Contras: docs já definem Agents como espelho; skill é normativa; risco de drift (ex. Security.md)

### Alternativa C — Package composto (escolhida)

- Prós: zero fork arquitectural; versionamento já existe (skill/provider/contract); install/orquestrar já conhecem skills
- Contras: inventário espalhado — mitigado por checklist + skill agent-authoring

## Consequências

### Positivas

- Authoring alinhado ao Execution Engine e ao EvolveLoop
- Fronteira clara skill-authoring vs agent-authoring
- Débito (Agent Registry missing) fica explícito, não escondido atrás de fachada

### Negativas / trade-offs

- «O que é um agente?» exige ler o package, não um único YAML
- Capabilities operacionais `git.*` / `filesystem.*` ainda MISSING — least-capability valida o que existe e marca GAP

## Referências

- `docs/architecture-audit-2026-09-17.md`
- `docs/architecture-plan-platform-evolution.md`
- `docs/evolve-Ecosystem.md` §6–7
- `.cursor/skills/agent-authoring/`
- `.cursor/skills/orquestrar/references/specs/provider-manifest.md`
