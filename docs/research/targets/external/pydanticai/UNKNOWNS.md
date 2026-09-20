# UNKNOWNS — Pydantic AI

**Target:** pydanticai  
**Date:** 2026-09-18  
**Rule:** No invented internals. Claims without primary evidence stay here.

## Access limitations

| Item | Status |
|------|--------|
| `pip install` / local clone / runtime | Not performed (policy) |
| Firecrawl MCP | Unauthorized — unused |
| Full source walk of `pydantic_ai` agent graph internals | Not done |
| Harness package deep dive | Out of primary scope |

## UNKNOWN (technical)

1. **Exact agent-graph edge conditions** beyond documented node types (when CallToolsNode loops vs ends; full interaction with `end_strategy`) — partially DOCUMENTED; complete state machine = UNKNOWN without source.
2. **Serialization boundary for durable execution** — what is snapshotted into Temporal/DBOS activities (message parts, deps objects, non-serializable clients) — docs warn about DynamicToolset IDs; full contract UNKNOWN.
3. **ModelRetry vs UnexpectedModelBehavior taxonomy** — complete exception matrix and hook recovery not exhaustively mapped.
4. **Token/cost accounting** across nested agent delegation / deferred capabilities / native tools — `RunUsage` shown in examples; edge aggregation rules UNKNOWN.
5. **Capability middleware ordering** (`get_wrapper_toolset`, hooks composition) — examples exist; formal precedence UNKNOWN.
6. **Security sandboxing of tools** (esp. Harness Shell/FileSystem allowlists) — advertised; enforcement internals UNKNOWN in this pass.
7. **Pydantic Evals** grader catalogue and CI patterns — not fully read.
8. **AI Gateway** failover/spend-cap behavior — product-level only; not audited.
9. **Realtime voice** tool concurrency vs text agent loop — feature-level DOCUMENTED; scheduling UNKNOWN.
10. **Version skew** — pinned to PyPI 2.45.0 + live docs; historical API renames (system_prompt vs instructions) not tabulated.

## UNKNOWN (vs MegaBrain)

1. Whether Provider manifests already encode **ModelProfile-equivalent** flags — baseline: Provider Registry IMPLEMENTED; field-level audit = GAP / UNKNOWN.
2. Whether Orchestrator already has **tool vs output retry budgets** — not in baseline → treat ABSENT until code audit.
3. Whether MegaBrain needs multi-hour durable jobs — product UNKNOWN → justifies DEFER on durable ADOPT.

## CONFLICTS

```text
CONFLICT:
  claim: Canonical documentation host
  source_a: https://ai.pydantic.dev/ (still serves content)
  source_b: https://pydantic.dev/docs/ai/ (llms.txt + README canonical)
  difference: Dual hosts / path layout differs
  resolution: prefer_primary — pydantic.dev/docs/ai/
```

```text
CONFLICT:
  claim: Scope of “Pydantic AI” vs “Harness”
  source_a: README foregrounds Harness coding agent
  source_b: Core docs describe SDK Agent/tools/output primitives
  difference: Marketing emphasis vs mechanism surface mined here
  resolution: UNRESOLVED for narrative; mining scope = core SDK; Harness = follow-up
```

## What would resolve

- Observational read of tagged `v2.45.0` agent-graph source on GitHub (no untrusted install).
- Audit CursorSKILLS `orchestrator/providers` + retry paths to upgrade PARTIAL→EQUIVALENT claims.
- Optional TARGET_RESEARCH: `pydantic-ai-harness`.
