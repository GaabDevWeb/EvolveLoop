# Lead Matrix — Agent System Transformation (2026-09-17)

**Lead:** MegaBrain / Agent Architect  
**Ferramenta oficial:** `.cursor/skills/agent-authoring/`  
**Repo activo:** `/home/gaab/Downloads/CursorSKILLS`  
**Regra:** cada linha → subchat com agent-authoring; Lead não edita packages de agentes directamente.

## Skill agent-authoring — usabilidade

| Check | Status |
|-------|--------|
| SKILL.md + workflow | OK |
| references (audit, package, lifecycle, gates, duplication, specializations) | OK |
| templates + evals + provider + command + install | OK |
| Agents mirror | OK |
| Audit stale (git/fs caps) | **FIXED** 2026-09-17 (agora IMPLEMENTED) |
| Gates | READY para uso |

## Inventário existente → acção

| Target specialization | Existing package | Action | Notes |
|----------------------|------------------|--------|-------|
| Architect | `adr` + **NEW `architect`** | NEW_AGENT ✅ READY experimental | capability `architecture-analysis`; adr = ADRs only |
| Product/Requirements | `prd` | REFACTOR ✅ READY 1.1.0 | contract business-requirements |
| Planner | `planner` | REFACTOR ✅ READY experimental | provider + planning.yaml + evals |
| Context Engineer | `wiki` | EXTEND ✅ READY experimental 1.2.0 | `context-grounding`; **DO NOT CREATE** `context-engineer` |
| Developer | `backend` (+ frontend-pro) | REFACTOR ✅ READY experimental 1.2.0 | EXTEND backend; KEEP frontend-pro; modes implement+refactor |
| Database | `database` | REFACTOR ✅ READY experimental 1.1.0 | Package completeness + contract |
| DevOps | `devops` | REFACTOR ✅ READY experimental 1.1.0 | Package completeness + contract |
| Refactorer | `backend` mode `refactor` | EXTEND ✅ READY experimental 1.2.0 | **DO NOT CREATE** `refactorer`; mode no backend |
| Researcher | **`researcher`** | NEW_AGENT ✅ READY experimental 1.0.0 | capability `research`; `/pesquisar` `/research`; ≠ Knowledge |
| Knowledge | `wiki-mem` | EXTEND ✅ READY experimental 1.0.0 | `knowledge-promote`; **DO NOT CREATE** thin `knowledge`; Researcher ≠ Knowledge |
| Debugger | **`debugger`** ← Tier3 systematic-debugging | EXTEND ✅ READY experimental 1.0.0 | capability `debug`; `/debugger` `/debug`; **REJECT_DUPLICATE** paralelo |
| Failure Analyst | **`failure-analyst`** | NEW_AGENT ✅ READY experimental 1.0.0 | capability `failure-analysis`; ≠ Debugger; sem fix |
| Tester | `testing` | REFACTOR ✅ READY | Control M1 |
| Code Reviewer | **`code-reviewer`** | NEW_AGENT ✅ READY experimental 1.0.0 | capability `code-review`; PDA gate/critic; **≠** po-review |
| Security | `security` | REFACTOR ✅ READY | Control M1 |
| Validator | **`validator`** | NEW_AGENT (thin) ✅ READY experimental 1.0.0 | capability `validation`; **≠** testing ≠ po-review ≠ code-reviewer |
| Evaluator | `skill-authoring` + `agent-authoring` | EXTEND ✅ READY | `eval-authoring` + op `evaluate`; **REJECT_DUPLICATE** agente `evaluator` |
| Observer | runtime telemetry | **AGENT_UNNECESSARY** ✅ | `execution-trace` + EventBus/JSONL; **não** criar agente |
| Documentarian | `documentation` | REFACTOR ✅ READY experimental | Control M1 |
| Frontend (extra) | `frontend-pro` | KEEP/REFACTOR ✅ READY experimental 1.2.0 | Construction; keep specialized |
| Orchestrator | `orquestrar` | KEEP | Meta-orchestration; not one of 19 product agents |
| Agent Author | `agent-authoring` | KEEP | Meta |

## Waves (PDA)

1. **Wave M1 — maintain existing Direction/Control:** planner ✅ · prd ✅ · architect NEW ✅ · adr contract ✅ · testing/security/po-review/documentation ✅  
2. **Wave M2 — maintain Construction:** backend ✅ · frontend-pro ✅ · database ✅ · devops ✅ (2026-09-17; sem Universal Developer)  
3. **Wave C1 — Foundation NEW/EXTEND:** Architect ✅ · Context Engineer (`wiki` EXTEND) ✅ · Knowledge (`wiki-mem` EXTEND) ✅  
4. **Wave C2 — Investigation:** Researcher ✅ · Failure Analyst ✅ · Debugger (`debugger`) ✅ · Refactorer (`backend` mode) ✅  
5. **Wave C3 — Control/Meta NEW:** Code Reviewer ✅ · Validator ✅ · Evaluator EXTEND ✅ · Observer AGENT_UNNECESSARY ✅  
6. **Wave I — Integration + composition scenarios + second maintenance pass** ✅  
   - Relatório: [`docs/agent-system-final-audit-2026-09-17.md`](./agent-system-final-audit-2026-09-17.md)  
   - Fix crítico: `orquestrar` **2.5.1** — row `/debugger` + PDA explore + Fase 3 pós-3-retries  
   - Sem NEW_AGENT; smoke composição **documentado** (LLM pleno DEFERRED)

## Matriz final por specialization (Wave I)

| Specialization | Package | Status |
|----------------|---------|--------|
| Architect | `architect` (+ `adr`) | **READY** |
| Product/Requirements | `prd` | **READY** |
| Planner | `planner` | **READY** |
| Context Engineer | `wiki` | **READY** |
| Developer | `backend` | **READY** |
| Frontend | `frontend-pro` | **READY** |
| Database | `database` | **READY** |
| DevOps | `devops` | **READY** |
| Refactorer | `backend` mode `refactor` | **READY** |
| Researcher | `researcher` | **READY** |
| Knowledge | `wiki-mem` | **READY** |
| Debugger | `debugger` | **READY** |
| Failure Analyst | `failure-analyst` | **READY** |
| Tester | `testing` | **READY** |
| Code Reviewer | `code-reviewer` | **READY** |
| Security | `security` | **READY** |
| Validator | `validator` | **READY** |
| Evaluator | `skill-authoring` + `agent-authoring` | **PARTIAL** |
| Observer | runtime (não agente) | **DEPRECATED** |
| Documentarian | `documentation` | **READY** |
| Orchestrator | `orquestrar` 2.5.1 | **READY** |
| Agent Author | `agent-authoring` | **READY** |

## Não criar

- Git Agent → capabilities `git.*`
- Filesystem/Shell/System Agents → deterministic providers
- UniversalAgent → RESPONSIBILITY_OVERLOAD
- **`context-engineer`** → EXTEND `wiki` (`context-grounding`) — REJECT_DUPLICATE
- **thin `knowledge` agent** → EXTEND `wiki-mem` (`knowledge-promote`); search = `knowledge.*` deterministic
- **`refactorer` agent** → EXTEND `backend` mode `refactor` — REJECT_DUPLICATE
- **segundo Debugger / package paralelo a systematic-debugging** → EXTEND via `debugger` — REJECT_DUPLICATE
- **agente `evaluator`** → EXTEND `skill-authoring` + `agent-authoring` — REJECT_DUPLICATE
- **Observer agent** → AGENT_UNNECESSARY — telemetria/runtime (`docs/execution-replay-model.md`)
