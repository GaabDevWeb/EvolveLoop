# UNKNOWNS — agency-agents (`tgt-agency-agents`)

Date: 2026-09-18  
Mode: TARGET_RESEARCH · source_type: LOCAL_CORPUS  
Access: READ-ONLY (no script execution / no app install)

Inherited audit IDs preserved where still valid.

---

## Open unknowns

| ID | Unknown | Why it matters | How to resolve (future) | Blocking? |
|----|---------|----------------|-------------------------|-----------|
| U-AA-01 | Canonical **semver / release version** of this roster checkout | Reproducibility / temporal pinning | Tag map; compare GitHub Releases; app release coupling | No for architecture class |
| U-AA-02 | **agency-agents-app** source, install contracts, offline sync with `tools.json` | Whether app adds runtime beyond file copy | Clone/read `msitarzewski/agency-agents-app` (separate target) | Yes for “product architecture” claims |
| U-AA-03 | README / marketing **agent counts** vs authoritative ship set | Avoid false inventory | Diff README tables ↔ `find` of frontmatter files (this report used 279 OBSERVED) | Partially closed: **279** on disk |
| U-AA-04 | Exhaustive proof **zero** unit tests under `testing/` | Audit conflict | Full listing (done: 9 persona md only) + confirm no hidden test runners there | **Closed** for this checkout — see Conflicts |
| U-AA-05 | Runtime behaviour of **generated** Hermes plugin / other convert outputs | Router quality, tool schemas, failure modes | Run `convert.sh --tool hermes` in isolated sandbox (out of scope here) | Medium for M-AA-05 confidence |
| U-AA-06 | Whether each **host** enforces persona boundaries (isolation, tool ACL, subagent API) | Real multi-agent vs prompt cosplay | Per-host RE (Claude Code agents, Cursor rules, Codex toml, …) | High if claiming multi-agent system |
| U-AA-07 | Effectiveness of NEXUS / Orchestrator **in production** (measured) | Utility of M-AA-06/07 | User studies / MEASURED evals — none in corpus | High for ADOPT |
| U-AA-08 | Which MCP memory servers Agency authors actually used | Completeness of M-AA-09 | Examples only name generic tools | Low |
| U-AA-09 | Drift between **strategy** agent names and current roster slugs | Broken activation prompts | Diff nexus matrix vs divisions | Medium for NEXUS ops |
| U-AA-10 | Temporal evolution of roster size / schema (416 commits, 0 tags) | Pattern mining over time | Git archaeology pass (TEMPORAL_RESEARCH_CANDIDATE) | No for Level-1 snapshot |

---

## Conflicts

### C-AA-01 — `testing/` semantics

```yaml
conflict:
  id: C-AA-01
  claim_a: "agency-agents/testing/ is a test suite"
  source_a: directory name
  claim_b: "contents are agent persona markdown files (QA specialists)"
  source_b: >
    OBSERVED 9 *.md with YAML name: frontmatter;
    divisions.json includes testing as a division;
    CONTRIBUTING excludes strategy/ and integrations/ as non-divisions (not testing/)
  difference: naming vs role
  resolution: prefer_primary
  resolved_as: PERSONA_DIVISION_NOT_UNIT_TESTS
  actual_tests_location: scripts/test-*.sh and test-hermes-plugin.py (install/convert integrity)
```

### C-AA-02 — “Multi-agent system” language vs delivery

```yaml
conflict:
  id: C-AA-02
  claim_a: "The Agency / NEXUS is a synchronized multi-agent operational system"
  source_a: README marketing; strategy/nexus-strategy.md rhetoric
  claim_b: "Repository ships non-executable Markdown agents + install/convert scripts"
  source_b: SECURITY.md; absence of app/runtime packages; orchestrator is a persona
  difference: product narrative vs artifact class
  resolution: prefer_primary
  resolved_as: ROSTER_PLUS_HOST_MEDIATED_ACTIVATION
  note: Multi-agent execution, if any, is host-dependent (U-AA-06)
```

### C-AA-03 — Hermes agent count in README stub vs local generation

```yaml
conflict:
  id: C-AA-03
  claim_a: "Generated agent count: 279" (integrations/hermes/README.md)
  source_a: committed README (may lag)
  claim_b: "Live generated plugin not in checkout"
  source_b: .gitignore + absent agency-agents-router/
  difference: documented count vs unverified fresh generate
  resolution: UNRESOLVED_for_fresh_generate
  supporting: OBSERVED on-disk persona count also 279 (consistent with stub)
```

---

## Access / method limitations

- Did not execute `install.sh`, `convert.sh`, or any `test-*` (security / investigator mandate).
- Did not fetch remote app or regenerate integrations.
- Did not measure token costs or quality of persona outputs.
- Secondary sources (stars, “battle-tested”) treated as **non-technical**.
