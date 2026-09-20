# UNKNOWNS — microsoft-agent-framework

**Date:** 2026-09-18  
**Target:** Microsoft Agent Framework / AutoGen  
**Rule:** Gaps without primary evidence stay UNKNOWN — no invented internals.

---

## Access / method gaps

| ID | Unknown | Why unknown | What would resolve |
|----|---------|-------------|--------------------|
| U-SRC | Exact internal executor scheduling, superstep semantics, edge activation algorithms | No source checkout / no OBSERVED code walk | Read `microsoft/agent-framework` workflow runtime modules at pinned commit |
| U-VER | Exact PyPI/NuGet/Go package versions and API stability matrix as of date | Investigation used docs/READMEs, not `pip show` / NuGet metadata | Pin versions + changelog/release notes |
| U-RUNTIME-EXEC | Behavior under failure (retries, cancellation, partial executor crash) | Not executed; docs describe happy-path HITL/checkpoint | Controlled OBSERVED runs + tests in repo |
| U-DIST | Current state of “distributed execution planned” for MAF | Migration guide statement only; no implementation proof here | Issues/ADRs/code for distributed runtime |
| U-GO | Full Go feature parity | Docs mark Go public preview; several features unavailable | `agent-framework-go` docs + code |

---

## Naming / product maturity

| ID | Unknown | Notes |
|----|---------|-------|
| U-1.0 | What “1.0 / production-ready” covers per language | AutoGen README asserts MAF 1.0 production-ready; Learn still marks previews (Go, some tools, functional workflows experimental) |
| U-BRAND | Whether “Microsoft Agent Framework” and package names map 1:1 across all docs | Multiple entry packages (`agent-framework`, `Microsoft.Agents.AI`, Foundry packages) |

---

## CONFLICTS (documented disagreement)

```text
CONFLICT:
  id: C-PROVIDERS
  claim: Anthropic / Ollama support in MAF
  source_a: Overview lists Anthropic, Ollama among supported agent backends
  source_b: Migration guide model-client table marks Anthropic / Ollama as Planned
  difference: available vs planned
  resolution: UNRESOLVED
```

```text
CONFLICT:
  id: C-MATURITY-LANGUAGE
  claim: Framework readiness for production
  source_a: microsoft/autogen README — MAF production-ready / 1.0 / LTS commitment
  source_b: Learn overview — Go public preview; tools tables include preview/experimental
  difference: global claim vs per-surface preview flags
  resolution: prefer_primary per surface; no global single label without version matrix
```

---

## Mechanism-level UNKNOWNs

| ID | Topic | Unknown |
|----|-------|---------|
| U-MEM-SEM | Memory | Exact persistence semantics of FileMemoryProvider across process restarts and multi-agent workflows (beyond DOCUMENTED scope notes) |
| U-APPROVAL | Tool approval | Interaction matrix: streaming + middleware + session restore edge cases not fully audited here |
| U-GROUPCHAT-MGR | Group chat | Manager structured-output requirements / failure if model lacks schema support — samples warn; depth UNKNOWN |
| U-HANDOFF-IMPL | Handoff | “Mesh topology without orchestrator” — DOCUMENTED intent; wire-level implementation UNKNOWN without source |
| U-CKPT-STORE | Checkpoints | Default storage backends and multi-host safety UNKNOWN |
| U-A2A | A2A | Interop guarantees and security model beyond marketing/samples UNKNOWN |
| U-SKILLS | Agent Skills | Design ADR exists in repo mention; runtime contract depth UNKNOWN (not fetched) |
| U-AUTOGEN-DIST | AutoGen Core | Practical limits of distributed runtime in maintenance mode UNKNOWN |

---

## MegaBrain comparison UNKNOWNs

| ID | Unknown |
|----|---------|
| U-MB-TERM | Whether Orchestrator/Policy already enforce hard max-iteration/tool budgets equivalent to MAF termination primitives |
| U-MB-HITL | Whether Evidence Bus already implements pause/resume equivalent to `request_info` |
| U-MB-TOOL-APPR | Parity of human tool-approval with MAF ApprovalRequired patterns |

These require CursorSKILLS audit — **not** inferred as ABSENT.

---

## Explicit non-claims

- No ranking of MAF vs LangGraph/CrewAI/OpenAI Agents.
- No claim that Magentic outperforms other MAF orchestrations (docs caution outside Magentic-One design).
- No claim AutoGen Core equals MAF Workflow (migration guide documents intentional redesign).
