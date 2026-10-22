# wiki / wiki-mem install

`standard` profile installs `wiki` and `wiki-mem` from `repo:${AGENTS_ROOT}/.cursor/skills/...` as **symlinks** into `~/.cursor/skills/` (fallback: `agent-setup/skills/*`).

## CONFLICT

If `~/.cursor/skills/wiki` already exists as a **copied directory** from an older install (bundled copytree), a second run reports `CONFLICT skill:wiki` instead of overwriting. Remediation:

```bash
rm -rf ~/.cursor/skills/wiki ~/.cursor/skills/wiki-mem
AGENTS_ROOT=/path/to/repo agent install --profile standard
```

When the destination already symlinks to the same resolved path as the source, install is **skipped** (idempotent).
