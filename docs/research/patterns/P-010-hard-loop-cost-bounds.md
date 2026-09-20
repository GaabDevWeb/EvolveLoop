# P-010 — Hard loop / cost / iteration bounds

```text
PATTERN
Observed in: crewai max iter, swe-agent / claude turn limits, openai max_turns, security-audit budget reservation (LOCAL), others PARTIAL (EXTERNAL)
Differences:
  - Token/cost caps vs iteration caps vs reserved budget for critic/validation waves
Common mechanism: Hard stop or degrade when autonomous loops exceed budget — not only soft “please stop” prompts
Why it appears repeatedly: Runaway tool loops are a dominant failure mode
Evidence: CROSS matrix “Hard loop / cost / iter bounds”; CROSS-INVESTIGATION-REVIEW §7.2 budget reservation
Applicability: Baseline PARTIAL — ADAPT explicit caps; audit ours before claiming EQUIVALENT
Decision: ADAPT
Confidence: MEDIUM
Supports Principle: none standalone; complements PRINCIPLE-03/04
```
