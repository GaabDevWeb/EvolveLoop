# Skill Usage Audit — Summary Table

**Date:** 2026-09-19  
**Status:** `AUDIT_COMPLETE` · no deletions · no catalog mutation  
**Frequency column:** `NOT_MEASURED` everywhere (no live telemetry)

## Project inventory

| Location | Count |
|----------|------:|
| `.cursor/skills` | 23 |
| `global-skills` | 20 |
| `agent-setup/skills` (divergent copies) | 2 |
| Unique outside project (`ip-as-logo`, `wiki-carpaccio`) | 2 |
| Commands (`.cursor/commands`) | 29 |

## Matrix (all project skills)

| Skill | Location | Used? | Caller | Flow | Dependency | Gate | Frequency | Criticality | Removal | Evidence |
|-------|----------|-------|--------|------|------------|------|-----------|-------------|---------|----------|
| orquestrar | local | Y | /MegaBrain | root | many | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | MegaBrain.md |
| gaabwiki | local | Y | /wiki, orquestrar | grounding | — | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | gaabwiki-grounding-gate |
| gaabwiki-mem | local | Y | /mem, hooks | episodic | — | soft | NOT_MEASURED | HIGH | DO_NOT_REMOVE | hooks.json |
| prd | local | Y | /prd | planning | brainstorming? | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | Fase 0.5 |
| planner | local | Y | /planejar | planning | image-to-code? | soft | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | planejar.md |
| frontend-pro | local | Y | /frontend-pro | frontend | image-to-code, agent-browser | HARD* | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | frontend-pro SKILL |
| backend | local | Y | /backend | development | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | backend.md |
| testing | local | Y | /testes | validation | debugger | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | testes.md |
| debugger | local | Y | /debugger | debugging | systematic-debugging | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | debugger SKILL |
| security | local | Y | /seguranca | validation | — | HARD* | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | policy-engine |
| po-review | local | Y | /validar | validation | image-to-code? | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | validar.md |
| documentation | local | Y | /documentar | validation | — | soft | NOT_MEASURED | HIGH | DO_NOT_REMOVE | documentar.md |
| code-reviewer | local | Y | /code-reviewer | validation | — | soft | NOT_MEASURED | MED | DO_NOT_REMOVE | code-reviewer.md |
| validator | local | Y | /validator | validation | — | soft | NOT_MEASURED | MED | DO_NOT_REMOVE | validator.md |
| researcher | local | Y | /pesquisar | research | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | pesquisar.md |
| architect | local | Y | /architect | architecture | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | architect.md |
| adr | local | Y | /adr | architecture | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | adr.md |
| database | local | Y | /database | development | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | database.md |
| devops | local | Y | /devops | development | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | devops.md |
| failure-analyst | local | Y | /failure-analyst | debugging | — | — | NOT_MEASURED | MED | DO_NOT_REMOVE | failure-analyst.md |
| agent-authoring | local | Y | /agent-authoring | agent-authoring | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | agent-authoring.md |
| skill-authoring | local | Y | /skill-authoring | skill-authoring | image-to-code ref | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | skill-authoring.md |
| agent-architecture-mining | local | Y | /agent-architecture-mining | architecture | — | — | NOT_MEASURED | HIGH | DO_NOT_REMOVE | command; install gap |
| image-to-code | global | Y | orquestrar, frontend-pro | frontend | — | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | image-attachment-gate |
| brainstorming | global | Y | orquestrar, prd | planning | writing-plans | soft† | NOT_MEASURED | HIGH | DO_NOT_REMOVE | Fase 0.5 |
| writing-plans | global | partial | brainstorming only | superpowers | SDD/executing | — | NOT_MEASURED | LOW | REMOVE_AFTER_MIGRATION | Superpowers SKILL |
| executing-plans | global | doc | ecosystem-v2 claim | superpowers | finishing | — | NOT_MEASURED | LOW | REMOVE_AFTER_MIGRATION | DOC_DRIFT |
| subagent-driven-development | global | partial | writing-plans | superpowers | finishing | — | NOT_MEASURED | LOW | REMOVE_AFTER_MIGRATION | research docs |
| finishing-a-development-branch | global | doc | Superpowers peers | superpowers | — | — | NOT_MEASURED | LOW | REMOVE_AFTER_MIGRATION | DOC_DRIFT |
| systematic-debugging | global | Y | debugger | debugging | — | HARD | NOT_MEASURED | CRITICAL | DO_NOT_REMOVE | PACKAGE-NOTE ABSORBED |
| grill-me | global | Y‡ | orquestrar, prd | planning | grilling MISSING | soft | NOT_MEASURED | MED | DO_NOT_REMOVE | WRAPPER broken |
| find-skills | global | Y§ | docs/discovery | discovery | — | — | NOT_MEASURED | MED | DO_NOT_REMOVE | DOC_DRIFT vs TS |
| technical-library-dossier | global | Y | /library-dossier | research | agent-browser | HARD¶ | NOT_MEASURED | HIGH | DO_NOT_REMOVE | library-dossier.md |
| agent-browser | global | Y | dossier, frontend-pro | browser | — | cond. | NOT_MEASURED | HIGH | DO_NOT_REMOVE | browser-tools.md |
| frontend-design | global | soft | frontend-pro anti-slop | frontend | — | — | NOT_MEASURED | LOW | OPTIONAL | anti-slop.md |
| ui-ux-pro-max | global | soft | frontend-pro fork | frontend | — | — | NOT_MEASURED | LOW | OPTIONAL | frontend-pro SKILL |
| gsap | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| framer-motion | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| lenis | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| hover-effects | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| particles | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| r3f-shaders | global | standalone | — | motion | peers | — | NOT_MEASURED | LOW | OPTIONAL | self only |
| linkedin-posts | global | inventory | — | content | — | — | NOT_MEASURED | LOW | ARCHIVE_CANDIDATE | README/INVENTORY |

