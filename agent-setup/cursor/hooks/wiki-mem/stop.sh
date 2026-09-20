#!/usr/bin/env bash
# stop → finalizar resumo + enqueue promote-queue
# followup_message vazio de propósito: só side-effect da fila (sem loops MegaBrain)
set -euo pipefail
python3 "$HOME/.cursor/hooks/wiki-mem/mem.py" stop >/dev/null
echo '{}'
