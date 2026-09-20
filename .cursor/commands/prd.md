# prd — Product / Requirements (upstream)

Invocação **`/prd`**.

1. **Ler** `.cursor/skills/prd/SKILL.md` (SSOT normativo)
2. AGENTS_ROOT: `~/.cursor/agents.env` (se pipeline MegaBrain)
3. Produzir pacote documental em `docs/` **antes** de código — modos `full-package` | `update-spec` | `delta-only`
4. **DO NOT:** implementar; decisões arquitecturais isoladas → handoff `/adr` (ou Architect)
5. **HARD-GATE:** aguardar aprovação humana antes de `/planejar`
6. Relevant Context only (feature + docs existentes + stack confirmada)

**Capability:** `business-requirements`  
**Fluxo:** brainstorming? → **prd** → **/grill-me** (HARD quando Policy exige) → planner
