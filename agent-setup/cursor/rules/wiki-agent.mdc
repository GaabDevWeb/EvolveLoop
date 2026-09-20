---
description: Wiki grounding — knowledge context for agent work (global)
alwaysApply: true
---

# Wiki — agent grounding loop

Vault: `$WIKI_ROOT` (alias: `$RAG_REPO_ROOT`) — set via environment; no hardcoded user path  
Skill: `wiki` (`~/.cursor/skills/wiki/`) · comando `/wiki`  
Script: `bash ~/.cursor/skills/wiki/scripts/ground.sh …`

Applies to all workspaces when knowledge grounding is required.

---

## 1. Use the wiki as context

Before planning or implementing (code, architecture, contracts):

1. Identify the project / domain.
2. Run grounding via skill **wiki** (pack if known + scout/search), or `/wiki`.
3. Follow the skill template (Sources / Contracts / GAPs / Method / Handoff).
4. Do not invent contracts: if the wiki does not say, declare GAP.

### Exceptions (may skip broad scout)

- Trivial requests without domain (calculation, formatting, generic “what is X?”).
- Clarification-only conversation with no technical action.

In those cases: one line `Wiki: n/a (trivial)` is enough.

Anti-pattern: do not use `wiki vibe` / Composer CLI as the coding brain — the Agent implements.

### Episodic memory (optional)

Continuity across chats: skill `wiki-mem` / `/mem` + `.ai/sessions/LATEST.md`.  
**Does not** replace wiki/RAG grounding. Public default: memory **off** unless profile enables it.

---

## 2. After code edits — register in the wiki

If the Agent creates, edits, or deletes code (or runtime configs) in a repo:

In the same turn (or at task close), update the wiki vault:

1. Append `{Project}/log.md` (append-only event).
2. If the change is a decision / relevant audit: also `.agent_history.md` when that is the project’s canonical place.
3. If contracts / architecture / state change: update synthesized `{Project}/wiki/` pages — **never** rewrite `raw/`.

### Exceptions

- Edits only inside the vault that are already the registry itself.
- Explicit user request: “do not update the wiki”.

---

## 3. Canonical order

```
request → wiki grounding → edit code → register wiki (log ± pages) → respond
```

## 4. Precedence

Verified code > wiki. If they conflict: fix the wiki or mark `GAP`/`status` — do not silence.
