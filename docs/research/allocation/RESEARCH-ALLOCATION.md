# RESEARCH-ALLOCATION

**Date:** 2026-09-18  
**Derived from SSOT:** `/home/gaab/Documentos/reverseEnginering/_corpus-audit/`  
**Primary inputs:** `RESEARCH-TARGETS.yaml`, `TARGET-INVENTORY.yaml`, `CORPUS-MAP.md`, `PROVENANCE-MAP.yaml`  
**Skill:** `agent-architecture-mining`  
**Rule:** depth = research allocation, **not** quality ranking.  
**Status:** allocation executed; 21/21 target reports complete (see `docs/research/targets/`).

**Official docs root:** `CursorSKILLS/docs/research/`  
**Working scratch (non-canonical):** `reverseEnginering/research/`  
**Corpus inventory SSOT:** `reverseEnginering/_corpus-audit/` (do **not** re-audit).

---

## Tracks

| Track | Root | Use |
|-------|------|-----|
| LOCAL_CORPUS | `/home/gaab/Documentos/reverseEnginering/{target}` | Five audited clones only |
| EXTERNAL_RESEARCH | Official repos/docs/specs | Sixteen mandatory external targets |

---

## Local targets (from `_corpus-audit`)

| Target | Source | Classification | Research depth | Investigator | Scope | Relevant artifacts | Primary questions | Expected output | Dependencies |
|--------|--------|----------------|----------------|--------------|-------|--------------------|-------------------|-----------------|--------------|
| superpowers | LOCAL_CORPUS `…/superpowers` | SKILL_SYSTEM + methodology runtime | DEEP | Subchat-01 (done) | Skills, hooks, SDD, multi-harness, tests/evals docs, git evolution | `skills/`, hooks, `tests/`, RELEASE-NOTES, CLAUDE.md | How do discovery/activation/disclosure/workflow/verification work? Temporal evolution? | Target dossier in `targets/local/superpowers/` | Audit tgt-superpowers; OUR-SYSTEM-BASELINE |
| mattpocock-skills | LOCAL_CORPUS `…/skills` (pkg `mattpocock-skills`) | SKILL_SYSTEM | DEEP | Subchat-02 (done) | Skill structure, invoke axis, ADR, distribution | 38× SKILL.md, `.agents/`, CHANGELOG, plugin | Granularity, metadata, composition, dual-harness? | `targets/local/mattpocock-skills/` | Audit tgt-mattpocock-skills; **no** joint superpowers compare in-target |
| agency-agents | LOCAL_CORPUS `…/agency-agents` | SYSTEM_PROMPT_CORPUS / roster | DEEP | Subchat-03 (done) | Personas, integrations, install — **IDENTITY≠RUNTIME** | division md, `integrations/`, scripts | Corpus vs framework vs multi-agent runtime? | `targets/local/agency-agents/` | Audit conflict on `testing/` |
| security-audit-skill | LOCAL_CORPUS | SKILL_SYSTEM + workflow | MODERATE | Subchat-04 (done) | 6-phase audit, ledger, validators | `skills/security-audit/*` | Evidence/validation/policy/agent boundaries? | `targets/local/security-audit-skill/` | Fleet harness NOT_IN_CORPUS |
| brag | LOCAL_CORPUS | SKILL_SYSTEM + media | AUXILIARY | Subchat-05 (done) | Packaging, DX, demos only | SKILL.md, assets, examples | Packaging/distribution — not agent runtime | `targets/local/brag/` | Hyperframes external |

---

## External targets (mandatory set — not from corpus audit)

| Target | Source | Classification | Research depth | Investigator | Scope (lens) | Expected output |
|--------|--------|----------------|----------------|--------------|--------------|-----------------|
| openai-agents-sdk | EXTERNAL | Agent SDK | DEEP | done | Agents, tools, handoffs, guardrails, tracing, sessions, MCP, sandbox, HITL | `targets/external/openai-agents-sdk/` |
| langgraph | EXTERNAL | Graph runtime | DEEP | done | State, nodes, checkpoints, interrupt, durability, subgraphs | `targets/external/langgraph/` |
| microsoft-agent-framework | EXTERNAL | Multi-agent / AutoGen lineage | DEEP | done | Teams→Workflow, Magentic, HITL, evolution from AutoGen | `targets/external/microsoft-agent-framework/` |
| crewai | EXTERNAL | Crew/Flow framework | DEEP | done | Agents, tasks, processes, memory, guardrails | `targets/external/crewai/` |
| pydanticai | EXTERNAL | Typed agent SDK | DEEP | done | Deps, tools, validation, durable, OTel | `targets/external/pydanticai/` |
| llamaindex | EXTERNAL | Agents/Workflows/RAG | DEEP | done | Event workflows, handoffs, RAG-as-tool | `targets/external/llamaindex/` |
| codex | EXTERNAL | Coding agent (OSS+closed) | DEEP | done | Loop, sandbox⊕approval, skills, MCP | `targets/external/codex/` |
| claude-code | EXTERNAL | Coding agent / Agent SDK | DEEP | done | Skills, CLAUDE.md, hooks, subagents, sandbox | `targets/external/claude-code/` |
| cursor | EXTERNAL | Product harness (partially closed) | DEEP | done | Rules, skills, MCP, indexing — MegaBrain≠Cursor | `targets/external/cursor/` |
| openhands | EXTERNAL | Coding agent ecosystem | DEEP | done | Workspace/sandbox, events, stuck detector | `targets/external/openhands/` |
| aider | EXTERNAL | Coding loop | DEEP | done | Repo map, edit formats, git fence | `targets/external/aider/` |
| cline | EXTERNAL | IDE coding agent | DEEP | done | Plan/Act, tools, approval, hub-spoke | `targets/external/cline/` |
| roo-code | EXTERNAL | Modes (archived product) | MODERATE | done | Modes, Boomerang, ACL — Cline lineage DOCUMENTED | `targets/external/roo-code/` |
| swe-agent | EXTERNAL | Research coding agent | DEEP | done | ACI, SWE-ReX, SWE-bench firewall | `targets/external/swe-agent/` |
| anthropic-agent-skills | EXTERNAL | Skills protocol | DEEP | done | Progressive disclosure, filesystem model | `targets/external/anthropic-agent-skills/` |
| mcp | EXTERNAL | Tool protocol | DEEP | done | Host/client/server — not mere tool-calling | `targets/external/mcp/` |

---

## Allocation rules (enforced)

1. One investigator = one target = one report folder.  
2. Cross-target comparison **only** in CROSS-* / patterns.  
3. Do not re-run corpus audit; reconcile only if `AUDIT ≠ OBSERVED` → `corpus-audit-reconciliation/`.  
4. Decision vocabulary only: `ALREADY_PRESENT|ADOPT|ADAPT|PROTOTYPE|DEFER|REJECT`.  
5. No implementation into Agent System in this operation.

---

## Downstream artifacts (canonical under this tree)

| Phase | Artifact |
|-------|----------|
| 4–5 | `CROSS-INVESTIGATION-REVIEW.md` |
| 6 | `CROSS-SYSTEM-ANALYSIS.md`, `patterns/`, `anti-patterns/` |
| 7 | `architecture-gaps/`, `DECISION-MATRIX.md` |
| 8–9 | `hypotheses/`, `experiments/` |
| 10–11 | `AGENT-ARCHITECTURE-PRINCIPLES.md`, `DO-NOT-CHANGE.md`, `EXECUTIVE-FINDINGS.md`, `FUTURE-RESEARCH-TARGETS.md` |
