# DO-NOT-CHANGE

**Date:** 2026-09-18  
**Basis:** Aggregate of 21 TARGET_RESEARCH dossiers + OUR-SYSTEM-BASELINE  
**Purpose:** Prevent research → architecture churn.

These MegaBrain mechanisms should **not** be replaced or duplicated merely because other systems use different names or packaging.

| Mechanism | Why keep | Evidence |
|-----------|----------|----------|
| Capability Registry + Provider Registry | Semantic equivalent of “tools/agents-as-callables” across SDKs; avoid second registry | Recurring REJECT of duplicate registries (MCP, OpenAI Agents, Cursor, PydanticAI, …) |
| Orchestrator / Runtime + Capability IR / Task Graph | Covers Runner/graph/crew orchestration roles without embedding foreign runtimes | Widespread REJECT embed LangGraph/CrewAI/LlamaIndex/MAF/PydanticAI as MegaBrain runtime |
| Policy Engine | Covers approval/guardrail/authorization roles; hooks are adapters not replacements | Claude Code / Codex / Cline: ADAPT hooks→policy, not replace |
| Evidence Bus (JSON gates on disk) | Stronger than prose “done”; aligns with security-audit tri-verdict & ledger ideas without copying product | security-audit ADAPT ledger/verdicts; ALREADY_PRESENT schema-first intent |
| PDA roles (plan/exec/gate/explore/critic/librarian) | Multi-agent without roster tourism; agency-agents REJECT prompt-only orchestration as architecture | agency-agents REJECT; OpenAI/LlamaIndex handoffs ≈ Task (MEDIUM) |
| GaabWiki grounding + Knowledge gate | Distinct from product “memory” modules; don’t replace with CrewAI/LlamaIndex memory packages | REJECT Knowledge-as-SSOT from LlamaIndex/CrewAI |
| Skills as `SKILL.md` packages | Already present; improve invocation/disclosure rather than rebrand | mattpocock ALREADY_PRESENT base; Anthropic Skills / Claude Code ALREADY_PRESENT pattern |
| MCP via host (Cursor), not reimplemented transports | Protocol belongs at host boundary | MCP report: ADOPT transports on host; REJECT reimplement in orchestrator |
| Separation MegaBrain ≠ Cursor product | Cursor is harness we run inside | Cursor REJECT equivalence |

## Explicit non-changes (fashion pressure)

- Do **not** add a second “Agent Registry” for persona markdown libraries.
- Do **not** replace Evidence Bus with vendor tracing alone (OTel may ADAPT as export, not SSOT).
- Do **not** treat popularity/stars/leaderboards as architectural requirements (Aider REJECT leaderboard SSOT).
- Do **not** import Hyperframes / browser-builtin / enterprise remote-config into core (brag/Cline REJECT).

## Status labels

| Item | State |
|------|--------|
| This list | DOCUMENTED from research synthesis (INFERRED applicability = HIGH for REJECT-embed cluster) |
| Implementation | unchanged — research only |

When a future ADR proposes changing any row: require Level 4 gap + experiment metrics first.
