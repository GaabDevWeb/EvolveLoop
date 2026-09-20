# UNKNOWNS — OpenAI Agents SDK

**Target:** openai-agents-sdk  
**Date:** 2026-09-18  
**Rule:** lacunas sem fonte → UNKNOWN (não inventar)

## Access / method limits

| ID | Unknown | Why unknown | Would resolve by |
|----|---------|-------------|------------------|
| U01 | Runtime behavior of every edge case under load | No install/execution of SDK in this investigation | Controlled OBSERVED runs in sandbox VM |
| U02 | Closed internals of OpenAI Responses hosted tools / Agents API managed harness | Not in public SDK source | Official service docs only; treat as UNKNOWN otherwise |
| U03 | Traces dashboard storage, retention, and exact export protocol beyond documented processors | Client exporter documented; server opaque | OpenAI platform docs / support |
| U04 | Full Python ↔ TypeScript behavioral parity on every API | Overview + shared concepts DOCUMENTED; no line-by-line audit | Dual-repo OBSERVED diff per feature |
| U05 | Production security guarantees of each hosted sandbox provider (E2B, Modal, …) | Client list DOCUMENTED; provider SLAs not audited | Provider security docs + threat model |

## Mechanism unknowns

| ID | Mechanism | Unknown | Notes |
|----|-----------|---------|-------|
| U10 | Agent loop | Exact default policies for retries/network when PTC present beyond docs | Docs state stricter replay-safety; full matrix UNKNOWN |
| U11 | Guardrails | Ordering details under concurrent streaming cancel paths | Partially DOCUMENTED; residual UNKNOWN |
| U12 | nest_handoff_history | Stability (docs: opt-in beta) | Expect change |
| U13 | SandboxAgent | GA timeline, default capability set churn | Explicitly beta in docs |
| U14 | Session backends | Concurrent write semantics for every backend | SQLite concurrency fix noted in v0.22.3 release; general guarantees UNKNOWN |
| U15 | MCP | How remote MCP auth/secrets are expected to be managed in apps | App responsibility; SDK surface DOCUMENTED |
| U16 | HITL | Forward-compat of RunState across arbitrary agent definition changes | Docs recommend version markers; schema evolution UNKNOWN |
| U17 | Models | Behavior of every third-party adapter under tracing | Caveats DOCUMENTED; matrix UNKNOWN |

## MegaBrain comparison unknowns

| ID | Claim blocked | Why |
|----|---------------|-----|
| U20 | Exact EQUIVALENCE for Context DI | Baseline does not inventory typed run-context wrapper; needs CursorSKILLS/orchestrator audit |
| U21 | Durable mid-run approval state in MegaBrain | Policy/hooks PARTIAL; no confirmed RunState analogue in baseline |
| U22 | Orchestrator-native MCP registry + tool guardrails | Workspace has Cursor MCP; Orchestrator MCP = UNKNOWN |
| U23 | Sandbox for target code execution | Baseline already marks UNKNOWN–PARTIAL |
| U24 | Evidence Bus vs guardrail tripwire mapping | Conceptual overlap INFERRED only — do not assert EQUIVALENT |

## CONFLICTS

```text
CONFLICT:
  claim: Whether to treat Agents SDK as successor product to Swarm for all use cases
  source_a: SDK docs — "production-ready upgrade of Swarm"
  source_b: developers.openai.com Agents overview — SDK vs Agents API vs Responses as distinct tracks
  difference: Swarm upgrade claim is historical; product choice is multi-path
  resolution: prefer_primary — both official; treat as complementary paths, not single replacement
```

```text
CONFLICT:
  claim: Sandbox isolation strength of UnixLocalSandboxClient
  source_a: Marketing-adjacent “isolated workspace” framing in overview
  source_b: sandbox_agents docs — Linux no OS confinement; macOS filesystem-only via sandbox-exec
  difference: “Isolated” ≠ strong security boundary for Unix-local
  resolution: prefer_primary technical warning in sandbox_agents docs
```

No fabricated consensus where sources disagree.

## Explicitly not claimed

- Internal ranking of SDK vs LangGraph/CrewAI/etc.  
- That MegaBrain should depend on `openai-agents` package.  
- Undocumented OpenAI service algorithms (routing, moderation models behind guardrail examples).
