# Autonomy

```text
OBSERVE → ANALYZE → PROPOSE → (gates) → PROTOTYPE → VALIDATE → IMPLEMENT
```

EvolveLoop V1 (motor longitudinal) remains autonomous up to **PROPOSE**.

| Change class | Auto-apply? |
|--------------|-------------|
| read-only observation | yes |
| USER_LOCAL proposal | propose only |
| CORE_CANDIDATE | propose only; no auto core mutation |
| Skill / Agent / Capability / Policy / Runtime | existing authoring + Prototype/Implementation gates |

## V2 execution foundation (`evolve-v2`)

Operational autonomy foundation (not self-evolution):

- **StructuredIntent → PlanEmitter → CapabilityIR** (GAP-A01 seam)
- **Provider bootstrap `real` \| `mock`** — no silent MockProvider on default CLI (GAP-A05)
- **GAP-A02:** `AutonomousSkillExecutor` + job claim/lease + `run-jobs worker` — handler-backed real execution; LLM-only skills → `EXECUTOR_UNAVAILABLE`
- **GAP-A04:** Automatic bounded replan (`Replanner` + validate + apply); DeterministicReplanner provider-switch proven; LLM replanner not wired
- **SE-08:** `CursorReasoningProvider` (`@cursor/sdk`) — primary Agent backend adapter; default `reasoning_only` (`tools: []`); live auth opt-in via `CURSOR_API_KEY`; agentic mode A03 **LIMITED**

See `ADR-INTENT-EXECUTABLE-IR-BOUNDARY.md`, `ADR-BOUNDED-REPLANNING.md`, `ADR-CURSOR-AGENT-BACKEND.md`, `V2-FOUNDATION-STATUS.md`, `V2-A02-SKILL-EXECUTION.md`, `V2-A04-BOUNDED-REPLANNING.md`, `V2-SE08-CURSOR-BACKEND.md`.  
Historical audit: `AUTONOMY_GAP_AUDIT.md` / `AUTONOMY_REAUDIT_V2_POST_SE07.md` (not rewritten).
