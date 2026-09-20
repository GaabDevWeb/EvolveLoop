# Agent Backend Portability

**Consulta:** 2026-09-20T19:29Z UTC

---

## Session / Thread Model

| Camada | Papel | Persistência |
|--------|-------|--------------|
| EvolveLoop `execution_id` / `task_id` / checkpoint B04 | **Canónico** | Durável no engine |
| AgentDecision / TaskGraph / Evidence | **Canónico** | Durável |
| Vendor session / thread / conversation / run id | **Vendor-local** | Opcional no adapter metadata |
| Stream tokens / partial assistant text | **Disposable** | Telemetry only |
| Vendor tool transcripts | **Recoverable raw** → normalize | Evidence só se promovido |

**Regra:** EvolveLoop **não** depende estruturalmente de vendor session ID. Adapter pode *opcionalmente* armazenar `vendor_session_ref` para resume **no mesmo backend**.

---

## Cross-backend continuation

| De → Para | Context | Session | Workspace | Plan | Tools | State | Classificação |
|-----------|---------|---------|-----------|------|-------|-------|---------------|
| Cursor → Codex | UNSAFE (history não portável) | UNAVAILABLE | CONDITIONALLY (mesmo cwd/git) | CONDITIONALLY (TaskGraph EvolveLoop) | UNSAFE | CONDITIONALLY (checkpoint) | **UNSAFE** para “continuar conversa”; **CONDITIONALLY_SAFE** para “nova run no mesmo task com plan canónico” |
| Codex → Cursor | idem | idem | idem | idem | idem | idem | idem |
| Qualquer → Ollama | CONDITIONALLY (re-prompt Decision) | N/A | N/A (sem workspace agent) | CONDITIONALLY | N/A | CONDITIONALLY | **CONDITIONALLY_SAFE** só reasoning; **UNSAFE** se task exige tool agent |
| Local agent → Managed cloud Antigravity | UNSAFE | UNSAFE | UNSAFE (sandbox remoto) | CONDITIONALLY | UNSAFE | UNSAFE | **UNSAFE** |
| Ollama → Cursor agentic | CONDITIONALLY | N/A | CONDITIONALLY | CONDITIONALLY | UNSAFE | CONDITIONALLY | **CONDITIONALLY_SAFE** se rehydrate só Decision |

---

## Fallback semantics

```text
Cursor unavailable → Codex available → Can task continue?
```

| Dimensão | Avaliação |
|----------|-----------|
| Role / AgentContract | SAFE se mesmo Decision schema |
| Capabilities | CONDITIONALLY_SAFE se capability match |
| Workspace | CONDITIONALLY_SAFE se mesmo roots |
| Context / chat | **UNSAFE** (não portar transcript) |
| Policy | SAFE se PolicyEngine inalterado |
| Execution model | **UNSAFE** se mudar reasoning_only ↔ agent_runtime |

**Classificação fallback automático:** **UNSAFE** por default.  
**CONDITIONALLY_SAFE** apenas com: mesma mode, mesmo workspace authority, re-seed de objective+TaskGraph (sem vendor history), human or policy gate.

---

## Evidence mapping

```text
Vendor event (raw)
  → Adapter normalize → ExecutionEvent (telemetry)
  → (optional promote) → Evidence (only if engine accepts)
```

Não misturar: raw ≠ Evidence ≠ Telemetry.

---

## Error normalization (proposta)

| Code | Significado |
|------|-------------|
| BACKEND_UNAVAILABLE | binário/SDK/serviço ausente |
| AUTHENTICATION_FAILED | key/login |
| SESSION_FAILED | create/resume vendor |
| RUN_FAILED | turn/agent failure |
| TOOL_FAILED | tool error vendor ou host |
| TIMEOUT | print-timeout / HTTP / executor |
| CANCELLED | abort |
| INVALID_OUTPUT | schema/decision |
| PERMISSION_DENIED | vendor ou EvolveLoop |
| WORKSPACE_UNAVAILABLE | cwd/sandbox |
| CONTEXT_ERROR | context too large / inject |
| UNKNOWN | catch-all |

Mapeamento fino por vendor fica no adapter; core só vê taxonomia.
