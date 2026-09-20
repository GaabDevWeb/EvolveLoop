# EvolveLoop Autonomy Gap Audit

**Date:** 2026-09-20  
**Auditor role:** Autonomy Architect / Systems Auditor  
**Scope:** CursorSKILLS (`orchestrator/` runtime + `/evolve` PDA contracts + EvolveLoop V1 motor)  
**Mode:** READ-ONLY — no code, tests, skills, policies, or architecture changes  
**Baseline status (documented):** `V1_READY_WITH_LIMITATIONS` · `OBSERVATION_FIRST` · autonomy ceiling `PROPOSE`  
**Tests executed this audit:** `cd orchestrator && npm test` → **424/424 passed** (vitest)  
**Wiki grounding:** scout hybrid ok; **no dedicated EvolveLoop pack** in vault hits (GAP: contracts primarily in-repo docs/skills)

---

## Executive Summary

O EvolveLoop **não** consegue, hoje, receber um objetivo de alto nível e executá-lo ponta a ponta com autonomia operacional controlada **sem intervenção humana entre etapas críticas**.

Existem **três planos de execução coexistentes**, com enforcement desigual:

1. **PDA / Cursor Agent (`/evolve`)** — autonomia de ciclo é **contrato de prompt** (SSOT no LLM raiz). Gates wiki/grill-me/image/evidence são **normativos**, não runtime TS.
2. **Execution Engine (`orchestrator`)** — loop DAG real (schedule → select → execute → validate evidence → retry). O caminho operacional de skills Cursor passa por **jobs externos** (`JOB_PENDING` → pickup humano/agente → `run-jobs complete`).
3. **EvolveLoop V1 (`src/evolveloop/`)** — observation → analyze → **PROPOSE**; default **OFF**; production gate **externo**; teto explícito `PROPOSE`.

O gargalo arquitetural primário **não** é “falta de componentes”. É a **quebra do loop reason→action→observe no caminho quente**: intent e planeamento vivem no Agent/PDA; execução material de skills depende de handoff externo; recovery/replan no engine é parcial ou órfão; validação/policy de skills é prompt-bound; evolução não fecha o ciclo.

**Veredicto e2e:** `NO` (com ilhas `PARTIAL` no subgraph DAG do engine quando IR + mock/deterministic já estão preparados).

---

## Current Autonomy Level

| Camada | Nível agregado (0–5) | Nota |
|--------|---------------------:|------|
| PDA `/evolve` (feature cycle) | **2–3** | Entre gates: alta autonomia *declarada*; paragens HITL obrigatórias (PRD, grill-me); enforcement LLM |
| Execution Engine (Capability IR) | **3–4** | Loop runtime real; jobs path = semi-manual; policies órfãs; CLI mockifica deterministic |
| EvolveLoop V1 (self-evolution) | **1–2** | OBSERVE/ANALYZE/PROPOSE; opt-in; sem promote/rollback autónomo |
| **Sistema composto (objetivo alto nível → entrega)** | **2** | `MANUAL_RUNTIME` / `PARTIALLY_AUTOMATED` |

Escala usada: `0 MISSING` · `1 PROMPT_ONLY` · `2 MANUAL_RUNTIME` · `3 PARTIALLY_AUTOMATED` · `4 RUNTIME_AUTOMATED` · `5 FULLY_AUTOMATED/BOUNDED`.

---

## Autonomy Matrix

