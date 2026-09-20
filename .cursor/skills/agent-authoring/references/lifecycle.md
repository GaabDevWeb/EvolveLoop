# Lifecycle — critérios objectivos

```text
DISCOVER → DESIGN → DRAFT → IMPLEMENT → REGISTER → EVALUATE → VALIDATE → ACTIVATE → MAINTAIN → DEPRECATE
```

## DISCOVER

**Done quando:** inventário escrito (agentes/skills/providers/contracts/roles/evals) + gaps classificados (IMPLEMENTED|PARTIAL|MISSING|…).

Checklist:

- [ ] Ler [architecture-audit.md](architecture-audit.md) e actualizar deltas do repo actual
- [ ] Listar `.cursor/skills/`, `Agents/`, `.cursor/commands/`, `provider.yaml`, `orchestrator/contracts/`
- [ ] Confirmar `AGENTS_ROOT` vs workspace
- [ ] Mapear skills irmãs e fases MegaBrain relevantes

## DESIGN

**Done quando:** decisão de duplicação (`NEW_AGENT`|…) + boundaries DO/DO NOT + capability scope + PDA role(s) + I/O + evidence.

Emitir sinal se:

- `RESPONSIBILITY_OVERLOAD` — propor split
- `REJECT_DUPLICATE` / `EXTEND_EXISTING_*` — não criar ficheiros novos

## DRAFT

**Done quando:** drafts dos artefactos do [agent-package.md](agent-package.md) existem (pelo menos skill + command + change record), ainda `status: draft`.

## IMPLEMENT

**Done quando:** ficheiros no repo reflectem o design; skill corpo consistente com providers/contracts; sem lógica determinística só-no-prompt quando já há capability/contract.

Delegar polish de evals/description da skill a **skill-authoring** se necessário.

## REGISTER

**Done quando:**

- [ ] `provider.yaml` presente (se Tier pipeline) e capabilities apontam a contracts existentes ou novos
- [ ] Entrada em `install-agents-global.sh` `SKILLS=(...)` se skill de pipeline
- [ ] Referência em orquestrar/ecosystem **ou** `DEFERRED` documentado
- [ ] Agents espelho alinhado **ou** justificação de ausência

**Não** criar Agent Registry novo.

## EVALUATE

**Done quando:** `evals/evals.json` cobre identidade, boundaries, capability scope, output/handoff, falhas — mín. 5 casos, ≥3 categorias (alinhar skill-authoring). Incluir meta-evals negativos quando o pedido for «criar agente» indevido.

## VALIDATE

**Done quando:** quality gates críticos em [quality-gates.md](quality-gates.md) passam; falhas → `NOT_READY` (não mascarar).

Evals comportamentais: runners isolados (outro chat / Task), não na sessão de authoring — reutilizar protocolo de skill-authoring.

## ACTIVATE

**Done quando:** `metadata.status: stable` (ou `experimental` explícito aceite pelo utilizador) + install/symlink ok + comando `/` testável.

## MAINTAIN

Operações: `inspect | review | update | refactor | migrate | validate | evaluate`.

Breaking (bump major / migration note):

- mudança de responsabilidade / output contract
- remoção de capability obrigatória
- alteração de autoridade implícita / PDA role
- mudança de contexto obrigatório

Menor: instruções, evals, docs, capability opcional.

## DEPRECATE

**Done quando:** `status: deprecated` em skill+provider; command aponta para sucessor; install pode manter symlink até remoção; documentar replacement.
