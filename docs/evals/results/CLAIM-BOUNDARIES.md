# Claim Boundaries

## E-001

### Claims We Can Make

- Under offline harness conditions, catalog size was associated with higher offline activation_precision for T_SKILLS_5 and T_SKILLS_10 vs CONTROL.
- Under offline harness conditions, treatments were associated with lower whitespace `token_estimate` vs CONTROL.
- `T_TOKENS_40` reduced `token_estimate` by ~39.6% vs CONTROL (~40%).
- Live `task_success` was NOT_MEASURED.
- Live host catalog injection was NOT_MEASURED.
- Vendor tokenizer was NOT_MEASURED.

### Claims We Cannot Make

- Production agent quality / performance improved.
- Live task_success improved or was unchanged.
- Whitespace token_estimate equals vendor billing tokens.
- “~40%” applies to T5 or T10.
- `max_skills` must be implemented.
- Offline overlap ranker equals Cursor/MegaBrain skill selection.

---

## E-005

### Claims We Can Make

- No duplicate STATE_WRITE mutation was observed in the tested fixture (15/15 mutation=1).
- Job-path resume succeeded on tested treatment runs (resume_success=1.0).
- State integrity was MEASURED under the fixture.
- Same-process interruption was MEASURED.
- OS kill was NOT_MEASURED.
- Side-effect scope was STATE_WRITE (job JSON).

### Claims We Cannot Make

- Global exactly-once is guaranteed.
- The system is globally idempotent.
- All external side effects are protected against duplication.
- Full HITL is validated.
- OS/process crash recovery is proven.
- `engine.pause()` interrupt semantics are proven.
- HITL is more than PARTIALLY_OBSERVED at product scope.
