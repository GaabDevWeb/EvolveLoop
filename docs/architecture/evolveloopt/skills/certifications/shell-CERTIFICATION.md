# shell — SKILL CERTIFICATION

## Identity
- **skill_id:** shell
- **version:** UNKNOWN
- **path:** /home/gaab/Downloads/CursorSKILLS/orchestrator/providers/shell
- **source:** orchestrator/providers
- **purpose:** 

## Classification
DETERMINISTIC

## Discovery
TESTED — source path inspected / registry relevance noted.

## Activation
See classification (hard-gate / conditional / LLM / deterministic).

## Preconditions / Dependencies
See SKILL.md / provider.yaml at path above. Declared deps not re-executed unless deterministic.

## Inputs / Outputs / Capabilities
Contract from SKILL.md / provider.yaml. Not re-authored here.

## Side Effects
Observable FS/process effects tested

## Authority / Scope
- Authority: TESTED
- Scope: TESTED

## Happy Path
TESTED

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
TESTED

## Telemetry
N/A

## Composition
NOT_TESTED

## Live LLM requirement
N/A — CURSOR_API_KEY MISSING; Ollama is not a workspace coding agent for most skills.

## Observed Result
**CERTIFIED_WITH_LIMITATIONS**

## Limitations
- shell.execute requires allowShell/confirm — happy path gated by design

## Findings
- —

## Final Certification
`CERTIFIED_WITH_LIMITATIONS`

Validated dimensions: discovery, happy, negative, adversarial, authority, scope, evidence
