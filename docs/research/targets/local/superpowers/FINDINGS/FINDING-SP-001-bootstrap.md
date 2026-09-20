```yaml
id: FINDING-SP-001
title: "Session bootstrap is the entire multi-harness integration"
category: Skills / Context Loading / Extensibility

problem: >
  Shipping SKILL.md files without forcing a meta-skill into session context
  leaves skills inert — present on disk, never invoked.

mechanism: >
  At SessionStart (or first user message / post-compaction on capable hosts),
  inject the full using-superpowers skill wrapped in <EXTREMELY_IMPORTANT>,
  with optional per-harness tool mapping appended. Porting a new harness =
  thin injector + tool map + install artifact — not rewriting skills.

observed_in:
  - superpowers

evidence:
  - claim: hooks/session-start reads using-superpowers and emits platform-specific JSON context fields
    label: OBSERVED
    source: hooks/session-start
  - claim: OpenCode plugin injects bootstrap into first user message with cache and double-injection guard
    label: OBSERVED
    source: .opencode/plugins/superpowers.js
  - claim: Pi re-injects on session_start and session_compact
    label: OBSERVED
    source: .pi/extensions/superpowers.ts
  - claim: "The bootstrap is the entire integration"
    label: DOCUMENTED
    source: docs/porting-to-a-new-harness.md
  - claim: Acceptance test requires brainstorming auto-trigger on "Let's make a react todo list"
    label: OBSERVED
    source: CLAUDE.md

why_it_exists: >
  Early history showed hook/bootstrap shape thrash from day one; Oct 2025
  commit restored using-superpowers because host bootstrap alone did not
  trigger skills effectively.

benefits:
  - Deterministic activation across sessions
  - Same skill library reusable across harnesses
  - Compaction recovery where host supports re-hook

costs:
  - Token tax every session
  - Per-platform injection format maintenance
  - Failure if host lacks SessionStart/compaction hooks (Hermes caveat)

failure_modes:
  - Missing injector → dead skills
  - Wrong JSON field → silent no-op or double inject
  - Subagent sessions incorrectly receiving controller bootstrap (fixed in later OpenCode commits beyond HEAD — note only)

alternatives:
  - User must /skill manually each time (rejected by project)
  - Put all methodology in AGENTS.md permanently (context bloat, no progressive load)

conditions: Coding-agent interactive sessions with plugin/hook support

technical_factors: Thin adapters; zero-dep preference; marker-based idempotency
product_factors: Marketplace install must carry bootstrap
adoption_factors: Multi-marketplace distribution

our_current_state: Hooks PARTIAL; skills IMPLEMENTED; no proven universal meta-skill injector (GAP audit)
equivalence: PARTIAL
gap: Canonical sessionStart mandatory skill-check injection across Agent System entrypoints
applicability: High for agent chat; lower for headless orchestrator jobs

utility: USEFUL
decision: ADAPT
confidence: HIGH
```
