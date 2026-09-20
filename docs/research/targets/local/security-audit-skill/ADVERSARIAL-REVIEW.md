# ADVERSARIAL-REVIEW — security-audit-skill investigation

**Investigator:** sole TARGET_RESEARCH pass  
**Date:** 2026-09-18  
**Depth claimed:** MODERATE  

## Self-critique

### What could be overclaimed?

1. **Treating prompt procedures as runtime.** The sandbox and artifact-promotion sequences are detailed and sound on paper (DOCUMENTED). Without harness code, claiming they “work” would be false. Report marks implementation ABSENT / DEFER — **kept**.
2. **Equating schema unit tests with security efficacy.** Tests OBSERVED target validator semantics (fixtures, severity caps, hostile diagnostics). They do **not** prove the six-phase workflow finds real vulns. U-SA-06/C-SA-02 capture this.
3. **Inflating MegaBrain gaps.** PDA critic/gate and Evidence Bus already cover independence and structured evidence at a generic level. Several decisions are ADAPT of **shapes**, not ALREADY_PRESENT of **security product** — deliberate to avoid proposing a second registry.
4. **ADOPT temptation.** No ADOPT issued. High-quality external skill ≠ drop-in MegaBrain module.

### What could be underclaimed?

1. **Validator code quality.** ~1.6k LOC of careful zero-dep validation (limits, NFC/encoding for coverage IDs, state invariants) is stronger than “docs with a schema.” Confidence HIGH on *existence and design intent*; MEDIUM on *runtime pass* because tests not run.
2. **AI-AND-LLM companion.** Explicitly separates prompt injection theater from deterministic authority/binding failures — high architectural signal for agent-security, not fully mined into Level 2 findings (depth MODERATE).

### Methodology compliance

| Check | Status |
|-------|--------|
| Flow 1–20 order respected | YES (define→evidence→map→decompose→compare→artifacts→validate) |
| Epistemic labels on key claims | YES |
| Decision vocab only allowed set | YES (`ALREADY_PRESENT\|ADAPT\|DEFER`; notes on REJECT for product clone) |
| No implementation of Agent System | YES |
| No ranking / popularity-as-merit | YES |
| No .cjs test execution | YES |
| Harness marked external | YES |
| UNKNOWN where unproven | YES |
| Comparison vs OUR-SYSTEM-BASELINE | YES |

### Biases checked

- **Cloudflare brand halo:** discounted; mechanisms judged from files, not vendor.
- **Security-topic fascination:** lens was agent-architecture (workflow, evidence, policy, boundaries), not vuln-hunting tips.
- **Confirmation of “skills are just markdown”:** falsified — validators are real code; still not a full runtime.

### Residual risks for consumers of this report

- Parent agent non-compliance can nullify write-isolation (U-SA-07).
- Copying companion attack packs wholesale may create over-agentization / context explosion (anti-pattern from analysis-framework).
- Implementing coverage ledger without budget reservation recreates the failure mode the skill explicitly fights.

### Depth honesty

MODERATE means: full skill + phase docs + schema + validator structure + corpus-audit cross-check + git identity. **Not** done: execute tests, read every companion end-to-end line-by-line, external blog/harness fetch, Level 2 finding files, Level 4 ADRs.

### Verdict on investigation quality

Sufficient for Level 1 target report and mechanism inventory with actionable ADAPT/DEFER decisions. Insufficient to claim harness parity, measured audit efficacy, or sandbox PROVEN status.
