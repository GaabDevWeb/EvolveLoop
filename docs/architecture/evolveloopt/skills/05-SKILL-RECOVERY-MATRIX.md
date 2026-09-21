# 05 — Skill × Recovery Matrix

| Skill | Crash before | During | After effect | Checkpoint | Replay | Result |
|-------|--------------|--------|--------------|------------|--------|--------|
| filesystem primitives | N/A skill-level | N/A | OS durable | Engine B04 | idempotent write | LIMITED to Engine |
| grill-me / image-to-code | DENY safe | N/A | no effect on DENY | N/A | stale artifact DENY | PASS gate recovery semantics |
| LLM skills | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | NOT_MEASURED | — |
| test-autonomous-write | a02 covers e2e | partial | file left | Engine | re-run may overwrite | LIMITATIONS |
