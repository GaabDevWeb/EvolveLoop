# descobrir — provider/skill discovery (user-facing)

Invocação **`/descobrir`**.

1. **Ler** `~/.agents/skills/find-skills/SKILL.md`
2. Usar Skills CLI (`npx skills find …`) para descobrir/instalar skills do ecossistema aberto
3. **Isto NÃO é** o fallback do Execution Engine / Registry

**Canonical architecture (2026-09-19 pre-pruning):**

| Camada | Mecanismo |
|--------|-----------|
| **User / Agent discovery** | `find-skills` + `/descobrir` → `npx skills` |
| **Orchestrator provider miss** | `orchestrator/src/discovery/provider-discovery.ts` — scan local de `provider.yaml` |

Não confundir o módulo TS `provider-discovery` com a skill `find-skills`.

**Capability documentada:** `provider-discovery` (sentido *humano*: descobrir providers/skills externos)  
**Runtime TS fallback:** manifest scan — **sem** chamar esta skill.
