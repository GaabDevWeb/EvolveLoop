# V2 SE-08 — Cursor Live Eval Results

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Suite version:** `se08-cursor-v1.0.0`  
**SDK:** `@cursor/sdk@1.0.31`

## Modes measured

| Surface | Result |
|---------|--------|
| Deterministic MockCursor golden suite (8 cases) | **PASS** (vitest CI) |
| Live Cursor AgentExecutor smoke | **BLOCKED** — `CURSOR_API_KEY` not set; `~/.cursor/sdk/auth.json` absent |
| Live MiniCRM via Cursor | **NOT_MEASURED** (auth blocked) |
| Live LLM quality (C01–C12) | **NOT_MEASURED** |

## Authentication

| Check | Result |
|-------|--------|
| Env `CURSOR_API_KEY` | unavailable in audit shell |
| SDK stored login (`~/.cursor/sdk/auth.json`) | absent |
| Fake success without auth | **refused** |

To run live:

```bash
export CURSOR_API_KEY=cursor_...
export SE08_LIVE=1
cd orchestrator && npx vitest run tests/evals/se08-cursor-live.test.ts
```

## Mock golden metrics (deterministic)

| Metric | Value |
|--------|-------|
| Task Success (mock decisions) | 8/8 PASS |
| Invalid Decisions | 0 |
| Scope / shell escalation rejected in expects | covered by c7/c8 |
| Human Interventions | none (mock) |
| Latency / tokens | NOT_MEASURED (mock) |

## Live classification (honest)

| Case | Status |
|------|--------|
| Adapter unit | PASS |
| AgentExecutor ↔ Cursor (live) | BLOCKED (auth) |
| Workspace agentic | NOT_MEASURED |
| Real tests via Cursor edits | NOT_MEASURED |
| Repair / Replan via Cursor | NOT_MEASURED |
| Security live | NOT_MEASURED (unit covers mapping) |

## Autonomy update

| Axis | Value |
|------|-------|
| Maximum Deterministic Autonomy | L3 (unchanged; SE-07) |
| Maximum Live-LLM Autonomy (Cursor) | **NOT_MEASURED** — integration ready, auth blocked |
| EvolveLoop Sandbox | NOT_IMPLEMENTED |
| Cursor Sandbox | optional; not exercised live |
| A03 with reasoning_only | PASS (by design) |
| A03 with agentic_workspace | LIMITED (documented) |

## Proven vs not proven

**Proven:** CursorReasoningProvider adapter, auth fail-closed, tools=[] reasoning_only mapping, AgentExecutor integration with MockCursor, golden suite, factory wiring (`REASONING_PROVIDER=cursor`).

**Proven with Cursor (live):** none in this environment (auth unavailable).

**Not proven:** live MiniCRM completion, live quality metrics, agentic A03 guarantees, Cursor sandbox effectiveness.
