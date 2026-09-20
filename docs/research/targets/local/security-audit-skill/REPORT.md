# Target Report — `security-audit-skill`

| Campo | Valor |
|-------|-------|
| Target | security-audit-skill (`tgt-security-audit-skill`) |
| Category | skills-protocol (Agent Skill + multi-agent audit workflow + schema/validators) |
| Mode | TARGET_RESEARCH |
| Depth | MODERATE |
| source_type | LOCAL_CORPUS |
| Versions examined | Git HEAD `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` (14 commits, 0 tags); semver **UNKNOWN** |
| Access limitations | READ-ONLY; `.cjs` tests **not executed**; Cloudflare fleet harness **NOT_IN_CORPUS** (DOCUMENTED_ONLY) |
| Date | 2026-09-18 |
| Reproducibility of validators | **UNKNOWN** (policy: do not run tests) |

## 1. What exists?

**OBSERVED:** Public Cloudflare repository packaged as an Anthropic-style Agent Skill (`skills/security-audit/`). It is not a runtime framework: orchestration is **prompt + parent-agent procedure**; the only executable artifacts in-corpus are zero-dependency Node validators and their unit tests.

**DOCUMENTED (README):** Seed of Cloudflare’s vulnerability-discovery harness (“Build your own vulnerability harness”); the multi-stage fleet system grew from this skill and is **absent** from this corpus.

Core product surface:

| Layer | Contents |
|-------|----------|
| Skill contract | `SKILL.md` — modes, safety, profiles/budget, 6-phase overview, anti-patterns |
| Phase prompts | `RECONNAISSANCE.md`, `HUNTING.md`, `VALIDATION-AND-REPORTING.md` |
| Domain companions | 10 attack-class markdown packs (core + AI/LLM, web/auth, client, memory/binary, supply-chain, cloud, RPC, availability, data lifecycle, desktop/IPC) |
| Output contracts | `report-schema.json`; parent-owned `findings.json`, `coverage-ledger.json`, prose reports |
| Machine gates | `validate-findings.cjs`, `validate-coverage-ledger.cjs` (+ `.test.cjs`) |

## 2. Architecture map

```text
User request
    │
    ├─ guidance mode ──► selective methodology (no full artifacts)
    │
    └─ full audit mode
           │
           ▼
     Parent (sole writer of shared state)
           │
           ├─ run-metadata.json  (profile, budget, source_ref, status)
           ├─ architecture.md    (~1k word cap)
           ├─ coverage-ledger.json  ◄── validate-coverage-ledger.cjs
           └─ findings.json         ◄── validate-findings.cjs + report-schema.json
           │
     Phase 1  research×N  (map; no file writes)
     Phase 2  general hunters + research coverage critics (waves)
     Phase 3  fresh general verifiers (refute candidates)
     Phase 4  parent writes findings; both validators
     Phase 5  fresh research verifiers (record check; material replace → re-verify)
     Phase 6  derive REPORT.md / FINDINGS-DETAIL.md / NEEDS-VALIDATION.md
           │
     Terminal: complete (validators pass) | incomplete (explicit reason)
```

**Roles (agent-neutral terminology, OBSERVED in SKILL.md):** Parent · Task tool · `research` · `general`. Write isolation: agents write only `scratch/`; retained `artifacts/` via parent-side race-safe promotion procedure (DOCUMENTED in skill; **no harness implementation in corpus**).

## 3. Execution flow

```text
Input: explicit audit/pen-test request (+ optional output dir, profile, budget, scope)
  → Setup: skill dir, target root, source_ref, output dir outside target
  → Budget gate (if set) before any recon agent
  → Recon (parallel research) → architecture.md + seeded coverage ledger → ledger validator
  → Prior-run merge (if compatible ledgers/findings exist)
  → Hunting waves: assign planned units → structured hunter JSON → parent ledger update → validator
  → Post-wave coverage critic (± final-clean critic for standard/deep)
  → Candidate consolidation by fingerprint → independent Phase 3 verifiers
  → findings.json + both validators
  → Phase 5 independent record verification (+ material replacement loop)
  → Phase 6 target-neutral prose derived from verified records only
Final Output: confirmed | needs_validation | rejected records + coverage claim + reports
         OR incomplete run with disclosed gaps (never silent mid-phase stop)
```

