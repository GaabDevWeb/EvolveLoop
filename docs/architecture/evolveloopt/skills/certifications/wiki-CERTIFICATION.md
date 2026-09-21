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
Hard-gate / knowledge grounding via Runtime PRE_EXECUTE.

## Preconditions / Dependencies
See SKILL.md. TS engine enforces grounding via on-disk attestation artifact (not caller status).

## Inputs / Outputs / Capabilities
Contract from SKILL.md. Gate input: `gateContext.grounding` with `artifact_path` + bindings.

## Side Effects
Agent/LLM vault CLI live — not fully observed in this campaign (limitation).

## Authority / Scope
- Authority: TESTED (artifact-verified grounding)
- Scope: NOT_TESTED (agent vault)

## Happy / Negative / Adversarial
- Happy: TESTED — valid `knowledge-grounding` artifact + non-empty `source_ids` → ALLOW
- Negative: TESTED — missing artifact / absent bindings → DENY
- Adversarial: TESTED — `grounding.status=satisfied` alone → DENY (RT-SKILL-WIKI-01 closed)

## Evidence / Telemetry / Recovery / Composition / Live
- Evidence: NOT_TESTED (agent evidence files)
- Telemetry: NOT_TESTED
- Recovery: N/A (gate)
- Composition: NOT_TESTED (orquestrar)
- Live: NOT_TESTED (no vault CLI live backend in harness)

## Limitations
- Behavioral wiki vault CLI live may still be NOT_MEASURED
- Attestation plantable by workspace writer (no HMAC) — residual shared with grill-me model

## Findings
(none open for caller-attested grounding bypass)

## Final status
`CERTIFIED_WITH_LIMITATIONS`
