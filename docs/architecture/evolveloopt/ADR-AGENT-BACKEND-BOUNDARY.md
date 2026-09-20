# ADR — AgentBackend Boundary & Multi-Backend Architecture

- **Status:** Accepted  
- **Date:** 2026-09-20  
- **Branch:** `evolve-v2`  
- **Grill-me:** `memory/evolveloop-v2-master-finalization/evidence/gate.grill-me.json` (Q2, Q3, Q4, Q8)

## Context

`ReasoningProvider` models cognitive turns. Full coding agents (Cursor, Codex, Claude Code, Antigravity) expose sessions, tools, streaming, vendor sandboxes. Forcing them into ReasoningProvider alone distorts authority (A03/B01) and portability.

## Decision

1. **Two seams:** `ReasoningProvider` (cognitive) and `AgentBackend` (coding-agent runtime capabilities).  
2. **No inheritance** between them; facades may implement both.  
3. **Tool Model C:** default `reasoning_only`; `agent_runtime` declare capabilities; vendor side-effects ⇒ A03 **LIMITED**.  
4. **Canonical state** = EvolveLoop execution/task/checkpoint — never vendor session IDs.  
5. **No auto-fallback** across backends.  
6. **SE-08 Cursor** remains ReasoningProvider; CursorAgentBackend wraps/declares modes incrementally.  
7. Core must not contain vendor execution logic beyond adapter packages under `src/backends/<vendor>/`.

## Consequences

- Contract tests per backend; live = separate dimension.  
- Ollama is ReasoningProvider-first; AgentBackend optional thin health/capabilities only.  
- Rejected: single universal provider; Model A default; vendor SUCCESS as task completion.
