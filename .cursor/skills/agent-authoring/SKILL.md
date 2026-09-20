---
name: agent-authoring
description: >
  Fábrica e manutenção de agentes do ecossistema EvolveLoop: cria, audita, revisa,
  actualiza, migra, valida, versiona e integra Agent Packages (Skill + Command +
  Provider/Contract + Agents espelho + install/orquestrar). Use quando o utilizador
  invocar /agent-authoring, pedir criar/revisar/actualizar agente, adicionar
  capacidades, dividir/fundir agentes, auditar o Agent System, verificar integração
  ao Orchestrator, criar evals de agente, detectar duplicados, ou migrar contratos
  de agentes. Não use para só escrever/melhorar o corpo de uma skill isolada
  (prefira skill-authoring), orquestração de features (orquestrar), implementação
  de produto (backend/frontend-pro), nem ADR avulso (adr).
metadata:
  version: 1.1.0
  status: experimental
  capability: agent-authoring
  type: meta
  command: agent-authoring
  pda_roles: []
  specialization: Agent Author | Evaluator (packages)
  eval_iteration: 1
  last_benchmark: agent-authoring-workspace/iteration-1/benchmark.md
disable-model-invocation: true
---

# Agent Authoring — fábrica de agentes EvolveLoop

Camada de **engenharia de Agent Packages** sobre a arquitectura existente.
Não é gerador genérico de prompts. Não inventa registry, runtime, Evidence Bus,
Policy Engine nem formato de provider — adapta-se ao que já existe.

**Wave C3 — Evaluator (packages):** `EXTEND_EXISTING_AGENT` — a operação `evaluate` + evals de package **são** o Evaluator para agentes. **REJECT_DUPLICATE** de um agente `evaluator` fino. Skills → `skill-authoring`.

**SSOT da auditoria:** [references/architecture-audit.md](references/architecture-audit.md)  
**Pacote formal:** [references/agent-package.md](references/agent-package.md)  
**Irmã:** `skill-authoring` — corpo/evals/trigger da skill; esta skill — packaging, boundaries, integração.

---

## Quando usar / não usar

**Usar:** create | inspect | review | update | refactor | migrate | validate | evaluate | deprecate | audit system.

**Não usar:** coding de produto; só polish de `SKILL.md`; spawn PDA de feature (`orquestrar`); gates de feature (`testing` / `validator` / `po-review` / `code-reviewer`); telemetria/replay (`Observer` → runtime).

### Evaluator vs factories vs Observer

| Papel | Decisão C3 | Onde vive |
|-------|------------|-----------|
| Evaluator (skills) | EXTEND | `skill-authoring` (`eval-authoring`) |
| Evaluator (packages) | EXTEND | esta skill — op `evaluate` + `evals/` |
| Observer | `AGENT_UNNECESSARY` | `orchestrator/src/telemetry/execution-trace.ts` + EventBus/JSONL — ver `docs/execution-replay-model.md` |

---

## Invariants

1. **Authoring layer, not parallel architecture** — reutilizar Provider, Contract, Capability Registry, Policy Engine, Evidence Bus, PDA roles, handoff, telemetry.
2. **SKILL.md is SSOT** — `Agents/*.md` é espelho humano.
3. **Least authority** — mínimo contexto + capabilities + autoridade.
4. **Agent decides, capability/tools execute** — não meter ops determinísticas só no prompt se já há provider/contract/tool adequado.
5. **Listar capability ≠ autorização** — policy continua a mediar.
6. **Relevant Context > Maximum Context**.
7. **Falhas classificadas** — [failure-degradation.md](references/failure-degradation.md).
8. **Gates honestos** — crítico falhou → `NOT_READY`.
9. **Não auto-criar os 19 agentes** do catálogo — só sob pedido + decisão `NEW_AGENT`.
10. **Correctness > token count**.

---

## Recursos

| Ficheiro | Quando |
|----------|--------|
| [architecture-audit.md](references/architecture-audit.md) | DISCOVER — sempre no início de sessão nova |
| [agent-package.md](references/agent-package.md) | DESIGN/IMPLEMENT — composição de artefactos |
| [lifecycle.md](references/lifecycle.md) | critérios por fase |
| [duplication-decisions.md](references/duplication-decisions.md) | antes de criar ficheiros |
| [quality-gates.md](references/quality-gates.md) | VALIDATE / ACTIVATE |
| [failure-degradation.md](references/failure-degradation.md) | failure model |
| [specializations.md](references/specializations.md) | naming / templates estruturais |
| [templates/](templates/) | checklist, change record, mirrors, handoff |
| [evals/](evals/) | evals desta skill |

---

## Workflow operacional

```text
REQUEST → UNDERSTAND → AUDIT → DESIGN → GENERATE → REGISTER
        → EVALS → VALIDATE → INTEGRATE → REPORT
```

Mapear para lifecycle: [lifecycle.md](references/lifecycle.md).

### 1. Parse request

Extrair: operação (`create|inspect|…`), nome sugerido, responsabilidades, constraints.

