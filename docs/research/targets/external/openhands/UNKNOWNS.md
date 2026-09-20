# UNKNOWNS — OpenHands (TARGET_RESEARCH)

Date: 2026-09-18  
Policy: no invent; no install/run.

## Access / method limits

| Item | Status |
|------|--------|
| Local clone of full repos | NOT DONE |
| Install / execute agents | FORBIDDEN this run |
| Full source read of all packages | PARTIAL (API tree + selected raw files) |
| GitHub API | Rate-limited mid-session on some directory listings |
| Runtime MEASURED behavior | NONE |

## Architectural UNKNOWNS

1. **Post-split location of evaluation harness**  
   Docs describe `evaluation/benchmarks/`, `openhands/core/main.py`, `CodeActAgent` — layout consistent with legacy Python app. Whether that harness still lives in a sibling repo, git history branch, or Canvas-era path is **UNKNOWN**.

2. **Default production security stack for Agent Canvas**  
   Which analyzer (`LLMSecurityAnalyzer` vs Ensemble vs ToolShield/GraySwan) and which confirmation policy ship as defaults in Canvas Docker images — **UNKNOWN** without config/source deep-dive + run.

3. **Exact mediation path tools ↔ Docker sandbox in agent-server**  
   Modules `docker_runtime/{mediation,provisioning,proxy,registry}.py` OBSERVED by path; control-flow details **UNKNOWN** (not fully read).

4. **ACP protocol surface**  
   Canvas claims ACP-compatible third-party agents. Wire protocol, auth, event mapping — **UNKNOWN** (only README-level DOCUMENTED).

5. **Automation repo internals**  
   SDK README assigns scheduling/webhooks to `OpenHands/automation` — not audited.

6. **Critic model availability / methodology reproducibility**  
   Critic is experimental and often tied to All-Hands LLM proxy. Independent self-host reproducibility — **UNKNOWN**.

7. **SWE-Bench “77.6” badge**  
   README badge exists; methodology, commit, harness version for that number — **not verified** here (do not treat as MEASURED architecture evidence).

8. **Browser isolation guarantees**  
   BrowserToolSet on browser-use: network egress policy, cookie/credential isolation relative to Docker workspace — **UNKNOWN**.

9. **MegaBrain MCP equivalence**  
   Depth of CursorSKILLS/orchestrator MCP binding vs OH MCP translation — **UNKNOWN** (`GAP: needs audit of CursorSKILLS`).

10. **MegaBrain secrets / sandbox present state**  
    Baseline marks Sandbox UNKNOWN–PARTIAL; secrets depth UNKNOWN — external DEFER decisions depend on internal audit.

## CONFLICTS

```text
CONFLICT:
  claim: Primary architecture of “OpenHands”
  source_a: docs.openhands.dev V1 SDK + sandboxes + Agent Canvas (llms.txt excludes Legacy V0)
  source_b: docs pages usage/architecture/runtime + backend (CodeAct + ActionExecutionServer)
  difference: Two generations (SDK/Workspace/Agent Server vs Runtime/EventStream/CodeAct)
  resolution: UNRESOLVED as single diagram — treat as dual-generation official corpus;
              prefer V1 SDK for “current” claims; cite V0 explicitly as legacy
```

```text
CONFLICT:
  claim: Name of execution environment
  source_a: V1 “sandbox” terminology
  source_b: Legacy “runtime” + env var RUNTIME still used in migration
  difference: Naming / config drift
  resolution: prefer_primary V1 docs note; record RUNTIME as transitional knob
```

```text
CONFLICT:
  claim: Where tools execute relative to workspace
  source_a: SDK overview — “Tools run alongside the agent in whatever environment workspace configures”
  source_b: Legacy runtime — actions sent over REST into ActionExecutionServer inside container
  difference: Co-located tools vs remote action server
  resolution: Generation-dependent; do not merge into one mechanism without labeling V0/V1
```

## Questions for follow-up (optional)

- Map `OpenHands/OpenHands` (Canvas) package.json → which SDK/agent-server versions it pins.  
- Locate current eval harness repo path via GitHub code search (authenticated).  
- Read `docker_runtime/mediation.py` and security guide defense-in-depth examples end-to-end.  
- Audit MegaBrain Policy Engine vs ConfirmRisky mapping (ARCHITECTURE_GAP_ANALYSIS mode).
