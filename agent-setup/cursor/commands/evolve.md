# EvolveLoop — public entrypoint (`/evolve`)

Invocação **`/evolve`**.

1. **Ler** `~/.cursor/skills/orquestrar/SKILL.md` (contrato normativo)
2. AGENTS_ROOT: `~/.cursor/agents.env`
3. Runtime: `$ORCHESTRATOR_ROOT` — `agents-orch engine`

**Modelo:** raiz orquestra; etapas em filhos `plan|exec|gate|explore|critic|librarian` com **GATE_BUNDLE** herdado (depth máx. 3). **critic** após exec e **antes** do gate testing (obrigatório se `risk_tier=sensitive`); **librarian** no fecho: hook enfileira `promote-queue`; librarian/Agent promove (`log.md` ± `wiki/`, nunca `raw/`).  
→ `~/.cursor/skills/orquestrar/references/gate-bundle.md`  
→ `~/.cursor/skills/orquestrar/references/pda-roles.md`

**HARD-GATE — Wiki (knowledge grounding):** antes de planear/implementar →  
`~/.cursor/skills/orquestrar/references/knowledge-grounding-gate.md`  
**Vault:** `$WIKI_ROOT` (alias `$RAG_REPO_ROOT`) — required when grounding applies; no hardcoded user path.  
**Skill:** `wiki` é atalho, não exclusivo. Após código → `log.md` no vault. Pipeline `rag/` (ingest, BM25, híbrido, LanceDB, packs).

**Outer loop:** erro → reentrada `partial` | `plan_reset` | `full_ground` (não reboot cego); teto `max_outer_cycles` (default 5) →  
`~/.cursor/skills/orquestrar/references/outer-loop.md`

**Policy Engine:** antes de spawn PDA / Fase 1 — classificar `risk_tier`, topologia, budget e `require[]`; gravar no SSOT. Sem policy → não spawn (`missing_policy`). `standard`|`sensitive` + `ORCHESTRATOR_ROOT` + `plan.ir.yaml` → tentar `run-engine`; hotfix pode PDA-only; audit sem exec. Engine down → fallback PDA, sem fingir sucesso.  
→ `~/.cursor/skills/orquestrar/references/policy-engine.md` · routing: `references/model-routing.md`

**Evidence Bus:** `memory/<feature_id>/evidence/` (`evidence_dir`) — gates lêem/gravam JSON; `continuar` exige o **ficheiro** do gate activo no disco (ex. `gate.testing.json`). Não misturar com `.ai/sessions` nem com o vault. → `~/.cursor/skills/orquestrar/references/evidence-bus.md`

**Episódico (opcional):** `.ai/sessions/` + skill `wiki-mem` / `/mem` — continuidade de sessão; **não** substitui o gate wiki. Na distribuição pública, memória episódica é **opt-in** (profile). Hook `stop`/`sessionEnd` **enfileira** `promote-queue.md`; **não** escreve `{Projeto}/wiki/` nem `raw/`. O papel `librarian` / Agent **promove** a fila.

**HARD-GATE — Imagem anexada:** → `~/.agents/skills/image-to-code/SKILL.md` (policy; ≠ TS engine enforcement)

**HARD-GATE — Grill-me (design/planning):** após `/prd` aprovado, antes de `/planejar` quando Policy exige → `~/.agents/skills/grill-me/SKILL.md` + `grill-me-gate.md` (fail-closed)

**Legacy:** o nome interno histórico *EvolveLoop* e o comando `/EvolveLoop` são aliases legados — não são a marca pública. O nome interno histórico *MegaBrain* e `/MegaBrain` são aliases legados. Use `/evolve`.