### 2. DISCOVER (obrigatório antes de escrever)

1. Revalidar [architecture-audit.md](references/architecture-audit.md) no repo actual.
2. Inventariar: skills, commands, Agents, providers, contracts, install list, fases orquestrar.
3. Procurar overlap por nome, capability id, DO/DO NOT.
4. Reportar `AGENTS_ROOT` vs workspace se divergirem.

### 3. Decisão de duplicação

Aplicar [duplication-decisions.md](references/duplication-decisions.md).  
Se não for `NEW_AGENT` / `REFACTOR` / `EXTEND` / `SPLIT` / `MERGE` / `MIGRATE` com acção clara — **parar** e reportar (ex.: `AGENT_UNNECESSARY`, `RESPONSIBILITY_OVERLOAD`).

### 4. DESIGN

Definir e registar no change record:

- identidade (`kebab-id`), purpose
- DO / DO NOT (obrigatório)
- `pda_roles` + `metadata.type`
- capability scope: required | optional | forbidden
- inputs (context contract) / outputs (handoff + contract)
- evidence + validation
- degradation
- routing hints só via `provider.yaml` constraints/signals existentes
- handoffs from→to por contratos/artefactos (não estado implícito)

Sinalizar `RESPONSIBILITY_OVERLOAD` se necessário.

### 5. IMPLEMENT (artefactos)

Gerar/alterar **apenas** o necessário do Agent Package:

1. `.cursor/skills/<id>/SKILL.md` (+ references se >500 linhas)
2. `.cursor/commands/<cmd>.md`
3. `provider.yaml` (pipeline)
4. `orchestrator/contracts/<capability>.yaml` se capability **nova** (schema existente)
5. `evals/evals.json` (+ trigger set se skill nova)
6. `Agents/<Name>.md` espelho
7. `scripts/install-agents-global.sh` — acrescentar id à lista `SKILLS`
8. Wiring orquestrar/docs — ou `DEFERRED` no relatório
9. ADR via skill `adr` se decisão arquitectural (ver ADR-0001)

Templates: [templates/](templates/).

Corpo da skill: boundaries, capability scope, context, output, failure/degradation, handoff.  
Para ciclo completo de evals/description da skill → invocar fluxo **skill-authoring**.

### 6. REGISTER

Sem Agent Registry novo: provider + registry-builder existente + install + command.

### 7. EVALUATE / VALIDATE

- Preencher gates [quality-gates.md](references/quality-gates.md)
- Evals comportamentais em **runners isolados** (não nesta sessão de authoring) — protocolo skill-authoring
- Incluir adversarial: ambiguous, out-of-scope, missing context, policy denial, etc.

### 8. REPORT

Entregar estrutura:

```text
## Decisão
<code> + justificação

## Audit (delta)
…

## Artefactos
…

## Gates
READY | NOT_READY

## Integração
provider | contract | install | orquestrar | Agents

## Debt
MISSING | PARTIAL | BLOCKED | DEFERRED
```

---

## Operações de manutenção

| Pedido | Acção |
|--------|-------|
| Revise agente X | inspect + gaps vs package + quality gates |
| Adicione capability | verificar contract/provider; least capability; bump version |
| Remova capability | breaking se required; migrar IR/deps |
| Divida agente | SPLIT + dois packages + deprecar overload |
| Actualize contrato | Contract semver + providers + evals |
| Audite Agent System | inventário + classificação + duplicados |
| Evals para agente | criar/actualizar `evals/` + runners isolados |
| Integrado ao Orchestrator? | provider, capability no IR/fases, install, evidence |

---

## Anti-patterns

- Criar `kind: Agent` registry / Evidence Bus / Policy Engine novos
- Agente «faz tudo»
- Lógica git/fs/test só no prompt quando deveria ser capability/tool
- Autoridade só porque a skill lista uma capability
- Contexto máximo («mete o repo inteiro»)
- Activar com gates críticos vermelhos
- Confundir Agents espelho com SSOT
- Transformar cada capability numa skill nova sem necessidade
- Implementar os 19 agentes do catálogo sem pedido

---

## Exemplos de resposta correcta (meta)

**Create Developer Agent** (repo com `backend`):  
`EXTEND_EXISTING_AGENT` / `REFACTOR` — completar package se faltar provider/command/espelho; não duplicar.

**Create Security Agent** (com `security`):  
idem — review/refactor, não segundo security.

**Create Git Agent**:  
`AGENT_UNNECESSARY` — não há Agent Registry git; usar tools no agente consumidor.

**Universal Agent**:  
`RESPONSIBILITY_OVERLOAD` + decomposição por [specializations.md](references/specializations.md).

**Audit all agents**:  
tabela skill↔command↔provider↔contract↔Agents↔install↔status.

---

## Checklist rápido pré-fecho

- [ ] Audit delta feito
- [ ] Decisão de duplicação explícita
- [ ] DO/DO NOT no skill
- [ ] Package artefactos coerentes
- [ ] Gates avaliados com honestidade
- [ ] Debt listado
- [ ] Sem arquitectura paralela
