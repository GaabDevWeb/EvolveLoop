# Auditoria — Agent System (SSOT desta skill)

**Data:** 2026-09-17  
**Âmbito:** repo `CursorSKILLS` (+ `AGENTS_ROOT` legado apontado por `~/.cursor/agents.env`)  
**Regra:** authoring adapta-se a estes mecanismos — **não** cria arquitectura paralela.

**Auditoria profunda do mesmo dia (runtime/RAG/capabilities operacionais):**  
[`docs/architecture-audit-2026-09-17.md`](../../../../docs/architecture-audit-2026-09-17.md)  
**Plano de evolução (CapabilityAuthority, deterministic providers):**  
[`docs/architecture-plan-platform-evolution.md`](../../../../docs/architecture-plan-platform-evolution.md)  
**ADR desta skill:** [`docs/adr/0001-agent-package-composition.md`](../../../../docs/adr/0001-agent-package-composition.md)

---

## Classificação

| Mecanismo | Path / evidência | Estado |
|-----------|------------------|--------|
| Skills normativas | `.cursor/skills/*/SKILL.md` | **IMPLEMENTED** |
| Commands `/` | `.cursor/commands/*.md` | **IMPLEMENTED** (parcial cobertura vs skills) |
| Agents espelho | `Agents/*.md` | **PARTIAL** (só subset; docs dizem que não são SSOT) |
| Provider manifests | `*/provider.yaml` + `orchestrator/providers/` | **IMPLEMENTED** (nem toda skill tem sidecar) |
| Capability Registry | `orchestrator` registry-builder → `capability-registry.yaml`; security tem registry local | **IMPLEMENTED** (runtime) + **PARTIAL** (skills sem rebuild contínuo) |
| Capability Contracts | `orchestrator/contracts/*.yaml` + specs `orquestrar/references/specs/contracts.md` | **IMPLEMENTED** |
| Capability IR | specs + `orchestrator/src` types `CapabilityIR` | **IMPLEMENTED** |
| Policy Engine (missão) | `orquestrar/references/policy-engine.md` (`risk_tier`/`topology`/`budget`/`require[]`) | **IMPLEMENTED** (skill) |
| Execution Policy (engine) | `orchestrator/policies/`, `policy-engine.ts` | **IMPLEMENTED** |
| Evidence Bus | `orquestrar/references/evidence-bus.md` + `orchestrator/src/evidence/` | **IMPLEMENTED** |
| PDA Roles | `orquestrar/references/pda-roles.md` (`plan\|exec\|gate\|explore\|critic\|librarian`) | **IMPLEMENTED** |
| Handoff `[ENTREGA CONSOLIDADA]` | skills pipeline (ex. backend) | **IMPLEMENTED** (convenção) |
| Knowledge / RAG / Wiki | `wiki`, `wiki-mem`, orchestrator knowledge stores | **IMPLEMENTED** |
| Telemetry | orchestrator events + provider `telemetry.key` | **IMPLEMENTED** (runtime) |
| Skill evals | `*/evals/evals.json` + skill-authoring protocol | **IMPLEMENTED** |
| Install / wiring | `scripts/install-agents-global.sh` lista `SKILLS=(...)` | **IMPLEMENTED** |
| Hooks | `.cursor/hooks/` + pickup orchestrator | **IMPLEMENTED** |
| agent-setup | `agent-setup/` instalador declarativo | **PARTIAL** (`.agent.yaml` de projeto, não registry de agentes) |
| **Agent Registry** (entidade `kind: Agent`) | — | **MISSING** |
| **Agent Routing** dedicado | — | **MISSING** (routing = Capability IR → Registry → Provider) |
| Contrato YAML `agent:` monolítico | — | **MISSING** (substituído por **Agent Package** composto) |
| Providers `git.*` / `filesystem.*` / `shell.*` / `system.*` / `knowledge.*` como capabilities tipadas | `orchestrator/providers/{git,filesystem,shell,system,project,knowledge}/` + contracts + DeterministicProvider (2026-09-17) | **IMPLEMENTED** (runtime); «least capability» valida contra estes IDs + tools Cursor |
| `AGENTS_ROOT` → `Documentos/gitHub/AGENTS` | `~/.cursor/agents.env` | **DUPLICATED** / legado vs clone `CursorSKILLS` (GLOBAL-SETUP diverge) |

---

## Como o sistema representa «agente»

Documento canónico: `docs/MegaBrain-Ecosystem.md` §6.

```text
Capability  →  Provider (provider.yaml)  →  Skill (SKILL.md)
                    ↑
         Command `/` + Agents/*.md (espelho humano)
```

| Conceito pedido | Equivalente real |
|-----------------|------------------|
| Agent identity | `metadata` do `SKILL.md` + `provider.yaml` `metadata.name` |
| Role | PDA `role` no `GATE_BUNDLE` (`pda-roles.md`) — **não** o nome do provider |
| Capabilities | `provider.yaml` `spec.capabilities[]` + Contract YAML |
| Authority / policy | Policy Engine missão + ExecutionPolicy; listar capability ≠ autorização |
| Context contract | inputs em Contract / secções da skill / docs upstream |
| Output contract | handoff + Contract `outputs` + evidence schemas |
| Evidence | Evidence Bus + schemas em `orchestrator/schemas/evidence/` |
| Evals | `evals/` da skill (+ protocol skill-authoring) |
| Discovery | Provider Discovery + Capability Registry (não Agent Registry) |
| Versioning | `metadata.version` skill + `provider.yaml` version + Contract semver |

**Invariante:** em conflito, **`SKILL.md` ganha** sobre `Agents/*.md`.

---

## Fronteira com skill-authoring

| Skill | Responsabilidade |
|-------|------------------|
| **skill-authoring** | Corpo do `SKILL.md`, evals de comportamento da skill, description/triggering |
| **agent-authoring** | Pacote completo de agente no ecossistema: inventário, duplicação, boundaries, provider, contract, command, Agents mirror, install, orquestrar wiring, gates de integração, manutenção multi-agente |

Delegar criação/melhoria profunda do texto da skill a **skill-authoring** quando o trabalho for só conteúdo/evals da skill.

---

## Gaps conscientes (não inventar nesta skill)

1. Sem `kind: Agent` no runtime — discovery futura deve estender Provider/Registry, não fork.
2. Capabilities tipadas `git.*` / `filesystem.*` / `shell.*` / `system.*` / `knowledge.*` / `project.*` — **IMPLEMENTED** no orchestrator (DeterministicProvider + CapabilityAuthority). «Least capability» deve referenciar esses IDs; tools Cursor continuam complementares.
3. Agents espelho incompletos — authoring deve criar/actualizar espelho **ou** documentar `DEFERRED` com justificação.
4. Duplo root AGENTS vs CursorSKILLS — authoring trabalha no **repo activo do workspace**; reportar se `AGENTS_ROOT` aponta para outro clone.