Harness fleet execution path: **UNKNOWN** (external, DOCUMENTED_ONLY).

## 4. Mechanisms

| id | problem | mechanism | evidence label | utility |
|----|---------|-----------|----------------|---------|
| M01 | Accidental full-audit / file spam | Dual mode: guidance vs full audit; ask if ambiguous | OBSERVED `SKILL.md` | HIGH |
| M02 | Checklist “vulns” without boundary | Require principal, control, crossed boundary, observable result | OBSERVED principles | HIGH |
| M03 | False confidence / unverifiable claims | Tri-verdict: `confirmed` / `needs_validation` / `rejected`; NV has no severity | OBSERVED schema + validators | HIGH |
| M04 | Hunter confirmation bias | Adversarial validation: hunter ≠ Phase 3/5 verifier; material replace needs new verifier | OBSERVED `VALIDATION-AND-REPORTING.md` | HIGH |
| M05 | Incomplete audit claimed complete | Deterministic coverage ledger + critic waves + incomplete terminal status | OBSERVED ledger + HUNTING | HIGH |
| M06 | Prose/JSON drift | Schema-shaped JSON first; Phase 6 derives prose; validators gate | OBSERVED | HIGH |
| M07 | Severity inflation | overall_severity ≤ demonstrated impact (code-enforced) | OBSERVED `validate-findings.cjs` | HIGH |
| M08 | Unsafe target execution | OS sandbox contract or block execute → `needs_validation` | DOCUMENTED (impl not in corpus) | HIGH |
| M09 | Agent escape / artifact tox | Write isolation + 11-step no-follow promotion | DOCUMENTED procedure in prompts | MEDIUM–HIGH |
| M10 | Domain blindness | Companion attack-class packs selected from recon boundaries | OBSERVED companions | HIGH |
| M11 | Cost overrun / thin evidence | Profiles (quick/standard/deep) + strict agent budget reservation | OBSERVED `SKILL.md` | HIGH |
| M12 | Stale multi-run state | Prior-run carry/revalidate by source comparison + fingerprints | OBSERVED RECON/HUNTING | MEDIUM–HIGH |
| M13 | Platform lock-in | Agent-neutral Parent/Task/research/general mapping | OBSERVED | MEDIUM |
| M14 | Schema gaming / hostile input | Zero-dep schema interpreters, size/depth limits, diagnostic escaping | OBSERVED validators + tests (unread run) | MEDIUM |

## 5. Adoption analysis (separated)

| Factor | Notes | Label |
|--------|-------|-------|
| Technical | Strong contracts for evidence, coverage, independence; validators are real code | OBSERVED |
| Product | Defensive security auditor skill for coding agents | DOCUMENTED |
| Distribution | skills.sh / `npx skills add` GitHub install | DOCUMENTED |
| Ecosystem | Cloudflare security-AI research; blog harness narrative | DOCUMENTED |
| Timing | Short history Jun–Sep 2026; major workflow harden PR | OBSERVED git |
| Community / DX | MIT; email contact; dense but precise prompts | DOCUMENTED / OBSERVED |

Popularidade ≠ mérito: não classificado por stars/adoption.

## 6. Comparison with MegaBrain (per mechanism)

### M03 Tri-verdict + schema gate
```text
EXTERNAL_MECHANISM   confirmed | needs_validation | rejected + report-schema + validate-findings
PROBLEM_SOLVED       Separate certainty from priority; block severity without impact; machine-check output
OUR_CURRENT_MECHANISM Evidence Bus JSON gates; Agent Contracts; skill evals (PARTIAL)
EQUIVALENCE          PARTIAL
GAP                  MegaBrain has evidence gates but not this security-specific tri-verdict / severity≤impact code
TRADE_OFF            Domain-specific richness vs generic evidence types
EVIDENCE             OBSERVED schema/validators vs baseline Evidence Bus DOCUMENTED+IMPLEMENTED
APPLICABILITY        High for any high-stakes structured finding pipeline
DECISION             ADAPT
```

