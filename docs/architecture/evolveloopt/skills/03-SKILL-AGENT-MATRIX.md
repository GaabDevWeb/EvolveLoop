# 03 — Skill × Agent Matrix

**Commit:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`

| Skill class | DefaultAgentExecutor | Supervisor | EngineeringWorker | Live Cursor | Live Ollama |
|-------------|---------------------|------------|-------------------|-------------|-------------|
| DETERMINISTIC | N/A (Engine) | N/A | uses FS/shell via Worker | N/A | N/A |
| HARD-GATE grill-me/image | proposal only | N/A | N/A | BLOCKED (no key) | N/A |
| HARD-GATE wiki | agent-attested | N/A | N/A | BLOCKED | PARTIAL knowledge |
| LLM cursor-skills | structural only | eligibility | N/A | BLOCKED | NOT coding agent |
| Host/Superpowers | incompatible with Engine | N/A | N/A | interactive | N/A |

Live Agent×Skill escalation attempts: structural DENY paths tested for grill-me forge; full live Agent corruption **NOT_MEASURED** (no CURSOR_API_KEY).
