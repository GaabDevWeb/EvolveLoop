# Skill Usage Audit — Final Report

**Date:** 2026-09-19T20:53:30Z  
**Agent role:** Skill Usage, Flow & Dependency Auditor  
**Final status:** `SKILL_PACK_AUDIT_COMPLETE`  
**Catalog mutation:** NO · **Skill deletion:** NO · **Runtime mutation:** NO

---

## Executive Summary

O MegaBrain tem **dois pipelines no disco**: (A) **MegaBrain canónico** (`.cursor/skills` + commands + orquestrar) e (B) **Superpowers Tier3** (`global-skills`, symlinks em `~/.agents/skills`).  

**`image-to-code` é HARD-GATE real** (política MegaBrain, condicional a imagem anexada) — **não** enforced pelo Execution Engine TS.  

**Superpowers mid/downstream** (`writing-plans`, SDD, `executing-plans`, `finishing-a-development-branch`) estão **instalados mas quase não wired** no `orquestrar/SKILL.md`; o planeamento/execução canónicos são `prd` → `planner` → PDA.  

**`find-skills` NÃO é o fallback do orchestrator** — isso é DOCUMENTATION_DRIFT; o código faz scan de `provider.yaml`.  

**`systematic-debugging` está ABSORVIDO** por `debugger`. **`grill-me` é WRAPPER** para `grilling`, que **não existe** neste ambiente.

---

## Scope

Auditado:

- `.cursor/skills/**`, `.cursor/commands/**`, `.cursor/rules/**`, `.cursor/hooks.json` + hooks
- `global-skills/**`, `~/.agents/skills/**` (symlinks)
- `docs/**`, `orchestrator/**`, evals skill-local + `docs/evals/**`
- Agent defs `Agents/**`, `agent-setup/**`
- 5 subagents read-only (dev / frontend / research / runtime / docs-evals)

Não auditaram-se remoções, archives, nem mudanças de catálogo.

---

## Total Skills Found

| Bucket | Count |
|--------|------:|
| Local `.cursor/skills` | 23 |
| `global-skills` | 20 |
| `agent-setup/skills` divergent copies | 2 |
| Host-only (`ip-as-logo`, `wiki-carpaccio`) | 2 |
| **Unique IDs (project-centric)** | **43** (+2 host-only = 45) |

---

## Current Core Skills

Todas as 23 locais MegaBrain com command e/ou `provider.yaml` + `orquestrar` / hooks.  
Tier3 críticos wired: `image-to-code`, `brainstorming` (optional), `grill-me` (optional), `systematic-debugging` (via debugger), `agent-browser` (condicional), `technical-library-dossier` (command), `find-skills` (discovery / claim).

---

## Skills Used in Runtime

**DIRECT_RUNTIME (TS Execution Engine):** apenas skills com `provider.yaml` sob `.cursor/skills` e/ou `orchestrator/providers/` via `CursorSkillProvider`.  
**Nenhum** `global-skills/*` é carregado pelo `provider-discovery.ts`.

**INDIRECT_RUNTIME:** Tier3 via instruções de agente (orquestrar/frontend-pro/commands) + hooks (`gaabwiki-mem` scripts, job pickup).

---

## Skills Used in Commands

Ver mapa completo em subagent docs e `FLOW-SKILL-CATALOG.md`.  
Globais com command dedicado: **`technical-library-dossier`** via `/library-dossier`.  
`/MegaBrain` e `/frontend-pro` hard-referenciam **`image-to-code`**.  
**`/descobrir` ausente** (docs → find-skills).

---

## Skills Used as Hard Gates

1. `image-to-code` (imagem anexada)  
2. `gaabwiki` (Fase 0)  
3. `prd` (aprovação humana)  
4. `testing` / Evidence Bus  
5. `debugger` (+ Iron Law de `systematic-debugging`)  
6. `security` (quando `require[]`)  
7. `po-review` (Fase 5)  
8. `agent-browser` **dentro** de `technical-library-dossier`  
9. `brainstorming` **interno** (anti-código) quando a skill corre  

Detalhe: [HARD-GATES.md](./HARD-GATES.md)

---

## Skills Used as Fallbacks

| Skill | Primary | When |
|-------|---------|------|
| `agent-browser` | Puppeteer MCP | login/multi-step/Electron/Puppeteer fail (`frontend-pro`) |
| `find-skills` | **claimed** vs Registry | **NOT implemented** in TS (DOC_DRIFT) |
| orchestrator `discoverManifestForCapability` | Registry select | **Actual** fallback (scan manifests) |

---

## Skills Used by Agents

Local packages via `Agents/*.md` → `.cursor/skills/<id>/SKILL.md`.  
Tier3 via paths `~/.agents/skills/<id>/SKILL.md` em Briefings/gates.