### M04 Independent adversarial verification
```text
EXTERNAL_MECHANISM   Fresh verifier agents; Phase 5 re-check; material replacement re-verify
PROBLEM_SOLVED       Confirmation bias / self-grading
OUR_CURRENT_MECHANISM PDA roles plan/exec/gate/explore/critic/librarian
EQUIVALENCE          SUBSTANTIAL (role separation idea); PARTIAL (security-specific refute protocol)
GAP                  Explicit “try to refute” + forbid repairing malformed JSON; incomplete if unverified
EVIDENCE             OBSERVED VALIDATION-AND-REPORTING vs baseline Multi-agent PDA IMPLEMENTED
APPLICABILITY        High for gate/critic workflows
DECISION             ADAPT
```

### M05 Coverage ledger + critic
```text
EXTERNAL_MECHANISM   coverage-ledger.json state machine + coverage critic waves + validator
PROBLEM_SOLVED       “We looked at auth” without unit-level evidence; silent under-coverage
OUR_CURRENT_MECHANISM Task IR / Capability IR plan.ir.yaml; orchestrator plans (PARTIAL–SUBSTANTIAL for planning)
EQUIVALENCE          PARTIAL — MegaBrain plans work units; lacks this coverage-claim ledger semantics
GAP                  Deterministic coverage IDs, prior_status, attempts archive, critic loop
EVIDENCE             OBSERVED ledger validator state invariants
APPLICABILITY        Medium–High for long multi-agent audits/reviews
DECISION             ADAPT
```

### M08/M09 Sandbox + artifact promotion
```text
EXTERNAL_MECHANISM   Mandatory OS sandbox + parent-only race-safe promotion
PROBLEM_SOLVED       Target-controlled code poisoning agent / host
OUR_CURRENT_MECHANISM Sandbox UNKNOWN–PARTIAL (baseline)
EQUIVALENCE          UNKNOWN / NONE proven
GAP                  Detailed contract exists here as prompts only; MegaBrain sandbox status UNKNOWN
EVIDENCE             DOCUMENTED skill; no sandbox binary in corpus; baseline marks Sandbox UNKNOWN
APPLICABILITY        Critical if agents execute untrusted target code
DECISION             DEFER (needs MegaBrain sandbox audit) — pattern worth PROTOTYPE later
```

### M01 Dual mode / authority boundary
```text
EXTERNAL_MECHANISM   Loading skill ≠ authorize full workflow; guidance vs full audit
PROBLEM_SOLVED       Over-orchestration / unwanted artifact creation
OUR_CURRENT_MECHANISM Policy Engine + skill non-responsibilities / context contracts
EQUIVALENCE          SUBSTANTIAL
GAP                  Residual: explicit “ask one question if ambiguous” UX
DECISION             ALREADY_PRESENT (with small ADAPT residual for ambiguity gate)
```

### M10 Attack-class companions
```text
EXTERNAL_MECHANISM   Domain companion markdown selected from recon boundaries
PROBLEM_SOLVED       Generic hunting misses LLM/MCP/supply-chain/etc. trust edges
OUR_CURRENT_MECHANISM Skills + Knowledge grounding (GaabWiki)
EQUIVALENCE          PARTIAL (packaged domain knowledge vs wiki packs)
GAP                  Security-domain packs not MegaBrain product scope unless security capability is desired
DECISION             DEFER (product-scope) / REJECT as wholesale product merge
```

### M11 Budget + profile gates
```text
EXTERNAL_MECHANISM   quick/standard/deep + reserve critics/validators before hunters
PROBLEM_SOLVED       Spend hunters until no budget for verification → false completeness
OUR_CURRENT_MECHANISM Orchestrator/runtime + Policy (PARTIAL)
EQUIVALENCE          PARTIAL
GAP                  Explicit “reserve verification before exploration” economics
DECISION             ADAPT
```

