# GAP-004 — Stuck / unproductive loop detector

```text
EXTERNAL_MECHANISM   OpenHands StuckDetector (repetitive unproductive loops)
PROBLEM_SOLVED       Halt agents that thrash without progress
OUR_CURRENT_MECHANISM Loop bounds PARTIAL; no dedicated stuck heuristic documented in baseline
EQUIVALENCE          ABSENT–UNKNOWN
GAP                  Progress signals (file changes, test deltas, unique tool traces) + halt/escalate
TRADE_OFF            False stuck vs wasted spend
EVIDENCE             targets/external/openhands M05 PROTOTYPE; related aider apply-reflect / swe limits
APPLICABILITY        Autonomous coding jobs
DECISION             PROTOTYPE
```

**Provenance:** EXTERNAL openhands (primary); related EXTERNAL aider/swe-agent.
**Confidence:** MEDIUM (sparse independent implementations — frequency low, still valuable).