| Domínio | Nível | Implementação | Runtime | Automático | Evidência | Gap |
| -------------------- | ----: | ------------- | ------- | ---------- | --------- | --- |
| Intent | 1 | Prompt `/evolve` + skills | Não | Não | Prompt | Sem Task IR / intent normalizer |
| Planning | 2 | Skill `planner` → `plan.ir.yaml` | Consome IR se existir | Não (Agent produz) | Prompt + ficheiro | Planner não é serviço runtime |
| Routing (agent) | 1 | PDA roles / Task spawn | Não | LLM decide | Prompt | Sem router de agentes no engine |
| Capability Selection | 3 | Registry + IR nodes | Sim (dado IR) | Sim no engine | Código | Discovery/IR incompletos no CLI |
| Provider Selection | 3 | `RegistryClient.select*` | Sim | Sim (strategy) | Código | Fallback órfão |
| Execution | 3 | `ExecutionEngine.run` | Sim | Parcial | Código | Jobs externos; mock default |
| Delegation | 1 | PDA Task/subagents | Não no engine | LLM | Prompt | Sem delegação estruturada runtime |
| State | 3 | Graph + memory + jobs | Sim | Parcial | Código | Registry telemetry in-memory |
| Checkpoint | 3 | `jobs/checkpoints/` | Sim | Em waiting | Código | Só path jobs; sem exactly-once |
| Resume | 3 | `--resume` | Sim | Invocável | Código | Requer re-invoke CLI |
| Failure Recovery | 2 | Retry + Orchestrator heurística | Parcial | Retry sim | Código | Replan sem IR; spin deadlock |
| Replanning | 1 | `requestReplan(ir)` API | API only | Não | Código | Sem planner automático |
| Validation | 3 | Evidence/DoD/gates engine | Sim | Sim (DAG) | Código | Skill gates ≠ engine |
| Evidence | 3 | Builders + RunResult | Sim | Sim no loop | Código | Bus PDA separado; adapters incompletos |
| Policy | 3 | PolicyEngine | Parcial | Campos subset | Código | Campos declarados sem enforce |
| Permissions | 3 | CapabilityAuthority | Só deterministic | Condicional | Código | Não no cursor-skill/mock path |
| Human-in-loop | 2 | PRD/grill-me/jobs/confirm | Misto | — | Docs+código | Mistura REQUIRED e ACCIDENTAL |
| Knowledge | 2 | Store + KnowledgeBackend | Parcial | Store se data-dir | Código | Backend wiki órfão no CLI |
| Telemetry | 3 | EventBus + JSONL | Sim se data-dir | Sim | Código | Trace/skill tel. fracos no CLI |
| Outcome | 2 | OutcomeTracker / live | Opt-in evolve | Condicional | Código | Feedback adapters NOT_CONNECTED |
| Evolution | 2 | LongitudinalEvolveLoop | Opt-in | Até PROPOSE | Código | Gate produção externo |
| Rollback | 0–1 | Docs / fixtures | Não e2e | Não | Docs | Sem rollback autónomo proven |
| Resource Control | 2 | retries, max_parallel, max_iter | Parcial | Parcial | Código | cost/token/time budgets órfãos |

---

## End-to-End Execution Trace

Cenário auditado (hipotético, só por código/contratos):

> “Analise o problema X, encontre a solução, implemente a correção no workspace autorizado, rode os testes, valide o resultado e entregue um relatório com evidências.”

```text
USER intent (chat)
  ↓  [PROMPT-BOUND]  EXISTS? yes  AUTOMATIC? no  RUNTIME-OWNED? no
INTENT normalize / Task IR
  ↓  [AUTONOMY GAP][MISSING]  não há Task IR no package orchestrator
PDA orquestrar (LLM SSOT)
  ↓  [PROMPT-BOUND]  policy risk_tier, grounding wiki, PRD/grill-me HITL
PLANNER skill → plan.md + plan.ir.yaml
  ↓  [PROMPT-BOUND]  EXISTS? yes (skill)  AUTOMATIC? no
run-engine --ir plan.ir.yaml
  ↓  [RUNTIME-OWNED]  EXISTS? yes  AUTOMATIC? se Agent invocar CLI
Policy + Scheduler + Registry select
  ↓  [RUNTIME-AUTOMATED]  parcial (fallback órfão)
Provider execute
  ↓  cursor-skill → JOB_PENDING  [AUTONOMY GAP][MANUAL]
  ↓  mock (CLI default non-cursor)  [FAKE AUTONOMY] sucesso simulado
  ↓  deterministic  [ORPHANED AUTOMATION] no setupProviders CLI
run-jobs invoke|complete (externo)
  ↓  [REQUIRED HITL / Agent pickup]
Engine poll / --resume
  ↓  [PARTIAL]
Evidence validate DoD/gates
  ↓  [RUNTIME] se evidence real; mock fabrica success
Observation / EvolveLoop
  ↓  [OPT-IN][--evolve] ceiling PROPOSE  [ORPHANED] se dist stale
Validation produto (testing/PO)
  ↓  [PROMPT-BOUND] Evidence Bus JSON convention
DELIVERY relatório
  ↓  [PROMPT-BOUND] Agent sintetiza
OUTCOME → Detection → Candidate → Gate produção
  ↓  [AUTONOMY GAP] production gate EXTERNAL; adapters incompletos
```

### Transições (checklist)

