# V2 Master Audit

**Date:** 2026-09-20T19:39Z  
**Branch:** `evolve-v2`  
**Mode:** Post grill-me (satisfied) — factual baseline before implementation  
**Companion:** explore audit 2026-09-20; `ADAPTER-ECOSYSTEM-AUDIT.md`; `AUTONOMY_REAUDIT_V2_POST_SE07.md`

---

## 1. Architecture current

```text
Intent → Requirements → Architecture → TaskGraph → Supervisor
  → AgentExecutor → ReasoningProvider → AgentDecision
  → EngineeringWorker → A03/gates → ProviderRuntime → Workspace
  → Tests → Review → Repair/Replan → Validation → Completion
```

| Seam | Path | Status |
|------|------|--------|
| AgentExecutor | `src/agent/` | Present |
| ReasoningProvider | Test/Ollama/Cursor | Present |
| AgentBackend | — | **ABSENT in src** (docs only) |
| Engine + A03 | `src/engine/`, `src/gates/` | Present (`src/runtime` N/A) |
| Supervisor / Worker | `src/supervisor/`, `src/engineering/` | Present |
| SE-01..07 | requirements/architecture/tasks/… | Present |
| SE-08 Cursor | `ReasoningProvider` facade | Present; pre-approval procedural debt |

---

## 2. Gaps (actionable this milestone)

1. Implement `AgentBackend` types + registry (ACK Q2).  
2. Cursor dual facade incremental (ACK Q4).  
3. Codex/Claude adapters + contract tests; live BLOCKED if unavailable (ACK Q5–Q6).  
4. Antigravity CLI or BLOCKED_BY_INTERFACE.  
5. Ollama remains ReasoningProvider (+ thin capability declare).  
6. Benchmarks A–J deterministic.  
7. Rebuild/document `dist` policy (B06).  
8. Authority/docs/handoff package.  
9. No auto-fallback (ACK Q8).  
10. Sandbox stays NOT_IMPLEMENTED (ACK Q9).

---

## 3. Duplications / leakage

- Domain evidence/telemetry twins across SE modules.  
- Dual knowledge stores (B03 residual).  
- `CursorSkillProvider` naming ≠ SE-08 SDK.  
- `@cursor/sdk` hard dependency (acceptable for PRIMARY; optionalize deferred — not ACK’d as required this pass).  
- Stale `dist/` vs `src` (B06).

---

## 4. Policy bypass risks

- `agentic_workspace` Cursor → A03 LIMITED (documented).  
- Direct ProviderRuntime outside Engine (tested LIMITED).  
- Vendor SUCCESS ≠ task completion (must encode in AgentBackend).

---

## 5. Procedural debt

**SE-08 shipped without prior adapter-ecosystem approval gate.** Reconciled as transitional ReasoningProvider; AgentBackend is the canonical future seam (ACK Q4).

---

## 6. Implementation plan (locked by ACK)

1. ADR AgentBackend + tool Model C.  
2. `src/backends/**` contract/registry/errors/events.  
3. Adapters: cursor, ollama, codex, claude-code, antigravity.  
4. Contract + adversarial tests.  
5. Benchmarks A–J harness + fixtures.  
6. Docs: autonomy status, authority proof, delivery spec, validator handoff, AGENT.md.  
7. Vitest V1+V2; live only if real auth.
