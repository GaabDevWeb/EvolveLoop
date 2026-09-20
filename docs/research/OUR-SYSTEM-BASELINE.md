# OUR-SYSTEM-BASELINE — MegaBrain / CursorSKILLS Agent System

**Date:** 2026-09-18  
**Purpose:** Comparison baseline for `agent-architecture-mining` investigators.  
**Epistemic:** Prefer OBSERVED code/docs in `CursorSKILLS`; wiki notes may be DOCUMENTED.

## Identity

| Item | Value |
|------|-------|
| System under comparison | MegaBrain development Agent System (`CursorSKILLS` + `orchestrator`) |
| NOT compared as | KernelBot / OrbitBot WhatsApp runtimes (different “Agent” sense — wiki) |
| Primary paths | `/home/gaab/Downloads/CursorSKILLS/orchestrator/` · `.cursor/skills/orquestrar/` |

## Mechanism inventory (baseline)

| Mechanism | Path / evidence | Status (COMPOSITE) |
|-----------|-----------------|-------------------|
| Capability Registry | orchestrator registry / contracts | IMPLEMENTED_TESTED (contract tests present per IMPLEMENTATION-STATUS) |
| Provider Registry | `orchestrator/providers/` | IMPLEMENTED |
| Orchestrator / Runtime | `orchestrator/src/` + skill `orquestrar` | IMPLEMENTED_TESTED |
| Policy Engine | `orquestrar/references/policy-engine.md` + policies | DOCUMENTED + IMPLEMENTED (verify per claim) |
| Evidence Bus | `memory/<feature>/evidence/` JSON gates | DOCUMENTED + IMPLEMENTED (operational contract) |
| Knowledge / grounding | GaabWiki + RAG gate | DOCUMENTED + PARTIAL (wiki: RAG degraded BM25) |
| Memory (episodic) | gaabwiki-mem / `.ai/sessions` | PARTIAL — continuity, not agent working memory |
| Telemetry / tracing | `summarizeExecutionTrace` + docs | PARTIAL |
| Evals | skill evals JSON; gaabwiki pytest | PARTIAL |
| Agent Contracts | PDA roles, GATE_BUNDLE | DOCUMENTED + IMPLEMENTED |
| Task Graph / Task IR | Capability IR `plan.ir.yaml` | IMPLEMENTED |
| Skills | `.cursor/skills/**/SKILL.md` | IMPLEMENTED (instruction packages) |
| Persistence | jobs/checkpoints | PARTIAL |
| Hooks | Cursor hooks + MegaBrain promote-queue | PARTIAL |
| Sandbox | UNKNOWN / limited for target code execution | UNKNOWN–PARTIAL |
| Multi-agent PDA | Task tool roles plan/exec/gate/explore/critic/librarian | IMPLEMENTED |

## Lente canónica (não alterar)

```text
Agent decide · Capability faz · Provider implementa · Policy autoriza
· Runtime orquestra · Evidence prova · Knowledge grounds
· Telemetry observa · Evals medem
```

## Comparison rules for investigators

For each external/local mechanism classify **our** state as:

`ABSENT | PARTIAL | SUBSTANTIAL | EQUIVALENT | UNKNOWN`

And composite: `DOCUMENTED_ONLY | IMPLEMENTED_UNVALIDATED | IMPLEMENTED_TESTED | PROVEN | UNKNOWN`

Decision vocabulary ONLY:

`ALREADY_PRESENT | ADOPT | ADAPT | PROTOTYPE | DEFER | REJECT`

Do **not** invent MegaBrain mechanisms. If unsure → `UNKNOWN` / `GAP: needs audit of CursorSKILLS`.

## Sources for deeper verification

- `orchestrator/IMPLEMENTATION-STATUS.md`
- `.cursor/skills/orquestrar/references/{policy-engine,evidence-bus,pda-roles,ARCHITECTURAL-PRINCIPLES}.md`
- `orchestrator/contracts/` · `orchestrator/schemas/`
