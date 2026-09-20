# ADR-0003: CapabilityAuthority vs ExecutionPolicy

| Campo | Valor |
|-------|-------|
| Data | 2026-09-17 |
| Status | accepted |
| Deciders | MegaBrain / platform evolution |

## Contexto

O `PolicyEngine` existente responde a perguntas de **execução**: retries, gates, strategy de provider, timeouts (`high-reliability`, `rapid-prototype`, `cost-optimized`). A missão e a auditoria exigiam allow/deny/confirm por capability (filesystem/shell/confirmação), o que **não** é a mesma pergunta. Fundir as duas num único objecto misturaria risk de permissões com scheduling.

Existe ainda a spec MegaBrain (`policy-engine.md`) de risk_tier / budget / topology para o orquestrador LLM raiz — terceira camada documental.

## Decisão

Manter **três** limites distintos:

| Camada | Pergunta | Implementação |
|--------|----------|---------------|
| **ExecutionPolicy** | Quantos retries? Quais gates? Que strategy? | `PolicyEngine` (existente) |
| **CapabilityAuthority** | Esta capability pode correr neste contexto? Precisa confirmação? | `authorize()` / `CapabilityAuthority` (novo) |
| **MegaBrain policy** | risk_tier / budget / topology | Spec docs — fora do TS engine nesta fase |

Authority corre **antes** do handler deterministic; deny/confirm emitem `buildAuthorityEvidence`; allow anexa decisão ao worker evidence.

## Alternativas consideradas

### Alternativa A — Estender ExecutionPolicy com allow/deny/confirm

- Prós: um ficheiro de policy
- Contras: conflui retries com permissões; quebra semântica dos builtins; difícil reutilizar em providers fora do engine loop

### Alternativa B — Só prompts / skill instructions (“não corras shell”)

- Prós: zero código
- Contras: não enforce; sem evidence auditável

### Alternativa C — Camada CapabilityAuthority ao lado (escolhida)

- Prós: pergunta certa; testável; não reescreve PolicyEngine
- Contras: dois pontos de configuração — documentar a fronteira (este ADR)

## Consequências

### Positivas

- Path escape / shell / write gated de forma explícita
- Evidence de autoridade separável no replay (`payload.type: authority`)
- ExecutionPolicy permanece estável para LLM workers

### Negativas / trade-offs

- Call sites devem passar `AuthorityContext` (allowShell, allowWrite, confirmed)
- Confirm sem UI humana no engine = falha `CONFIRMATION_REQUIRED` até haver gate humano

## Referências

- Código: `src/authority/capability-authority.ts`, `src/policies/policy-engine.ts`
- Relacionado: ADR-0002
