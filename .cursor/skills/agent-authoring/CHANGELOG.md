# Agent change record — `agent-authoring` 1.0.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | create |
| Breaking | no |
| Decisão | NEW_AGENT |

## Depois

- version: 1.0.0
- capability: agent-authoring
- type: meta
- responsibilities: fábrica/manutenção de Agent Packages MegaBrain

## Artefactos tocados

| Path | Acção |
|------|-------|
| `.cursor/skills/agent-authoring/**` | added |
| `.cursor/commands/agent-authoring.md` | added |
| `Agents/Agent-authoring.md` | added |
| `orchestrator/contracts/agent-authoring.yaml` | added |
| `scripts/install-agents-global.sh` | modified |
| `docs/adr/0001-agent-package-composition.md` | added |

## Validação

- gates estruturais: READY
- evals isolados iteration-1 (ids 2,3,4,7): with_skill 8/8 assertions; baseline 6/8
- discriminação: 1/4 wins (só overload) → ship gate **FAIL**
- causa: baseline leu ADR-0001 / docs / skill no repo (contaminação)
- status: **experimental** até iteration-2 com baseline sem acesso a `agent-authoring/`
- deferred: evals 1,5,6,8 + trigger review humano

---

# Agent change record — `agent-authoring` 1.1.0

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Operação | update |
| Breaking | no |
| Decisão | EXTEND_EXISTING_AGENT (Evaluator packages) |

## Motivo

Wave C3: Evaluator = EXTEND meta factories; Observer = AGENT_UNNECESSARY documentado.

## Depois

- version: 1.1.0
- specialization: Agent Author | Evaluator (packages)
- docs: Evaluator vs Observer na skill + specializations
