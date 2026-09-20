# V2 A03 — Runtime-Enforced Gates

## Problem

Documented gates (grill-me, image-to-code, wiki grounding, evidence, risk/confirmation)
were largely **prompt-bound** or **eval-only**. `PolicyEngine` / `CapabilityAuthority` /
`skill-gates.ts` existed, but denial did not reliably prevent `ProviderRuntime.execute`
on the public `ExecutionEngine` path — especially for mock providers and post-A04 replans.

## Existing Gate Architecture

| Mechanism | Exists | Evaluated | Enforced (pre-A03) | Runtime path |
|-----------|--------|-----------|--------------------|--------------|
| PolicyEngine | Yes | Yes (retries, gate skip, strategy) | Partial | Scheduler / engine |
| CapabilityAuthority | Yes | Yes | Only DeterministicProvider | Provider-local |
| skill-gates.ts | Yes | Eval helpers | No | Observe harness |
| Evidence validation | Yes | Post-execute | Yes (blocks node) | `processRunResult` |
| Wiki grounding | Backend exists | Consult-before-schedule optional | No as required gate | KnowledgeStore |
| Grill-me / image-to-code | Decision helpers | Yes | No | Prompt / docs |
| Confirmation | Authority `confirm` | Yes | Provider-local | Deterministic only |
| Risk tiers | `RiskTier` in skill-gates | Grill-me input | Via grill-me when wired | RuntimeGateContext |

## Existing Policy Architecture

- `PolicyEngine.resolve` → `ExecutionPolicy` (retries, parallelism, provider_strategy, gate_depth).
- Decision ≠ enforcement: policy can skip IR gate nodes (`gateEnabled`) without authorizing workers.
- Orphan fields (not A03 scope): `cost_budget`, `feature_timeout`, `fail_fast`,
  `provider_strategy_fallback` — still not hot-path enforced → **GAP-B01**.

## Authorization Boundary

```text
Agent proposes (IR)
      ↓
Capability selection (Registry)
      ↓
evaluatePreExecute  ← UNIVERSAL PRE_EXECUTE (A03)
      ↓
ALLOW | DENY | CONFIRMATION_REQUIRED | DEFERRED
      ↓
Scheduler.schedule → Provider.execute   (only on ALLOW)
```

Module: `orchestrator/src/gates/runtime-gates.ts`  
Wired in: `ExecutionEngine` before every `scheduler.schedule`.

Defaults: permissive `authorityContext` when omitted (V1 compat). Restrictive callers
pass `authorityContext` / `gateContext`.

## Gate Evaluation Pipeline

Order (fixed):

1. Capability deny-list (`gateContext.denied_capabilities`)
2. Knowledge grounding requirement (status attestation)
3. AGENT_ATTESTED skill gates (grill-me, image-to-code) when context supplied
4. CapabilityAuthority (path escape, shell/write/network, confirmation)
5. ALLOW → schedule with `authority_context` on `ExecuteRequest`

## Pre-Execute Gates

| Gate | Kind | Fail-closed |
|------|------|-------------|
| capability_deny_list | DETERMINISTIC | Yes |
| knowledge-grounding | DETERMINISTIC (status) | When `required` |
| grill-me | AGENT_ATTESTED | When required by risk/phase rules |
| image-to-code | AGENT_ATTESTED | When `image_attachment` |
| capability_authority | DETERMINISTIC / HUMAN | Path deny; confirm for write/shell |

## Post-Execute Gates

| Gate | Path |
|------|------|
| Evidence / DoD validation | `validateEvidence` in `processRunResult` |
| Gate node verdict | `gate_rejected` → fail + optional orchestrator block |

## Confirmation

- Structured: `CONFIRMATION_REQUIRED` → node `blocked`, telemetry `GateConfirmationRequired`,
  engine stops (classified POLICY_BLOCKED for replan purposes — no bypass replan).
- Bound to `plan_hash` via `confirmedForPlanHash`.
- Default `inheritConfirmationAcrossReplan: false` — replan invalidates confirmation.

## Replan Revalidation

Every A04-applied plan gets a new `currentPlanHash`. Pre-execute runs again.
Candidate IRs that only contain denied capabilities are rejected at apply time
(`POLICY_BLOCKED`) before provider execution.

## Evidence

- Pre-execute decisions → `buildAuthorityEvidence` (+ assumptions: execution_id, policy_id).
- Post-execute: incomplete / failed DoD / fake status → node fail (not silent allow).
- Agent-generated artifacts are not auto-trusted; status must be `complete` with DoD checks.

## Telemetry

Events (existing EventBus): `GateEvaluated`, `GateAllowed`, `GateDenied`,
`GateConfirmationRequired`, `PolicyDenied`, `AuthorizationDenied`.

## Adversarial Validation

See `tests/integration/a03-runtime-gates.test.ts`:

- Deny-list / mock under deny → execute count 0
- Grill-me / image / grounding required → block
- Workspace path escape → AUTHORITY_DENIED
- Fake incomplete evidence → run fails
- A04 replan to forbidden capability → forbidden provider never executes
- Confirmation plan-hash revalidation

## External Executor Limitations

```text
EXTERNAL_EXECUTION_LIMITATION
```

Pre-execute runs **before** `JobFileExecutor` writes a job (schedule path).  
Once a job is on disk, an external agent completing the job is outside the TS
authorization boundary; resume still applies post-execute evidence validation.
Do not claim full sandbox or full external-agent enforcement.

Path authorization ≠ sandbox: workspace root + path normalization only.
`sandbox = NOT IMPLEMENTED`.

## Remaining Policy Gaps

| Field / surface | Status | Milestone |
|-----------------|--------|-----------|
| cost_budget | Declared, not enforced | B01 |
| feature_timeout | Declared, not enforced | B01 |
| fail_fast | Declared, not enforced | B01 |
| provider_strategy_fallback | Declared, not enforced | B01 |
| Direct `ProviderRuntime.execute` outside engine | Possible (internal/test) | Documented — public path is Engine |
| LLM/agent semantic gate content | AGENT_ATTESTED status only | Not fake-deterministic |

## Test Evidence

```text
npm test -- tests/integration/a03-runtime-gates.test.ts
→ 19/19 passing (recorded with full suite)
```

## Autonomy Claim (factual)

```text
Runtime-enforced gates: IMPLEMENTED (hot path)
Policy denial → provider not executed: PROVEN (mock execute count)
Replan revalidation: PROVEN (A04×A03)
Confirmation: STRUCTURED (plan-hash bound)
Evidence gate: ENFORCED (post-execute)
Grounding gate: ENFORCED when gateContext.grounding.required
Workspace authority: PASS (path escape)
External executor: LIMITED
Mock policy bypass: IMPOSSIBLE on Engine path
Sandbox: NOT IMPLEMENTED
```
