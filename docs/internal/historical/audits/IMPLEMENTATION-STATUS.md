# Estado da implementação — Orquestrador v2.1

**Data:** 2026-09-17  
**Pacote:** `@agents/orchestrator` v2.0.0  
**Contratos:** `contracts-v2.1.0`  
**SSOT testes:** `AGENTS/Cursor/orchestrator` (`npm test`)

---

## Contratos congelados

| Artefacto | Path |
|-----------|------|
| Princípios | `.cursor/skills/orquestrar/references/ARCHITECTURAL-PRINCIPLES.md` |
| Pacote contratos | `.cursor/skills/orquestrar/references/contracts/` |

---

## Runtime v2.1 — implementado

| Marco | Estado |
|-------|--------|
| Evidence universal (6+ emissores) | ✓ (+ authority, retrieval) |
| State machine nó + run | ✓ |
| Scheduler topological + scheduling evidence | ✓ |
| Registry selectWithEvidence + quality_score auto | ✓ |
| Executor smart mock (cancel/timeout/heartbeat) | ✓ |
| Policy `cost-optimized` | ✓ |
| Learning PatternAggregator | ✓ |
| Engine lifecycle pause/cancel/abort | ✓ |
| JOB_PENDING → waiting | ✓ |
| Ponte orquestrar + planner IR YAML | ✓ (skills) |
| Contract tests | `tests/contracts/contract-prototype.test.ts` |

---

## Skills Tier 1 — estado

| Skill | Capability | Status |
|-------|------------|--------|
| orquestrar | orchestration | **stable** |
| testing | testing | **stable** |
| po-review | po-acceptance | **stable** |
| security | security-review | draft |
| frontend-pro | frontend-ui | draft |
| planner | planning | IR YAML v2.1 |

---

## Platform evolution — 2026-09-17 (Fases 2–7)

| Marco | Estado |
|-------|--------|
| ContractDocument permissions/cost/deterministic | ✓ |
| CapabilityAuthority (allow/deny/confirm) | ✓ — distinto de ExecutionPolicy (ADR-0003) |
| Plugin `deterministic` (+ alias `shell`) | ✓ (ADR-0002) |
| Caps: filesystem.*, git.*, shell.execute, system.*, project.inspect, knowledge.* | ✓ |
| Capability profiles (coding/research/diagnose) | ✓ |
| Normalized results + authority/retrieval evidence | ✓ |
| Observability: `summarizeExecutionTrace` + replay docs | ✓ F5 |
| RAG degraded BM25 (karpathyWiki) | ✓ F4 — pytest **21** |
| ADRs 0002–0005 + architecture-current | ✓ F7 |
| browser.* | pendente (fora desta entrega) |
| Kafka / Temporal / GraphRAG | **não** |

### Testes

| Suite | Contagem |
|-------|----------|
| AGENTS `npm test` | **103** passed (base 101 + execution-trace + knowledge UNAVAILABLE) |
| wiki pytest | **21** |

---

## Pendente (opcional)

| Item | Notas |
|------|-------|
| JSON Schema Ajv | Validador lightweight actual |
| security/frontend-pro → stable | Após evals browser |
| browser.* capabilities | Fase posterior |
