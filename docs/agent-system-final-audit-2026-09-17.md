# Agent System — Final Audit (Wave I) — 2026-09-17

**Lead:** MegaBrain / Agent Architect  
**Ferramenta:** `.cursor/skills/agent-authoring/` (`audit system` + `validate`)  
**Repo:** `/home/gaab/Downloads/CursorSKILLS`  
**Matriz Lead:** [`agent-system-lead-matrix-2026-09-17.md`](./agent-system-lead-matrix-2026-09-17.md)  
**Regra:** sem Kafka / Agent Registry paralelo / Evidence Bus fork — authoring adapta-se à arquitectura existente.

---

## Decisão

`INTEGRATE` + `MAINTAIN` (2ª passagem) — **sem** `NEW_AGENT` (nenhum gap crítico de especialização em falta).

**Gates Wave I:** `READY` (integração documental + inventário + smoke composição) com debt listado honestamente.

---

## Existing maintained / New created / Merged / Split / Deprecated

### Existing maintained (REFACTOR / EXTEND / KEEP)

| Package | Acção histórica | Versão skill | Status package |
|---------|-----------------|--------------|----------------|
| `prd` | REFACTOR | 1.1.0 | READY stable |
| `planner` | REFACTOR | 1.0.0 | READY experimental |
| `adr` | REFACTOR (+ contract) | 1.0.1 | READY stable |
| `testing` | REFACTOR (M1) | 1.2.0 | READY stable |
| `security` | REFACTOR (M1) | 2.1.1 | READY stable |
| `po-review` | REFACTOR (M1) | 1.1.0 | READY stable |
| `documentation` | REFACTOR (M1) | 1.0.0 | READY experimental |
| `backend` | REFACTOR + mode `refactor` | 1.2.0 | READY experimental |
| `frontend-pro` | KEEP/REFACTOR | 1.2.0 | READY experimental |
| `database` | REFACTOR | 1.1.0 | READY experimental |
| `devops` | REFACTOR | 1.1.0 | READY experimental |
| `wiki` | EXTEND (`context-grounding`) | 1.2.0 | READY experimental |
| `wiki-mem` | EXTEND (`knowledge-promote`) | 1.0.0 | READY experimental |
| `debugger` | EXTEND Tier3 → package | 1.0.0 | READY experimental |
| `skill-authoring` | EXTEND Evaluator (skills) | 1.3.0 | READY stable (evals package DEFERRED) |
| `agent-authoring` | EXTEND Evaluator (packages) | 1.1.0 | READY experimental |
| `orquestrar` | KEEP + Wave I routing fix | **2.5.1** | READY stable |

### New created (Wave C1–C3)

| Package | Capability | Versão | Status |
|---------|------------|--------|--------|
| `architect` | `architecture-analysis` | 1.0.0 | READY experimental |
| `researcher` | `research` | 1.0.0 | READY experimental |
| `failure-analyst` | `failure-analysis` | 1.0.0 | READY experimental |
| `code-reviewer` | `code-review` | 1.0.0 | READY experimental |
| `validator` | `validation` | 1.0.0 | READY experimental |

### Merged

| Decisão | Resultado |
|---------|-----------|
| Context Engineer → `wiki` | EXTEND; **REJECT** `context-engineer` |
| Knowledge → `wiki-mem` | EXTEND; **REJECT** thin `knowledge` |
| Refactorer → `backend` mode `refactor` | EXTEND; **REJECT** `refactorer` |
| Debugger → package `debugger` (Tier3 source) | EXTEND; **REJECT** paralelo |
| Evaluator → `skill-authoring` + `agent-authoring` | EXTEND; **REJECT** agente `evaluator` |

### Split

Nenhum SPLIT executado nesta missão (sem `RESPONSIBILITY_OVERLOAD` activo a exigir decomposição).

### Deprecated / AGENT_UNNECESSARY

