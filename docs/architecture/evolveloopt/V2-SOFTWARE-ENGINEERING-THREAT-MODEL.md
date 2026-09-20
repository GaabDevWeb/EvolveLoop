# V2 Software Engineering Threat Model

**Status:** DESIGNED  
**Branch:** `evolve-v2`  
**Builds on:** `V2-AGENT-SECURITY-MODEL.md`, A03, B01, context redaction  

Assumption: PRD, repo content, dependencies, and retrieved knowledge are **untrusted data**, not authority.

---

## Prompt Injection

| Item | Detail |
|------|--------|
| Threat | PRD/docs/skills say “ignore policy / disable gates / write outside workspace” |
| Impact | Attempted policy bypass or scope explosion |
| Control | AgentContextAssembler `context_authority: none`; A03 still enforces; adversarial live evals |
| Residual | Model may propose forbidden actions — Runtime must DENY (proven path) |

---

## Repository Injection

| Item | Detail |
|------|--------|
| Threat | Malicious README/tests/scripts in workspace steer agent |
| Impact | Unsafe commands, path traversal, secret exfil via “docs” |
| Control | Task file_scope; command allowlists; no whole-repo dump; path escape checks (CapabilityAuthority) |
| Residual | Social-engineering via legitimate-looking tests |

---

## Dependency Supply Chain

| Item | Detail |
|------|--------|
| Threat | Agent proposes `npm install evil@latest` |
| Impact | Arbitrary code at install/build time |
| Control | Install/build as **governed capabilities**; allowlist/pin policy; RISK_BASED_CONFIRM / HUMAN for new deps |
| Residual | Compromised allowed package versions |

---

## Scope Escalation

| Item | Detail |
|------|--------|
| Threat | Task agent edits unrelated modules / other tasks’ files |
| Impact | Corruption, conflict, privilege creep |
| Control | file_scope + ownership; role ≠ authority; delegation depth limits |
| Residual | Spec bugs that over-grant scope |

---

## Credential Leakage

| Item | Detail |
|------|--------|
| Threat | Secrets enter AgentExecutionRequest, prompts, logs, evidence |
| Impact | Exfiltration to model provider / artifacts |
| Control | Forbidden-key filters; secrets from env/credential provider only; redact telemetry |
| Residual | Secrets in user code accidentally retrieved |

---

## Workspace Escape

| Item | Detail |
|------|--------|
| Threat | Path traversal / symlink / write outside roots |
| Impact | Host compromise |
| Control | CapabilityAuthority workspace roots; A03; future sandbox (NOT IMPLEMENTED today) |
| Residual | Without process sandbox, OS-level escape risk remains **GAP** |

---

## Fake Validation

| Item | Detail |
|------|--------|
| Threat | Implementation Agent self-attests success / fabricates evidence ids |
| Impact | False DELIVERY_COMPLETE |
| Control | Independent ValidationResult; evidence must be Runtime/provider-backed; reject unknown evidence refs |
| Residual | Collusion if validator shares same compromised backend (mitigate with offline checkers) |

---

## Test Bypass

| Item | Detail |
|------|--------|
| Threat | Delete/skip tests, weaken assertions, fake green |
| Impact | Undetected defects |
| Control | DoD requires listed tests; Validation cross-checks coverage; policy on mutating test dirs |
| Residual | Subtle assertion weakening |

---

## Runaway Execution

| Item | Detail |
|------|--------|
| Threat | Infinite repair/replan/agent loops; fork bombs via scripts |
| Impact | Resource exhaustion |
| Control | B01 budgets/timeouts/max_replans/iterations; fail_fast; no LLM-owned while(true) |
| Residual | Single capability that is inherently expensive |

---

## Git Destruction

| Item | Detail |
|------|--------|
| Threat | `reset --hard`, force push, delete branches, rewrite history |
| Impact | Irrecoverable loss |
| Control | Git capabilities allowlist; deny destructive ops by default; delivery commits append-only preferred |
| Residual | Human-approved break-glass |

---

## Deployment Abuse

| Item | Detail |
|------|--------|
| Threat | Auto-deploy to production from SE loop |
| Impact | Outage, data loss, compliance breach |
| Control | Separate risk ladder BUILD→…→DEPLOY; production = HUMAN_REQUIRED until formal gate |
| Residual | Misconfigured “staging” that is actually prod |

---

## Additional notes

### Build / test as code execution
`npm test` / `npm run build` execute arbitrary project code — same family as shell. Require workspace, timeout, network policy, evidence.

### Package / publish
Higher than build; treat like deploy for policy severity.

### No self-escalation
Agents cannot modify own policy, budget, permissions, role, or gates during normal SE execution.

### Self-evolution
Modifying EvolveLoop itself is **out of band** (EvolveLoop longitudinal / separate workflow), not a SE factory task.

### Conflict handling
Prefer explicit conflict failure over last-writer-wins; resolve only with evidence-backed repair.
