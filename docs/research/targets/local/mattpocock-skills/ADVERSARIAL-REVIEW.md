# ADVERSARIAL-REVIEW — mattpocock-skills

Date: 2026-09-18  
Role: self-critique before closing TARGET_RESEARCH

## Attacks on this investigation

### 1. Over-crediting documentation as runtime truth

**Risk:** Much of the “architecture” is prompt convention. Without harness runs, Skill-tool composition and invocation gating could fail silently.  
**Mitigation applied:** Execution flow marked UNKNOWN; decisions framed as adapting *instruction design*, not proven runtime.  
**Residual:** Still possible that ADAPT items fail in Cursor specifically (U-MP-10).

### 2. Marketing bleed

**Risk:** README contrasts GSD/BMAD/Spec-Kit and claims token savings from shared language.  
**Mitigation:** Separated Product/Technical factors; efficacy claims not labelled MEASURED; utility for CONTEXT.md benefits kept CONDITIONALLY / evidence DOCUMENTED.  
**Residual:** Narrative in REPORT may still feel persuasive beyond evidence.

### 3. False equivalence with MegaBrain

**Risk:** Mapping “main flow” onto Orchestrator/Evidence Bus as if same layer.  
**Mitigation:** Explicit REJECT of main flow as runtime replacement; EQUIVALENCE PARTIAL with content-only ADAPT.  
**Residual:** Phase-boundary language might be cargo-culted into orquestrar without evidence gates.

### 4. Inventing completeness of skill inventory

**Risk:** Missed deprecated skills, scripts-as-skills, or docs-only behaviours.  
**Mitigation:** Counts from glob (38 SKILL.md, 38 openai.yaml, 25 plugin entries, 25 docs).  
**Residual:** U-MP-09 personal bucket; deprecated folder contents not deeply read.

### 5. Decision inflation

**Risk:** Too many ADAPT → noise for Lead.  
**Mitigation:** Clustered related mechanisms; flagged DEFER/REJECT clearly; top mechanisms called out in summary.  
**Residual:** M-WAIT-WHAT as PROTOTYPE is thinner evidence (one short skill + changelog rationale).

### 6. Ignoring anti-patterns in the target

**Risk:** Cheerleading “composable skills” while missing failure modes.  
**Mitigation noted:**

| Anti-pattern signal | Where | Notes |
|---------------------|-------|-------|
| Router drift | ask-matt + CLAUDE.md warning | Cognitive load cure creates new consistency debt |
| Context explosion | Many model-invoked descriptions | Trade-off explicit in writing-for-agents |
| Brittle prompts | Thin wrappers depend on Skill tool | No fallback body |
| Lack of validation/evals | Corpus-wide | REJECT adopting absence |
| Hidden state | Per-repo docs/agents + CONTEXT | Soft-dep skills degrade silently |
| Premature completion | Discussed *in* methodology | Target authors aware; unmeasured |

### 7. Temporal shallowness

**Risk:** Labelled TEMPORAL_RESEARCH_CANDIDATE but only CHANGELOG skim.  
**Mitigation:** TEMPORAL.md covers 1.2.x themes from CHANGELOG; no fake commit archaeology.  
**Residual:** Pre-1.0 evolution and rename history not reconstructed.

### 8. Scope contamination

**Risk:** Comparing to superpowers (forbidden).  
**Mitigation:** No joint analysis; RELATED_TO omitted.  
**Check:** Pass.

### 9. Hard/soft dependency ADR vs code-review pointer

**Risk:** ADR lists hard deps as to-tickets/to-spec/triage; code-review also tells user to run setup if issue-tracker missing.  
**Note:** Mild tension — code-review treats tracker as hard for Spec axis. Not elevated to CONFLICT; mark as nuance / possible ADR drift (INFERRED).

## Claims downgraded during review

| Claim draft | Downgrade |
|-------------|-----------|
| “Composition always works” | → DOCUMENTED intent; runtime UNKNOWN |
| “CONTEXT.md saves tokens” | → product/DOCUMENTED tip; not MEASURED |
| “25 skills on marketplace” | → local plugin 25; marketplace UNKNOWN |

## What would change decisions

- If Skill-tool wrappers fail often on Cursor → DEFER M-THIN-WRAPPER or require inlined fallback.
- If dual openai.yaml unused in MegaBrain hosts → still keep Claude `disable-model-invocation` ADAPT; drop Codex half to DEFER.
- If GaabWiki already covers glossary fully → M-CONTEXT-ADR → DEFER entirely.

## Verdict

Artifacts are **fit to hand off** as Level 1 LOCAL_CORPUS research with explicit UNKNOWNs. Highest-confidence ADAPTs: invocation axis, Skill-tool composition, writing-for-agents levers, grilling primitive, dual-axis review, harness-neutral wording. Do not treat as endorsement of shipping without evals.