| Target | Decisão |
|--------|---------|
| Observer agent | **AGENT_UNNECESSARY** — `execution-trace` + EventBus/JSONL |
| Git / FS / Shell / System agents | **AGENT_UNNECESSARY** — DeterministicProvider |
| UniversalAgent | **REJECT** — overload |
| Nomes rejeitados acima | **DEPRECATED as targets** (não criar) |

---

## Inventário final — Agent Packages

Legenda colunas: **S**=skill sidecar `provider.yaml` · **O**=`orchestrator/providers/<id>/` · **E**=`evals/evals.json` · **C**=contract YAML · **I**=install `SKILLS[]` · **A**=`Agents/*.md` · **Cmd**=comando `/`.

| Skill | Capability | Cmd | S | O | E | C | I | A | Matriz |
|-------|------------|-----|---|---|---|---|---|---|--------|
| `architect` | `architecture-analysis` | `/architect` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `prd` | `business-requirements` | `/prd` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `planner` | `planning` | `/planejar` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `wiki` | `context-grounding` | `/wiki` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `backend` | `backend-implementation` (+ mode refactor) | `/backend` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `frontend-pro` | `frontend-ui` (+ visual-review mode) | `/frontend-pro` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `database` | `database-schema` | `/database` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `devops` | `devops-deploy` | `/devops` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `researcher` | `research` | `/pesquisar` `/research` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `wiki-mem` | `knowledge-promote` | `/mem` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `debugger` | `debug` | `/debugger` `/debug` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `failure-analyst` | `failure-analysis` | `/failure-analyst` `/analisar-falha` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `testing` | `testing` | `/testes` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `code-reviewer` | `code-review` | `/code-reviewer` `/revisar-codigo` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `security` | `security-review` | `/seguranca` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `validator` | `validation` | `/validator` `/validar-artefacto` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `po-review` | `po-acceptance` | `/validar` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `documentation` | `documentation` | `/documentar` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | **READY** |
| `adr` | `architecture-decision` | `/adr` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `skill-authoring` | `eval-authoring` | `/skill-authoring` | — | — | — | template only | ✓ | ✓ | **PARTIAL** |
| `agent-authoring` | `agent-authoring` | `/agent-authoring` | ✓ | — | ✓ | ✓ | ✓ | ✓ | **READY** |
| `orquestrar` | (meta-orquestração) | `/MegaBrain` | — | — | — | n/a | ✓ | ✓ | **READY** |

### Não-agentes (determinísticos / runtime)

| Capacidade | Estado | Matriz |
|------------|--------|--------|
| `git.*` / `filesystem.*` / `shell.*` / `system.*` / `knowledge.*` / `project.*` | DeterministicProvider + contracts | **READY** (não-agente) |
| Observer / execution-trace | runtime | **DEPRECATED** como agente (**AGENT_UNNECESSARY**) |
| `context-engineer`, thin `knowledge`, `refactorer`, `evaluator` agent | rejeitados | **DEPRECATED** (targets) |

### Orphan / fora do package pipeline

| Artefacto | Nota | Matriz |
|-----------|------|--------|
| `.cursor/commands/library-dossier.md` | aponta Tier3 `technical-library-dossier` (global); sem skill no repo | **DEFERRED** (não Wave I) |
| Contract `frontend-visual-review` | mode de `frontend-pro`, sem skill separada | **READY** (by design) |
| Contract `repository.inspect` | deterministic-ish / shared | **PARTIAL** wiring docs |

**Contagens:** 22 skills com `SKILL.md` · 22 em `install` · 22 espelhos `Agents/` · 20 packages com `evals/evals.json` · 28 commands no repo.

---

## Architecture summary

```text
Capability  →  Provider (provider.yaml)  →  Skill (SKILL.md = SSOT)
                    ↑
         Command `/` + Agents/*.md (espelho humano)
                    ↑
         Policy Engine + Evidence Bus + PDA roles (orquestrar)
                    ↑
         DeterministicProvider (git/fs/shell/system/knowledge/project)
```

