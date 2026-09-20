# Plano de arquitectura — plataforma de capabilities (Fase 1)

**Data:** 2026-09-17  
**Base:** auditoria `docs/architecture-audit-2026-09-17.md`  
**Princípio:** evoluir o Execution Engine existente; **proibido** segundo registry / segundo evidence bus / microsserviços prematuros.

---

## Arquitectura alvo (sobre o existente)

```text
Agent / Planner
      │  Capability IR (DAG)  +  Capability Request (operacional)
      ▼
ExecutionEngine / Scheduler
      │
      ├─► CapabilityAuthority.authorize(cap, ctx)   [NOVO — allow|deny|confirm]
      ├─► RegistryClient.select(cap, strategy)
      ├─► ProviderRuntime.execute(...)
      │         ├─ cursor-skill (jobs)     [existente]
      │         ├─ mock                    [existente]
      │         └─ deterministic           [NOVO]
      ├─► NormalizedResult                 [NOVO]
      ├─► Evidence builders + EventBus     [existente]
      └─► memory/<feature>/evidence/       [Evidence Bus MegaBrain — docs]
```

### Separação de responsabilidades

| Camada | Decide | Implementação |
|--------|--------|---------------|
| Agent/LLM | o quê pedir / interpretar | Cursor + skills |
| Capability | contrato do “o quê” | Contract YAML + registry |
| Provider | “como” | deterministic / cursor-skill / futuro remote |
| ExecutionPolicy | retries, gates, strategy | PolicyEngine existente |
| CapabilityAuthority | allow/deny/confirm + permissões | **novo módulo** |
| Knowledge RAG | retrieval + provenance | wiki (Python) via provider |
| Evidence | o que aconteceu | builders + evidence_dir |
| Telemetry | observação | EventBus + JSONL |

---

## Taxonomia de capabilities

### A — Workflow (já existem)
`planning`, `backend-implementation`, `frontend-ui`, `testing`, …

### B — Operacionais primitivas (a adicionar)
```
filesystem.read | write | list | search
shell.execute
git.status | diff | log | inspect
system.cpu | memory | disk | processes | inspect
knowledge.search | inspect
browser.navigate | extract   (fase posterior — OmniBrowse/agent-browser)
project.search
```

### C — Compostas (providers que orquestram primitivas internamente)
```
repository.inspect  → git.*
project.inspect     → filesystem + git + manifests
system.inspect      → cpu/memory/disk/processes
research.knowledge  → knowledge.search (+ opcional browser depois)
```

**Naming:** dotted IDs como na missão; manifests agrupados por domínio (`providers/filesystem/`, `providers/git/`, …).

---

## Contratos — extensão (não inventar formato)

Estender `ContractDocument.spec` (YAML existente) com campos opcionais:

```yaml
permissions:
  filesystem: none | read | write
  network: false | true
  shell: false | true
side_effects: false
deterministic: true
requires_confirmation: false
timeout: 30s
retry_policy: { max: 0 }
cost:
  latency: low | medium | high
  token_cost: none | low | high
  compute_cost: low | medium | high
  network_cost: none | low | high
  risk: low | medium | high
evidence:
  schema: evidence/deterministic-default@1.0.0
provider_requirements:
  plugin: deterministic
```

Compatível com contratos worker/gate actuais (campos omitidos = defaults liberais para LLM workers).

---

## Provider boundaries

1. **DeterministicProvider** — Node local, resultados JSON semânticos, sem LLM.
2. **CursorSkillProvider** — inalterado.
3. **KnowledgeWikiProvider** — subprocess/`python -m gaabwiki search` ou HTTP local; nunca embutir LanceDB no TS.
4. **Browser** — adaptar depois via port (Playwright/agent-browser); não nesta fundação.

---

## RAG architecture

```text
Project wiki (.ai/ Carpaccio) ──┐
Wiki vault (karpathyWiki) ──┼─► ingest/index (Python)
                                ▼
                         BM25 + (LanceDB se embeddings OK)
                                ▼
                         HybridRetriever
                                ▼
                    knowledge.search → EvidenceSet + provenance
```

**Degraded:** Ollama down → BM25 only + `retrieval_method: bm25` + `degraded: ollama_unavailable` (≠ empty corpus).

**Project Knowledge Contract:** documento normativo + checklist Carpaccio (overview, architecture, decisions, troubleshooting, testing) — sem forçar árvore `wiki/` se `.ai/` for a convenção.

---

## Policy boundaries

| Engine | Pergunta |
|--------|----------|
| ExecutionPolicy | Quantos retries? Quais gates? Que strategy? |
| CapabilityAuthority | Esta capability pode correr neste contexto? Precisa confirmação? |
| MegaBrain policy-engine.md | risk_tier / budget / topology (orquestrador raiz LLM) |

Não fundir os três num único objecto.

---

## Discovery / scoping

Helper `discoverCapabilities(profile)` filtra registry por tags/profiles:

| Profile | Caps |
|---------|------|
| coding | filesystem.*, git.*, project.*, shell.execute (confirm), knowledge.search |
| research | knowledge.*, browser.* |
| diagnose | system.*, project.inspect, git.inspect, knowledge.search |

Planner/agent recebe subset — não dump de dezenas de IDs.

---

## Test strategy

| Camada | O quê |
|--------|-------|
| Unit | authority allow/deny; normalize git/fs; contract schema |
| Integration | registry → deterministic provider → evidence |
| Adversarial | Ollama down; permission deny; malformed input; timeout |
| Regression | `npm test` orchestrator 82+; wiki pytest |
| E2E | run-engine IR com nós deterministic |

---

## Migration strategy

1. **Foundation** em `AGENTS/Cursor/orchestrator` (SSOT; tem jobs)
2. **Espelho** dos módulos novos → `CursorSKILLS/orchestrator`
3. Manifests + contracts no pack CursorSKILLS e AGENTS
4. Fix `wiki` skill paths + degraded mode no vault package
5. ADRs só para decisões estruturais
6. Docs `CURRENT REAL ARCHITECTURE` após verde

**Breaking:** nenhum para skills existentes; novos campos de contrato são opcionais.

---

## Fora de escopo (explícito)

Kafka, Redis, Temporal, K8s, GraphRAG, swarm multi-agent, segundo vector DB, reescrita do Planner in-TS, microsserviços.
