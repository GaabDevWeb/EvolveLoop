---
name: grill-me
description: >
  HARD-GATE EvolveLoop de stress-test de requisitos/design antes do planner:
  entrevista relâmpago (design tree) até entendimento partilhado. Use quando
  /grill-me, Fase 0.5 pós-/prd, PRD/arquitectura/refactor/escopo significativo,
  ou policy require[] inclui grill-me / design-stress-test. Não use para perguntas
  factuais, tradução, hotfix trivial, ou execução já totalmente especificada
  (exemption documentada). Não use writing-plans/planner até readiness_for_planning.
metadata:
  version: "2.0.0"
  status: stable
  capability: design-stress-test
  type: upstream
  hard_gate: true
  command: grill-me
  evolveloop_gate: grill-me-gate
disable-model-invocation: true
---

# grill-me — Design stress-test (HARD-GATE EvolveLoop)

**Autoridade operacional:** esta skill **é** o gate. Não existe skill `grilling` separada no catálogo CursorSKILLS — a metodologia de entrevista (design tree / rounds) vive **aqui**.

**Capability:** `design-stress-test`  
**Contrato de gate:** `.cursor/skills/orquestrar/references/grill-me-gate.md`  
**Skill path instalado:** `~/.agents/skills/grill-me/SKILL.md`

---

## HARD-GATE (fail-closed)

Quando a Policy Engine marca `grill-me` em `require[]` (ou o orquestrador classifica o âmbito como design/planning scope):

```text
gate_required = true AND gate_not_satisfied  →  BLOCK_TRANSITION to /planejar
```

Estados válidos do gate: `satisfied` | `blocked` | `failed` | `exempt`.  
`absent` / skill inválida / resultado incompleto → **BLOCKED** (nunca “best effort → planner”).

---

## DO

- Entrevistar o utilizador **relentlessly** até entendimento partilhado
- Mapear decisões como **design tree**; trabalhar em **rounds** na frontier
- Expor ambiguidades, assunções, riscos, perguntas abertas
- Gravar evidência `memory/<feature_id>/evidence/gate.grill-me.json`
- Emitir `GRILL_ME_RESULT` estruturado (ver abaixo)
- Pausar o orquestrador durante a sessão (HITL — nunca loop autónomo silencioso)

## DO NOT

- Avançar para `/planejar` / IR / código com `gate_required` e sem `satisfied|exempt`
- Inventar factos do ambiente — usar tools/sub-agentes; decisões ficam com o humano
- Substituir `/prd` (formalização documental) nem `/adr` (decisão arquitectural isolada)
- Correr em paralelo com implementação PDA `exec`

---

## Metodologia (design tree)

Interview until shared understanding. Map decisions as a **design tree**.

Work in **rounds**. The **frontier** is every decision whose prerequisites are settled. Ask the whole frontier in one round: number each question and give your recommended answer. Wait for answers before the next round.

```text
❓ **Q1** - **<title>**: <body>

➡️ <recommended answer>

---
```

Finding _facts_ is the agent's job (tools/sub-agents). _Decisions_ are the user's.

Session done when frontier is empty **and** the user confirms shared understanding.

---

## GRILL_ME_RESULT (minimum valid output)

Emitir no fecho (chat + evidência JSON):

```yaml
GRILL_ME_RESULT:
  problem_understood: true|false
  requirements_challenged: true|false
  ambiguities_found: []
  assumptions_exposed: []
  risks_identified: []
  open_questions: []
  accepted_scope: []
  rejected_scope: []
  readiness_for_planning: true|false
  user_confirmed_shared_understanding: true|false
```

**Mínimo para `satisfied`:**  
`problem_understood` ∧ `requirements_challenged` ∧ `user_confirmed_shared_understanding` ∧ `readiness_for_planning` ∧ listas de âmbito preenchidas (podem ser curtas).

---

## Evidence

Escrever (ou pedir ao orquestrador raiz que escreva):

`memory/<feature_id>/evidence/gate.grill-me.json`

```json
{
  "gate": "grill-me",
  "required": true,
  "status": "satisfied",
  "skill_id": "grill-me",
  "skill_version": "2.0.0",
  "skill_path": "~/.agents/skills/grill-me/SKILL.md",
  "timestamp": "ISO-8601",
  "feature_id": "<id>",
  "result_reference": "GRILL_ME_RESULT",
  "reason": "shared understanding confirmed",
  "verdict": "pass"
}
```

Telemetry (observe-only): ver `docs/architecture/skills/audit/SKILL-TELEMETRY-SCHEMA.yaml` — eventos `GATE_REQUIRED` / `GATE_SATISFIED` / `BLOCKED`.

---

## Exemptions (só com evidência)

Permitidas quando Policy marca `exempt` **e** grava motivo em `gate.grill-me.json`:

- `risk_tier: hotfix` sem RF novo / sem mudança de escopo
- Pedido factual / tradução / consulta sem decisão
- Acção já totalmente especificada pelo humano (“executa exactamente isto”)
- Utilizador ordena explicitamente `skip grill-me` **e** o raiz regista `status: exempt`

Exemption **sem** ficheiro de evidência = **inválida** → BLOCKED.

---

## Integração EvolveLoop

```text
brainstorming? → /prd → /grill-me [HARD quando aplicável] → /planejar → …
```

Ver [grill-me-gate.md](../../.cursor/skills/orquestrar/references/grill-me-gate.md) (path relativo via install: `.cursor/skills/orquestrar/references/grill-me-gate.md`).