- **Descoberta:** Capability IR → Registry → Provider (sem `kind: Agent`).
- **Autoridade:** listar capability ≠ autorização; Policy medeia.
- **Meta:** `orquestrar` orquestra; `agent-authoring` / `skill-authoring` fabricam e avaliam packages — não são workers de produto.
- **Wave I fix:** `orquestrar` **2.5.1** — row `/debugger` (`/debug`) + PDA `explore` + Fase 3 pós-3-retries ancorados em `debugger` (antes omitidos).

---

## Smoke composição (documental — sem LLM pleno)

Sequências de handoff **compatíveis** com contratos/PDA actuais. Cada seta = `[ENTREGA CONSOLIDADA]` + Briefing.

### 1. Feature (feliz)

```text
wiki (F0 grounding)
  → prd (F0.5) [+ adr se decisão; architect se redesign]
  → planner (plan IR)
  → backend | frontend-pro | database | devops (exec, parallel-safe por IR)
  → critic? (failure-analyst | code-reviewer se sensitive)
  → testing (gate)
  → security (gate)
  → code-reviewer? → validator? → devops?
  → po-review → documentation + wiki-mem (librarian promote)
```

**Incompatibilidades a evitar:** `validator` ≠ `po-review` ≠ `testing` ≠ `code-reviewer`; `adr` ≠ `architect`.

### 2. Bug

```text
testing (FAIL ×≤3 no raiz)
  → debugger (root cause; Iron Law)
  → backend | frontend-pro (fix mínimo / mode adequado)
  → testing (re-gate)
  → [opcional] failure-analyst se padrão de processo / postmortem
  → po-review se user-facing
```

**Incompatível:** `failure-analyst` a aplicar fix; `debugger` a substituir gate `testing`.

### 3. Research

```text
wiki (contexto interno)
  → researcher (fontes externas + source_policy)
  → [opcional] wiki-mem (promote episódico→canónico)
  → prd | architect | adr (consumidores — não o researcher implementa)
```

**Incompatível:** researcher a escrever código de produto; thin knowledge agent.

### 4. Security

```text
[exec done] → testing → security
  → [achados] backend|devops fix → security re-gate
  → code-reviewer? → po-review (sensitive) → documentation
```

**Incompatível:** security a implementar mitigação larga sem worker; skip security em `risk_tier=sensitive`.

### 5. Ops

```text
planner (DoD CI/deploy)
  → devops (pipeline/runbook)
  → testing + security (pré-prod)
  → validator (artefactos/evidence formais)
  → po-review se release user-facing
  → documentation
```

**Incompatível:** devops a substituir `security` ou `po-review`.

---

## Agent matrix (specialization → status)

| Specialization | Package | Status |
|----------------|---------|--------|
| Architect | `architect` (+ `adr` ADRs-only) | **READY** |
| Product/Requirements | `prd` | **READY** |
| Planner | `planner` | **READY** |
| Context Engineer | `wiki` | **READY** |
| Developer | `backend` | **READY** |
| Frontend | `frontend-pro` | **READY** |
| Database | `database` | **READY** |
| DevOps | `devops` | **READY** |
| Refactorer | `backend` mode `refactor` | **READY** (não agente) |
| Researcher | `researcher` | **READY** |
| Knowledge | `wiki-mem` | **READY** |
| Debugger | `debugger` | **READY** |
| Failure Analyst | `failure-analyst` | **READY** |
| Tester | `testing` | **READY** |
| Code Reviewer | `code-reviewer` | **READY** |
| Security | `security` | **READY** |
| Validator | `validator` | **READY** |
| Evaluator | `skill-authoring` + `agent-authoring` | **PARTIAL** (skill-authoring sem `evals/evals.json` runtime) |
| Observer | runtime telemetry | **DEPRECATED** (agent) |
| Documentarian | `documentation` | **READY** |
| Orchestrator | `orquestrar` | **READY** |
| Agent Author | `agent-authoring` | **READY** |

---

## Validation status