| Transição | EXISTS | AUTOMATIC | RUNTIME-OWNED | PERSISTENT | POLICY-GATED | VALIDATED | OBSERVABLE | RECOVERABLE |
|-----------|:------:|:---------:|:-------------:|:----------:|:------------:|:---------:|:----------:|:-----------:|
| USER→INTENT | ✓ prompt | ✗ | ✗ | ✗ | ✗ | ✗ | parcial | ✗ |
| INTENT→Task IR | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| →PLANNER | ✓ skill | ✗ | ✗ | ficheiro | prompt | IR validate se engine | parcial | prompt outer-loop |
| →ROUTER agent | ✓ PDA | ✗ | ✗ | SSOT prompt | prompt | ✗ | parcial | ✗ |
| →CAPABILITY | ✓ IR+registry | ✓* | ✓* | registry | strategy | contracts opcional | selection evidence | discovery parcial |
| →PROVIDER | ✓ | ✓* | ✓* | ✗ scores | strategy | — | events | fallback ✗ |
| →EXECUTION | ✓ | parcial | ✓ | jobs/cp | retries | evidence | events | retry / jobs |
| →OBSERVATION | ✓ evolve | opt-in | ✓ | signals | — | — | JSONL | — |
| →RECOVERY | parcial | retry | ✓ | — | retries | — | RetryScheduled | limitado |
| →REPLAN | API | ✗ | parcial | — | — | — | PlannerReplan | **sem IR auto** |
| →VALIDATION | misto | engine DoD | parcial | evidence files | gates | misto | misto | — |
| →EVIDENCE | ✓ | ✓ engine | ✓ | RunResult | — | validateEvidenceV21 | ✓ | — |
| →DELIVERY | prompt | ✗ | ✗ | memory/ | — | PO prompt | — | — |
| →OUTCOME/EVOLVE | ✓ | opt-in | ✓ | evolveloop/ | ceiling | fixture≠prod | parcial | rollback ✗ |

\*apenas depois de existir IR válido e providers wired (não no caminho “só chat”).

---

## Human Intervention Map

| Intervenção | Classificação | Evidência |
|-------------|---------------|-----------|
| Iniciar `/evolve` / fornecer objetivo | **REQUIRED** | Entry chat; sem daemon de intent |
| Aprovar `/prd` antes de `/planejar` | **REQUIRED** (salvo hotfix) | `orquestrar/SKILL.md` protocolo Fase 0.5 |
| `/grill-me` quando `require[]` | **RISK-BASED → REQUIRED** | `grill-me-gate.md`; helpers TS **não** no engine |
| Wiki grounding retrieve | **REQUIRED** (processo) | Prompt hard-gate; não bloqueia `ExecutionEngine` |
| Invocar `run-engine` após IR | **ACCIDENTAL / LEGACY gap** | Contrato diz obrigatório; fallback PDA se down |
| Completar SkillJob (`run-jobs`) | **REQUIRED** no path cursor-skill | `JobFileExecutor` → `JOB_PENDING` |
| `CONFIRMATION_REQUIRED` shell/fs.write | **REQUIRED** (deterministic) | `DeterministicProvider` + `authorize` |
| Micro-OK entre fases do ciclo | **Proibido por contrato** (não HITL) | `SKILL.md` autoridade de ciclo |
| Outer loop > `max_outer_cycles` | **REQUIRED** handoff | `outer-loop.md` |
| EvolveLoop promote / production gate | **REQUIRED** externo | `LIMITATIONS.md`; `FINAL-STATUS.yaml` |
| Librarian promote wiki | **RISK-BASED** | Hook enfileira; promote não é write cego |
| Escolher modelo Task | **OPTIONAL** | inherit / routing qualitativo prompt |
| Rebuild `dist/` para CLI reflectir `src` | **ACCIDENTAL** | `dist/` sem `evolveloop/` observado nesta árvore |

---

## Fake Autonomy Findings

| ID | Finding | Porquê é fake |
|----|---------|----------------|
| FA-01 | “Agente autónomo de ciclo fechado” (`orquestrar/SKILL.md`) | Autonomia entre passos é **obediência a prompt**; PRD/grill-me/jobs quebram o loop |
| FA-02 | Hard-gates wiki/image/grill-me | Documentados fail-closed; `skill-gates.ts` declara **NOT Execution Engine enforcement** |
| FA-03 | `continuar` só com evidence no disco | Convenção Evidence Bus; engine PDA **não** lê `evidence_dir` do chat |
| FA-04 | CLI `run-engine` sem jobs reais | `setupProviders` regista **MockProvider** para non-cursor-skill → sucesso simulado |
| FA-05 | `Orchestrator.decide` “replan” | Emite decisão; **sem** gerar IR; com `blockedReason` persistente pode spin até `max_iterations` |
| FA-06 | Policy fields `fail_fast`, `cost_budget`, `feature_timeout`, `provider_strategy_fallback` | Declarados em types/builtins; **não lidos** no hot path do engine |
| FA-07 | EvolveLoop “automatic analysis” | Opt-in `--evolve`; ceiling PROPOSE; fixture gate ≠ production; `dist` sem módulo |
| FA-08 | Librarian “fecho wiki” | Hook só `promote-queue`; promoção é passo separado |
| FA-09 | `cancel` em CursorSkillProvider / Mock | Noop — cancel API não cancela executor externo |

