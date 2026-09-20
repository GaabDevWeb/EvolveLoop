# Agents / notes — wiki (Context Engineer)

Skill: grounding Wiki / context pack no Cursor Agent.

- Skill: `~/.cursor/skills/wiki/`
- Capability: `context-grounding`
- Command: `/wiki`
- Espelho: `Agents/Wiki.md`
- Workspace evals: `~/.cursor/skills/wiki-workspace/`
- Script: `scripts/ground.sh` → `python -m gaabwiki search` / packs

**DO NOT CREATE** `context-engineer` — este package **é** o Context Engineer.

Não confundir com CLI `wiki vibe` (coding no terminal). Esta skill **só** injecta spec; o Agent implementa.  
Knowledge / promote → `wiki-mem`.
