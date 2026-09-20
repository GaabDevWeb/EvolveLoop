# FRAGILE-ALREADY-PRESENT

**Date:** 2026-09-18  
**Purpose:** Research-era `ALREADY_PRESENT` claims that lack full implementation proof on this tree.

| Mechanism | Previous claim | Actual status | Missing evidence | Implementation gap | Risk of false assumption |
|-----------|----------------|---------------|------------------|--------------------|--------------------------|
| Capability + Provider registries | ALREADY_PRESENT / IMPLEMENTED_TESTED | **IMPLEMENTED** (core select path) | Full-cycle e2e blocked here by missing jobs | None for select itself | LOW if limited to registry lookup |
| Orchestrator + Capability IR / PDA | ALREADY_PRESENT | **PARTIALLY_IMPLEMENTED** | Engine cannot load without `jobs/`; PDA is skill process not engine class | Missing `src/jobs/`; PDA ≠ ExecutionEngine | **HIGH** — “runtime complete” overstated for this checkout |
| Policy Engine | ALREADY_PRESENT | **PARTIALLY_IMPLEMENTED** | Enforcement only on DeterministicProvider | ExecutionPolicy ≠ CapabilityAuthority coverage | **HIGH** — policy “allows” mock/skill side-effects without authority |
| Evidence Bus | ALREADY_PRESENT | **PARTIALLY_IMPLEMENTED** / dual concept | No engine write of `memory/*/evidence/gate.*.json` | Skill convention vs `Evidence[]` + JSONL | **HIGH** — gates “proven” in docs, not by engine FS bus |
| Skills as SKILL.md | ALREADY_PRESENT | **IMPLEMENTED** (packages exist) | Orchestrator does not parse SKILL.md as Agent | Skill → Provider via CursorSkill/JobFile, not Skill=Capability | MEDIUM — conflating package with capability IR |
| Wiki / Knowledge grounding | ALREADY_PRESENT | **PARTIALLY_IMPLEMENTED** | RAG depends on external wiki; DeterministicProvider path | Not EvolveLoop-only; UNAVAILABLE if python missing | MEDIUM |
| MCP via host | ADOPT (host) | **NOT_IMPLEMENTED** in orchestrator | N/A — correctly host-side | None expected in package | LOW if not claimed as engine feature |
| Subagent / PDA isolation | ADAPT / substantial | **DOCUMENTED_ONLY** in engine; **PARTIAL** in Cursor Task | No Agent Registry runtime objects | Isolation is host Task tool, not engine | MEDIUM–HIGH if treated as engine multi-agent |
| HITL / jobs waiting | PROTOTYPE / partial jobs | **DEAD_OR_UNREACHABLE** here | `src/jobs/` absent | Checkpoint/resume unreachable | **CRITICAL** for E-005 |
| Sandbox | PROTOTYPE / UNKNOWN–PARTIAL | **NOT_IMPLEMENTED** (OS) | No seatbelt/docker | Path flags ≠ sandbox | **HIGH** if labelled ALREADY_PRESENT casually |

## Summary

Do **not** treat research `ALREADY_PRESENT` as PROVEN for: Evidence Bus (EvolveLoop FS), full Orchestrator resume, Policy enforcement on all providers, OS sandbox, or PDA-as-engine.
