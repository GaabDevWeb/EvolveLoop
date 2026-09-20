# GAP-003 — Named permission profiles (FS+network posture)

```text
EXTERNAL_MECHANISM   Codex permission profiles (beta) composing sandbox + approval
PROBLEM_SOLVED       Reuse one named posture instead of ad-hoc knobs; avoid "full_access"
OUR_CURRENT_MECHANISM Policy Engine (documented+implemented); profile packaging unclear
EQUIVALENCE          PARTIAL
GAP                  Named, testable postures with refuse-if-unenforceable semantics
TRADE_OFF            Simpler UX vs expressive profiles
EVIDENCE             targets/external/codex M04 PROTOTYPE; AP04 full_access_never
APPLICABILITY        Policy authoring for coding agents
DECISION             PROTOTYPE → ADAPT into Policy (not a second engine)
```

**Provenance:** EXTERNAL codex.
**Confidence:** MEDIUM
