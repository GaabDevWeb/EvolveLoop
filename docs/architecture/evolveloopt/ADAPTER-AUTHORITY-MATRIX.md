# Adapter Authority Matrix

**Consulta:** 2026-09-20T19:29Z UTC  
**Princípio:** Vendor Agent ≠ Authority. Bypass detection.

| Capability / Authority | EvolveLoop (canónico) | Vendor Agent | Bypass risk se AgentRuntime ativo |
|---|---|---|---|
| Task assignment | Sim (Supervisor / TaskGraph) | Não | Baixo |
| Policy | Sim (PolicyEngine) | Não (só vendor permission UX) | Médio — vendor “allow” ≠ policy allow |
| Runtime execution (capabilities) | Sim (ExecutionEngine + providers) | Documented exception only | **Alto** se vendor tools escrevem FS/shell |
| Workspace ownership | Shared/controlled por EvolveLoop roots | Depende (cwd vendor) | Alto se cloud sandbox ≠ workspace task |
| Tool permissions | EvolveLoop + adapter allow/deny map | Vendor allow/deny/approvals | Alto se só vendor |
| Validation / gates A03 | Sim | Não | **Crítico** |
| Budgets B01 | Sim | Não (maxTurns vendor ≠ B01) | Alto se turns ilimitados |
| Checkpoint B04 | Sim | Vendor session ≠ checkpoint | Médio — falso resume |
| Evidence | Sim (Evidence store) | Source data only (raw events) | Médio se “success” vendor vira Evidence PASS |
| Telemetry | EvolveLoop + adapter | Vendor events | Baixo se separado |
| Replan A04 | Sim (Replanner) | Não | Médio se agent “self-repairs” fora do graph |
| Task completion | Sim | Não | **Crítico** — vendor done ≠ task done |
| Review | Sim | Vendor review modes | Médio |
| Sandbox EvolveLoop | NOT_IMPLEMENTED | Vendor sandbox separado | Confusão semântica |

---

## Model A / B / C (tools)

Ver `ADAPTER-CONTRACT-PROPOSAL.md` e root audit §.

| Model | Quem executa tools | A03 | Portability | Vendor support |
|---|---|---|---|---|
| A Vendor controls tools | Vendor | Observação apenas; autorização fraca | Baixa | Natural Cursor/Codex/Claude/Antigravity |
| B EvolveLoop exposes tools | EvolveLoop Runtime | Forte | Alta | Natural Ollama; forçado nos outros |
| C Hybrid | Vendor subset + EvolveLoop capabilities | Forte se deny-by-default vendor tools | Média | Requer adapter mapping |

**Proposta de auditoria (não implementada):** default **C** com mode `reasoning_only` (= B cognitivo) e `agent_runtime` (= A observado + deny list + never treat vendor completion as task completion).

---

## Non-bypass rules (proposta)

1. Vendor `SUCCESS` / `result` ≠ EvolveLoop task completion.
2. Vendor sandbox ≠ EvolveLoop sandbox.
3. Vendor session resume ≠ B04 recovery.
4. Vendor approvals ≠ PolicyEngine.
5. Evidence só após normalização + validação de engine.
