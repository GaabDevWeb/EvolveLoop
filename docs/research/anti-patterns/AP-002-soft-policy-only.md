# AP-002 — Soft-policy-only (prompt without enforcement)

```yaml
id: ANTI-002
title: Soft-policy-only
problem: Safety and process rules live only in natural language; models can ignore them.
anti_pattern: Rely on CLAUDE.md/skill text ("always ask") without hooks/Policy/tool allowlists.
observed_in:
  - EXTERNAL/claude-code (anti soft-policy-only)
  - Contrast: EXTERNAL/claude-code CC-HOOKS, EXTERNAL/cursor CUR-HOOKS, LOCAL/superpowers bootstrap
evidence:
  - claim: Claude Code dossier warns soft-policy-only; hooks exist precisely because prompts are insufficient.
    label: DOCUMENTED
    source: targets/external/claude-code/MECHANISMS.yaml anti_patterns_observed_or_warned
why_it_happens: Fast to author prose; enforcement requires host integration.
negative_effects:
  - Silent policy bypass
  - False compliance in evals
failure_modes:
  - Skills never invoked
  - Shell runs despite "ask first"
alternatives:
  - Lifecycle hooks as Policy adapters (P-006)
  - Plan|Act tool whitelists (P-002)
our_current_state: Policy Engine PRESENT; hooks PARTIAL — residual risk if skills are soft-only
applicability: Any process skill / security skill
decision: ADAPT (enforcement) / REJECT (soft-only as architecture)
confidence: HIGH
```