---

## Orphaned Automation

Componentes que **existem** mas **não** fecham autonomia no caminho quente:

| Componente | Local | Limitação |
|------------|-------|-----------|
| `DeterministicProvider` + KnowledgeBackend | `providers/deterministic/`, `knowledge/backend/` | CLI `setupProviders` mockifica |
| `provider_strategy_fallback` / `fallbacks[]` | types + policy builtins | Sem select/fallback runtime |
| `ProviderFallbackUsed` event | `types/index.ts` | Sem `emit` |
| `buildPlanningEvidence` | `evidence/builders.ts` | Exportado; não no loop engine |
| `summarizeExecutionTrace` | `telemetry/execution-trace.ts` | Não chamado pelo engine |
| Skill telemetry opts | `cursor-skill-provider.ts` | CLI não passa bus/dir |
| `inferManifestFromSkill` | discovery | Não chamado pelo engine |
| `pause`/`abort`/`cancel`/`requestReplan` | `execution-engine.ts` | API; CLI não expõe |
| `on_gate_reject: auto_retry\|fail_fast` | policy types | Engine só trata `"orchestrator"` |
| `EvolveLoopController` (batch) | `evolveloop/controller.ts` | CLI usa Longitudinal |
| `skill-gates.ts` | policy helpers | Eval/observe only |
| `dist/evolveloop` | artefacto build | **Ausente** — `npm run run-engine` não reflecte src evolve |
| `patternAggregator.providerPenalty` | aggregator | Não alimenta select |
| KnowledgeStore vs KnowledgeBackend | duas seams | Desligadas |

---

## Critical Gaps

### GAP-A01 — Intent → executable representation break
- **Domínio:** Intent / Planning  
- **Severidade:** BLOCKER  
- **Nível atual:** 1 · **Alvo:** 4  
- **Tipo:** MISSING (Task IR) + MANUAL (planner skill)  
- **Evidência:** IR do engine é só `kind: "CapabilityGraph"` (`types/index.ts`, `ir/validator.ts`); planner é skill Cursor que **escreve** `plan.ir.yaml` (`planner/SKILL.md`).  
- **Impacto:** Sem humano/Agent a interpretar e emitir IR, o runtime **não arranca**.  
- **Pré-requisitos:** contrato de intent + gerador IR validado (reutilizar planner contracts, não segundo planner).

### GAP-A02 — Skill execution requires external pickup
- **Domínio:** Execution  
- **Severidade:** BLOCKER  
- **Nível atual:** 2 · **Alvo:** 4  
- **Tipo:** MANUAL / DISCONNECTED  
- **Evidência:** `JobFileExecutor.execute` escreve job e retorna `JOB_PENDING` (`cursor-skill-provider.ts:17-47`); engine põe nó `waiting` (`execution-engine.ts:507-510`).  
- **Impacto:** Qualquer capability `cursor-skill` **não** completa sozinha.  
- **Risco:** Ilusão de DAG verde se se usar MockProvider.

### GAP-A03 — PDA hard-gates unenforced by runtime
- **Domínio:** Policy / Validation / HITL  
- **Severidade:** CRITICAL  
- **Nível atual:** 1 · **Alvo:** 4 (bounded)  
- **Tipo:** UNENFORCED / PROMPT-BOUND  
- **Evidência:** `skill-gates.ts:1-4`; image/grill-me docs ≠ TS engine.  
- **Impacto:** Agente pode saltar grounding/gates e ainda assim “continuar”.  
- **Risco:** **FAKE AUTONOMY** + bypass de policy.

### GAP-A04 — No automatic replanning
- **Domínio:** Replanning / Failure Recovery  
- **Severidade:** CRITICAL  
- **Nível atual:** 1 · **Alvo:** 4  
- **Tipo:** PARTIAL / DISCONNECTED  
- **Evidência:** `Orchestrator.decide` → `"replan"` (`orchestrator.ts:13-14`); apply só emite evento; substituição de grafo exige `requestReplan(ir)` com IR externo (`execution-engine.ts:211-219,400-402`).  
- **Impacto:** Falha estrutural não vira plano novo; possível spin.  
- **Dependências:** GAP-A01 (fonte de IR).

