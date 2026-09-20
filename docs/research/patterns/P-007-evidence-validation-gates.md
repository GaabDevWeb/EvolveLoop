# P-007 — Evidence / validation gates before done

```text
PATTERN
Observed in: security-audit-skill tri-verdict+ledger, superpowers verify-before-complete (LOCAL_CORPUS);
  aider lint/test reflect, crewai task guardrails, pydanticai validators, openai structured final (EXTERNAL)
Differences:
  - Schema/deterministic validators vs LLM judges vs harness evals (SWE-bench) vs OTel spans
Common mechanism: Require structured proof artifacts before marking a step/task complete
Why it appears repeatedly: LLM self-report of “done” is unreliable
Evidence: CROSS §4 observation 4; DO-NOT-CHANGE Evidence Bus; CROSS-INVESTIGATION-REVIEW §1.7 / §8 false memory≡evidence
Applicability: ALREADY_PRESENT Evidence Bus — ADAPT ledger/verdict shapes; REJECT tracing-as-SSOT
Decision: ALREADY_PRESENT | ADAPT
Confidence: HIGH
Supports Principle: PRINCIPLE-04
```
