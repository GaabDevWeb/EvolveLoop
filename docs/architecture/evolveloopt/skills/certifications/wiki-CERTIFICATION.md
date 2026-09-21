# wiki — SKILL CERTIFICATION

## Identity
- **skill_id:** wiki
- **version:** 1.2.0
- **path:** /home/gaab/Downloads/CursorSKILLS/.cursor/skills/wiki
- **source:** .cursor/skills
- **purpose:** Wiki — Context Engineer (grounding / context pack)

## Classification
HARD-GATE

## Discovery
TESTED — source path inspected / registry relevance noted.

## Activation
See classification (hard-gate / conditional / LLM / deterministic).

## Preconditions / Dependencies
See SKILL.md / provider.yaml at path above. Declared deps not re-executed unless deterministic.

## Inputs / Outputs / Capabilities
Contract from SKILL.md / provider.yaml. Not re-authored here.

## Side Effects
Agent/LLM mediated — not fully observed in this campaign

## Authority / Scope
- Authority: TESTED
- Scope: NOT_TESTED

## Happy Path
NOT_TESTED

## Negative Tests
TESTED

## Adversarial Tests
TESTED

## Failure Injection
NOT_TESTED

## Crash/Recovery
N/A

## Replay / Idempotency
N/A or Engine-level

## Evidence
NOT_TESTED

## Telemetry
NOT_TESTED

## Composition
NOT_TESTED

## Live LLM requirement
NOT_TESTED — CURSOR_API_KEY MISSING; Ollama is not a workspace coding agent for most skills.

## Observed Result
**FAILED**

## Limitations
- Hard-gate largely AGENT/POLICY attested; TS engine enforced=false for most (wiki/grill-me/image docs)

## Findings
- FINDING: grounding.status caller-attested similarly to pre-fix grill-me pattern when supplied in gateContext
- FINDING: grounding.status=satisfied accepted without artifact verification (caller attestation)

## Final Certification
`FAILED`

Validated dimensions: discovery, negative, adversarial, authority
