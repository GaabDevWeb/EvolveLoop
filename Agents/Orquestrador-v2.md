# Orquestrador-v2 — Ecossistema e ciclo

Documentação consolidada do agente `/evolve`: skills, fases, subagentes, Superpowers (`brainstorming`, `grill-me`, `executing-plans`), `frontend-pro`, Tier 2 (`prd`, `database`, `adr`, `devops`), `find-skills` e catálogo skills.sh.

## Documento principal

**Ler:** [`.cursor/skills/orquestrar/references/ecosystem-v2.md`](../.cursor/skills/orquestrar/references/ecosystem-v2.md)

## Resumo executivo

| Área | Decisão |
|------|---------|
| **Raiz** | `/evolve` (`orquestrar` skill) mantém SSOT + PDA + matriz `continuar \| corrigir \| replanejar` |
| **Frontend** | `frontend` → **`frontend-pro`** + **Fase 2.5** (Review/Audit visual) |
| **Testing** | Skill local **`testing`** |
| **Pré-ciclo** | `brainstorming` (opcional) → **`prd`** (HARD-GATE docs) → `grill-me` (opcional) → Fase 1 `planner` |
| **Tier 1** | orquestrar, planner, backend, frontend-pro, testing, security, po-review, documentation, skill-authoring |
| **Tier 2** | **`database`**, **`prd`**, **`adr`**, **`devops`** — ✓ activos no repo |
| **Tier 3** | `find-skills` + installs globais (`brainstorming`, `grill-me`, `image-to-code`, etc.) |
| **Imagem anexada** | **HARD-GATE** → sempre `image-to-code` ([image-attachment-gate.md](../.cursor/skills/orquestrar/references/image-attachment-gate.md)) |

## Fluxo alvo

```
brainstorming (opcional, diálogo) → prd (pacote docs/) → grill-me? → planner → Fase 2 código
```

| Skill | Papel |
|-------|-------|
| `brainstorming` (global) | Exploração — **sem código** |
| `prd` (local) | Documentação formal estruturada — **HARD-GATE** antes do planner |
| `planner` | Consome PRD + ARCHITECTURE + DATA-MODEL + API_SPEC |
| `adr` | ADR isolado mid-cycle (pacote inicial vem do `prd`) |
| `database` | Schema/migrações — delegável de backend |
| `devops` | CI/deploy — Fase 4b opcional |

## Comandos `/`

| Comando | Provider |
|---------|----------|
| `/evolve` | orquestrar |
| `/prd` | prd |
| `/adr` | adr |
| `/planejar` | planner |
| `/database` | database |
| `/devops` | devops |
| `/backend` | backend |
| `/frontend` | frontend-pro |
| `/testes` | testing |
| `/seguranca` | security |
| `/validar` | po-review |
| `/documentar` | documentation |

## Comando

```
/evolve
```

Skill interna: `.cursor/skills/orquestrar/SKILL.md`

## Estado

- **Arquitectura** congelada em `ecosystem-v2.md` v2.0
- **Tier 2** skills criadas com evals + provider.yaml
- **Runtime TypeScript** (`Cursor/orchestrator/`): implementação parcial — ver roadmap secção 19