### GAP-A05 — CLI path mockifies real providers
- **Domínio:** Provider Selection / Execution  
- **Severidade:** CRITICAL  
- **Nível atual:** 2 · **Alvo:** 4  
- **Tipo:** DISCONNECTED  
- **Evidência:** `run-engine.ts:137-144` — só `cursor-skill`+executor; resto `createMockProvider`.  
- **Impacto:** Runs “verdes” sem efeitos reais (knowledge/fs/shell).  
- **Risco:** Validação falsa de autonomia.

### GAP-A06 — Evolution ceiling + external production gate
- **Domínio:** Evolution / Outcome  
- **Severidade:** CRITICAL (para self-evolution; não para exec de feature)  
- **Nível atual:** 2 · **Alvo:** 3–4 bounded  
- **Tipo:** PARTIAL + MANUAL  
- **Evidência:** `AUTONOMY.md`; `FINAL-STATUS.yaml` `autonomy_ceiling: PROPOSE`; `LIMITATIONS.md` production gate external; `--evolve` default OFF (`run-engine.ts:207`).  
- **Impacto:** Loop Outcome→Promote→Rollback **não** é autónomo (intencional na V1).

---

## High Gaps

### GAP-B01 — Policy declared ≠ policy enforced
- **Tipo:** UNENFORCED  
- **Evidência:** `cost_budget`, `feature_timeout`, `fail_fast`, `provider_strategy_fallback` em `policy-engine.ts` builtins / `types` — grep sem consumers no engine.  
- **Severidade:** HIGH  

### GAP-B02 — CapabilityAuthority not on cursor-skill path
- **Tipo:** DISCONNECTED  
- **Evidência:** `authorize` em `DeterministicProvider` (`deterministic/index.ts:184-200`); JobFileExecutor não chama authority.  
- **Pergunta crítica:** *O agente consegue executar ação proibida só porque decidiu?* No path PDA/cursor-skill: **sim, relativamente** — depende do LLM/sandbox Cursor, não do CapabilityAuthority do orchestrator.  
- **Severidade:** HIGH  

### GAP-B03 — Dual knowledge seams
- **Tipo:** DISCONNECTED  
- **Evidência:** `FilesystemKnowledgeStore` (scheduler consult) vs `KnowledgeBackend` (wiki RAG caps).  
- **Severidade:** HIGH  

### GAP-B04 — Checkpoint/resume semantics incomplete
- **Tipo:** PARTIAL  
- **Evidência:** checkpoint em waiting (`execution-engine.ts:342-351`); sem exactly-once; cancel noop; resume é re-invoke.  
- **Sobrevive a:** process crash **parcial** (se jobsDir); machine reboot **se disco**; provider/LLM failure **via retry/jobs**, não genérico.  
- **Severidade:** HIGH  

### GAP-B05 — Deadlock → `continuar` spin
- **Tipo:** UNHANDLED / Finding  
- **Evidência:** `orchestrator.ts:25-27` + loop `execution-engine.ts:233-243,278-284`.  
- **Severidade:** HIGH  

### GAP-B06 — `dist/` stale vs `src/evolveloop`
- **Tipo:** DISCONNECTED (deploy)  
- **Evidência:** listing `orchestrator/dist/` sem `evolveloop/`; testes passam via vitest/`src`.  
- **Severidade:** HIGH (para quem usa só `npm run run-engine` sem rebuild)  

### GAP-B07 — Evidence/Eval/Feedback adapters incomplete
- **Tipo:** PARTIAL (documentado)  
- **Evidência:** `LIMITATIONS.md`; operationalization report.  
- **Severidade:** HIGH  

### GAP-B08 — Agent delegation not runtime-owned
- **Tipo:** PROMPT-BOUND  
- **Evidência:** PDA spawn critérios em `SKILL.md`; engine sem spawn/delegate.  
- **Severidade:** HIGH  

---

## Medium / Low Gaps

