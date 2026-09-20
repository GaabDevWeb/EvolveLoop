# Skill Usage — Final Report V2 (Pre-Pruning)

**Date:** 2026-09-19  
**Status:** `PRE_PRUNING_READY`  
**Skills removed:** 0 · **Archived:** 0

## Executive Summary

Pré-pruning corrigiu drifts críticos, tornou **`grill-me` HARD-GATE condicional fail-closed** (autoridade operacional v2.0.0 — sem skill `grilling` separada), instalou **telemetria observe-only** (`SkillLifecycle`), e reclassificou disposições em V2 **sem remover skills**.

`image-to-code` permanece HARD-GATE; documentado explicitamente: **policy ≠ TS engine enforcement**.

`find-skills` = **user-facing discovery** (`/descobrir`); fallback runtime = scan `provider.yaml`.

## Drift repaired

See [DRIFT-REPAIR-REPORT.md](./DRIFT-REPAIR-REPORT.md).

## Hard gates

See [HARD-GATES-V2.yaml](./HARD-GATES-V2.yaml) + [HARD-GATE-CONTRACT.md](./HARD-GATE-CONTRACT.md).

| Gate | Condição | Enforcement | Evidence | Fail-Closed | Status |
|------|----------|-------------|----------|-------------|--------|
| image-to-code | imagem anexada | policy/agent | SSOT/Vision | policy yes | UNCHANGED |
| grill-me | design/planning | policy/agent + Evidence Bus | gate.grill-me.json | **yes** | **NEW OPERATIONAL** |

## Telemetry

Installed: `orchestrator/src/telemetry/skill-telemetry.ts` + EventType `SkillLifecycle` + CursorSkillProvider hooks.  
Production frequency: **NOT_MEASURED** (window = harness only).

## Superpowers

**PARTIAL** confirmed: upstream methodology (`brainstorming`) optional; mid/downstream **not** MegaBrain-canonical (planner/PDA/po-review instead).

## 11-skill update

| Skill | V2 disposition |
|-------|----------------|
| brainstorming | KEEP_OPTIONAL |
| writing-plans | REVIEW |
| executing-plans | REVIEW |
| subagent-driven-development | REVIEW |
| finishing-a-development-branch | REVIEW |
| systematic-debugging | DO_NOT_REMOVE (ABSORBED) |
| grill-me | DO_NOT_REMOVE (HARD_GATE) |
| find-skills | KEEP_SPECIALIZED |
| technical-library-dossier | DO_NOT_REMOVE |
| agent-browser | DO_NOT_REMOVE |
| image-to-code | DO_NOT_REMOVE |

## Regression

**212/212** vitest passed (was 196; +16 gate/telemetry tests).

## Artifacts

| File |
|------|
| SKILL-USAGE-FINAL-REPORT-V2.md |
| SKILL-USAGE-MATRIX-V2.yaml |
| SKILL-DEPENDENCY-GRAPH-V2.md / .yaml |
| SKILL-TELEMETRY-SCHEMA.yaml |
| SKILL-TELEMETRY-REPORT.md |
| HARD-GATES-V2.yaml |
| HARD-GATE-CONTRACT.md |
| DRIFT-REPAIR-REPORT.md |
| REMOVAL-CANDIDATES-V2.yaml |
| DO-NOT-REMOVE-V2.yaml |
| PRE-PRUNING-DECISION.md |
| PRE-PRUNING-TEST-MATRIX.yaml |
