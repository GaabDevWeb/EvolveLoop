# 00 — Skill Inventory (canonical rediscovery)

**Generated:** 2026-09-21T00:01:39.835318+00:00  
**Branch:** evolve-v2  
**Commit:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`  

## Pre-flight

| Item | Value |
|------|-------|
| Node | v24.15.0 |
| npm | 11.12.1 |
| Python | 3.13.5 |
| Cursor CLI | AVAILABLE |
| Ollama | AVAILABLE (bonsai-64k) |
| CURSOR_API_KEY | MISSING |
| OPENAI_API_KEY | MISSING |
| ANTHROPIC_API_KEY | MISSING |
| WIKI_ROOT | unset |
| skills/ root | ABSENT |
| `.cursor/skills` | present |
| `global-skills` | present |
| `orchestrator/providers` | present |
| `~/.agents/skills` | present |

## Discovery sources

1. `.cursor/skills/*/SKILL.md`
2. `global-skills/*/SKILL.md`
3. `orchestrator/providers/*/provider.yaml`
4. `agent-setup/skills` (copies)
5. Host `~/.agents/skills` (host-only extras)

**Discovered:** 46

## Inventory table

| skill_id | version | source | classification | provider.yaml | evals | testability |
|----------|---------|--------|----------------|---------------|-------|-------------|

| MegaBrain | 2.5.1 | host:~/.agents/skills | HOST-DEPENDENT | False | True | BLOCKED_ON_HOST_PACK |
| adr | 1.0.1 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| agent-architecture-mining | 1.0.0 | .cursor/skills | META/ORCHESTRATION | True | True | MEDIUM |
| agent-authoring | 1.1.0 | .cursor/skills | META/ORCHESTRATION | True | True | MEDIUM |
| agent-browser | UNKNOWN | global-skills | CONDITIONAL, LLM-DEPENDENT | False | False | LIVE_REQUIRED |
| architect | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| backend | 1.2.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| brainstorming | UNKNOWN | global-skills | HOST-DEPENDENT, META/ORCHESTRATION | False | False | MEDIUM |
| code-reviewer | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| database | 1.1.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| debugger | 1.0.0 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| devops | 1.1.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| documentation | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| executing-plans | UNKNOWN | global-skills | HOST-DEPENDENT, META/ORCHESTRATION | False | False | MEDIUM |
| failure-analyst | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| filesystem | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| find-skills | UNKNOWN | global-skills | DISCOVERY-ONLY | False | False | MEDIUM |
| finishing-a-development-branch | UNKNOWN | global-skills | HOST-DEPENDENT, META/ORCHESTRATION | False | False | MEDIUM |
| frontend-design | UNKNOWN | global-skills | LLM-DEPENDENT | False | False | LIVE_REQUIRED |
| frontend-pro | 1.2.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| git | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| grill-me | 2.0.0 | global-skills | CONDITIONAL, HARD-GATE | False | False | MEDIUM |
| image-to-code | UNKNOWN | global-skills | CONDITIONAL, HARD-GATE | False | False | MEDIUM |
| ip-as-logo | UNKNOWN | host:~/.agents/skills | HOST-DEPENDENT | False | True | BLOCKED_ON_HOST_PACK |
| knowledge | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| orquestrar | 2.5.1 | .cursor/skills | META/ORCHESTRATION | False | True | MEDIUM |
| planner | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| po-review | 1.1.0 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| prd | 1.1.0 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| project | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| researcher | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| security | 2.1.1 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| shell | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| skill-authoring | 1.3.0 | .cursor/skills | META/ORCHESTRATION | False | False | MEDIUM |
| subagent-driven-development | UNKNOWN | global-skills | HOST-DEPENDENT, META/ORCHESTRATION | False | False | MEDIUM |
| system | UNKNOWN | orchestrator/providers | DETERMINISTIC | True | False | HIGH |
| systematic-debugging | UNKNOWN | global-skills | LLM-DEPENDENT | False | False | LIVE_REQUIRED |
| technical-library-dossier | 1.0.0 | global-skills | LLM-DEPENDENT | False | True | LIVE_REQUIRED |
| test-autonomous-write | UNKNOWN | orchestrator/providers | DETERMINISTIC, PROVIDER-DEPENDENT | True | False | HIGH |
| testing | 1.2.0 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| ui-ux-pro-max | UNKNOWN | global-skills | LLM-DEPENDENT | False | False | LIVE_REQUIRED |
| validator | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| wiki | 1.2.0 | .cursor/skills | HARD-GATE | True | True | MEDIUM |
| wiki-carpaccio | 1.0.0 | host:~/.agents/skills | HOST-DEPENDENT | False | True | BLOCKED_ON_HOST_PACK |
| wiki-mem | 1.0.0 | .cursor/skills | LLM-DEPENDENT, PROVIDER-DEPENDENT | True | True | LIVE_REQUIRED |
| writing-plans | UNKNOWN | global-skills | HOST-DEPENDENT, META/ORCHESTRATION | False | False | MEDIUM |

## Notes

- Engine discovery loads only dirs with `provider.yaml` under `.cursor/skills` + `orchestrator/providers`.

- `find-skills` ≠ `provider-discovery.ts`.

- Host-only skills are inventory members but not Engine-pack.
