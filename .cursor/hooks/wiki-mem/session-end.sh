#!/usr/bin/env bash
# sessionEnd → fecho + enqueue promote-queue (sem followup_message)
set -euo pipefail
python3 "$HOME/.cursor/hooks/wiki-mem/mem.py" session-end >/dev/null
echo '{}'
