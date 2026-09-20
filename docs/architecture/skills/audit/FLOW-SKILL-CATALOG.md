# Flow × Skill Catalog

**Audit:** 2026-09-19 · CURRENT_FLOW vs LEGACY_FLOW separated

---

## Development

```text
CURRENT_FLOW:
  plan.ir.yaml / PLANO
    → PDA role:exec
    → /backend | /frontend-pro | /database | /devops | …
    → critic? → /code-reviewer (mandatory if risk_tier=sensitive)
    → /testes → (/debugger after 3 fails)
    → /seguranca?
    → /validar (po-review)
    → /documentar

LEGACY / PARALLEL (Superpowers — installed, not MegaBrain-wired):
  writing-plans → SDD | executing-plans → finishing-a-development-branch
```

Skills: `orquestrar`, `backend`, `frontend-pro`, `database`, `devops`, `code-reviewer`, `testing`, `debugger`, `security`, `po-review`, `documentation`  
Optional parallel: `writing-plans`, `subagent-driven-development`, `executing-plans`, `finishing-a-development-branch`

---

## Planning

```text
CURRENT_FLOW:
  idea
    → brainstorming?                 (SOFT optional)
    → /prd                           (HARD approval)
    → grill-me?                      (SOFT optional; WRAPPER broken)
    → /planejar                      (planner → plan.ir.yaml)
    → Policy Engine + GATE_BUNDLE

SUPERPOWERS PARALLEL (if brainstorming used as Superpowers terminal):
  brainstorming → writing-plans → …
  (conflicts with MegaBrain terminal /prd)
```

Skills: `brainstorming`, `prd`, `grill-me`, `planner`, `adr`, `architect`

---

## Research

```text
CURRENT_FLOW A:
  /pesquisar|/research → researcher → optional MCP/browser → handoff

CURRENT_FLOW B (parallel, NOT child of A):
  /library-dossier → technical-library-dossier → HARD agent-browser + Puppeteer
                 → docs/dossiers/

Orthogonal:
  /wiki → gaabwiki (vault grounding — not web research)
  /agent-architecture-mining → agentic system reverse-eng (near-miss vs dossier)
```

Skills: `researcher`, `technical-library-dossier`, `agent-browser`, `gaabwiki`, `agent-architecture-mining`, `documentation`

---

## Frontend

```text
CURRENT_FLOW:
  /frontend-pro | MegaBrain frontend-ui
    → boot (stack, design system, browser tool)
    → if image attached:
         HARD Vision → image-to-code → implement
      else:
         Build | Review | Fix | Audit | Vision-premium (may still use image-to-code generate→analyze→implement)
    → Review/Audit evidence: Puppeteer default; agent-browser FALLBACK
    → /testes → /validar (PO may re-require image-to-code)
```

Skills: `frontend-pro`, `image-to-code`, `agent-browser`, `frontend-design` (soft), `ui-ux-pro-max` (fork), motion pack (standalone on demand)

---

## Browser

```text
technical-library-dossier ──HARD──► agent-browser
frontend-pro ──OPTIONAL/FALLBACK──► agent-browser
Cursor description match ──DIRECT──► agent-browser CLI stub
researcher / testing ──no hard──► agent-browser
```

---

## Debugging

```text
CURRENT_FLOW:
  bug | /testes RED
    → up to 3 auto-correction cycles (orquestrar)
    → HARD /debugger (absorbs systematic-debugging DO)
    → structural → /backend|/frontend-pro
    → optional /failure-analyst (process taxonomy)

NOT CURRENT:
  invoke systematic-debugging as parallel agent (REJECT_DUPLICATE)
```

Skills: `debugger`, `systematic-debugging` (ABSORBED source), `testing`, `failure-analyst`

---

## Architecture

```text
/architect → architect
/adr → adr
/agent-architecture-mining → mining vs MegaBrain gaps
```

---

## Agent Authoring

```text
/agent-authoring → agent-authoring
  near-miss: find-skills (install external skill ≠ author package)
```

---

## Skill Authoring

```text
/skill-authoring → skill-authoring
  UI skills must reference image-attachment-gate / image-to-code
```

---

## Discovery

```text
LEGACY_FLOW (documented, unimplemented):
  Registry miss → find-skills → npx skills → /descobrir

CURRENT_FLOW (orchestrator):
  Registry miss → scan provider.yaml (.cursor/skills + orch providers)

CURRENT_FLOW (Cursor agent):
  user asks "skill for X?" → find-skills (DISCOVERY)
```

---

## Validation

```text
/testes → testing (HARD evidence)
/seguranca → security (HARD when required)
/code-reviewer → code quality (SOFT/conditional)
/validator → artefact DoD (SOFT)
/validar → po-review (HARD Fase 5)
/documentar → documentation (Fase 6)
```
