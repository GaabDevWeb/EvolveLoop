# Grill-Me Gate — HARD-GATE EvolveLoop (condicional)

**Âmbito:** ecossistema EvolveLoop (`/evolve`) — orquestrador, planner, upstream.  
**Skill obrigatória quando o gate aplica:** `~/.agents/skills/grill-me/SKILL.md`  
**Capability:** `design-stress-test` · provider/skill id `grill-me`  
**Paridade conceptual:** mesmo *nível* de política que [image-attachment-gate.md](image-attachment-gate.md) (HARD condicional).  
**Enforcement actual:** **policy / agente** (instruções + Evidence Bus) — **≠** machine-enforcement no Execution Engine TypeScript (igual a `image-to-code`).

---

## Trigger (quando `gate_required = true`)

O raiz (Policy Engine) inclui `grill-me` em `require[]` quando o âmbito é **design / planning / escopo**, tipicamente:

| Sinal | Exemplo |
|-------|---------|
| Pacote PRD / Fase 0.5 activa | Feature com docs formais antes de `/planejar` |
| `risk_tier` ∈ {`standard`, `sensitive`} com RF novo | Nova feature, refactor relevante |
| Mudança de arquitectura / workflow / agentes | ADR+produto, EvolveLoop, capabilities |
| Mudança significativa de escopo mid-cycle | Replan com novos RF |
| Múltiplas alternativas técnicas materiais | Debate de desenho antes do DAG |

### Quando normalmente **NÃO** aplica (`gate_required = false` ou `exempt`)

| Sinal | Exemplo |
|-------|---------|
| `risk_tier: hotfix` sem RF novo | Fix localizado 1 ficheiro |
| Pedido factual / tradução / consulta | “O que é X?” |
| Execução já totalmente especificada | Diff exacto pedido pelo humano |
| `skipped_trivial` / pedido não-técnico | Fora de produto |
| Utilizador: `skip grill-me` + evidência `exempt` | HITL explícito |

A classificação final é do **Policy Engine** (`risk_tier` + âmbito), não de uma lista hardcoded no runtime TS.

---

## Regra absoluta (fail-closed)

> **Quando `grill-me` ∈ `require[]` → a transição para `/planejar` (Fase 1) é proibida até `status ∈ {satisfied, exempt}` em `gate.grill-me.json`.**

```text
grill-me indisponível | inválido | não executado | resultado incompleto
  → BLOCKED
  → evidência do motivo
  → instrução de recuperação (correr /grill-me ou registar exempt válido)
```

**Proibido:** soft-skip silencioso → planner (“best effort”).

---

## Ordem mínima

1. Completar `/prd` (ou confirmar docs aprovados) quando Fase 0.5 aplica
2. **Ler** `~/.agents/skills/grill-me/SKILL.md`
3. Executar sessão HITL até `GRILL_ME_RESULT` válido + confirmação humana
4. Gravar `memory/<feature_id>/evidence/gate.grill-me.json`
5. Só então `/planejar`

---

## Por papel

| Papel | O que fazer |
|-------|-------------|
| **EvolveLoop (raiz)** | Classificar se `grill-me` entra em `require[]`; bloquear Fase 1 sem evidência; propagar no GATE_BUNDLE |
| **prd** | Handoff: após aprovação docs, **não** sugerir `/planejar` directo se gate aplicável — apontar `/grill-me` |
| **grill-me** | Executar stress-test; emitir resultado + evidência |
| **planner** | **Recusar** se `require` inclui `grill-me` e ficheiro ausente/`failed`/`blocked` |
| **Workers** | Não substituem grill-me |

---

## Evidence

Ficheiro canónico (Evidence Bus):

`memory/<feature_id>/evidence/gate.grill-me.json`

Campos mínimos:

| Campo | Valores |
|-------|---------|
| `gate` | `grill-me` |
| `required` | `true` \| `false` |
| `status` | `satisfied` \| `blocked` \| `failed` \| `exempt` |
| `skill_id` | `grill-me` |
| `skill_version` | semver da skill |
| `timestamp` | ISO-8601 |
| `reason` | texto curto |
| `verdict` | `pass` \| `reject` \| `skip` (skip só com exempt) |

SSOT / run-notes:

```text
grill_me_gate: required|exempt|n/a
grill_me_status: satisfied|blocked|failed|exempt|absent
grill_me_skill: ~/.agents/skills/grill-me/SKILL.md
```

---

## GATE_BUNDLE

Quando `grill_me_required: true`, o bundle **deve** incluir:

```text
grill_me_required: true|false
grill_me_status: satisfied|blocked|failed|exempt|absent|n/a
grill_me_skill: ~/.agents/skills/grill-me/SKILL.md | n/a
```

Filho `role: plan` com `grill_me_required: true` e status ≠ satisfied|exempt → **recusar** (`bloqueado: grill_me_gate`).

---

## Relação com image-to-code

| Gate | Condição | Momento |
|------|----------|---------|
| `grill-me` | design/planning scope | **Antes** de `/planejar` |
| `image-to-code` | imagem anexada | Em qualquer fase visual / Vision |

Independente: um ciclo pode exigir **ambos**.

---

## Recovery

| Situação | Acção |
|----------|--------|
| Skill path em falta | BLOCKED + instalar symlink `global-skills/grill-me` |
| Sessão incompleta | `status: blocked` — retomar `/grill-me` |
| Utilizador recusa continuar | `failed` ou renegociar âmbito / exempt |
| Hotfix legítimo | `exempt` + `reason` + policy tier |

---

## Nota arquitectural

```text
policy hard gate  ≠  TS engine enforcement
```

Helpers de decisão testáveis podem existir em `orchestrator/src/policy/evolveloop-skill-gates.ts` para evals — **não** substituem o contrato agente/Evidence Bus.
