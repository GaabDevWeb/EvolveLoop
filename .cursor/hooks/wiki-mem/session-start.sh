#!/usr/bin/env bash
# sessionStart → episodic mem + additional_context (e LATEST.md fallback)
set -euo pipefail
exec python3 "$HOME/.cursor/hooks/wiki-mem/mem.py" session-start
