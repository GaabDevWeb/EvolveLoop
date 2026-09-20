# GAP-001 — OS / workspace sandbox enforcement

```text
EXTERNAL_MECHANISM   OS-enforced command/workspace sandbox (Codex sandbox, OpenHands workspace, SWE-ReX, Claude Bash sandbox, OpenAI SandboxAgent)
PROBLEM_SOLVED       Bound what agent-spawned commands can read/write/network; reduce host blast radius
OUR_CURRENT_MECHANISM Policy Engine + host IDE constraints; orchestrator sandbox UNKNOWN–PARTIAL (baseline)
EQUIVALENCE          PARTIAL → closer to NONE for OS enforcement owned by MegaBrain
GAP                  No refuse-if-unenforceable posture; unclear what Cursor already enforces vs what we assume
TRADE_OFF            Strong isolation vs local DX and MCP host integration complexity
EVIDENCE             OUR-SYSTEM-BASELINE Sandbox UNKNOWN–PARTIAL; dossiers codex/openhands/swe-agent/claude-code PROTOTYPE/ADAPT
APPLICABILITY        High for any shell/MCP side effects
DECISION             PROTOTYPE
```

**Provenance:** EXTERNAL mechanisms; LOCAL security-audit M09 also DEFER/UNKNOWN sandbox.
**Confidence:** HIGH that gap exists; MEDIUM on feasible enforcement inside Cursor host.