### M06 Schema-first reporting
```text
EXTERNAL_MECHANISM   findings.json SSOT; prose derived; reject prose-only hunter output
PROBLEM_SOLVED       Undeduplicable / unverifiable narrative findings
OUR_CURRENT_MECHANISM Evidence Bus + contracts
EQUIVALENCE          SUBSTANTIAL
DECISION             ALREADY_PRESENT (pattern); ADAPT security field shapes if needed
```

### Full 6-phase security product
```text
EXTERNAL_MECHANISM   End-to-end security audit skill
OUR_CURRENT_MECHANISM Not a vulnerability harness (baseline: MegaBrain = Agent System)
EQUIVALENCE          NONE as product
DECISION             DEFER / REJECT as product clone; harvest mechanisms above instead
```

## 7. Decisions summary

| Mechanism | Decision | Confidence |
|-----------|----------|------------|
| Tri-verdict + severity≤impact + schema validators | ADAPT | HIGH |
| Independent refute / Phase 5 material-replace loop | ADAPT | HIGH |
| Coverage ledger + critic waves | ADAPT | HIGH |
| Budget reserve critics/validation before hunting | ADAPT | MEDIUM |
| Dual mode / skill load ≠ authorize | ALREADY_PRESENT | HIGH |
| Schema-first SSOT then prose | ALREADY_PRESENT | HIGH |
| Sandbox + promotion procedure | DEFER (→ PROTOTYPE after sandbox audit) | MEDIUM |
| Attack-class companion library | DEFER / REJECT as wholesale | MEDIUM |
| Entire 6-phase security product | DEFER/REJECT clone | HIGH |
| Cloudflare fleet harness internals | UNKNOWN — no decision | — |

## 8. UNKNOWN / CONFLICTS

See `UNKNOWNS.md`.

```yaml
CONFLICT:
  claim: Skill is the production Cloudflare vulnerability harness
  source_a: Marketing-adjacent reading of README title
  source_b: README "seeded" / "starting point"; harness NOT_IN_CORPUS
  difference: Skill ≠ fleet harness
  resolution: prefer_primary (README) — DOCUMENTED seed, harness DOCUMENTED_ONLY external
```

```yaml
CONFLICT:
  claim: Validators are proven correct in this investigation
  source_a: Presence of .test.cjs (OBSERVED)
  source_b: Tests not executed (policy)
  difference: Code exists vs MEASURED pass
  resolution: UNRESOLVED — reproducibility UNKNOWN
```

## 9. Sources

| Source | Label |
|--------|-------|
| `/home/gaab/Documentos/reverseEnginering/security-audit-skill/README.md` | DOCUMENTED |
| `.../skills/security-audit/SKILL.md` | OBSERVED |
| `RECONNAISSANCE.md`, `HUNTING.md`, `VALIDATION-AND-REPORTING.md` | OBSERVED |
| `ATTACK-CLASSES.md` + companion `*.md` | OBSERVED |
| `report-schema.json`, `validate-*.cjs`, `validate-*.test.cjs` | OBSERVED (tests unread-run) |
| `_corpus-audit/{CORPUS-MAP,TARGET-INVENTORY,UNKNOWN-CATALOG,EVALUATION-INVENTORY,RELATIONSHIP-MAP,VERSION-MAP}.*` | OBSERVED audit |
| `research/OUR-SYSTEM-BASELINE.md` | DOCUMENTED baseline |
| Git HEAD `c1c8a8c…` | OBSERVED |
| Cloudflare blog / fleet harness | DOCUMENTED_ONLY external — not fetched in this pass |

## 10. Handoff

- Para `agent-authoring`: considerar ADAPT de (1) tri-estado de findings com severidade só em confirmed, (2) gate critic independent, (3) coverage-claim ledger semantics, (4) budget reservation — **sem** clonar o produto de audit de segurança.
- Para `architect` / `adr`: sandbox/promotion se agentes executarem código de target; gap Sandbox MegaBrain = UNKNOWN.
- Para investigação futura: fleet harness (external), executar validators em sandbox controlado se política permitir → fechar U-SA-03.
- **Não implementado nesta skill / neste turno.**