---

## Skills Used by Skills

| Source | Target | Notes |
|--------|--------|-------|
| brainstorming | writing-plans | Superpowers terminal |
| writing-plans | SDD / executing-plans | REQUIRED SUB-SKILL |
| executing-plans / SDD | finishing-a-development-branch | REQUIRED |
| debugger | systematic-debugging | ABSORBED source |
| frontend-pro | image-to-code | HARD Vision |
| frontend-pro | agent-browser | FALLBACK |
| technical-library-dossier | agent-browser | HARD |
| grill-me | grilling | WRAPPER broken |
| hover-effects | gsap / framer-motion / image-to-code | peer refs |

---

## Skills Used by Evals

Locais: maioria com `evals/`.  
Globais com self-evals: motion pack + `technical-library-dossier`.  
`image-to-code` coberto via evals de `frontend-pro` / `backend` (delegation).  
`prd` tem case `post-brainstorming-handoff`.

---

## Superpowers Flow

```text
DOCUMENTED Superpowers:
  brainstorming → writing-plans → SDD|executing-plans → finishing

MEGABRAIN CURRENT:
  brainstorming? → prd → grill-me? → planner → PDA workers → gates → po-review → documentar
```

**Verdict:** Superpowers **participa parcialmente**: `brainstorming` (+ opcional `grill-me`) no upstream MegaBrain; o resto é **instalado / documentado / cadeia interna**, **não** integrado no `orquestrar` canónico.  
Há **DOCUMENTATION_DRIFT** em `ecosystem-v2.md` (finishing / plan-execution / systematic-debug naming).

### Superpowers individual verdicts

| Skill | Verdict |
|-------|---------|
| brainstorming | **USED** — optional MegaBrain upstream + Superpowers HARD internal |
| writing-plans | **NOT MegaBrain-wired** — Superpowers/manual only |
| executing-plans | **DOCUMENTED Tier3 claim** — not called by orquestrar SKILL |
| subagent-driven-development | **NOT MegaBrain-wired** — Superpowers parallel to PDA |
| finishing-a-development-branch | **DOC_DRIFT** — MegaBrain uses po-review/documentar |
| systematic-debugging | **USED as ABSORBED source** of debugger |
| grill-me | **REFERENCED OPTIONAL_UPSTREAM** — WRAPPER broken (no grilling) |

---

## Image-to-Code Hard Gate

```yaml
image_to_code:
  existence: true
  references: [image-attachment-gate, orquestrar, frontend-pro, MegaBrain.md, frontend-pro.md, po-review, planner, …]
  hard_gate: true
  callers: [orquestrar, frontend-pro, planner, po-review (reentry)]
  fallback: none_when_image_attached
  removable: false
  runtime_enforced: false
```

**Resposta explícita:** Sim — **Hard Gate do sistema actual (política MegaBrain)**, condicional a imagem anexada. Não é machine-enforced no engine TS.

---

## Browser / Agent-Browser Flow

- **Dossier:** obrigatório (HARD skill-contract)  
- **frontend-pro:** OPTIONAL + FALLBACK vs Puppeteer  
- **researcher:** não hard  
- **Capability `browser-automation`:** DOCUMENTATION_ONLY (sem provider.yaml)

**Verdict:** **FALLBACK (frontend) + HARD_GATE (dossier)** — não “sempre obrigatório” no MegaBrain.

---

## Discovery / Find-Skills

**Verdict:** ferramenta de **DISCOVERY** para o Agent Cursor (`npx skills`).  
**NÃO** funciona como fallback arquitectural do orchestrator hoje — o fallback real é scan de manifests.  
Docs + `/descobrir` ausente = **DOCUMENTATION_DRIFT**.

---

## Research / Technical Library Dossier

**Verdict:** **usado** via `/library-dossier` (COMMAND_ENTRYPOINT).  
**Não** é filho do `researcher`. Quando corre, depende HARD de `agent-browser` + Puppeteer. Raro ≠ unused.

---

## Debugging Flow

```text
test fail ×3 → /debugger (Iron Law) ← ABSORBS systematic-debugging
             → optional /failure-analyst
```

**Verdict:** `systematic-debugging` é **dependency de conteúdo** do `debugger`, não package paralelo.

---

## Frontend Flow

Ver [FLOW-SKILL-CATALOG.md](./FLOW-SKILL-CATALOG.md) secção Frontend.  
Vision path = HARD `image-to-code`. Browser = QA path, não substituto do Vision.

---

## Critical Skills

Ver [CRITICAL-SKILLS.yaml](./CRITICAL-SKILLS.yaml).

---

## Optional Skills

Ver [OPTIONAL-SKILLS.yaml](./OPTIONAL-SKILLS.yaml). Inclui motion pack, Superpowers mid/downstream, brainstorming/grill-me entry, find-skills (com caveat).

