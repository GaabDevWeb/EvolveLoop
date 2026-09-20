# TEMPORAL.md — superpowers git archaeology

| Field | Value |
|-------|-------|
| Repo | `/home/gaab/Documentos/reverseEnginering/superpowers` |
| Remote | `git@github.com:obra/superpowers.git` (inventory) |
| Examined tip | `main` @ `b36e082` = **v6.3.0** (2026-08-12 release notes) |
| Commits | 681 (matches inventory) |
| Tags | 34: `v3.1.0` … `v6.3.0` |
| Method | `git log` / `git ls-tree` / tag dates — **READ-ONLY**, no checkouts of other tags into worktree |
| Label | OBSERVED for paths/dates; DOCUMENTED for RELEASE-NOTES narrative |

## Era map (problem → mechanism evolution)

### Era 0 — Birth (2025-10)

- **2025-10-09** `dd013f6` Initial Superpowers plugin v1.0.0.
- Immediate churn on **SessionStart hook** shape (`hookEventName`, command type, matcher clear/compact) — bootstrap correctness is foundational from day one.
- **2025-10-16** `using-superpowers` skill added back when Claude bootstrap alone “does not seem to trigger skills quite as effectively” — **OBSERVED** commit message: bootstrap ≠ discovery; meta-skill content needed.

**Pattern:** Activation reliability dominates early commits (not skill content polish).

### Era 1 — v3.x → v4.0 (methodology + first multi-runtime)

- Tag **v4.0.0**: skills include SDD + using-superpowers; OpenCode path `.opencode/plugin/`; hook still `session-start.sh`.
- SDD already has implementer + separate spec/quality reviewer prompts.
- ~132 commits v3.1.0→v4.0.0.

### Era 2 — v5.0 (Cursor, agentskills, Windows polyglot)

- **v5.0.0** (2026-03-09): `.cursor-plugin/`; platform refs begin (`codex-tools.md`); explicit-skill-requests tests.
- Hook renamed to extensionless `session-start` + `run-hook.cmd` for Windows focus-stealing (commit `5fbefbd`, Feb 2026) — harness quirks drive code.
- Mid-v5: inline self-review experiments vs subagent loops (RELEASE-NOTES v5.0.6) — **review cost** becomes a theme.
- **v5.1.0**: global `~/.config/superpowers/worktrees` removed later in v6; contributor AI guidelines harden; Codex plugin mirror tooling.

### Era 3 — v6.0 rewrite (cost, neutrality, ledger seeds)

- **v6.0.0** (2026-06-16): largest architectural release in notes.
  - Two reviewers → **one dual-verdict** `task-reviewer-prompt.md`.
  - File handoff (`task-brief`, `review-package`) to cut pasted-diff context cost.
  - Mandatory **named models** on dispatches.
  - **Anti-coaching** of reviewers.
  - Progress ledger for compaction recovery.
  - Writing-plans: **Global Constraints** + **Interfaces**.
  - Skills rewritten to **action vocabulary**; harness tool refs expanded (Pi, Antigravity, Kimi).
  - Brainstorm companion **auth hardening**.
  - Skill evals lifted to external **drill**/`evals/` (not in this checkout).
- Claimed MEASURED benefit (docs): ~2× faster, ~50% fewer tokens on CC/Codex evals — **not revalidated here**.

### Era 4 — v6.1–v6.3 (token diet, plan-scoped workspace, more harnesses)

- **v6.1.x**: lower per-session token cost; Codex bootstrap/compaction fixes.
- **v6.2–v6.3**: SDD plan-scoped workspace `.superpowers/sdd/<plan>/` (`sdd-workspace`); ownership markers; “rule and continue” vs stall; evidence-bearing preflight; brainstorming **three-path router**; Devin CLI + Hermes Agent; Hermes compaction limitation documented.
- ~83 commits v6.0.0→v6.3.0 after large v5→v6 jump (~285 commits v5→v6).

### Beyond HEAD (OUT_OF_SCOPE for mechanism claims)

`git log --all` shows post-v6.3 work (v6.4.0 notes, diagnosing-superpowers, movie skill, OpenCode V2, Muse, Qwen). **Not present** in examined working tree. Do not treat as current LOCAL_CORPUS mechanisms.

## Mechanism introduction summary

| Mechanism | Earliest strong signal | Mature form by |
|-----------|------------------------|----------------|
| Session bootstrap | 2025-10 initial + hook fixes | continuously patched through v6.3 |
| using-superpowers meta-skill | 2025-10-16 | v6 action/hierarchy wording |
| SDD | ≤v4.0.0 | v6.0 review rewrite + v6.3 ledger workspace |
| Multi-harness adapters | OpenCode ≤v4; Cursor v5; Pi/Kimi/Antigravity v6 | v6.3 + porting guide |
| Plan contracts | v6.0 notes | v6.0+ |
| Three-path brainstorm | v6.3.0 | v6.3.0 |
| evals split | v6.0 docs | submodule absent here |
| Worktree project-local | v6.0 notes (removal of global dir) | v6.0 |

## Failure recovery evolution (lens)

1. **Early:** rely on session memory / todos.  
2. **v6.0:** progress ledger acknowledged as recovery after compaction.  
3. **v6.3:** plan-scoped durable workspace + identity line prevents cross-plan ledger contamination (eval-driven redesign docs in `docs/superpowers/specs/2026-07-06-*`).

**INFERRED:** Compaction-induced re-dispatch was the “single most expensive failure observed” (skill prose) — treated as design driver, not independently MEASURED in this pass.

## Release / versioning practices

- Semver tags aligned with `package.json` / plugin manifests at 6.3.0.
- `RELEASE-NOTES.md` large narrative changelog (~94kB) — product communication as architecture history.
- `dev` vs `main` branch policy for contributions (CLAUDE.md).
- `.version-bump.json` + scripts for multi-manifest sync (not executed).

## Takeaways for mining

1. **Bootstrap reliability** is a decade of micro-fixes, not a one-shot feature.  
2. **Cost/gaming of multi-agent review** forced structural change (v6), not prompt nags alone.  
3. **Harness surface area** expands faster than skill count (14 skills relatively stable; adapters proliferate).  
4. Temporal candidate justified: 681 commits / 34 tags show mechanism *selection pressure* clearly.
)
