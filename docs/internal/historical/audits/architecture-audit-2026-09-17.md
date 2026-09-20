# Auditoria arquitetural — 2026-09-17 (Fase 0)

**Missão:** evolução para plataforma de agentes (Runtime / Capabilities / Providers / Policy / RAG / Evidence / Observability / Eval).  
**Método:** inspeção de código + testes (não só docs). Docs ≠ prova de implementação.  
**Roots:** `AGENTS` (SSOT runtime global), `CursorSKILLS` (pacote portátil), `karpathyWiki` (RAG), `~/.cursor/skills` (symlinks → AGENTS).

---

## Veredicto em uma frase

O Execution Engine v2 está **realmente implementado** (registry, scheduler, policy de execução, evidence, jobs); as **capabilities operacionais** da missão (`filesystem.*`, `git.*`, …) **não existem**; o **RAG Wiki** existe como motor Python **separado** e **parcialmente degradável**; a ponte skill↔CLI está **quebrada**; há **duplicação** AGENTS ↔ CursorSKILLS.

---

## Divergências críticas vs missão (adaptar à arquitetura real)

| Premissa da missão | Realidade | Adaptação |
|--------------------|-----------|-----------|
| State machine `RECEIVED…HUMAN_REQUIRED` | `FeatureRunState`: created/active/blocked/completed/cancelled + `NodeStatus` | **Não substituir** — estender observabilidade/eventos sobre a SM existente |
| Policy = allow/deny/confirm por capability | `PolicyEngine` = ExecutionPolicy (retries, gates, strategy) | **Nova camada** `CapabilityAuthority` ao lado; não reescrever ExecutionPolicy |
| Evidence Bus como componente | Spec MegaBrain = `memory/<id>/evidence/`; runtime = `EventBus` + Evidence builders | Manter ambos: EventBus in-process + evidence_dir operacional |
| Capabilities = filesystem/git/shell | Capabilities = `backend-implementation`, `testing`, … (workers/gates LLM) | **Mesmo registry**; novo `plugin.type: deterministic` para primitivas |
| Knowledge no orchestrator = RAG | `KnowledgeStore` = filtro substring/tags | Bridge: provider `knowledge.search` → wiki CLI/API |
| Ollama único ponto | Wiki: ports `EmbeddingProvider`/`LLMProvider` + Ollama adapter | Completar **degraded BM25** no wiring (hoje service sempre assume Ollama) |
| SSOT skills = CursorSKILLS | `~/.cursor/skills` → **AGENTS** | Evoluir runtime em AGENTS; espelhar docs/skills no pacote CursorSKILLS |

---

## Inventário por componente

### Runtime / ExecutionEngine
- **STATUS:** IMPLEMENTED (PARTIAL nas flags de policy)
- **INTERFACE:** `src/engine/execution-engine.ts`, CLI `run-engine`
- **TESTES:** 82 green (AGENTS)
- **CONCERNS:** `feature_timeout` / `fail_fast` / `on_gate_reject:auto_retry` declarados mas pouco aplicados; `abort` sem `FeatureAborted`

### Scheduler
- **STATUS:** IMPLEMENTED
- **INTERFACE:** `src/scheduler/scheduler.ts`
- **CONCERNS:** salta `ready`; Memory não consultada; acoplamento a `ProviderRouter` em `mock-provider.ts`

### Capability IR
- **STATUS:** IMPLEMENTED
- **INTERFACE:** `types` + `ir/validator.ts`

### Capability Registry + Discovery
- **STATUS:** IMPLEMENTED (PARTIAL)
- **INTERFACE:** `registry-client.ts`, `manifest-loader.ts`, `provider-discovery.ts`, `registry-builder.ts`
- **CONCERNS:** `inferManifestFromSkill` morto; shell plugin tipado mas não implementado

### Provider system
- **STATUS:** PARTIAL
- **Tipos:** `cursor-skill` (jobs), `mock`; `shell` **MISSING**
- **Consumers:** engine via PluginLoader

### Policy Engine (execução)
- **STATUS:** IMPLEMENTED
- **Builtin:** high-reliability, rapid-prototype, cost-optimized
- **≠** autoridade filesystem/shell

### Policy (MegaBrain risk/budget) — docs
- **STATUS:** SPECIFIED_ONLY (CursorSKILLS `policy-engine.md`) — não no TS engine

### Evidence
- **STATUS:** IMPLEMENTED (builders/validator) + SPEC Evidence Bus (disco)
- **Sem** classe EvidenceBus

### Knowledge / Memory (orchestrator)
- **STATUS:** PARTIAL (stores FS + in-memory filter)
- **RAG:** MISSING neste pacote

### Telemetry / Persistence
- **STATUS:** IMPLEMENTED (EventBus, JSONL, MetricsAccumulator)
- **Replay:** modelo de eventos existe; replay completo PARTIAL

### RAG Wiki (`karpathyWiki/wiki`)
- **STATUS:** IMPLEMENTED (BM25 + LanceDB + hybrid RRF + Ollama ports)
- **Degraded Ollama:** PARTIAL (vector skip se embedder null; wiring sempre cria Ollama)
- **Ponte skill `ground.sh`:** BROKEN (paths/CLI desatualizados)
- **Vault path docs:** `/home/gaab/Documentos/karpathyWiki` vs real `/home/gaab/Documentos/gitHub/karpathyWiki`

### Wiki Carpaccio
- **STATUS:** IMPLEMENTED como skill (`.ai/` Markdown) — **sem** RAG (por desenho)

### Capabilities operacionais missão
- **STATUS:** MISSING (todos os IDs `filesystem.*` / `git.*` / `shell.*` / `system.*` / `knowledge.*` / `browser.*` / `project.*` / `repository.*`)

### Capabilities produto atuais
- planning, backend-implementation, frontend-ui, frontend-visual-review, testing, security-review, po-acceptance, documentation, database-schema, devops-deploy, business-requirements, architecture-decision, (+ security interno)

### Hooks / Commands
- CursorSKILLS: wiki-mem + orchestrator
- Global `~/.cursor/hooks.json`: só orchestrator (sem mem)

### Duplicação
- CursorSKILLS/orchestrator ≈ AGENTS/orchestrator (**AGENTS tem `jobs/`**, mais completo)
- orquestrar refs mais ricos em CursorSKILLS; globais leem AGENTS
- wiki só em CursorSKILLS (não no symlink global AGENTS)

---

## Gaps prioritários (ordem de valor)

1. Foundation: contratos + authority + plugin `deterministic` + normalização
2. Capabilities: git.inspect, filesystem.*, project.inspect, shell.execute, system.inspect
3. knowledge.search/inspect → wiki (degraded BM25)
4. Fix ground.sh + path vault
5. Observabilidade: capability trace / policy decision evidence
6. Evals unit+adversarial das novas capabilities
7. Sync AGENTS ↔ CursorSKILLS + docs/ADRs

---

## Paths críticos

| Recurso | Path |
|---------|------|
| Runtime SSOT | `/home/gaab/Documentos/gitHub/AGENTS/Cursor/orchestrator/` |
| Pack portátil | `/home/gaab/Downloads/CursorSKILLS/orchestrator/` |
| Specs | `~/.cursor/skills/orquestrar/references/` (→ AGENTS) + extras CursorSKILLS |
| RAG | `/home/gaab/Documentos/gitHub/karpathyWiki/wiki/` |
| Carpaccio | `~/.agents/skills/wiki-carpaccio/` |