---

## Orphaned / Unknown Skills

**ORPHANED (strict):** nenhuma das 11 protegidas.  
Mais próximo: **`linkedin-posts`** (só inventário) → ARCHIVE_CANDIDATE, não ORPHANED absoluto (ainda installada/discoverable).  

**UNKNOWN:** ver [UNKNOWN-USAGE.yaml](./UNKNOWN-USAGE.yaml) (`grill-me` execução, frequência motion, etc.).

---

## Dependency Graph

- [SKILL-DEPENDENCY-GRAPH.md](./SKILL-DEPENDENCY-GRAPH.md)  
- [SKILL-DEPENDENCY-GRAPH.yaml](./SKILL-DEPENDENCY-GRAPH.yaml)

---

## Broken References

| Ref | Issue |
|-----|-------|
| `/descobrir` | Command missing |
| `grilling` / `/grilling` | Skill missing (grill-me wrapper) |
| `using-superpowers` | Not in CursorSKILLS global-skills |
| `gaabwiki-workspace` path | Referenced, missing |
| ecosystem-v2 finishing step | DOC_DRIFT vs Fase 5–6 |
| events.md `ProviderDiscoveryStarted` ← find-skills | Code emits from engine after manifest scan |
| provider-manifest example `image-to-code optional:true` | Conflicts HARD-GATE docs |
| correction-loop → systematic-debugging | Prefer `/debugger` |

---

## Removal Candidates

Ver [REMOVAL-CANDIDATES.yaml](./REMOVAL-CANDIDATES.yaml). **Nenhuma remoção executada.**

---

## Do-Not-Remove List

Ver [DO-NOT-REMOVE.yaml](./DO-NOT-REMOVE.yaml).

---

## Explicit 11-Skill Table

| Skill | Actual usage | Flow | Caller | Hard/Soft | Criticality | Frequency | Removal safety | Evidence |
|-------|--------------|------|--------|-----------|-------------|-----------|----------------|----------|
| brainstorming | Optional upstream MegaBrain + Superpowers gate | Planning | orquestrar, prd | Soft entry / Hard internal | HIGH | NOT_MEASURED | DO_NOT_REMOVE | orquestrar:335, prd SKILL |
| writing-plans | Superpowers chain only | Superpowers | brainstorming | Soft | LOW (MegaBrain) | NOT_MEASURED | REMOVE_AFTER_MIGRATION | brainstorming terminal; no planner ref |
| executing-plans | Docs Tier3 claim | Superpowers/doc | writing-plans, ecosystem-v2 | Soft | LOW | NOT_MEASURED | REMOVE_AFTER_MIGRATION | ecosystem-v2 plan-execution; 0 orch SKILL |
| subagent-driven-development | Superpowers executor | Superpowers | writing-plans | Soft | LOW | NOT_MEASURED | REMOVE_AFTER_MIGRATION | writing-plans REQUIRED; research FINDINGS |
| finishing-a-development-branch | Superpowers + DOC_DRIFT | Superpowers/doc | SDD/executing, ecosystem-v2 | Soft | LOW | NOT_MEASURED | REMOVE_AFTER_MIGRATION | ecosystem-v2:895 vs Fase 5–6 |
| systematic-debugging | Absorbed DO source | Debugging | debugger | Hard (Iron Law) | CRITICAL | NOT_MEASURED | DO_NOT_REMOVE | PACKAGE-NOTE, debugger SKILL |
| grill-me | Referenced optional; wrapper broken | Planning | orquestrar, prd | Soft | MED | NOT_MEASURED | DO_NOT_REMOVE | grill-me SKILL; grilling ABSENT |
| find-skills | Discovery tool; fallback claim false | Discovery | docs, agent desc | Soft | MED unresolved | NOT_MEASURED | DO_NOT_REMOVE | ecosystem-v2 vs provider-discovery.ts |
| technical-library-dossier | Command path real | Research | /library-dossier | Hard (in-skill) | HIGH when used | NOT_MEASURED | DO_NOT_REMOVE | library-dossier.md |
| agent-browser | FE fallback + dossier hard | Browser | frontend-pro, dossier | Conditional | HIGH | NOT_MEASURED | DO_NOT_REMOVE | browser-tools.md; library-dossier.md |
| image-to-code | MegaBrain Vision HARD-GATE | Frontend | orquestrar, FE, PO, planner | Hard | CRITICAL | NOT_MEASURED | DO_NOT_REMOVE | image-attachment-gate.md |

---

## Recommendations for the Next Pruning Phase

