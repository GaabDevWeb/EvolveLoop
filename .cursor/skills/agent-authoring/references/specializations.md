# Specializations — catálogo preparado (não auto-criar)

A skill **está preparada** para criar estes agentes sob pedido explícito. **Não** materializar a lista inteira num único run.

## Direction

| Nome sugerido | Capability típica | PDA | Notas |
|---------------|-------------------|-----|-------|
| Architect | architecture / ADR-like | plan | fronteira com `adr`, `planner` |
| Planner | `planning` | plan | **EXISTS** `planner` |
| Product/Requirements | `prd` / requirements | plan | **EXISTS** `prd` |
| Context Engineer | `context-grounding` | explore/plan | **EXISTS** `wiki` — DO NOT CREATE `context-engineer` |

## Construction

| Nome | Capability | PDA | Notas |
|------|------------|-----|-------|
| Developer / Backend | `backend-implementation` | exec | **EXISTS** `backend` |
| Database | `database-schema` | exec | **EXISTS** `database` |
| DevOps | devops-deploy (ou similar) | exec | **EXISTS** `devops` |
| Frontend | `frontend-ui` | exec | **EXISTS** `frontend-pro` |
| Refactorer | refactor | exec | **EXISTS** as `backend` mode `refactor` — DO NOT CREATE agente separado |

## Investigation

| Nome | Capability | PDA | Notas |
|------|------------|-----|-------|
| Researcher | research | explore | verificar skills globais antes de NEW |
| Knowledge | `knowledge-promote` | librarian | **EXISTS** `wiki-mem` — DO NOT CREATE thin `knowledge`; ≠ Researcher |
| Debugger | debug | explore/exec | **EXISTS** `debugger` — EXTEND Tier3 systematic-debugging; REJECT_DUPLICATE paralelo |
| Failure Analyst | failure-analysis | explore/critic | |

## Control

| Nome | Capability | PDA | Notas |
|------|------------|-----|-------|
| Tester | `testing` | gate | **EXISTS** `testing` |
| PO (aceite) | `po-acceptance` | gate | **EXISTS** `po-review` — **≠** Code Reviewer |
| Code Reviewer | `code-review` | gate | **EXISTS** `code-reviewer` — **≠** `po-review` / `validator` / `testing` |
| Security | `security-review` | gate | **EXISTS** `security` |
| Validator | `validation` | gate | **EXISTS** `validator` (thin) — **≠** testing / po-review / code-reviewer |

## Meta / Quality

| Nome | Capability | PDA | Notas |
|------|------------|-----|-------|
| Evaluator | `eval-authoring` (+ evaluate packages) | meta | **EXTEND** `skill-authoring` + `agent-authoring` — DO NOT CREATE `evaluator` |
| Observer | telemetry/observe | — | **AGENT_UNNECESSARY** — `execution-trace` / EventBus |
| Documentarian | `documentation` | gate | **EXISTS** `documentation` |
| Skill Author | skill-authoring | meta | **EXISTS** (+ Evaluator skills) |
| Agent Author | agent-authoring | meta | esta skill (+ Evaluator packages) |

## Templates estruturais (comportamento)

Usar secções DO/DO NOT + capability scope + handoff; variar ênfase:

| Template | Ênfase |
|----------|--------|
| reasoning | análise, opções, evidência; pouco patch |
| execution | código/artefactos; handoff para gates |
| research | fontes, source_policy, anti-alucinação |
| review | adversarial, findings estruturados |
| validation | DoD, evidence files, vereditos |
| diagnostic | hypothetes → evidence → root cause |
| orchestration-support | SSOT/matriz; **não** implementar produto |
