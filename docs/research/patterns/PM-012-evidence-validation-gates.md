# P-012 — Evidence / validation gates before completion

**Pattern:** Require machine-checkable proof (command output, schema-valid artifacts, lint/test, independent refute) before claiming done or promoting results — not prose “fixed”.

**Observed In:**
- EXTERNAL: aider (lint/test reflect), crewai (task guardrails), pydanticai (validators + ModelRetry), openai-agents (guardrails), swe-agent (lint-gated edit), openhands (critic refinement)
- LOCAL: security-audit-skill (tri-verdict, coverage ledger, independent verification), superpowers (M-VERIFY-GATE), MegaBrain Evidence Bus (baseline)

**Mechanism:** JSON schemas on disk; retry on invalid; separate critic/refute agents; budget reserved for validation.

**Problem Solved:** Premature completion; self-graded success; silent invalid artifacts.

**Independent Implementations:** MegaBrain evidence JSON gates; security-audit Phase 5 material-replace; Aider apply-reflect; PydanticAI output validators; Superpowers verification-before-completion.

**Benefits:** Higher trust; eval-friendly; aligns Agent System lens “Evidence prova”.

**Costs:** Extra steps; flaky tests block; over-formalization for tiny tasks.

**Failure Modes:** Tracing mistaken for evidence; soft checklists; hunter confirms own findings without independent refute.

**Counterexamples:** mattpocock M-NO-EVALS (REJECT as pattern to copy); leaderboard screenshots as proof.

**Evidence:** OBSERVED/DOCUMENTED LOCAL security-audit + baseline; EXTERNAL guardrail/lint loops. Confidence HIGH.

**Our Architecture:** Evidence Bus ALREADY_PRESENT — ADAPT ledger/verdict/critic ideas; REJECT second evidence bus / OTel-as-SSOT.

**Applicability:** ADAPT contracts and skill gates; keep single Evidence plane.

**Confidence:** HIGH
