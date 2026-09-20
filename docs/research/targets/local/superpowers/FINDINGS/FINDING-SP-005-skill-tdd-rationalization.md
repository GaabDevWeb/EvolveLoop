```yaml
id: FINDING-SP-005
title: "Skills as behavior-shaping code — TDD and rationalization resistance"
category: Skills / Evaluation / Prompt Structure / Developer Workflow

problem: >
  Skill prose that isn't tested under adversarial pressure fails to change
  agent behavior; agents invent exemptions ("too simple", "just this once").

mechanism: >
  writing-skills treats skill authoring as RED-GREEN-REFACTOR with pressure
  scenarios; Red Flags / rationalization tables and "spirit over letter"
  across process skills; CLAUDE.md requires eval evidence for skill behavior
  changes and rejects Anthropic-compliance rewrites without proof; explicit
  skill-request test prompts in tests/.

observed_in:
  - superpowers

evidence:
  - claim: TDD mapping for skill creation with baseline-without-skill
    label: OBSERVED
    source: skills/writing-skills/SKILL.md
  - claim: Contributor rules raise bar for skill content changes
    label: OBSERVED
    source: CLAUDE.md
  - claim: Rationalization tables in using-superpowers, verification, brainstorming, TDD
    label: OBSERVED
    source: skills/*/SKILL.md
  - claim: explicit-skill-requests pressure prompts (skip formalities, I know what SDD means, …)
    label: OBSERVED
    source: tests/explicit-skill-requests/prompts/

why_it_exists: >
  Maintainers treat skills as tuned behavior code; high PR rejection of untested
  rewording; persuasion/rationalization research referenced in early commits.

benefits:
  - Higher chance skills actually bind under stress
  - Shared authoring pattern
  - Clear rejection criteria for drive-by skill PRs

costs:
  - Expensive multi-session evals
  - Contributor friction
  - External evals submodule needed for full loop

failure_modes:
  - Pressure scenarios overfit to one model/harness
  - Tables ignored if not in injected bootstrap path
  - evals/ missing → process documented but not runnable in this corpus

alternatives:
  - Mechanical validators for what can be regex-enforced (writing-skills says prefer automate then)
  - MegaBrain skill evals JSON only without adversarial pressure

conditions: Meta-changes to process skills; high-stakes behavior shaping

technical_factors: Subagent pressure tests; optional drill harness
product_factors: Quality moat / anti-slop
adoption_factors: ADAPT into skill-authoring + eval gates

our_current_state: skill evals PARTIAL; less adversarial pressure culture documented
equivalence: PARTIAL
gap: Default adversarial pressure loop before shipping skill edits
applicability: High for meta-skills

utility: USEFUL
decision: ADAPT
confidence: HIGH
```