| Gate | Resultado |
|------|-----------|
| Inventário skill↔cmd↔provider↔contract↔Agents↔install | **PASS** (22/22 install; mirrors OK) |
| Duplicação / REJECT list | **PASS** (sem NEW indevido) |
| Routing orquestrar vs packages | **PASS** após fix debugger 2.5.1 |
| Evals artefact present | **PARTIAL** — falta `skill-authoring/evals/evals.json`; `orquestrar` sem evals (aceitável meta) |
| Evals runners isolados (LLM) | **DEFERRED** (todas experimental waves) |
| Orchestrator provider mirror para todos | **PARTIAL** — vários só sidecar skill (não bloqueante se registry-builder consome sidecar) |
| Smoke LLM pleno 5 cenários | **DEFERRED** — documentado acima |
| Architecture paralela | **PASS** — nenhuma criada |

**Overall Wave I:** `READY` com debt **PARTIAL/DEFERRED** abaixo.

---

## Problems Fixed / Remaining / Blocked / Deferred

### Fixed (Wave I)

1. **Crítico — routing `debugger` ausente** em `orquestrar` (tabela comando→capability, PDA `explore`, Fase 3 pós-3-retries). Corrigido em **2.5.1**.

### Remaining (não crítico)

1. Naming espelho `Agents/backend.md` (lowercase) vs Title Case dos restantes.
2. `metadata.specialization` ausente em alguns packages (`debugger`, `backend`, …) — inventário usa lead matrix.
3. Providers só em skill sidecar (sem cópia `orchestrator/providers/`) para adr/architect/planner/prd/researcher/etc.
4. Docs legado `orquestrar/references/ecosystem-v2.md` ainda cita `systematic-debugging` Tier3 como skill de gate — supersedido por package `debugger`.

### Blocked

Nenhum bloqueio activo para uso do Agent System no repo.

### Deferred

1. Runners isolados de evals (protocolo skill-authoring) para packages experimental.
2. `skill-authoring/evals/evals.json` formal (existe template em `templates/`).
3. Comando `/library-dossier` → package no repo ou documentar como Tier3-only.
4. Dual-root `AGENTS_ROOT` vs workspace (GLOBAL-SETUP) — operacional, fora Wave I.
5. Smoke LLM pleno Feature/Bug/Research/Security/Ops.

---

## Architectural debt

| ID | Item | Class |
|----|------|-------|
| D1 | Sem `kind: Agent` registry (by design) | **DEFERRED** / aceite |
| D2 | Agents espelho naming inconsistente | **PARTIAL** |
| D3 | Evals runners não executados nesta missão | **DEFERRED** |
| D4 | skill-authoring sem evals package runtime | **PARTIAL** |
| D5 | ecosystem-v2 stale vs `debugger` package | **PARTIAL** |
| D6 | Provider orch mirror incompleto | **PARTIAL** |
| D7 | `/library-dossier` orphan no clone | **DEFERRED** |

---

## Audit (delta vs architecture-audit SSOT)

| Mecanismo | Antes (authoring SSOT) | Após Wave I |
|-----------|------------------------|-------------|
| Skills / commands / Agents | IMPLEMENTED / PARTIAL | **IMPLEMENTED** (cobertura Agents = 22/22) |
| Providers | IMPLEMENTED parcial | **IMPLEMENTED** parcial (inalterado; documentado) |
| Contracts agent capabilities | IMPLEMENTED | **IMPLEMENTED** (+ C1–C3 caps) |
| Routing orquestrar | parcial (debugger gap) | **FIXED** 2.5.1 |
| Observer agent | — | **AGENT_UNNECESSARY** confirmado |
| Parallel architecture | proibido | **não criada** |

---

## Encerramento — paths

| Documento | Path |
|-----------|------|
| Este relatório | `docs/agent-system-final-audit-2026-09-17.md` |
| Lead matrix (actualizada) | `docs/agent-system-lead-matrix-2026-09-17.md` |
| SSOT authoring audit | `.cursor/skills/agent-authoring/references/architecture-audit.md` |
| Orquestrar (fix routing) | `.cursor/skills/orquestrar/SKILL.md` (v2.5.1) |
