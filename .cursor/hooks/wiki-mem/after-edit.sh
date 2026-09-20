#!/usr/bin/env bash
# afterFileEdit → observação (skip secrets)
set -euo pipefail
exec python3 "$HOME/.cursor/hooks/wiki-mem/mem.py" after-edit
