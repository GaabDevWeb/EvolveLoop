# V2 Authority Boundary Proof

**Date:** 2026-09-20  
**Branch:** `evolve-v2`

## Claim

```text
Agent ≠ Provider ≠ Capability ≠ Policy ≠ Runtime
```

## Routes exercised (deterministic)

| Route | Proof |
|-------|-------|
| AgentDecision does not execute providers | AgentExecutor + apply-decision tests; Supervisor RuntimeBridge |
| Forbidden capability proposed | A03 DENY + provider count 0 (`tests/integration/a03-runtime-gates.test.ts`) |
| ReasoningProvider ≠ side effects | ADR-AGENT-RUNTIME-BOUNDARY; Cursor reasoning_only |
| AgentBackend agent_runtime | Contract test `agent_runtime_limited` → A03 LIMITED |
| Policy budgets B01 | `tests/integration/b01-resource-policy.test.ts` |
| Checkpoint B04 | `tests/integration/b04-checkpoint-recovery.test.ts` |
| No auto-fallback | `AgentBackendRegistry.resolve` throws; unit test |
| Vendor SUCCESS ≠ task done | Adapter Development Standard + Worker completion authority |

## Explicit LIMITED paths

| Path | Why |
|------|-----|
| Cursor/Codex/Claude/Antigravity `agent_runtime` | Vendor tools bypass EvolveLoop Runtime |
| Skill worker external agent | Documented LIMITED in A03 status |
| Direct ProviderRuntime outside Engine | Documented LIMITED |

## Not proven as PASS

- EvolveLoop process sandbox
- Live vendor agentic under full A03
- Production delivery authority
