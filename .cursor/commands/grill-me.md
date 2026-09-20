# grill-me — Design stress-test (HARD-GATE)

Invocação **`/grill-me`**.

1. **Ler** `~/.agents/skills/grill-me/SKILL.md` (autoridade operacional — **não** skill `grilling` separada)
2. Seguir HARD-GATE: `.cursor/skills/orquestrar/references/grill-me-gate.md`
3. Sessão HITL (design tree / rounds) até `GRILL_ME_RESULT` válido
4. Gravar `memory/<feature_id>/evidence/gate.grill-me.json`
5. **Fail-closed:** sem `satisfied|exempt` → **proibido** `/planejar`

**Capability:** `design-stress-test`  
**Fluxo:** brainstorming? → /prd → **/grill-me** → /planejar