| ID | Título | Sev | Tipo | Notas |
|----|--------|-----|------|-------|
| GAP-C01 | `summarizeExecutionTrace` órfão | MEDIUM | ORPHANED | Reconstrução e2e frágil |
| GAP-C02 | Skill telemetry não wired no CLI | MEDIUM | ORPHANED | |
| GAP-C03 | Registry runtime scores não persistidos | MEDIUM | UNPERSISTED | Perdem-se entre processos |
| GAP-C04 | `buildPlanningEvidence` fora do loop | MEDIUM | ORPHANED | |
| GAP-C05 | Edges IR `spec.edges` vs `dependencies` | LOW | PARTIAL | Execução usa dependencies nos nodes |
| GAP-C06 | GaabType overlay ausente em main | LOW | MISSING (neste checkout) | Overlay não materializado |
| GAP-C07 | Agents/*.md drift (grill-me opcional) | LOW | LEGACY | vs skill canónico |
| GAP-C08 | Token/cost budgets ausentes | MEDIUM | MISSING/ORPHANED | Só max_parallel, retries, max_iterations=500 |
| GAP-C09 | Identity USER/PROJECT nos eventos engine | MEDIUM | PARTIAL | Evolve defer se falta `user_id` |
| GAP-C10 | Graph `canTransition` não enforced | LOW | UNENFORCED | setNodeStatus directo |

### Failure class map (resumo)

| Classe | Detecção | Classificação | Recuperação |
|--------|----------|---------------|-------------|
| LLM failure | Via job fail / Agent | Parcial | RECOVER_MANUALLY / retry job |
| Capability failure | NodeFailed | Sim | AUTO_RECOVER (retry) |
| Provider failure | Sim | Sim | DETECT_ONLY (fallback órfão) |
| Policy rejection | Authority deny (det.) | Sim | Abort seguro (det.) |
| Validation/DoD | validateEvidenceV21 | Sim | corrigir / retry |
| Network | Depende provider | Parcial | UNHANDLED genérico |
| Timeout | step_timeout no request | Parcial | UNHANDLED no mock/jobs |
| Malformed output | Evidence fail | Sim | retry |
| Missing capability/provider | select throw + discovery | Parcial | discovery se flag |
| Deadlock / waiting external | blockedReason | Sim | DETECT_ONLY / spin |
| Partial execution | checkpoint waiting | Sim | RECOVER_MANUALLY resume |

---

## Existing Components That Can Be Reused

Prioridade: **integrar**, não duplicar.

| EXISTING | CURRENT ROLE | AUTONOMY LIMITATION | MISSING CONNECTION / BEHAVIOR |
|----------|--------------|---------------------|-------------------------------|
| `ExecutionEngine` | Loop DAG | Jobs externos; replan API-only | Bridge executor in-process ou worker autónomo; replan IR feed |
| `RegistryClient` | Select + evidence | Sem fallback strategy | Wire `provider_strategy_fallback` + manifest.fallbacks |
| `PolicyEngine` | Resolve policy YAML/builtins | Campos órfãos | Enforce cost/timeout/fail_fast no loop |
| `CapabilityAuthority` | allow/deny/confirm | Só deterministic | Aplicar pré-execute em todos os providers |
| Evidence builders + schemas | Prova por nó | Planning evidence órfã; Bus PDA separado | Unificar Evidence Bus ↔ RunResult.evidence |
| EventBus + JsonlEventPersister | Telemetria | Trace summary órfão | attach summarize + skill telemetry no CLI |
| `FilesystemKnowledgeStore` | Consult pré-schedule | ≠ wiki backend | Ligar backend resolve ao provider deterministic no CLI |
| `KnowledgeBackend` | RAG wiki caps | CLI mock | setupProviders real |
| `LongitudinalEvolveLoop` | Observe→Propose | Opt-in; gate externo | Manter ceiling; ligar adapters; rebuild dist |
| Planner skill + capability-ir specs | Produz IR | Humano/Agent | Serviço/tool deterministic `plan.emit` invocado pelo runtime |
| PDA roles + GATE_BUNDLE | Contrato multi-agente | Prompt-only | Opcional: engine nodes tipados por role |
| Job store / checkpoint | Persistência waiting | Pickup manual | Autopickup worker com policy |

**Não propor:** segundo Capability Registry, segundo Policy Engine, segundo Evidence system, segundo Orchestrator, segundo RAG.

---

## Dependency Graph

```text
[Foundational]
GAP-A01 Intent→IR (planner/runtime bridge)
    ↓
GAP-A05 Providers reais no CLI (senão autonomia é simulada)
    ↓
GAP-A02 Skill execution autonomy (jobs pickup → bounded worker)
    ↓
GAP-B02 Authority on all execute paths
    ↓
GAP-B01 Enforce declared policy budgets/timeouts
    ↓
GAP-A04 Automatic bounded replan (needs IR source from A01)
    ↓
GAP-B04 Checkpoint/resume semantics + cancel real
    ↓
GAP-A03 Runtime-enforce critical gates (subset; HITL risk-based permanece)
    ↓
GAP-B03 Unify knowledge seams
    ↓
GAP-B07 Outcome adapters (Evidence/Eval/Feedback)
    ↓
GAP-A06 Evolution promote/rollback (ainda gated — não irrestrito)

[Parallelizable after A01/A05]
GAP-C01..C04 telemetry/evidence orphans
GAP-B06 dist rebuild discipline
GAP-C08 resource budgets (overlaps B01)

[Consequence, not separate product]
Fake autonomy FA-* dissolve quando A02+A03+A05+A04 fecharem
```

**Verdadeiro gargalo:**  
**quebra Intent→IR→Provider real→Observe→Replan**, com o **job handoff cursor-skill** e o **enforcement só-prompt dos gates** como os dois cut points que mais impedem autonomia operacional bounded.

---

## Autonomy Contract

Proposta abstrata V2 (não implementada):

```text
Given:
  user_intent
  authorized_workspace
  available_capabilities
  available_providers
  applicable_policies
  knowledge_sources
  resource_budgets

The system SHALL:
```

| # | SHALL | Status actual |
|---|-------|---------------|
| 1 | interpret intent | **PARTIAL** (LLM prompt) |
| 2 | produce executable task representation | **PARTIAL** (CapabilityGraph via planner skill; sem Task IR) |
| 3 | plan work | **PARTIAL** (prompt planner) |
| 4 | select authorized capabilities | **PARTIAL** (IR nodes + registry; authorization fraca no path skill) |
| 5 | select compatible providers | **PARTIAL** (select sim; fallback não) |
| 6 | execute steps | **PARTIAL** (engine sim; skills via jobs manuais; mock default) |
| 7 | observe outcomes | **PARTIAL** (EventBus; evolve opt-in) |
| 8 | recover bounded failures | **PARTIAL** (retry; sem fallback/replan auto) |
| 9 | replan when required | **MISSING** (API only) |
| 10 | validate completion | **PARTIAL** (DoD engine; PO/gates prompt) |
| 11 | produce evidence | **PARTIAL** (engine sim; Bus PDA convention) |
| 12 | satisfy policies | **PARTIAL** (subset enforced) |
| 13 | deliver result | **PARTIAL** (Agent report) |
| 14 | persist outcome | **PARTIAL** (evolve/memory se ligados) |
| 15 | expose telemetry | **PARTIAL** (events; trace órfão) |

Self-evolution stages (separado):

| Stage | Status |
|-------|--------|
| OBSERVE | PARTIAL (opt-in) |
| PROPOSE | PARTIAL (ceiling V1) |
| GENERATE | PARTIAL (candidates) |
| TEST | MISSING/external |
| VALIDATE | PARTIAL (fixture ≠ prod) |
| PROMOTE | MISSING (external gate) |
| ROLLBACK | MISSING |

---

## V2 Autonomy Roadmap

Ordem justificada pelo dependency graph (não a ordem alfabética A–E ingenua):

### V2-A — Execution Autonomy *(primeiro)*
- Bridge Intent→IR (reutilizar planner contracts; tool/runtime emit).
- Wire deterministic/real providers no CLI path.
- Autopickup/worker bounded para SkillJobs **ou** executor in-process com policy.
- Dist build freshness para CLI = src.

### V2-D — Permissioned Autonomy *(em paralelo cedo com A)*
- CapabilityAuthority pré-execute universal.
- Enforce policy fields já declarados (budget/timeout/fail_fast).
- Manter HITL risk-based (grill-me/PRD) — **não** remover; **enforce** subset crítico.

### V2-B — Recovery Autonomy
- Provider fallback real.
- Replan bounded com novo IR + anti-loop.
- Checkpoint/resume/cancel com semântica clara.
- Corrigir deadlock→continuar spin.

### V2-C — Verification Autonomy
- Ligar Evidence Bus PDA ↔ engine evidence.
- Completion criteria objectivas (não só LLM “done”).
- Production gate **in-package ou adapter explícito** (hoje EXTERNAL).

### V2-E — Evolution Autonomy *(depois de C + outcomes reais)*
- Conectar Feedback/Eval adapters.
- Promote/rollback gated (ainda bounded).
- Não elevar ceiling além de policy.

**Nota:** V2-E antes de A/C produziria mais propostas sem causalidade de execução real → risco de fake evolution.

---

## Risks

| Risco | Descrição |
|-------|-----------|
| Demo verde | MockProvider mascara gaps de execução |
| Prompt fatigue bypass | Gates unenforced → agente salta segurança |
| Spin loops | replan sem IR / deadlock continuar |
| Dual control planes | PDA vs Engine divergem; SSOT ambíguo |
| Evolve sem identity | USER scope defer; análise vazia |
| Over-automation | Remover HITL risk-based sem authority universal |
| Dist drift | Operadores usam CLI stale |

---

## Known Limitations of This Audit

- Wiki scout **não** devolveu pack EvolveLoop dedicado; grounding em docs/skills/código in-repo.
- Não foi executado um feature cycle `/evolve` completo com jobs Cursor reais nesta sessão (auditoria estática + suite vitest).
- `dist/` inspeccionado como artefacto actual; rebuild não foi feito (proibido alterar/implementar).
- Sibling trees (ex. AGENTS/Cursor/orchestrator) mencionados em audits históricos — **não** revalidados ficheiro-a-ficheiro aqui.
- GaabType branch/overlay não presente neste checkout `main`.
- “Autonomia” do produto Cursor (IDE sandbox) está fora do package; authority do orchestrator ≠ sandbox do editor.

---

## Evidence Index (amostra canónica)

| Claim | FILE | SYMBOL | BEHAVIOR |
|-------|------|--------|----------|
| Loop de execução | `orchestrator/src/engine/execution-engine.ts:203-316` | `ExecutionEngine.run` | while !finished; schedule batch |
| Checkpoint waiting | `execution-engine.ts:342-351` | `saveCheckpoint` | auto se waiting |
| JOB_PENDING | `plugins/cursor-skill-provider.ts:17-47` | `JobFileExecutor` | write job; success false |
| Mock CLI providers | `cli/run-engine.ts:137-144` | `setupProviders` | non-cursor → mock |
| Orchestrator decisions | `orchestrator/orchestrator.ts:10-29` | `decide` | heurística fixa |
| Replan needs IR | `execution-engine.ts:211-219,400-402` | `requestReplan` | sem IR não troca grafo |
| Authority confirm | `providers/deterministic/index.ts:184-200` | `authorize` | CONFIRMATION_REQUIRED |
| Skill gates not engine | `policy/skill-gates.ts:1-4` | module doc | eval harness only |
| Evolve opt-in | `cli/run-engine.ts:207-233` | `parseEvolveScope` | default OFF |
| V1 status | `docs/.../FINAL-STATUS.yaml` | — | READY_WITH_LIMITATIONS / PROPOSE |
| Public limits | `docs/architecture/public/LIMITATIONS.md` | — | gate external; adapters |
| Autonomy ceiling doc | `docs/architecture/evolveloopt/AUTONOMY.md` | — | até PROPOSE |
| Tests verdes | vitest 2026-09-20 | — | 424/424 |

---

## Final Verdict

```text
Can EvolveLoop currently receive a high-level goal
and autonomously execute it end-to-end?

NO
```

**Porquê (operacional, não marketing):**

1. Intent de alto nível **não** é objecto runtime — depende do Agent Cursor e skills.  
2. Planeamento executável (`plan.ir.yaml`) é **produzido por prompt**, não por serviço do engine.  
3. O caminho real de capabilities Cursor **para** em `JOB_PENDING` até um executor externo.  
4. O CLI default pode **simular** sucesso via MockProvider.  
5. Recovery automático limita-se essencialmente a **retry**; **replan** e **provider fallback** não estão fechados.  
6. Gates de segurança/produto do ciclo `/evolve` são **prompt-bound**.  
7. EvolveLoop V1 observa/propõe; **não** promove — e o production gate está **fora** do package.

Ilhas `PARTIAL`: dado um IR pré-validado, policy conhecida, providers deterministic/mocks controlados e sem dependência de jobs externos, o **ExecutionEngine** executa o DAG com evidence, retries e telemetria — isso **não** equivale a autonomia ponta a ponta do objectivo de utilizador.

---

## Audit checklist

```text
[x] Runtime relevante mapeado
[x] Agent vs Runtime distinguido
[x] Capability vs Provider distinguido
[x] Policy decision vs enforcement distinguido
[x] Evidence vs Telemetry distinguido
[x] Knowledge vs Memory vs Checkpoint distinguido
[x] Human intervention mapeada
[x] Recovery mapeado
[x] Replanning mapeado
[x] Checkpoint/Resume mapeado
[x] Validation mapeada
[x] Outcome loop mapeado
[x] Evolution mapeada
[x] Resource budgets mapeados
[x] Fake autonomy procurada
[x] Orphaned automation procurada
[x] Componentes reutilizáveis identificados
[x] Gaps classificados
[x] Dependências mapeadas
[x] Autonomy Contract produzido
[x] Roadmap V2 produzido
[x] Nenhuma alteração de implementação
```

---

*Fim do relatório. Nenhuma mudança de código, testes, skills ou políticas foi efectuada por esta auditoria.*
