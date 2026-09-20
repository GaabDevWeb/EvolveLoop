#!/usr/bin/env bash
set -euo pipefail
[[ -f "$HOME/.cursor/agents.env" ]] && source "$HOME/.cursor/agents.env"

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=_resolve-root.sh
source "$HOOK_DIR/_resolve-root.sh"

PROJECT_ROOT="$(resolve_project_root || true)"
if [[ -z "$PROJECT_ROOT" ]]; then echo '{}'; exit 0; fi

ORCH="$PROJECT_ROOT/orchestrator"
CURSOR_META="$(dirname "$ORCH")/.cursor"
[[ -d "$PROJECT_ROOT/.cursor" ]] && CURSOR_META="$PROJECT_ROOT/.cursor"

JOBS_DIR="${ORCHESTRATOR_JOBS_DIR:-$ORCH/jobs}"
PROMPT_DIR="${ORCHESTRATOR_PROMPT_DIR:-$CURSOR_META/pickup}"
RUN_JOBS="$ORCH/dist/cli/run-jobs.js"

[[ -f "$RUN_JOBS" ]] || { echo '{}'; exit 0; }

RESULT="$(node "$RUN_JOBS" invoke --jobs-dir "$JOBS_DIR" --prompt-dir "$PROMPT_DIR" 2>/dev/null || echo '{"status":"idle"}')"

node -e "
const plan = JSON.parse(process.argv[1]);
if (plan.status !== 'ready') { console.log('{}'); process.exit(0); }
const msg = [
  'Pending SkillJob (Execution Engine).',
  'Run ID: ' + plan.run_id,
  '1. Read: ' + plan.prompt_path,
  '2. Skill: ' + plan.skill_path,
  '3. Complete: agents-orch jobs complete --jobs-dir ' + plan.jobs_dir + ' --run-id ' + plan.run_id + ' --success --evidence <path>',
].join('\\n');
console.log(JSON.stringify({ followup_message: msg }));
" "$RESULT"
