#!/usr/bin/env bash
# sessionStart — Caveman output hard gate. Default ON.
# Opt-out: EVOLVELOOP_BREVITY_CAVEMAN=off (also 0, false, no).
# Does not rewrite the vendored skill. Does not print secrets.
set -euo pipefail

mode="$(printf '%s' "${EVOLVELOOP_BREVITY_CAVEMAN:-}" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
case "$mode" in
  0|false|off|no)
    printf '%s\n' '{}'
    exit 0
    ;;
esac

python3 - <<'PY'
import json

text = """Caveman output hard gate: ON.
Follow vendor/juliusbrussee-caveman/skills/caveman/SKILL.md (upstream v4.0.1, d262ab3882952a59312ff3537cd86d894523c5ab). Do not rewrite it. Do not switch to ultracave, megacave, or caveman-compress.
Opt-out: EVOLVELOOP_BREVITY_CAVEMAN=off
Exceptions — never compress or alter: code, commands, paths, evidence, SHAs, commit messages, user docs, task reports (structured fields), security content.
"""
print(json.dumps({"additional_context": text}))
PY