\* HARD when policy/image condition applies  
† Internal HARD when skill runs; optional to enter MegaBrain  
‡ Referenced; effective execution UNKNOWN without grilling  
§ Discoverable; architectural fallback **not** implemented in orchestrator TS  
¶ HARD inside dossier skill contract only

## 11 protected candidates — quick answers

| Skill | USED? | WHERE? | BY WHOM? | WHEN? | HARD/SOFT | DIRECT/INDIRECT | FALLBACK? | CRITICAL? | OPTIONAL? | REMOVABLE? |
|-------|-------|--------|----------|-------|-----------|-----------------|-----------|-----------|-----------|------------|
| brainstorming | Y | Fase 0.5 | orquestrar/prd | pre-prd | soft† | indirect | N | high when used | Y entry | N now |
| writing-plans | partial | Superpowers | brainstorming | after design | soft | skill→skill | N | N MegaBrain | Y | after migration |
| executing-plans | doc | ecosystem claim | docs | plan-execution claim | soft | — | N | N | Y | after migration |
| subagent-driven-development | partial | Superpowers | writing-plans | impl session | soft | skill→skill | N | N MegaBrain | Y | after migration |
| finishing-a-development-branch | doc | ecosystem/Superpowers | peers | post-impl | soft | skill→skill | N | N MegaBrain | Y | after migration |
| systematic-debugging | Y | debugger source | debugger | debug | HARD | indirect ABSORBED | N | Y | N | N |
| grill-me | Y‡ | Fase 0.5 | orquestrar/prd | post-prd | soft | indirect WRAPPER | N | med | Y | N until fixed |
| find-skills | Y§ | discovery | agent/docs | capability gap | — | claimed fallback | claimed | med unresolved | Y | N until drift fixed |
| technical-library-dossier | Y | /library-dossier | user command | deep lib research | HARD¶ | command | N | high when used | Y path | N |
| agent-browser | Y | dossier/FE | dossier HARD; FE fallback | browser tasks | cond. | indirect | Y (FE) | high | Y in FE | N |
| image-to-code | Y | Vision/gate | orquestrar/FE/PO | image attached | HARD | indirect policy | N | CRITICAL | N when attached | N |
