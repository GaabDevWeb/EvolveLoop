# ADVERSARIAL-REVIEW — MCP TARGET_RESEARCH

Date: 2026-09-18  
Reviewer stance: attack the report’s confidence, not the protocol’s marketing.

## 1. Did we treat MCP as “just tool calling”?

**Check:** REPORT separates Tools / Resources / Prompts control models; Host/Client/Server; transports; auth; reverse primitives.  
**Verdict:** Pass — mechanism set is protocol-shaped.  
**Residual risk:** Readers may still skim only M-TOOLS-SCHEMA; decisions table must stay attached to handoff.

## 2. Overclaiming MegaBrain equivalence?

**Attack:** “ALREADY_PRESENT for tools” may overstate — Capability Registry ≠ MCP wire protocol.  
**Mitigation in REPORT:** Split semantic ALREADY_PRESENT vs wire ADAPT; confidence MEDIUM–HIGH.  
**Residual:** Without U-03 audit, “mcp” executor_types might be aspirational. If unimplemented → revise tools decision toward ADAPT-only.

## 3. Underclaiming / false REJECT?

**Attack:** REJECT reimplementing transports may be wrong if MegaBrain needs headless agents outside Cursor.  
**Response:** REJECT is scoped to *duplicating while Cursor hosts*; ADR path (B) thin client remains open in handoff. Not a permanent ban — evidence insufficient for ADOPT native stack now.

## 4. Version cherry-picking?

**Attack:** Basing decisions on 2025-11-25 while 2026-07-28 deletes sessions/sampling is biased.  
**Response:** Explicit CONFLICT blocks; Sampling/Roots DEFER partly *because* of draft.  
**Residual:** If draft ratifies quickly, Resources subscribe PROTOTYPE may waste effort — flagged in UNKNOWNS U-07.

## 5. Security theatre?

**Attack:** Spec “SHOULD consent” without enforcement — report might imply MCP is “secure by architecture.”  
**Response:** M-SECURITY-HOST-ENFORCED states protocol cannot enforce; isolation is Host-dependent.  
**Residual:** No MEASURED exploit corpus here — do not claim empirical hardness.

## 6. Popularity contamination?

**Attack:** Ecosystem size influenced ADOPT.  
**Response:** Adoption table separates Ecosystem from Technical; no scores/rankings. ADOPT limited to host transports/OAuth necessity, not “because popular.”

## 7. Missing alternatives?

**Attack:** Insufficient comparison to OpenAPI tool calling, LSP analogy depth, A2A, function-calling JSON schemas.  
**Response:** Alternatives listed per mechanism at high level. Full cross-system = separate mode.  
**GAP accepted:** PATTERN_MINING later if Lead requests.

## 8. Source hygiene?

**Attack:** Medium secondary articles appeared in search.  
**Response:** Not used as primary evidence; official modelcontextprotocol.io specs cited.  
**Residual:** U-01 schema commit not pinned.

## 9. Skill compliance checklist

| Requirement | Status |
|-------------|--------|
| Epistemic labels on key claims | YES |
| UNKNOWN where no proof | YES (`UNKNOWNS.md`) |
| Decisions ∈ allowed set | YES |
| No Agent System implementation | YES |
| No ranking / scores | YES |
| Anti-duplication (registries/Evidence/Skills) | YES REJECT |
| Compare OUR_CURRENT_MECHANISM | YES §6 |
| Adversarial self-critique | THIS FILE |

## 10. Strongest steelman against our conclusions

> “Ignore MCP; Cursor already exposes tools; MegaBrain only needs Policy on Cursor tools.”

**Partial accept:** For many workflows, Cursor mediation + Policy ADAPT is enough — aligns with REJECT native transports.  
**Counter:** Resources/Prompts/OAuth remote servers and capability negotiation are still protocol mechanisms hosts must understand; investigators must not flatten them into “tools.” Remote auth and untrusted annotations remain real gaps even under Cursor mediation.

## 11. Revision triggers

Re-open decisions if:

1. Orchestrator audit shows no real `mcp` executor (U-03).
2. 2026-07-28 ratifies → re-evaluate session, Sampling, Roots, subscribe.
3. Headless MegaBrain runtime ships without Cursor Host → revisit REJECT on transports.

## 12. Summary verdict

Investigation quality: **adequate for Level 1 TARGET_RESEARCH** from official docs.  
Weakest link: **MegaBrain↔MCP implementation depth (U-03)** and **spec version dual-track**.  
Net recommendation stands: **integrate MCP as Host-mediated wire protocol; map into existing Capability/Provider/Policy; do not clone registries; DEFER Sampling/Roots; PROTOTYPE resource→Knowledge mapping carefully.**