1. **Não remover** `image-to-code`, `systematic-debugging`, `agent-browser`, `technical-library-dossier`, `brainstorming` sem redesign de gates.  
2. Resolver **DOC_DRIFT**: `/descobrir`, `find-skills` vs TS discovery, `finishing` vs Fase 5–6, `grilling` missing.  
3. Decidir explicitamente: **manter Superpowers mid-chain** como path paralelo suportado **ou** migrar docs e marcar ARCHIVE.  
4. Motion pack / `linkedin-posts`: candidatos OPTIONAL/ARCHIVE após confirmação de product need.  
5. Alinhar `provider.yaml` de `frontend-pro` com HARD-GATE `image-to-code` (hoje exemplo marca optional).  
6. Só depois: PRUNING PLAN → REMOVAL → REGRESSION.

---

## Final Questions (explicit)

1. **Quantas Skills realmente participam de algum fluxo?** ~**34**/43 project skills (23 locais + ~11 globais wired/soft; motion/linkedin mais standalone).  
2. **Quantas são Hard Gates?** **9** skills com papel de hard gate (ver HARD-GATES; contagem de *gates* distintos ≈ 9–11 entradas).  
3. **Quantas são runtime dependencies (TS DIRECT)?** Todas com `provider.yaml` carregáveis — **≈21** manifests locais/orch; **0** Tier3 DIRECT.  
4. **Quantas são fallback?** **1** confirmado (`agent-browser`); **1** claimed-unimplemented (`find-skills`).  
5. **Quantas são apenas optional?** Ver OPTIONAL-SKILLS — **≈20** entradas (incl. Superpowers mid + motion).  
6. **Quantas são documentation-only (MegaBrain)?** **≈4** Superpowers mid/downstream primary docs: writing-plans, SDD, executing-plans, finishing (+ find-skills claim).  
7. **Quantas são realmente órfãs?** **0** strict entre as 11; **linkedin-posts** ≈ archive orphan-like.  
8. **Quais usadas indiretamente?** image-to-code, systematic-debugging, agent-browser, brainstorming, grill-me, frontend-design/ui-ux-pro-max (soft).  
9. **Superpowers integrado?** **Parcial** — upstream sim; mid/downstream **não** no orquestrar canónico.  
10. **image-to-code Hard Gate?** **Sim** (policy).  
11. **find-skills fallback arquitectural?** **Documentado sim; implementado não** → DISCOVERY + DRIFT.  
12. **agent-browser?** **FALLBACK (FE) + HARD (dossier)**; não sempre obrigatório.  
13. **technical-library-dossier usado?** **Sim**, via `/library-dossier`.  
14. **systematic-debugging dependency do debugger?** **Sim — ABSORBED source DO**.  
15. **Skill rara mas critical?** **`image-to-code`** (CRITICAL_LOW_FREQUENCY) e **`technical-library-dossier`/`agent-browser`** no path dossier.

---

## Final Conclusion

```text
SKILL_PACK_AUDIT_COMPLETE
```

O sistema **usa de facto** o núcleo MegaBrain local + um subconjunto Tier3 (especialmente **image-to-code**, **debugger←systematic-debugging**, **dossier←agent-browser**, upstream **brainstorming/grill-me**).  
Grande parte do pack Superpowers de execução e do motion pack está **instalada/discoverable** sem ser **required** pelo `orquestrar`.  
Pruning só é seguro **depois** de fechar DOCUMENTATION_DRIFT e decidir o destino do path Superpowers paralelo.

Artefactos:

| File |
|------|
| [SKILL-USAGE-MATRIX.yaml](./SKILL-USAGE-MATRIX.yaml) |
| [SKILL-USAGE-AUDIT.md](./SKILL-USAGE-AUDIT.md) |
| [SKILL-DEPENDENCY-GRAPH.md](./SKILL-DEPENDENCY-GRAPH.md) |
| [SKILL-DEPENDENCY-GRAPH.yaml](./SKILL-DEPENDENCY-GRAPH.yaml) |
| [HARD-GATES.md](./HARD-GATES.md) |
| [FLOW-SKILL-CATALOG.md](./FLOW-SKILL-CATALOG.md) |
| [CRITICAL-SKILLS.yaml](./CRITICAL-SKILLS.yaml) |
| [DO-NOT-REMOVE.yaml](./DO-NOT-REMOVE.yaml) |
| [REMOVAL-CANDIDATES.yaml](./REMOVAL-CANDIDATES.yaml) |
| [OPTIONAL-SKILLS.yaml](./OPTIONAL-SKILLS.yaml) |
| [UNKNOWN-USAGE.yaml](./UNKNOWN-USAGE.yaml) |
| [AUDIT-TEST-MATRIX.yaml](./AUDIT-TEST-MATRIX.yaml) |
| [SKILL-USAGE-FINAL-REPORT.md](./SKILL-USAGE-FINAL-REPORT.md) |
