# P-006 — Deterministic lifecycle hooks as enforcement seam

**Pattern:** Code-side hooks/middleware intercept session/tool events to inject, block, or record — because soft instructions are not guarantees.

**Observed In:**
- EXTERNAL: claude-code (CC-HOOKS), cursor (CUR-HOOKS), codex (M13), openai-agents-sdk (M13), microsoft-agent-framework (MAF-MW)
- LOCAL: superpowers (M-BOOTSTRAP SessionStart / plugin transforms)

**Mechanism:** Event points (SessionStart, PreToolUse, stop, etc.) run host scripts or plugin callbacks with structured I/O.

**Problem Solved:** Skills present but never invoked; policy that models can ignore; missing telemetry seams.

**Independent Implementations:** Claude/Cursor hooks.json; Codex lifecycle hooks; OpenAI Runner hooks; Superpowers bootstrap injection across harnesses.

**Benefits:** Determinism; portability of *policy adapters*; bootstrap of process skills.

**Costs:** Platform-specific shapes; double-injection; hook failures can brick sessions; over-hooking.

**Failure Modes:** Soft-policy-only without hooks; hooks that only log; conflicting multi-harness injectors.

**Counterexamples:** Pure library SDKs without host hook surface (app must DIY).

**Evidence:** OBSERVED paths in LOCAL superpowers hooks; DOCUMENTED in Claude/Cursor/Codex dossiers. Confidence HIGH.

**Our Architecture:** Cursor hooks + MegaBrain promote-queue PARTIAL; Policy should own semantics — ADAPT hooks as adapters.

**Applicability:** ADAPT; REJECT replacing Policy with ad-hoc hook soup.

**Confidence:** HIGH
