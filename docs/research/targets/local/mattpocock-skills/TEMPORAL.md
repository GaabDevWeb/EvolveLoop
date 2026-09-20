# TEMPORAL — mattpocock-skills

Date: 2026-09-18  
source_type: LOCAL_CORPUS  
Epistemic: primarily DOCUMENTED via `CHANGELOG.md` + `_corpus-audit/VERSION-MAP.md`; no full git archaeology this pass.

## Version spine

| Marker | Evidence |
|--------|----------|
| First commit (audit) | 2026-02-03 |
| Tags | `v1.0.0` … `v1.2.3`, plus `mattpocock-skills@1.0.0` |
| Current manifests | `package.json` / `plugin.json` **1.2.3** |
| Commits (audit) | 472 |

```text
2026-02  first commit
   → v1.0.0 / v1.0.1
   → v1.1.0
   → v1.2.0  (plugin + dual-harness metadata + graduations)
   → v1.2.2  (Codex model-invoke fix for writing-for-agents)
   → v1.2.3  (harness-neutral subagents; diagnosing-bugs redact; wizard polish)
```

## Evolutionary themes (from CHANGELOG)

### 1. Dual-harness metadata (1.2.0)

**Change:** Add `agents/openai.yaml` beside every skill; Codex `policy.allow_implicit_invocation: false` pairs with Claude `disable-model-invocation`; `AGENTS.md` symlink to `CLAUDE.md`.  
**Why (DOCUMENTED):** One set works in Claude Code and Codex without generated copies.  
**Implication for mining:** Invocation axis is a *deliberate product of evolution*, not an accident of one harness.

### 2. Native Claude plugin + marketplace (1.2.0)

**Change:** `.claude-plugin/plugin.json` curated path list; later accepted into official marketplace; skills.sh remains universal path.  
**Why (ADR 0002):** Subscribe/read-only vs fork/edit; Codex plugin blocked by single-path + symlink drop.  
**Implication:** Bucket layout is load-bearing for distribution, not only taxonomy.

### 3. Graduation pipeline (1.2.x)

**Examples:** `to-questionnaire`, `wizard` move from `in-progress/` → promoted buckets with plugin entry, README, docs page, ask-matt route.  
**Implication:** `in-progress/` is a public beta channel with explicit non-ship invariant.

### 4. Invocation polarity flips (1.2.2)

**Example:** `writing-for-agents` had Codex policy false → filtered from model-visible list → fixed by dropping policy and moving README category to Model-invoked.  
**Implication:** Dual flags drift is a real failure mode (supports M-INVOKE-AXIS costs).

### 5. Harness neutralization (1.2.3)

**Change:** Remove Claude-specific tool/agent-type names from subagent instructions in several skills.  
**Implication:** Cross-harness portability is an ongoing edit discipline (M-HARNESS-NEUTRAL).

### 6. Safety / HITL polish (1.2.3)

**Change:** `diagnosing-bugs` redaction section; wizard drops time estimates.  
**Implication:** Skills that show secrets/commands accumulate guardrail text over time.

### 7. Minimal corrective skill (1.2.x)

**Change:** `wait-what` added as ultra-short leading-word skill; CHANGELOG argues against long concision skills.  
**Implication:** Counter-trend to skill bloat — methodology applied to itself.

## What TEMPORAL does *not* claim

- Exact commit that introduced grilling / domain-modeling / buckets (pre-1.2 detail not reconstructed).
- Whether marketplace pin currently matches 1.2.3 (UNKNOWN — see UNKNOWNS).
- Performance or adoption metrics over time (ABSENT).

## Useful follow-ups (for a deeper temporal pass)

1. `git log --follow` on `.agents/invocation.md` and `ask-matt/SKILL.md`.
2. Diff `plugin.json` across tags for promotion timeline.
3. Correlate changesets in `.changeset/` with CHANGELOG entries.
