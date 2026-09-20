# AP-007 — Memory / auto-memory as SSOT pollution

```yaml
id: ANTI-007
title: Memory pollution / auto-memory as SSOT
problem: Unbounded write-back of "learnings" becomes silent authority that overrides project knowledge and policy.
anti_pattern: Treat auto-memory or vendor unified memory modules as system source of truth.
observed_in:
  - EXTERNAL/claude-code (auto-memory-as-ssot warning; CC-AUTOMEM DEFER)
  - EXTERNAL/crewai (unified memory DEFER)
  - EXTERNAL/roo-code (AP-CONTEXT-POISON related)
evidence:
  - claim: Claude Code dossier warns auto-memory-as-SSOT; DEFER auto memory adoption.
    label: DOCUMENTED
    source: targets/external/claude-code/REPORT.md
why_it_happens: Desire for continuity; conflating episodic notes with Knowledge.
negative_effects:
  - Stale or wrong "facts" stick
  - Undebuggable behavior
failure_modes:
  - Memory overrides GaabWiki grounding
  - Secrets landed in memory stores
alternatives:
  - GaabWiki Knowledge gate
  - Explicit Evidence artifacts
  - Scoped session state ≠ SSOT
our_current_state: Knowledge PARTIAL; episodic mem PARTIAL — do not elevate auto-memory
applicability: Memory feature design
decision: DEFER auto-memory / REJECT as SSOT
confidence: MEDIUM–HIGH
```
