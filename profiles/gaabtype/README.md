# GaabType profile overlay

This directory personalizes **EvolveLoop** without duplicating core.

```text
GaabType = main + this overlay
```

Set environment (never commit secrets or machine-only paths into tracked files unless intentional):

```bash
export WIKI_ROOT="/path/to/your/personal/wiki-vault"   # e.g. karpathyWiki
export RAG_REPO_ROOT="$WIKI_ROOT"
export EVOLVELOOP_PROFILE_PATH="$AGENTS_ROOT/profiles/gaabtype/profile.yaml"
# or merge preferences into agents.env
```

Core remains the EvolveLoop `main` architecture.
