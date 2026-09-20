# UNKNOWNS — security-audit-skill

**Target:** `tgt-security-audit-skill`  
**Date:** 2026-09-18  
**Policy:** READ-ONLY; `.cjs` tests not executed → reproducibility **UNKNOWN**.

## Corpus-audit carry-forward

| ID | Unknown | Status this pass |
|----|---------|------------------|
| U-SA-01 | Diff exacto vs Cloudflare fleet harness | **OPEN** — harness NOT_IN_CORPUS; only README seed narrative |
| U-SA-02 | Version semver canónica | **OPEN** — 0 tags; no package.json version field OBSERVED; HEAD commit only |
| U-SA-03 | Reproducibility dos `.test.cjs` | **OPEN** — intentionally NOT_RUN; mark UNKNOWN |

## New / refined unknowns from TARGET_RESEARCH

| ID | Claim left UNKNOWN | Why | How to close (future) |
|----|--------------------|-----|------------------------|
| U-SA-04 | Runtime behavior of parent promotion APIs on real OS | Procedure DOCUMENTED in prompts only; no implementation binary in corpus | Obtain harness source or instrumented parent; do not invent |
| U-SA-05 | Whether fleet harness still matches this skill’s schema/ledger | README says harness evolved from skill | External research with primary harness sources |
| U-SA-06 | Empirical “single run finds ~half of repeated-run vulns” | README design principle; no dataset/MEASURED in corpus | Need published eval data or controlled re-run |
| U-SA-07 | Agent platform compliance rate with write-isolation rules | Skill assumes parent enforces; coding agents may ignore | Eval harness with adversarial agent |
| U-SA-08 | Completeness of companion attack classes vs real vulns | Packs OBSERVED; coverage of vuln space unmeasured | Mapping study / eval suite |
| U-SA-09 | Exact Node version / platform matrix for validators | Shebang `node`; limits use `O_NOFOLLOW` etc. | Read tests + run matrix if policy allows |
| U-SA-10 | Interaction with Cursor Task tool vs Claude/Codex equivalents | Agent-neutral mapping DOCUMENTED; no per-platform adapters in corpus | Platform-specific dry runs |
| U-SA-11 | Whether `architecture.md` 1k-word cap is enforced mechanically | Cap DOCUMENTED as parent procedure; no validator for architecture.md OBSERVED | Grep/search confirmed no architecture validator |

## Explicit non-claims

- Do **not** claim the LOCAL_CORPUS skill **is** the production Cloudflare fleet harness.
- Do **not** claim validators **pass** — only that test files **exist** (OBSERVED).
- Do **not** claim sandbox controls are **implemented** in this repo — only **specified**.
- Do **not** invent MegaBrain sandbox equivalence — baseline says UNKNOWN–PARTIAL.

## Conflicts

```yaml
CONFLICT:
  id: C-SA-01
  claim: This repository is the full Cloudflare vulnerability harness
  source_a: Over-reading of blog/README branding
  source_b: README "seeded" / "starting point"; harness NOT_IN_CORPUS
  resolution: prefer_primary
  note: Skill = single-repo starting point (DOCUMENTED)
```

```yaml
CONFLICT:
  id: C-SA-02
  claim: Evaluation present and proven
  source_a: EVALUATION-INVENTORY present=true, schema unit tests OBSERVED
  source_b: reproducibility UNKNOWN; no e2e audit eval in corpus
  resolution: UNRESOLVED
  note: Schema tests ≠ end-to-end audit efficacy
```
