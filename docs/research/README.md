# docs/research — Agent Architecture Mining (official)

**Status:** COMPLETE (2026-09-18)  
**Skill:** `agent-architecture-mining`  
**Corpus inventory SSOT:** `/home/gaab/Documentos/reverseEnginering/_corpus-audit/` (**do not re-audit**)  
**Working investigator scratch:** `/home/gaab/Documentos/reverseEnginering/research/` (non-canonical)

## Start here

1. [allocation/RESEARCH-ALLOCATION.md](./allocation/RESEARCH-ALLOCATION.md) — how 21 targets were allocated from audit  
2. [EXECUTIVE-FINDINGS.md](./EXECUTIVE-FINDINGS.md) — mission answers  
3. [AGENT-ARCHITECTURE-PRINCIPLES.md](./AGENT-ARCHITECTURE-PRINCIPLES.md) — principles that survived evidence  
4. [DECISION-MATRIX.md](./DECISION-MATRIX.md) — ALREADY_PRESENT…REJECT  
5. [DO-NOT-CHANGE.md](./DO-NOT-CHANGE.md) — anti-churn  
6. [CROSS-INVESTIGATION-REVIEW.md](./CROSS-INVESTIGATION-REVIEW.md) — contradictions / terminology  
7. [CROSS-SYSTEM-ANALYSIS.md](./CROSS-SYSTEM-ANALYSIS.md) — matrices  

## Layout

```text
docs/research/
├── allocation/RESEARCH-ALLOCATION.md
├── targets/{local,external}/<slug>/   # REPORT, MECHANISMS, UNKNOWNS, ADVERSARIAL-REVIEW
├── patterns/   # P-* Lead-canonical; PM-* parallel-miner
├── anti-patterns/
├── architecture-gaps/
├── hypotheses/
├── experiments/
├── findings/
├── temporal-analysis/
├── corpus-audit-reconciliation/   # only for AUDIT≠OBSERVED notes
└── *.md synthesis
```

## Rules

- No Agent System implementation from this tree alone — handoff to `agent-authoring` / ADR.  
- LOCAL_CORPUS vs OFFICIAL_EXTERNAL provenance preserved in dossiers.  
- Pattern ≠ Principle; popularity ≠ quality; frequency ≠ necessity.

## Related

- Skill SSOT pointer also: `docs/AGENT_ARCHITECTURE_PRINCIPLES.md` (index into this tree)  
- Older experimental paths under `docs/architecture-mining/` may exist — **this** `docs/research/` is the operation canonical for 2026-09-18.
