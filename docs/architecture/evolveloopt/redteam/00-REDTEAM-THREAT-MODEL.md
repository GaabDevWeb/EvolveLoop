# 00 — RED TEAM Threat Model (Grill-Me adversarial)

**Date:** 2026-09-20  
**Branch:** `evolve-v2`  
**Baseline:** `5edab1ae334a54f4fb2b823209afd7532f8626d6`  
**Wiki grounding:** GAP — `WIKI_ROOT` found but `gaabwiki` CLI module not importable; contracts taken from repo docs as **claims only**.

## Mission stance

Treat EvolveLoop V2 as **hostile and potentially incorrect**. Documentation PASS/PROVEN/COMPLETE are claims. Self-reported success is untrusted.

## Trust boundaries

1. **Agent → Runtime** — Agent proposes; Runtime must authorize.
2. **PRE_EXECUTE → Provider** — DENY must prevent side effect on Engine path.
3. **Caller → gateContext** — Attestation fields are attacker-controlled if caller is.
4. **Provider → Evidence** — Evidence blobs are not cryptographically bound.
5. **FS → Checkpoint** — Recovery trusts local JSON without integrity.
6. **Vendor agentic tools → Workspace** — Outside EvolveLoop A03 (`LIMITED`).
7. **Skill discovery → Registry** — Any `provider.yaml` under agentsRoot may load.

## Fragile hypotheses (grill-me)

| Hypothesis | Why fragile | Attack |
|------------|-------------|--------|
| A03 “universal” | Only Engine schedule path; agentic LIMITED; defaults permissive | Omit workspaceRoot; agentic Cursor |
| Grill-me fail-closed | `evidence_status` trusted; `fail_closed_missing_attestation` **dead code** | Forge satisfied |
| Evidence proves work | `buildWorkerEvidence` auto-pass DoD | Mock/malicious provider |
| Checkpoint recovery integrity | No HMAC; schema-only validate | Inflate accounting / terminal |
| Sandbox | Explicitly NOT_IMPLEMENTED / UNAVAILABLE | Confuse Cursor sandbox with EvolveLoop |
| Skill certified if registered | Discovery ≠ execution ≠ certification | Registry-only claims |
| L3 autonomy | Benchmarks + mocks ≠ live reliability | Live BLOCKED without keys |
| Exactly-once | Documented AT_LEAST_ONCE | Crash mid-effect + resume |

## Privilege escalation surfaces

- CapabilityAuthority defaults `allowWrite/Shell/Network: true` in ExecutionEngine
- Engineering path forces `confirmed: true`
- Autonomous skill `import()` of module from provider.yaml
- AGENT_ATTESTED gates without artifact verification
- Symlink read through workspace into host files (proven)

## State corruption surfaces

- Checkpoint revision/accounting/graph via FS write
- Evidence metadata mutation still validates
- Stale plan_hash confirmation binding gaps when plan_hash absent
- AT_LEAST_ONCE re-execution

## Agent compromise vectors

- README / wiki / test prompt injection
- Tool-result poisoning
- Cross-task context contamination
- Identity spoofing in decision payloads (partially schema-gated)

## External backend compromise

- Malicious/malformed LLM JSON
- Stream interruption
- Auth failure → must fail closed (Cursor without key: BLOCKED correctly)

## Workspace compromise

- Path traversal (resisted when root set)
- Symlink escape (BROKEN at deterministic FS)
- Secret file read (.env) at FS layer despite engineering forbid list
- package.json test script rewrite within scope

## Test blind spots

- Mutations that remove DENY not in CI mutation suite
- Live backends skipped by default
- Hard-gates `ts_engine_enforced: false` for wiki/grill-me/image
- global-skills without provider.yaml invisible to Registry
- Assertions on DENY return without always checking side-effect absence (harness now does for FS)

## Campaign success criteria

Find real bugs OR prove attacks contained with evidence. Returning PASS without attack is failure of the campaign.
